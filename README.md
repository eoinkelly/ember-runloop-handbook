# Ember Javascript Runloop Handbook

by [Eoin Kelly](https://twitter.com/eoinkelly)

![Creative Commons License](https://i.creativecommons.org/l/by-sa/4.0/88x31.png)

### Current status

```
Very much a work in progress. Currently still compiling my notes and researching
topics.
```

### Contributing

You should. :-). If you spot any of the (inevitable) errors, omissions, things
which are unclear you would be doing me a great favour by opening an issue.

# Introduction

We are about to take a deep dive into the Ember.js runloop. Why? Because
eventually you need to. Together we will answer these questions:

2. Why does Ember have this runloop thing?
1. What is the Runloop?
3. How can we use it skillfully?

This is not reference documentation - the [Ember API
docs](http://emberjs.com/api/) have that nicely covered. This isn't even the
_"I'm an experienced dev, just give me the concepts in a succinct way"_
documentation - the [Official Ember Run-loop
guide](http://emberjs.com/guides/understanding-ember/run-loop/) has that
covered. This is a longer, more detailed look at the Runloop.

You get started with Ember application development without understanding the
Runloop. However at some point you will want to dig in and understand it
properly so you can use it skillfully. It is my sincere hope that this handbook
can be your guide.

Let's begin.

## Naming is hard

As you learn more about the Ember Runloop you will come to understand that,
well, it just isn't very _loopish_. The name is a bit unfortunate as it
implies that there is a single instance of the Runloop sitting somewhere in
memory looping endlessly _running things_. As we will see soon this is not
true.

In alternate universes the _Runloop_ might have been named

* _Ember Work Queues_
* _Ember Coordinated Work Algorithm_
* _Ember Job Scheduler_
* _Runelope - a large friendly creature that lives in your Javascript VM and
  manages the work Ember does in response to events._

OK so some of those names are really terrible (except _Runelope_ of course, that
one is pure gold and should be immediately pushed to Ember master). Naming is a
hard problem and hindsight is 20/20. The _Runloop_ is what we have so that is
what we will call it but try not to infer too much about its action from the
name.

# section: Why Runloop?

```
background (the environment ember lives in)
    Javascript event loop
    all about events:
        where they come from
        what they are
    examples of how vanialla Javascript handles them
    show timeline of how vanilla Javascript responds to events
    show how ember is just a fancy example of handling events
    discuss the ways in which the vanilla approach doesn't scale well if you are doing lots of work
    end with a clear statement of the problems that the runloop solves
```

## Background

On our journey to understand the Runloop we must first understand the
environment it lives in and the problems it is trying to solve.  Lets set the
scene by refreshing our brains with a few fundementals about how Javascript
runs. (If you are an experienced Javascript developer you may want to just
skim/skip this.)

The browser makes request and server sends HTML back as a response.

The browser then parses the HTML and every time it finds a script it executes it
immediately(*) Lets call this the _setup phase_.  This _setup phase_ happens
well before the user sees any content or gets a chance to interact with the DOM.
Once a script is finished executing the Browser never re-runs it.

(*) Things like `defer` tweak this somewhat but this is a useful simplification.


The browser watches for actions by the user, the network and some internal
timers and will send _events_ to Javascript in response e.g.

* User moved their mouse (`mousemove`)
* The DOM has been completely built (`DOMContentLoaded`)
* User clicked on something (`mousedown`, `mouseup`, `click`)
* An asset have been loaded on the page (`load`)

Javascript is lazy but well perpared!  During the _setup phase_, Javascript prepares its work
space (or _mise en place_ if you prefer) - it creates the objects it will later need
 to respond to orders (events) from the browser and also told the browser
in detail what events it cares about e.g.

> Hey browser, wake me up and run this function I'm giving you whenever the user
> clicks on an element with an id attribute of `#do-stuff`.

The description above makes it look like the browser the one giving all the
orders but the browser is a team player and has a few things it can do to help
Javascript get the job done:

1. Timers. Javascript can use the browser like an alarm clock:

    > Javascript: Hey browser, wake me up and run this function I'm giving you in 5 seconds please.

2. Talking to other systems. If Javascript needs to send or receive data to other
computers it asks the browser to do it and the browser promises to wake Javascript up
again when it is finished.

    > Javascript: Hey browser, I want to get whatever data is at
    > `http://foo.com/things.json` please.

    > Browser: Sure thing but it might take a while (networks can be slow), I'll
    > try to get that data and wake you up again when it is done. What do you
    > want me to do when it comes back?

    > Javascript: I have two functions ready to go (one for a successful data fetch and
    > one for a failure) so just wake me up and run the appropriate one when you
    > finish.

    > Browser: cool.

We usually refer to this this _talking to other systems_ stuff as Web APIs e.g.

* XHR (AJAX) requests
* Web workers
* etc.

This communication between browser and Javascript involves a lot of passing
around _chunks of work_. Javascript functions are neatly packaged units of work
that can be passed around and stored so are perfect for this job.

Javascript can use these services of the browser both during its setup phase and while
responding to another event e.g. part of Javascript response to a "click" event on a
certain element might be to retrieve some data from the network and also
schedule a timer to do some future work.

We can see the pattern of how javascript does work emerging:

1. In the short _setup phase_ the browser runs each script it finds on the page
from start to finish. Javascript uses this as time to do some preparation for next phase.
2. Javascript app spends most of of its life _responding to events_. Many events
come from the user but Javascript can also schedule events for itself by using
the many services (web APIs) that the browser provides.

A solid understanding of this stuff is required to understand the Runloop so if
you are unclear about any of this and want to dig a little deeper I recommend a
[wonderful video by Philip Roberts at Scotland JS](http://vimeo.com/96425312)
that goes into the Javascript event loop in more detail. It is a short watch but
has a few diagrams that are absolute gold IMHO.

# Enter the Ember!

### Things we already know

Since Ember is Javascript we already know quite a bit about how Ember works:

* Apart from when the code is first found, all Ember framework and application
  code is run in response to "events" from the browser.
* The `DOMContentLoaded` event is significant in the life of an Ember app. It tells
  it that it now has a full DOM to play with. Ember will do most of its "setup work"
  (registering for event listeners etc.) in response to this event.
* Your Ember app can schedule its own events by asking the browser to do some work
  on its behalf (e.g. AJAX requests) or simply by asking the browser to be its
  alarm clock (e.g. `setTimeout`)

### Where does the framework end an my app begin

How does your Ember _application_ relate to the Ember _framework_? The machinery
for responding to events is part of Ember _framework_ itself but it does not
have a meaningful response without _application_ code.

For example if the user is on `/#/blog/posts` and clicks a link to go to
`/#/authors/shelly` the Ember _framework_ will recieve the click event but it
won't be able to do anything meaningful with it without some _application_ code
e.g.

* A Router map to tell it how to understand the URL
* The Route objects themselves e.g. BlogRoute, PostsRoute, AuthorsRoute
* The models, controllers, views that all play a part in putting new data on the screen

### What events does Ember listen to?

The Ember docs have a list of [events Ember listens for by
default](http://emberjs.com/api/classes/Ember.View.html#toc_event-names). These
are 28 the entry points into our code. **Anytime Ember does anything it is in
response to an event.**

### How ember listens for events

[This]() is a good resource for refreshing your understanding of how DOM events
work. To get the most of the following discussion you should be familiar with
how the browser propagates events and how the "capturing" and "bubbling" phases
work.

Ember registers listeners for those 28 events similarly to how we might do it
ourselves with jQuery.  More specifically:

* Ember attaches *all* its listeneners to a single element in the DOM.
* This element is `<body>` unless your application specifies a `rootElement`
* Ember attaches its listeners to the "bubbling" phase.

## Problems

What are the problems that the Runloop solves?

### Problem #1 - Clashing events

It is possible and likely that any event listeners you add manually will run
_before_ Ember runs. Examples:

* You add a listener to a node deeper in the DOM tree than `<body>`
* You add a listener to the capturing phase.

This is a bad thing because Ember assumes that it has complete control over
whatever portion of DOM you have given it. It will happily create and remove
nodes within there and won't care if you had event listeners attached.

At best you won't get the intended result of the listener and at worst you get
the joy of _zombie event listeners_ creating chaos in your nice clean DOM. (I
see a few looks of painful recognition from the Backbone devs here)

You might be thinking that you are unlikely to want to add your own listeners
but this is exactly what will happen if you try to integrate any third party Javascript
code with your Ember app e.g. a jQuery plugin.

So we have a problem: How can we add event our own listeners to the DOM without
clashing with Ember?

### Problem #2 - Uncoordinated work

The pattern of how Javascript, therefore Ember, works is periods of intense
activity in response to some event and then going back to being idle until the
next event happens. Lets dig a little deeper into these periods of intense
activity.

We already know that the first code to get run in reponse to an event is the
listener function that Ember registered with the browser. What happens after
that? Lets consider an imaginary example of how a simpler, _no Runloop_ Ember
might respond:

    [explain here the kinds of work that ember does and make it clear that there are
    natural phases to it]
    [walk through a simple example showing how it would look if ember just did
    owrk as it needed to]

We can see from this example that the work can be grouped into just a few
categories:

1. Bindings need to be synced
2. ???
3. Update the DOM (rendering)
4. Manipulate the new DOM (after rendering)
5.

Our _do work as you need it_ approach means that these types of work are
interleaved. This has some significant downsides:

1. It is inefficent. Every time we changed the DOM in the example above the browser
did a layout and paint - these are expensive operations that we did more often
than we needed to.
2. Difficult to know when all DOM changes have happened. The rendering happened
a little bit at a time it is difficult to know when we can safely work with the
new state of the DOM .e.g. if we wanted to animate an element into view.
3. Because we were just deleting objects as they went out of scope we
don't really have a good handle on when the browser will decide that it should
run garbage collection.

So we would give our imaginary _no Runloop_ Ember an **A** for effort but a **D**
for efficency here.

## Enter the Runloop

We have identified two categories of problem

1. Clashing events
2. Uncoordinated work

How does Ember solve them? Instead of just doing work as it finds it, Ember
schedules the work on an internal set of queues. By default Ember has six queues:

```js
console.log(Ember.run.queues);
// ["sync", "actions", "routerTransitions", "render", "afterRender", "destroy"]
```

You can see a summary of the intent of each queue in the [Runloop
Guide](http://emberjs.com/guides/understanding-ember/run-loop/#toc_an-example-of-the-internals)
but today we are going to focus on the queues themselves.

Each queue corresponds to a "phase of work" identified by the Ember core team.
This set of queues and the code that manages them **is** the Ember Runloop. Lets
look closer at how it works:

A _job_ on a queue is just a plain ol' Javascript callback function. _Running a
job_ is simply executing that function.

1. A browser event happens and Embers event listener function is triggered.
1. Early on in its response to the event, Ember opens a set of queues and starts
   accepting jobs.
1. As Ember works its way through your application code, it continues to
schedule jobs on the queues.
1. Near the end of its response to the event Ember closes the queue-set and starts
running jobs on the queues. Scheduled jobs can themselves still add jobs to the queues even
   though we have closed them to other code. The [Runloop
   Guide](http://emberjs.com/guides/understanding-ember/run-loop/#toc_an-example-of-the-internals)
   has an excellent visualisaiton of the algorithm works but in brief:
    1. Scan the queues array, starting at the first until you find a job. Finish if all queues are empty.
    1. Run the job (aka execute the callback function)
    1. Go to step 1

Lets consider some subtle consequences of this simple algorihtm:

* Ember does a full queue scan after each *job* - it does not attempt to finish
  a full queue before checking for earlier work.
* Ember will only get to jobs on a queue if all the previous queues are empty.
* Ember cannot *garuantee* that, for example, *all* _sync_ queue tasks will be
  complete before any _actions_ tasks are attempted because jobs on any queue
  after _sync_ might add jobs to the _sync_ queue. Ember will however do its
  best to do work in the desired order. It is (presumably?) not practical for
  your app to schedule *all* work before any is performed so this flexibility is
  necessary.
* At first glance it may seem that the Runloop has two distinct phases

    1. Schedule work
    2. Perform the work

    but this is subtly incorrect. Functions that have been scheduled on a Runloop queue
    can themselves schedule function on **any** queue in the same runloop. It is
    true that once the runloop starts executing the queues that code **outside** the
    queues cannot schedule new jobs. In a sense the initial set of jobs that are
    scheduled are a "starter set" of work and Ember commits to doing it and also
    doing any jobs that result from those jobs - Ember is a pretty great
    employee to have working for you!

There are also some things which are not obvious:

There is no "singleton" Runloop. This is confusing because documentation uses
the phrase "the Runloop" to refer to the whole system but it is important to
note that there is not a single instance of the runloop in memory (unlike the
[Ember container](http://emberjs.com/guides/understanding-ember/dependency-injection-and-service-lookup/#toc_dependency-management-in-ember-js)
which is a singleton). There is no "the" Runloop, instead there can
be multiple instances of "a runloop". It is true that Ember will usually only
create one runloop per DOM event but this is not always the case. For example:

* When you use `Ember.run` (see below) you will be creating your own
  Runloop that may go through its full lifecycle while the runloop thatEmber
  uses is still accepting jobs.
* Usually Ember application will boot within a single runloop but if you
  enable the [Ember Inspector](https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi?hl=en) then many more runloops happen at boot time.

Another consequence of the runloop not being a singleton it that it does not
function as a "global gateway" to DOM access for the Ember app. It is not
correct to say that the Runloop is the "gatekeeper" to all DOM access in Ember,
rather that "coordinated DOM access" is a pleasant (and deliberate!) side-effect
of organising all the work done in response to an event.. As mentioned above,
multiple Runloops can exist simultaneously so there is not guarantee that *all*
DOM access will happen at one time.

## How often do Runloops happen?

From what I have observed, Ember typically runs one Runloop in response to each
DOM event that it handles.

#### Visualising the Runloop for yourself

This repo also contains the [noisy runloop kit]() which is trivial demo app and
a copy of Ember that I have patched to be very noisy about what its runloop
does. You can add features to the demo app and see how the actions the runloop takes in
response in the console. You can also use the included version of Ember in your own
project to visualise what is happening there. Obviously you should only include
this in development because it will slow the Runloop down.

#### Enough with the mousemove already!

When you start getting the Runloop to log its work you will quickly get
overwhelmed by its running in response to mouse events that happen very
frequently on desktop browsers e.g. `mousemove`. Below is an initializer for
Ember that will stop it listening to certain events. You probably want to add
this to whatever Ember app you are trying to visualise the Runloop for unless
you are actually _using_ `mousemove`, `mouseenter`, `mouseleave` in your app.

```js
/**
 * Tell Ember to stop listening for certain events. These events are very
 * frequent so they make it harder to visualise what the runloop is doing. Feel
 * free to adjust this list by adding/removing events. The full list of events
 * that Ember listens for by default is at
 * http://emberjs.com/api/classes/Ember.View.html#toc_event-names
 *
 */

Ember.Application.initializer({
  name: 'Stop listening for overly noisy mouse events',

  initialize: function(container, application) {
    var events = container.lookup('event_dispatcher:main').events;
    delete events.mousemove;
    delete events.mouseenter;
    delete events.mouseleave;
  }
});
```

### Does Ember wrap my async code in a runloop if I forget? If so how?

```
STATUS: INCOMPLETE

the guide says that ember will wrap any ordinary async calls in a runloop - how?
    I don't think this really happens!

    The runloop guide says that ember will try to wrap async callbacks in a runloop
    (http://emberjs.com/guides/understanding-ember/run-loop/#toc_what-happens-if-i-forget-to-start-a-run-loop-in-an-async-handler)
    but I can't find where this happens within Ember code - can anyone give me any
    pointers?

    guide says:
    * if ember detects an event handler running (how???) it opens a runloop and
    closes it (which actually executes your code) on the next JS event loop turn
    * this is bad because your code does not run in the turn you thought it would
    and there can be a gap between turns if the browser decides to do GC etc.
```

Aside: You really want your runlooop to start and end in a single JS frame
otherwise the browser might do otherwork if it spans frames e.g. GC


### How is Runloop behaviour different when testing?

```
STATUS: INCOMPLETE

> "Some of Ember's test helpers are promises that wait for the run loop to empty before resolving."

Q: what ember funcs do defer() and deferOnce() map on to???

Ember.backburner.defer() an Ember.backburner.deferOnce will create an
"autorun" runloop if no runloop is currently open. they call `checkAutoRun()` to
prevent that this behaviour when `Ember.testing` is set.


TODO: investigate this:
8. `Ember.Test` has its own internal `run()` that will use the normal runloop
   `run()` if a runloop is open or otherwise just run the provide calback
   synchronously
    is this what the docs mean about disabling autoruns in testing ???


# auto run methods: createAutorun() and checkAutoRun()

* Ember.backburner.createAutorun()
    * calls begin() immediately and schedules an end() (using setTimeout) on the very next turn of the event loop
    * i.e. opens a runloop that will stay open for this turn of the event loop
    * is only called by `backburner.defer()` and `backburner.deferOnce()`! iff there is not an already open runloop
        Two places total!

* Ember.backburnder.checkAutoRun()
    * If there isn't a currently open runloop, it will throw an error if `Ember.testing` is set.

checkAutoRun is called by 3 functions
Ember.run.
    schedule()
    scheduleOnce()
    once()
```

### Summary

You don't need to understand the Runloop to get started making applicaitons with
Ember you will eventually have to understand it. In exchange for this we get the
following benefits:

1. We can have a complex response to events in an efficient and coordinated way.
The standard Javascript tooling for handling events works well but the
complexity of coordinating a complex event response quickly gets out of hand in
large apps.
2. We can insert our own work into know points in this coordinated repsonse.

# How do I use the runloop?

| Function Name | Runloop (current/future/always-new) | Queue (`actions`/chosen by param) | Create new runloop? (always/if required/never) | Notices `Ember.testing`?  (yes/no) |
| ----------------------------- | -------------------------- | -------- | ----------- | ----------- |
| `Ember.run`		            | always-new | `actions` | Always | No |
| `Ember.run.debounce`		    | always-new | `actions` | Always | No |
| `Ember.run.throttle`		    | always-new | `actions` | Always | No |
| `Ember.run.join`		        | current | `actions` | If required | No |
| `Ember.run.bind`		        | current | `actions` | If required | No |
| `Ember.run.schedule`		    | current | chosen by param | If required | Yes |
| `Ember.run.scheduleOnce`		| current | chosen by param| If required | Yes |
| `Ember.run.later`		        | future | `actions` | If required | Yes |
| `Ember.run.next`		        | future | `actions` | If required | Yes |
| `Ember.run.once`		        | current | `actions` | If required | Yes |
| `Ember.run.begin`		        | NA | NA | Never | No |
| `Ember.run.end`		        | NA | NA | Never | No |
| `Ember.run.cancel`		    | NA | NA | NA | NA |
| `Ember.run.sync`		        | NA | NA | NA | NA |


Legend:

* future = some runloop in the future
* The default queue in Ember is `actions`
* NA = not applicable

```
TODO: add some category columns to above to e.g.
    runs in current turn of JS event loop
    puts its callback arg onto timers array
    Will share with runloop started implicitly by response to event

API overview:

3 timer management functions
5 functions that let you run a callback in the future
2 low-level manual runloop control functions
1 convenience function for forcing bindings to settle

executing a callback you give to one of the 5 "timer runner" functions will
create a new runloop if there isn't

Q: will a timer function share an already open ember runloop or always create its own
    * When is my call to Ember.run.* is discovered by Ember????
    * do the timer functions always use Ember.run ????

    anything that uses Ember.run will always create its own loop
```


### Ember and future work

There are 3 functions in the Runloop API let us schedule "future work":

1. `Ember.run.later`
1. `Ember.run.next`
1. `Ember.run.once`

Each of these API functions is a way of expressing _when_ you would like work
(a callback function) to happen. The garuantee provided by the Runloop is that
it will also manage the other work that results from running that function. It
does not garuantee anything else!

The key points:

* Ember keeps an internal queue of "future work" in the form of an array of
  timestamp and function pairs e.g.
    ```
    [1410373997044, function fn() {..}, 1410373997048, function fn() {..}, 1410373997052, function fn() {..}]
    // or in pseudo code:
    [(timestamp, fn), (timestamp, fn) ... ]
    ```
* It uses this queue to manage _work you have asked it to do but not on the current runloop_
* Each of the API functions above is a different way of adding a (timestamp,
  callback) pair to this array.
* Ember does now know **exactly** when it will get a chance to execute this future
  work (Javascript might be busy doing something else)
* Each time it checks for future it executes all the functions whose timestamps are in the past
* So the X API functions are creative in their creation of timestamps to achieve what they want.
* When Ember does find some pairs on the _future work queue_ that should be
  executed it creates a new runloop for those functions (using `Ember.run`) and
  schedules each function onto the `actions` queue.

Consequences:

* When you give a function to one of the _Future work_ API functions you cannot
  know which Runloop it will run in.
    * It may share a runloop iwth other _future work_ functions
    * It will only every share with other functions from the _future work queue_
      - it will not share a runloop with other Ember code or anything you
      explicitly pass to `Ember.run` yourself
* You can only put _future work_ on the `actions` queue so if you need to run
  something on a future `afterRender` queue you need to schedule it from within
  the function you gave the _future work_ API (TODO: terrbile sentence)
* _future work_ APIs let you specify _some_ future runloop but not exactly which
  one.

```
"run any other functions whose timers expire at a similar time in that same runloop"

TODO: I *think* that the timers loop just runs functions whose timestamps have
expired - this is how ember implements that "timers which expire at similar
times" stuff.

QUESTION: how does ember check for work on the timers array?
    ANSWER: ???
    _laterTimer is a variable that holds a timerout value that is used to schedule
    the running of executeTimers() executeTimers() is what actually runs the callbacks)

    _laterTimerExpiresAt
    ???

searchTimers()
* this func is repsonsible for deciding what timers have expired and should be
  added to the new runloop


debounce, throttle use window.setTimeout and call Ember.run
so they do not use the "timer queues" mechanism at all
=> they are a separate strand of "future work"

throttle and debounce are a a thing on their own
    when they do decide to run the callback they wrap it in `Ember.run`
    => the method will get **a runloop just for itself**

ember maintains an internal lists of "throttlers" and "debouncees"

need to separate these somehow
=> perhaps ember has _queued future work_ and _future work_


diff between throttle and debounce?

throttle (target, method, args*, spacing, immediate = true)
    * target method is run on leading edge of spacing period if immediate == true
    * no matter how many calls to throttle(same args) come in, Ember will run at
      most one per 'spacing' ms

debounce (target, method, args*, wait, immediate = false)
    * delay calling the method until we get a 'wait' amount of time with no
      calls to debounce
    * use it when you have an event that will be called multiple times but you
      only want to run a callback once when the event is *finished* e.g. run a
      callback when a user finishes scrolling
    * immediate allows you to call the method immediately and then start waiting
      this lets you
    * for a 'wait' lenght period without any calls to the method - this lets
    * 'wait' is the amount of time Ember should remember this call for - after
    * that time has expired Ember will forget about it

    "I want to call this method once now and ignore all future calls to it until
    there has been a peiod of 'wait' ms with no call to it. Once that has
    happened you can stop ignoring it and call it again"

    * Use debounce when an event may fire many times over a brief period of time
    * e.g. scroll and you only want to run one callback in response - use
    * 'immediate' to control whether the callback is run at the start of the
    * "event storm" or at the end
```

# Appendices

## Sources

The primary documentation for the Ember runloop is [Official Ember Run-loop
guide](http://emberjs.com/guides/understanding-ember/run-loop/) and the [Ember
API docs](http://emberjs.com/api/)

These are other sources I studied in compiling this research:

* [Ember source code](https://github.com/emberjs/ember.js)
* Books
    * [Developing an Ember Edge](http://bleedingedgepress.com/our-books/developing-an-ember-edge/)
    * [Ember.js in Action](http://www.manning.com/skeie/)

