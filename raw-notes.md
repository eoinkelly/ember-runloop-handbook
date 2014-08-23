# The Ember Runloop

_These are my in progress notes, designed to be read as plain text. Markdown
formatting here will be crappy_

The runloop has the concept of a "currently open instance".

The runloop marks the start and end of ember related JS execution

You work with the runloop as follows

1. Open a runloop instance
2. Schedule stuff onto its queues
3. Close it and do the work (flush the queue)

All these steps can happen
* in one turn of the event loop (with `Ember.run()`) or
step 3 can be delayed to
* on the next turn of event loop (with autoruns)
* a future time (with setTimeout, later)

* Terminology
    * "flush the runloop" = process all the queues

You can have multiple open runloops open for scheduling work but only the most
recently opened will get the jobs you schedule.

* Implications:
    * You can open a runloop and then `open->schedule work->close` a different one
      while that one is still open.

The point of calling Ember.run is to allow the RunLoop to track all of the async calls and make sure that they're executed completely.

* What exists in memory:
    * There is a single instance of Backburner
    * There is an instance of DeferredActionQueues for each runloop currently open
    * There is an instance of Queue for each queue on each DeferredActionQueues in existance


Backburner
    * Aliased as `Ember.run` in Ember

* defer() Ember.run.schedule()
    * if no currently open runloop, will create an autorun, otherwise they will
      schedule onto the currently open runloop
    * behaves like a "schedule this and then run it on the very next tick of the event loop"

* deferOnce() Ember.run.scheduleOnce()
    * if no currently open runloop, will create an autorun
    * behaves like a "schedule this thing once (no matter how many times it is
      added in the current tick of the event loop) and then run it on the very
      next tick of the event loop"

* later() Ember.run.setTimeout()
    * ?

* `run(callback)` _"run this callback on the 'actions' queue of a new runloop"_
    * Open a new runloop, schedule the given callback on 'actions', then close &
      flush all the queues.
    * the opening, running the callback and closing of the runloop happens in
      the curent turn of the browser event loop
    * will create a new insance of DeferredActionQueues even if an existing
      instance is already open. It will synchronously create a new runloop, run
      the callback and then flush the runloop before returning
    * is synchronous! It finishes a complete trip through the runloop before
      returning
    * Implications:
        * You can use run() to schedule stuff on any queue by calling
          `Ember.run.schedule` from within the callback e.g. you can schedule
          onto 'afterRender' to do stuff that will happen after the views have
          been rendered.
        * Your callback will be run after bindings have settled but before any
          view rendering happens

    * The callback you pass to run() might ask Ember to do things for it (update
      bindings etc.). By putting it in a runloop you let Ember perform those
      actions for your callback in an efficient way.
    * The callback is put in the `actions` queue
    * If your callback code takes any action that would require ember to do
    * stuff you should wrap it in run()

* begin()
    * runs the onBegin callback if there is one in options
    * creates a new instance of DeferredActionQueues (the queues object)

* end()
    * calls flush() to acutally process the queues
    * runs the onEnd callback if there is one in options

* debounce()
* throttle()
* setTimeout()

DeferredActionQueues

* queues
    * array
* queueNames
    * array
* options
    * object
* flush()
    * does all the work of running the callbacks schedules on the queues
* schedule()
* invoke()
* invokeWithOnError()

Queue

* daq
    * a reference to the DeferredActionQueues that owns this Queue
* name
    * the name of this queue
* globalOptions
* options
    * the subset of globalOptions that applies to this queue (based on name)
* `_queue`
    * the internal array that holds the queue callbacks
* push()
* pushUnique()
* flush()
    * this is where the action is! This is what actually processes the queues
* cancel()

## An autorun is
* calls begin() and schedules an end() (using setTimeout) on the very next turn of the event loop
* opens a runloop that will only stay open for this turn of the event loop
* disabled in testing mode
    * ??? what exactly happens in testing mode?

