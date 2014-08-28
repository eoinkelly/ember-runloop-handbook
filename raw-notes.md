# The Ember Runloop

_These are my in progress notes, designed to be read as plain text. Markdown
formatting here will be crappy_

The tenets of the runloop
    * batch similar work together
        define similar ???

we want to be able to control the order of execution not just execute it as we
find it

it is embers way of first creating a todo list, then putting it in order and
then doing it
it is embers internal kanban board

rule of thumb: any event handlers i register should do their work in a runloop

TODO: can i see log when queues start executing???

TODO: dig into .observe() - I think it runs outside the runloop?

TODO: differentiate in the runloop API which calls create a new runloop and
which work with an existing one

# auto-creating runloops

* if ember detects an event handler running (how???) it opens a runloop and
  closes it (which actually executes your code) on the next JS event loop turn
* this is bad because your code does not run in the turn you thought it would
  and there can be a gap between turns if the browser decides to do GC etc.

# runloops and testing

Ember disables "autoruns" during testing
QUESTION: what exactly are these? Are they the "auto creating" descdribed above
or domething different?

TODO: need a section on how the runloop and testing
    how does it behave differently
    why is this the case?
    what do youneed to know

"Some of Ember's test helpers are promises that wait for the run loop to empty
before resolving."

# other stuff

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
    * Aliased as `Ember.run.backburner` in Ember

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


* `run(callback)`
    * It does *NOT* schedule your callback on a queue!
    * will create a new insance of DeferredActionQueues even if an existing
      instance is already open. It will synchronously
        1. create a new runloop,
        2. run your callback in a try {}
        3. end and flush the runloop in finally {}
        4. return whatever your callback returned
    * is synchronous - everything happens in a single turn of the event loop! It
      finishes a complete trip through the runloop before returning
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

