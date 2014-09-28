# Ember Javascript runloop Handbook

by [Eoin Kelly](https://twitter.com/eoinkelly)

![Creative Commons License](https://i.creativecommons.org/l/by-sa/4.0/88x31.png)

### Current status

```
Very much a work in progress.
```

### Contributing

You should. :-). If you spot any of the (inevitable) errors, omissions, things
which are unclear you would be doing me a great favour by opening an issue.

# Introduction

We are about to take a deep dive into the Ember.js runloop. Why? Because
eventually you need to. Together we will answer these questions:

2. Why does Ember have this runloop thing?
1. What is the runloop?
3. How can we use it skillfully?

This is not reference documentation - the [Ember API
docs](http://emberjs.com/api/) have that nicely covered. This isn't even the
_"I'm an experienced dev, just give me the concepts in a succinct way"_
documentation - the [Official Ember Run-loop
guide](http://emberjs.com/guides/understanding-ember/run-loop/) has that
covered. This is a longer, more detailed look at the runloop.

You can get started with Ember application development without understanding the
runloop. However at some point you will want to dig in and understand it
properly so you can use it skillfully. It is my sincere hope that this handbook
can be your guide.

## Naming is hard

As you learn more about the Ember runloop you will come to understand that,
well, it just isn't very _loopish_. The name is a bit unfortunate as it
implies that there is a single instance of the runloop sitting somewhere in
memory looping endlessly _running things_. As we will see soon this is not
true.

In alternate universes the _runloop_ might have been named:

* _Ember Work Queues_
* _Ember Coordinated Work Algorithm_
* _Ember Job Scheduler_
* _Runelope (a large friendly creature that lives in your Javascript VM and
  manages the work Ember does in response to events)_

OK some of those names are really terrible (except _Runelope_ of course, that
one is pure gold and should be immediately pushed to Ember master). Naming is a
hard problem and hindsight is 20/20. The _runloop_ is what we have so that is
what we will call it but try not to infer too much about its action from its
name.

# Why do we have a runloop?

## Background

On our journey to understand the runloop we must first understand the
environment it lives in and the problems it is trying to solve.  Lets set the
scene by refreshing a few fundementals about how Javascript runs. (If you are an
experienced Javascript developer you may want to just skip this part)

Our story begins with when the browser sends a request to the server and the
server sends HTML back as a response.

The browser then parses this HTML response. Every time it finds a script it executes it
immediately(*) Lets call this the _setup phase_.  This _setup phase_ happens
well before the user sees any content or gets a chance to interact with the DOM.
Once a script is finished executing the Browser never runs it again.

(*) Things like `defer` tweak this somewhat but this is a useful simplification.

The browser does most of its communication with Javascript by sending "events".
Usually these are created in response to some action from one of:

1. The user e.g. moves their mouse (`mousemove`)
2. The network e.g. an asset have been loaded on the page (`load`)
3. Internal timers e.g. a particular timer has completed

However there are a few events that the browser generates itself to tell
Javascript about some important event in the lifecycle of the page. The must
widely used of these is `DOMContentLoaded` which tells Javascript that the HTML
has been fully parsed and the DOM (the memory structure the browser builds by
parsing the HTML) is complete. This is significant for Javascript because it
does most of its setup work in response to this event.

Javascript is lazy but well perpared!  During the _setup phase_, Javascript prepared its work
space (or _mise en place_ if you prefer) - it created the objects it would now need
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
computers it asks the browser to do it:

    > Javascript: Hey browser, I want to get whatever data is at
    > `http://foo.com/things.json` please.

    > Browser: Sure thing but it might take a while. What do you want me to do
    > when it comes back?

    > Javascript: I have two functions ready to go (one for a successful data fetch and
    > one for a failure) so just wake me up and run the appropriate one when you
    > finish.

    > Browser: cool.

We usually refer to this this _talking to other systems_ stuff as Web APIs e.g.

* XHR (AJAX) requests
* Web workers
* etc.

Javascript can use these services of the browser both during the setup phase
and afterwards. For example part of the Javascript response to a "click" event on a
certain element might be to retrieve some data from the network and also
schedule a timer to do some future work.

We now know enough to see the pattern of how javascript and the browser
interact and to understand the two phases:

1. In the short _setup phase_ the browser runs each script it finds on the page
from start to finish. Javascript uses this as time to do some preparation for next phase.
2. Javascript spends most of of its life _responding to events_. Many events
come from the user but Javascript can also schedule events for itself by using
the many services (web APIs) that the browser provides.

A solid understanding of this stuff is required to understand the runloop so if
you are unclear about any of this and want to dig a little deeper I recommend a
[wonderful video by Philip Roberts at Scotland JS](http://vimeo.com/96425312)
that goes into the Javascript event loop in more detail. It is a short watch and includes
a few "aha!" inducing diagrams.

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
have a meaningful response without your _application_ code.

For example if the user is on `/#/blog/posts` and clicks a link to go to
`/#/authors/shelly` the Ember _framework_ will recieve the click event but it
won't be able to do anything meaningful with it without

1. A Router map to tell it how to understand the URL
2. The Route objects themselves e.g. `BlogRoute`, `PostsRoute`, `AuthorsRoute`
3. The models, controllers, views that all play a part in putting new data on the screen

### What events does Ember listen to?

The Ember docs have a list of [events Ember listens for by
default](http://emberjs.com/api/classes/Ember.View.html#toc_event-names). These
are 28 the entry points into our code. **Anytime Ember does anything it is in
response to one of these events.**

### How ember listens for events

[This](http://www.quirksmode.org/js/events_order.html) is a good resource for
refreshing your understanding of how DOM events work. To get the most of the
following discussion you should be familiar with how the browser propagates
events and what the phrases "capturing phase" and "bubbling phase" mean.

Ember registers listeners for those 28 events similarly to how we might do it
ourselves with jQuery.  More specifically:

* Ember attaches *all* its listeneners to a single element in the DOM.
* This element is `<body>` unless your application specifies a `rootElement`
* Ember attaches its listeners to the "bubbling" phase.

## ?

The pattern of how Javascript (Ember) works is periods of intense activity in
response to some event followed by idleness until the next event happens. Lets
dig a little deeper into these periods of intense activity.

We already know that the first code to get run in reponse to an event is the
listener function that Ember registered with the browser. What happens after
that? Lets consider an imaginary example of how a simpler, _no runloop_ Ember
might respond:

http://jsbin.com/diyuj/1/edit?html,js,output

<a class="jsbin-embed" href="http://jsbin.com/diyuj/1/embed?html,js,output">JS Bin</a><script src="http://static.jsbin.com/js/embed.js"></script>

    TODO:
    [explain here the kinds of work that ember does and make it clear that there are
    natural phases to it]
    [walk through a simple example showing how it would look if ember just did
    owrk as it needed to]
    // ["sync", "actions", "routerTransitions", "render", "afterRender", "destroy"]

We can see from this example that the work can be grouped into just a few
categories:

1. Bindings need to be synced
1. Update the DOM (rendering)
1. Manipulate the new DOM (after rendering)

Our _do work as you need it_ approach means that these types of work are
interleaved. This has some significant downsides:

1. It is inefficent. Every time we changed the DOM in the example above the browser
did a layout and paint - these are expensive operations that we did more often
than we needed to.
2. It is difficult to choose a point in time all DOM changes have happened. The
rendering happened a little bit at a time it is difficult to know when we can
safely work with the new state of the DOM .e.g. if we wanted to animate an
element into view once all our changes were complete.
3. Because we were just deleting objects as they went out of scope we
don't really have a good handle on when the browser will decide that it should
run garbage collection.

We would give our imaginary _no runloop_ Ember an **A** for enthusiasm but a **D**
for efficency.

## Enter the runloop

We have identified some problems caused by an uncoordinated approach to doing work.
How does Ember solve them?

Instead of doing work as it finds it, Ember schedules the work on an internal
set of queues. By default Ember has six queues:

```js
console.log(Ember.run.queues);
// ["sync", "actions", "routerTransitions", "render", "afterRender", "destroy"]
```


Each queue corresponds to a "phase of work" identified by the Ember core team.
This set of queues and the code that manages them **is** the Ember runloop.

You can see a summary of the purpose of each queue in the [runloop
Guide](http://emberjs.com/guides/understanding-ember/run-loop/#toc_an-example-of-the-internals)
but today we are going to focus on the queues themselves.

### How it works

First lets get some terminology sorted:

* A _job_ on a queue is just a plain ol' Javascript callback function.
* _Running a job_ is simply executing that function.

1. A browser event happens and Embers event listener function is triggered.
2. Early on in its response to the event, Ember opens a set of queues and starts
   accepting jobs.
3. As Ember works its way through your application code, it continues to
schedule jobs on the queues.
4. Near the end of its response to the event Ember closes the queue-set and starts
running jobs on the queues. Scheduled jobs can themselves still add jobs to the queues even
   though we have closed them to other code. The [runloop
   Guide](http://emberjs.com/guides/understanding-ember/run-loop/#toc_an-example-of-the-internals)
   has an excellent visualisaiton of the algorithm works but in brief:
    1. Scan the queues array, starting at the first until you find a job. Finish if all queues are empty.
    2. Run the job (aka execute the callback function)
    3. Go to step 1

Lets consider some subtle consequences of this simple algorihtm:

* Ember does a full queue scan after each *job* - it does not attempt to finish
  a full queue before checking for earlier work.
* Ember will only get to jobs on a queue if all the previous queues are empty.
* Ember cannot *guarantee* that, for example, *all* _sync_ queue tasks will be
  complete before any _actions_ tasks are attempted because jobs on any queue
  after _sync_ might add jobs to the _sync_ queue. Ember will however do its
  best to do work in the desired order. It is (presumably?) not practical for
  your app to schedule *all* work before any is performed so this flexibility is
  necessary.
* At first glance it may seem that the runloop has two distinct phases

    1. Schedule work
    2. Perform the work

    but this is subtly incorrect. Functions that have been scheduled on a runloop queue
    can themselves schedule function on **any** queue in the same runloop. It is
    true that once the runloop starts executing the queues that code **outside** the
    queues cannot schedule new jobs. In a sense the initial set of jobs that are
    scheduled are a "starter set" of work and Ember commits to doing it and also
    doing any jobs that result from those jobs - Ember is a pretty great
    employee to have working for you!

There are also some things which are not obvious:

There is no "singleton" runloop. This is confusing because documentation uses
the phrase "the runloop" to refer to the whole system but it is important to
note that there is not a single instance of the runloop in memory (unlike the
[Ember container](http://emberjs.com/guides/understanding-ember/dependency-injection-and-service-lookup/#toc_dependency-management-in-ember-js)
which is a singleton). There is no "the" runloop, instead there can
be multiple instances of "a runloop". It is true that Ember will usually only
create one runloop per DOM event but this is not always the case. For example:

* When you use `Ember.run` (see below) you will be creating your own
  runloop that may go through its full lifecycle while the runloop thatEmber
  uses is still accepting jobs.
* Usually Ember application will boot within a single runloop but if you
  enable the [Ember Inspector](https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi?hl=en) then many more runloops happen at boot time.

Another consequence of the runloop not being a singleton it that it does not
function as a "global gateway" to DOM access for the Ember app. It is not
correct to say that the runloop is the "gatekeeper" to all DOM access in Ember,
rather that "coordinated DOM access" is a pleasant (and deliberate!) side-effect
of organising all the work done in response to an event.. As mentioned above,
multiple runloops can exist simultaneously so there is not guarantee that *all*
DOM access will happen at one time.

## How often do runloops happen?

From what I have observed, Ember typically runs one runloop in response to each
DOM event that it handles.

#### Visualising the runloop for yourself

This repo also contains the [noisy runloop kit]() which is trivial demo app and
a copy of Ember that I have patched to be very noisy about what its runloop
does. You can add features to the demo app and see how the actions the runloop takes in
response in the console. You can also use the included version of Ember in your own
project to visualise what is happening there. Obviously you should only include
this in development because it will slow the runloop down.

#### Enough with the mousemove already!

When you start getting the runloop to log its work you will quickly get
overwhelmed by its running in response to mouse events that happen very
frequently on desktop browsers e.g. `mousemove`. Below is an initializer for
Ember that will stop it listening to certain events. You probably want to add
this to whatever Ember app you are trying to visualise the runloop for unless
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

#### What are _autoruns_?

In Ember calls to any of

* `run.schedule`
* `run.scheduleOnce`
* `run.once`

have the property that they will approximate a runloop for you if one does not
already exist. These automatically (implicitly) created runloops are called
_autoruns_.

Lets consider an example of a click handler:

```js
$('a').click(function(){
  console.log('Doing things...');

  Ember.run.schedule('actions', this, function() {
    // Do more things
  });
  Ember.run.scheduleOnce('afterRender', this, function() {
    // Yet more things
  });
});
```

The above will run in response to a `click` event from the Browser and will most
likely run before Ember finds out about the `click`. When you call `schedule`
and `scheduleOnce` Ember notices that there is not a currently open runloop so
it opens one and schedules it to close on the next turn of the JS event loop.

Here is some pseudocode to describe what happens:

```js
// This is **not** working code - it simply approximates what Ember does when
// creating an autorun
$('a').click(function(){
  console.log('Doing things...'); // <-- Not within the autorun

  Ember.run.begin();

  Ember.run.schedule('actions', this, function() {
    // Do more things
  });

  Ember.run.scheduleOnce('afterRender', this, function() {
    // Yet more things
  });

  setTimeout(function() {
    Ember.run.end()
  }, 0);
});
```

Although autoruns are convenient you should not rely on them because:

1. The current JS frame is allowed to end before the run loop is flushed, which
sometimes means the browser will take the opportunity to do other things, like
garbage collection.
2. Only calls to `run.schedule`, `run.scheduleOnce` and `run.once` are wrapped
in autoruns.  All other code in your callback will happen outside Ember. This
can lead to unexpected and confusing behavior.

#### How is runloop behaviour different when testing?

We know that

* `run.schedule`
* `run.scheduleOnce`
* `run.once`

create a new runloop if one does not exist and that these automatically
(implicitly) created runloops are called _autoruns_.

If `Ember.testing` is set then this _"automatic runloop approximation creation"_
behaviour is disabled. In fact when `Ember.testing` is set these three functions
will throw an error if you run them at a time when there is not an existing
runloop available.

The reasons for this are:

1. Autoruns are Embers way of not punishing you in production if you forget to
open a runloop before you schedule callbacks on it. While this is useful in
production, these are still errors and are revealed as such in testing mode to
help you find and fix them.
2. Some of Ember's test helpers are promises that wait for the run loop to empty
before resolving. If your application has code that runs _outside_ a runloop,
these will resolve too early and gives erroneous test failures which can be
**very** difficult to find. Disabling autoruns help you identify these scenarios
and helps both your testing and your application!


### Summary

You don't need to understand the runloop to get started making applicaitons with
Ember you will eventually have to understand it. In exchange for this we get the
following benefits:

1. We can have a complex response to events in an efficient and coordinated way.
The standard Javascript tooling for handling events works well but the
complexity of coordinating a complex event response quickly gets out of hand in
large apps.
2. We can insert our own work into know points in this coordinated repsonse.

# How do I use the runloop?

The [Ember runloop API docs](http://emberjs.com/api/classes/Ember.run.html) are
the canonical resource on what each function does. This section will provide a
high-level overview of how the API works to make it easier to categorise it in
your head and put it to use.

In the API we have:

* 1 way of running a given callback in a new runloop
    * `Ember.run`
* 1 way of adding a callback to an the currently open runloop
    * `Ember.run.schedule`
* 2 ways to add a callback to current runloop and ensure that it is only added once.
    * `Ember.run.scheduleOnce`
    * `Ember.run.once`
* 2 ways to add a callback to some future runloop
    * `Ember.run.later`
    * `Ember.run.next`
* 2 ways to of doing rate control on a callback. These control how often callback is called (it will get its own runloop each time)
    * `Ember.run.debounce`
    * `Ember.run.throttle`
* 1 way of cancelling work scheduled for a future runloop or rate control
    * `Ember.run.cancel`
* 2 functions provide a low-level alternative to `Ember.run`
    * `Ember.run.begin`
    * `Ember.run.end`
* 1 convenience function for forcing bindings to settle
    * `Ember.run.sync`

| Function Name | runloop (current/future/always-new) | Queue (`actions`/chosen by param) | Create new runloop? (always/if required/never) | Notices `Ember.testing`?  (yes/no) | Runs callback in current JS event loop turn
| ----------------------------- | -------------------------- | -------- | ----------- | ----------- |----------- |
| `Ember.run`		            | always-new | `actions` | Always | No | Yes |
| `Ember.run.debounce`		    | always-new | `actions` | Always | No | No |
| `Ember.run.throttle`		    | always-new | `actions` | Always | No | No |
| `Ember.run.join`		        | current | `actions` | If required | No | Yes |
| `Ember.run.bind`		        | current | `actions` | If required | No | No |
| `Ember.run.schedule`		    | current | chosen by param | If required | Yes | Yes |
| `Ember.run.scheduleOnce`		| current | chosen by param| If required | Yes | Yes |
| `Ember.run.once`		        | current | `actions` | If required | Yes | No |
| `Ember.run.later`		        | future | `actions` | If required | Yes | No |
| `Ember.run.next`		        | future | `actions` | If required | Yes | No |
| `Ember.run.begin`		        | NA | NA | Never | No | NA |
| `Ember.run.end`		        | NA | NA | Never | No | NA |
| `Ember.run.cancel`		    | NA | NA | NA | NA | NA |
| `Ember.run.sync`		        | NA | NA | NA | NA | NA |


Legend:

* future = some runloop in the future
* The default queue in Ember is `actions`
* NA = not applicable


### A note about future work

There are 2 functions in the runloop API let us schedule "future work":

1. `Ember.run.later`
1. `Ember.run.next`

Each of these API functions is a way of expressing _when_ you would like work
(a callback function) to happen. The guarantee provided by the runloop is that
it will also manage the other work that results from running that function. It
does not guarantee anything else!

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
* Each time it checks the timers queue it executes all the functions whose timestamps
  are in the past so the future work API functions are creative in their
  creation of timestamps to achieve what they want.
* When Ember does find some pairs on the _future work queue_ that should be
  executed it creates a new runloop for those functions (using `Ember.run`) and
  schedules each function onto the `actions` queue.

Consequences:

* When you give a function to one of the _Future work_ API functions you cannot
  know which runloop it will run in.
    * It may share a runloop iwth other _future work_ functions
    * It will only every share with other functions from the _future work queue_
      - it will not share a runloop with other Ember code or anything you
      explicitly pass to `Ember.run` yourself
* You can only directly schedule _future work_ onto the `actions` queue. If you need to run
  something on a different queue of that future runloop you will need to
  schedule it _from_ that `actions` queue callback.
* _future work_ APIs let you specify _some_ future runloop but not exactly which
  one.

### A note about rate control

Ember provides two flavors of rate control.

* `Ember.run.debounce`
    * Ignore a callback if the previous call to it was within a given time period
* `Ember.run.throttle`
    * Used to guarantee a minimum time between calls to a particular callback

These functions are useful becuase they allow us to control when the given
callbck is _not_ run. When it is actually run, these functions use `Ember.run`
so these functions can be thought of  as "`Ember.run` with some extra controls
about when the function should be run"

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