## Ember in action explanation

The loop remains dormant until
1. a valid event occurs within the app
    * Ember has listeners which fill the queues whenever certain events occur
      i.e. most of the time when you ask Ember to do something for you (e.g.
      update a binding) it will actually add it to a runloop.

        ex ??
2. you start one manually
    ex ??

Unless otherwise specified the
Unless you specify another queue, all events get added to the `actions` queue by
default

Ember makes sure that the current queue (and any previous ones) are completely
exhausted before moving on to the next queue

The `actions` queue is for things that need to be after bindings have settled
but before views are rendered
Examples of things Ember puts in `actions`:
* RSVP events
* App initialization

`render` and `afterRender` are added by the Ember view packages
    * implies that they won't exist if you don't use ember views
* most views put their render events in the render queue
* afterRender is handy to run stuff that needs to happen after the DOM has
  rendered

The Destroy queue exists to make sure that GC pauses don't happen at critical
times I guess ???

TODO: try to verify this

Using the runloop API you can schedule code onto the `actions` queue

* The Ember team ideally only want devs to have to use `Ember.run` from this API

# Runloop API calls

1. Immediately
    * `Ember.run(callback)`
2. On the next run
    * `Ember.run.next(callback)`
    * I think next() also triggers another runloop to run when current on
    * finishes - CHECK THIS
3. after a set amount of time (triggers a new runloop after the delay)
    * `Ember.run.later(callback, delayInMilliSeconds)`
    * adds the callback to the runloop but also schedules the runloop to happen after the delay
    * use this instead of built-in setTimeout because it ensures that items that
      expire in the same execution cycle all expire together
        * this is more efficient than the real setTimeout

Note: the above methods only allow you to schedule things onto `actions`

# API methods for adding tasks to any queue

4. `Ember.run.schedule('queueName', context, callback)`
    * lets you decide which queue to put your code on
    * allows you to schedule a single task on any queue
    * this will start a runloop if there is not already one open

5. `Ember.run.scheduleOnce('queueName', context, callback)`
    * calling this method with the same queueName, context, callback combo will
    * have no effect after the first one!
    * note that any optional args you pass are not considered when comparing
    * calls i.e. the optional args of the last call you make will be what is
    * used
    * NB: do not pass an anonymous function as callback - anonymous functions
      will not compare as equal even if they are! e.g.
        ```js
        Ember.run.scheduleOnce('render', this, function () { ...}) // BAD IDEA
        ```
6. `Ember.run.once( ...)` = `Ember.run.scheduleOnce('actions' ...)`

* Ember does not have a built-in way to run tasks within a runloop on an
  interval but there are two ways you can achive this:
    1. Use built-in `setInterval` and wrap its contents in `Ember.run` or `Ember.run.schedule`
    2. Use `Ember.run.later` and make the callback you pass recursively add another `Ember.run.later`


# Slightly private methods

`Ember.run.join(target, callback, args*)`
* creates a runloop if none exists
* if one exists it will schedul its callback onto it
* this is different to `Ember.run` which always creates a new runloop


run.cancel()
    * cancels an item scheduled by one of
        * run.once()
        * run.throttle()
        * run.debounce()
        * run.next()
run.throttle()
run.debounce()
run.next()
    * basically run.later() with a timeout of 0
    * introduces an element of indeterminism as it relies on setTimout to
    * schedule the future runloop
`run._addQueue()`
run.hasScheduledTimers
    * used by global test teardown
run.cancelTimers
    * used by global test teardown
run.bind

run.currentRunLoop
// * A reference to the currently active instance of DeferredActionQueues
// * Changed using onBegin and onEnd callbacks to backburner

run.queues
run.backburner // reference to the backburner instance

* The default queue in Ember is 'actions' but you could configure Backburner to
* have any queue as default

### onError

Ember configures backburner as follows

```
onErrorTarget: Ember
onErrorMethod: 'onerror'
```