Ember.run (not in backburner

join()
    from docs:
    If no run-loop is present, it creates a new one. If a run loop is
    present it will queue itself to run on the existing run-loops action
    queue.

    Please note: This is not for normal usage, and should be used sparingly.


## auto run methods: createAutorun() and checkAutoRun()

* createAutorun()
    * calls begin() immediately and schedules an end() (using setTimeout) on the very next turn of the event loop
    * i.e. opens a runloop that will stay open for this turn of the event loop
    * is only called by `backburner.defer()` and `backburner.deferOnce()`! Two places total!

* checkAutoRun()
    * If there isn't a currently open runloop, it checks whether `Ember.testing` is
      set. If it isn't it throws an error about how autoruns will not work

The docs are *not* referring to these methods when they say "auto runs are disbled in testing
mode"


## What *does* change about ember (esp runloop) in testing mode?

Testing mode is

Ember.setupForTesting()
    * loads 'ember-testing/test' into Ember.Test (if Test doesn't exist)
    * sets Ember.testing = true
    * if no adapter configured for sets Ember.Test adpater to Qunit
    * Add listeners to  'ajaxSend' and 'ajaxComplete' events (checking that we
      are not adding dupes of listeners.
        * Ember.Test.pendingAjaxRequests monitors 'ajaxSend' and 'ajaxComplete' to
        keep track of which XHR requests are in flight
        * => Ember knows what ajax requests are in flight when in testing mode - why???

* App.setupForTesting()
    * Sets App.testing = true
    * calls Ember.setupForTesting()
    * sets router location to 'none'

```js
// How to manually set the router location to 'none'
App.Router.reopen({
    location: 'none'
});
```


When `App.testing` and `Ember.testing` are true the app behaves differently

1. Ember.Application.didBecomeReady
    * does not set Ember.BOOTED to true
    * does not process the namespace
2. Does not tell dev about ember inspector
3. checkAutoRun()
4. RSVP.onErrorDefault
    * will send any exception to the test adapter
5. RSVP.configure
    * calls asyncStart() and asyncEnd() around a runloop
6. Ember adds a new initializer that calls deferReadiness() once (if App.testing is true)
7. Ember monitors 'ajaxSend' and 'ajaxComplete' to keep track of what XHR
   requests are in flight
8. `Ember.Test` has its own internal `run()` that will use the normal runloop
   `run()` if a runloop is open or otherwise just run the provide calback
   synchronously


There are a number of Ember.run functions that will create a runloop an
"autorun" runloop if none exists. the `checkAutoRun()` is there to prevent that
happening when `Ember.testing` is set.

### Why is autoruns disabled in testing mode

> Some of Ember's test helpers are promises that wait for the run loop to empty
> before resolving. This leads to resolving too early if there is code that is
> outside the run loop and gives erroneous test failures. Disabling autoruns help
> you identify these scenarios and helps both your testing and your application!

It seems like they want us to realise when we are running code outo
autoruns are a bit of a band-aid - if you run handlers ourside a runloop, ember
will try to wrap it in one in production but not in testing - the test failures
_should_ help find places where you are doing that

And yet in practice I have just found this super confusing???

Aside: Router NoneLocation

      Using `NoneLocation` causes Ember to not store the applications URL state
      in the actual URL. This is generally used for testing purposes, and is one
      of the changes made when calling `App.setupForTesting()`.
Ember.NoneLocation is an object (extends Ember.Object)
It seems to be some sort of null object for router locations

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

# Experiment: log out the name of the queue being flushed

When our very simple app started up we saw:

```
DEBUG: Started runloop: 1 ember.js:14469
DEBUG: Tweaking built-in events to my liking ember.js:14469
DEBUG: Ending & flushing runloop:1 ember.js:14469
DEBUG: Flushing DeferredActionQueues object ember.js:14469
DEBUG: Flushing queue: sync ember.js:14469
DEBUG: Flushing queue: actions
DEBUG: Flushing queue: actions
DEBUG: Flushing queue: actions
DEBUG: Flushing queue: actions
DEBUG: Flushing queue: actions
DEBUG: Flushing queue: actions
DEBUG: Flushing queue: actions
DEBUG: Flushing queue: actions
... lots more
DEBUG: Flushing queue: actions
```

From stepping through the code it seems that ember put a single function on the
actions queue but that function scheduled more work on the actions queue and
this kept happening for quite a while


### how the queue is

DeferredActionQueues.flush()
checks each queue sequentially
scans all queues in order to decide which queue to process next (it defaults to going to next queue)

Conclusion: queues are not "finished" before checking for work on earlier queues - the
check happens afer each function (chunk of work) is run.

`DeferredActionQueues` is {}
    key = queue name
    value = Queue object

`Queue._queue` is an array
    a function call on the queue is represented by a 4 element block of the
    array [targer, method|methodName, args, stack]
    e.g. if there are 3 function calls on the queue the array will have 12
    elements

Conclusion: It is not true to say that the Ember splits work into a "scheduling"
and a "doing" phase because functions executed in the "doing" phase can also
schedule work.


# Experiment: what happens if I call Ember.run within the application ready()

I added the current runloop ID to each log message

Results
The normal ember boot-time runloop started and then end()/flush() was called on
it.
Then my runloop (2) started, ended and its flush completed fully
Then the flush for runloop 1 finished.

It seems like runloops created with Ember.run start,end,finish flush in one turn
of event loop - is this true?

runloop-1 (the normal ember one) had ended before mine started (even though its
flush was not complete - can there be more than one open runloop at a time?

CONCLUSION: runloops can interleave (or at least their flushing does)
    or is this just comparing an internal ember runloop to one i made with
    Ember.run - are Ember.run loops "special"

I created some nested Ember.run calls - the timing looked like:

- outer start
- inner start
- inner end
- inner flush completed
- outer end
- outer flush completed



CONCLUSION:
if we consider the callback you pass the runloop a "chunk of work" then
    runloop's job is to make sure that your chunk gets properly processed by
    Ember itself - the runloop is *not* responsible for coordinating *all* work
    currently being done by ember.

    Runloops are not a gateway to the DOM - I *think* this is diff to angular
    where all access to the DOM goes through a single gateway (the dirty check)
    - TODO: check this


# Experiment: How does ember kick off its first runloop

* It uses run() not begin()/end()
* It kicks off from `App.scheduleInitialize()` which puts `App._initialize()` within
  a runloop with run()


When does ember run runloops

1. it runs one at boot time
2. it runs one in response to each DOM event



# Experiment: is Ember.run started synchronously or put on a queue?

Yes. `Ember.run` is a synchronous function that will

1. open a runloop
2. execute your callback
3. end the runloop
4. flush the runloop
    * runs any callbacks which have been scheduled

NOTE: The callback you supply to Ember.run does *not* run on a queue - it runs
synchronously. It can schedule other callbacks on the queues (either explicitly
or implicitly)
it will return whatever your callback returns


