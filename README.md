# Ember Javascript Runloop Handbook

by [Eoin Kelly](https://twitter.com/eoinkelly)

![Creative Commons License](https://i.creativecommons.org/l/by-sa/4.0/88x31.png)

## Current status: Such incomplete, much TODO.

`TODO: remove this when complete`

Very much a work in progress. Currently still compiling my notes and researching
topics.

## Contributing

You should. :-). If you spot any of the (inevitable) errors, omissions, things
which are unclear you would be doing me a great favour by opening an issue.

# Section: Introduction

We are about to take a deep dive into the Ember.js runloop. Why? Because
eventually you need to. Together we will answer these questions:

2. Why does Ember have this runloop thing?
1. What is the Runloop?
3. How can we use it skillfully?

This is not reference documentation - the [Ember API
docs](http://emberjs.com/api/) have that nicely covered. This isn't even the
_I'm a pretty experienced dev, just give me the concepts in a succinct way_
documentation - the [Official Ember Run-loop
guide](http://emberjs.com/guides/understanding-ember/run-loop/) has that
covered. This is a longer, more detailed look at the Runloop.

The good news is that you get started with Ember Application development without
really understanding what the Runloop is or how it works. However at some point
you will want to dig in and understand it. It is my sincere hope that this
handbook can be your guide.

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

OK some of those names are terrible (except _Runelope_ of course, that one is pure gold
and should be immediately pushed to Ember master)

Naming is a hard problem and hindsight is 20/20. The _Runloop_ is what we have
so that is what we will call it but try not to infer too much about its action
from the name.

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

Lets set the scene by reviewing a few fundementals about how Javascript runs.

While parsing your HTML the browser executes each `<script>` element that it
finds *as it finds them*. This is a slightly simplified description of how this works but good enough for
us today. [Check out the full story.]()

We will call this the _setup phase_. This _setup phase_ happens well before the
user sees any content or gets a chance to interact with the DOM. Once a script
is finished executing the Browser never re-runs it.

The browser has a built-in set of _events_ that it it will generate in response
to actions by the user, the network or its own work. Some examples of events:

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

We can see a pattern of how javascript does work emerging:

1. In the short _setup phase_ the browser runs each script it finds on the page
from start to finish. Javascript uses this as time to do some preparation for next phase.
2. Javascript app spends most of of its life _responding to events_. Many events
come from the user but Javascript can also schedule events for itself by using
the many services (web APIs) that the browser provides.

If you are unclear about any of this and want to dig a little deeper I recommend

* A [wonderful video by ??? at Scotland JS]() that goes into the
Javascript event loop in more detail. It is a short watch but has a few diagrams
that are absolute gold IMHO.
* TODO some free JS books that cover this material well

## Enter the Ember!

### Things we already know

We have refreshed how Javascript works and we know that your Ember app is Javascript
(wow!) so we already know quite a bit about how Ember works:

* Apart from when the code is first found, all Ember framework and application
  code is run in response to "events" from the browser.
* The `DOMContentLoaded` event is significant in the life of an Ember app. It tells
  it that it now has a full DOM to play with so Ember will do most of its "setup work"
  (registering for event listeners etc.) in its response to this event.
* Your Ember app can schedule its own events by asking the browser to do some work
  on its behalf (e.g. AJAX requests) or simply by asking the browser to be its
  alarm clock (e.g. `setTimeout`)

### Where does the framework end an my app begin

How does your Ember _application_ relate to the Ember _framework_?

The machinery for responding to events is part of Ember _framework_ itself but
it does not have a meaningful response without _application_ code.

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
are 28 the entry points into our code. Anytime Ember does anything it is in response to an event.

### How ember listens for events

[This]() is a good resource for refreshing your understanding of how DOM events
work. To get the most of the following discussion you should be familiar with
how the browser propagates events and how the "capturing" and "bubbling" phases
work.

Ember registers listeners for those 28 events in the same way you would if you
were doing it yourself with jQuery. More specifically:

* Ember attaches *all* its listeneners to a single element in the DOM.
* This element is `<body>` unless your application specifies a `rootElement`
* Ember attaches listeners to the normal "bubbling" phase.

### Problem: Clashing events

It is possible and likely that any event listeners you add manually will run
_before_ Ember runs. Examples:

* You add a listener to a node deeper in the DOM tree
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

So we have a problem: How can we add event listeners to the DOM without
clashing with Ember?

Spoiler alert: The Runloop is part of the solution here but before we understand
how, we need to lay some more groudwork.

### Problem: Uncoordinated work

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

and we can also see that our _do work as you need it_ approach means that these
types of work get interleaved. This turns out to have are some significant downsides:

1. It is inefficent. Every time we changed the DOM in the example above the browser
did a layout and paint - these are expensive operations which can create a laggy UI.
2. It is arkwward to work with if we want to do stuff with the newly changed DOM. Since
the rendering happened a little bit at a time it is difficult to know when we
can safely work with the new state of the DOM .e.g. if we wanted to animate an
element into view.
3. Because we were just deleting objects as they went out of scope we
don't really have a good handle on when the browser will decide that it should
run a _Garbage Collection_ (GC) round.

So we would give our imaginary _no Runloop_ Ember an **A** for effort but a **D**
for efficency here.

## Enter the Runloop

We have identified two categories of problem

1. Clashing events
2. Uncoordinated work

How does Ember solve them?

Instead of just doing work as it finds it, Ember schedules the work on an
internal set of work queues (roughly one for each phase).

By default Ember has six queues:

```js
console.log(Ember.run.queues);
// ["sync", "actions", "routerTransitions", "render", "afterRender", "destroy"]
```

x

```
TODO
    discuss the kind of stuff that goes on each queue
```

Each queue corresponds to a "phase of work" identified by the Ember core team.
This set of queues and the code that manages them is the Ember Runloop. Lets
look closer at how it works:

A _job_ on a queue is just a plain ol' Javascript callback function. _running a
job_ is simply executing that function.

1. A browser event happens and Embers event listener function is triggered.
2. Early on in its response to the event, Ember opens a set of queues and starts
   accepting jobs.
3. As Ember works its way through your application code, it continues to
schedule jobs on the queues.
4. Near the end of its response to the event Ember closes the queue-set and starts
running jobs on the queues. Scheduled jobs can themselves still add jobs to the queues even
   though we have closed them to other code. The [Runloop
   Guide](http://emberjs.com/guides/understanding-ember/run-loop/#toc_an-example-of-the-internals)
   has an excellent visualisaiton of the algorithm works but in brief:
    1. Scan the queues array, starting at the first until you find a job. Finish if all queues are empty.
    2. Run the job (aka execute the callback function)
    3. Go to step 1

Lets consider some subtle consequences of this simple algorightm:

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

And there there are some things which are not obvious:

There is no "singleton" Runloop. This is confusing because documentation uses
the phrase "the Runloop" to refer to the whole system but it is important to
note that there is not a single instance of the runloop in memory (unlike the
[Ember container](http://emberjs.com/guides/understanding-ember/dependency-injection-and-service-lookup/#toc_dependency-management-in-ember-js)
which is a singleton). There is no "the" Runloop, instead there can
be multiple instances of "a runloop". It is true that Ember will usually only
create one runloop per DOM event but this is not always the case. For example:

* When you use [Ember.run()]() API (see below) you will be creating your own
* Runloop that may go through its full lifecycle while the runloop that
    Ember uses is still accepting jobs.
* Usually Ember application will boot within a single runloop but if you
    enable the [Ember Inspector]() then many more runloops happen at boot
    time.

Another consequence of the runloop not being a singleton it that it does not
function as a "global gateway" to DOM access for the Ember app. It is not
correct to say that the Runloop is the "gatekeeper" to all DOM access in Ember,
rather that "coordinated DOM access" is a pleasant (and deliberate!) side-effect
of this approach. As mentioned above, multiple Runloops can exist simultaneously
so there is not garuantee that *all* DOM access will happen at one time.

The Ember Runloop has the goal of organising *all* the work done in response to
an event, the fact that DOM access is coordinated is a side-effect of this.
This is an important and subtle difference in goals between the Ember Runloop
and things like Angulars _dirty checking_ algorithm.


## How often do Runloops happen?

From what I have observed, Ember typically runs one Runloop in response to each
DOM event that it handles.

### Visualising the Runloop for yourself

This repo also contains the [noisy runloop kit]() which is trivial demo app and
a copy of Ember 1.7.0 that I have patched to be very noisy bout what its runloop
does. Add features to the demo app and see how the actions the runloop takes in
response in the console. You can also use this version of Ember in your own
project to visualise what is happening there.

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

### Autoruns: what are they

```
explain what they are
what problem the solve
why they should be avoided if possible



# auto-creating runloops

* if ember detects an event handler running (how???) it opens a runloop and
  closes it (which actually executes your code) on the next JS event loop turn
* this is bad because your code does not run in the turn you thought it would
  and there can be a gap between turns if the browser decides to do GC etc.



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

The downside of the Runloop is that while you don't need to understand it to get
started making applicaitons with Ember you will eventually have to understand
it. In exchange for this we get the following benefits:

The runloop does add extra complexity to our Ember projects. In return we get:

1. Have a complex response to events in an efficient and coordinated way. Simple
event handling but as anybody who has built more ambitious apps with it, the
complexity of coordinating a complex response quickly gets out of hand.
2. All application developers an opportuntity to work with the newly changed DOM
before it is rendered - the `afterRender` queue is the solution to many
questions! TODO: imporve this
3. Interface with other Javascript code that attaches event listeners to the DOM.


# Section: How do I use the runloop?

```
this section is deisgned to be an primer for the API docs

TODO: re-read the run loopguide before I write this so I don't overlap too much.

the API
    give a high-level overview, help people mentally categorise it
    what are the main categories of methods
        which ones create new runloops
        which ones assume an existing one
        which ones perform a runloop cycle synchronously
        which ones do that at some time in the future

when do I _need_ to know about runloop API
    1. non ember js - show w. timeline how using vanilla Javascript outside runloop causes problem in ember

How is runloop behaviour different in testing?
    explain why auto-run is turned off

How to use the runloop API
    this is well covered in the guide, refer mostly to it
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