This implies that on a runloop error Ember.onerror is invoked ???

QUESTION: how does onerror work with backburner in Ember???

Is is important for me to know when a runloop is currently open?
it feels like I need to be aware of this???
especially with Ember.run() - surely it would be better to add to an existing
runloop rather than start a new one - surely the things I add in the inner
runloop might depend on being scheduled with the stuff in the outer loop e.g. if
ember is updating


# refering to my graph

https://docs.google.com/drawings/d/10HAJdly4R_31NE0n7Lt8XcLr_TlYwfsal-SZl7pINsM/edit?usp=sharing

<img src="https://docs.google.com/drawings/d/10HAJdly4R_31NE0n7Lt8XcLr_TlYwfsal-SZl7pINsM/pub?w=498&amp;h=749">

[graph](https://docs.google.com/drawings/d/10HAJdly4R_31NE0n7Lt8XcLr_TlYwfsal-SZl7pINsM/pub?w=498&amp;h=749)
terminology
    input event = a network/timer/user event that woke up the JS event loop

QUESTION: Is it true that when the JS engine enters ember code that it will stay in ember
code until ember gives control back? I think so - check w. Jonas

does ember run just a single runloop within each turn of the browser event loop?
does all ember code execute inside the runloop?
    surely something has to handle the "input event" do the scheduling

TODO: figure out the entry points for Ember in response to
    network event
    user event e.g. click
    timer event

anatomy of a click event

user clicks
browser wakes up the JS
JS checks for any handlers that have been registered
    starts at the DOM element that received the click
    works its way up to `document` element


* W3C Events spec has both capturing (top down) and bubbling (bottom up) phases
* You can decide which phase to register your handler in using the 3rd arg to
  `addEventListener` e.g.

```
element1.addEventListener('click',doSomething2,true) // capturing
element2.addEventListener('click',doSomething,false) // bubbling

element3.onclick = doSomething2; // defaults to bubbling
```

e.stopPropagation() // stops propagation in the bubbling phase

// x-browser way to stop propagation of the bubbling phase
function doSomething(e)
{
	if (!e) var e = window.event;
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();
}

event.target is always the same in both capturing and bubbling phases
    * it is the element that acutally received the event

QUESTION: what is the story with adding extra args to a jquery event handler?
    ember does it, what does it do?

### how ember registers events


#### Ember.EventDispatcher

Ember.EventDispatcher (part of ember-views) manages events for Ember

* rootElement defaults to 'body' (a string)
    * it can be either a DOMElement or a String but Ember uses a String because
      that can be evaluated before the body DOMElement exists
* events {}
    * a hash of DOM event names to handler function names
* setup()
    * calls setupHandler for each element in events
    * will check `customEvents` property of the App for any extras
    ```js
    App = Ember.Application.create({
        customEvents: {
            // add support for the paste event
            paste: "paste"
        }
    });
    ```
setupHandler()
    * registers two handlers on the given rootElement
    * I believe these are the entry point to Ember code
    ```
    // this is Ember registering its DOM event handlers
    rootElement.on(event + '.ember', '.ember-view', function(evt, triggeringManager) {
    rootElement.on(event + '.ember', '[data-ember-action]', function(evt) {
    ```
    * Notice that the handlers are all namespaced with `.ember`
    * The first handler will only handle events that come from a `.ember-view`
        * consequences:
            * ember will ignore events that don't come from an ember view
    * The second will only handle events that come from an element that has the `data-ember-action` attribute
        * consequences:
            * ember handles actions differently from normal DOM events

These handlers are the entry point into the Ember app for DOM events


ASIDE:

    Unregistering for mousemove might be a good idea
        although it is not an event that happens on mobile devices
        QUESTION: what is the performance penalty for listening to mousemove, mouseenter, mouseout etc.

QUESTION: follow the trail of a click that results in some ember action from the
event handler through ember.

QUESTION: How many runloops does ember run in response to a single click?

