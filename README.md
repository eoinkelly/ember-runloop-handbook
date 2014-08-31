# Ember JS Runloop Handbook

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

```
    do this last

    intro the 2 sections
        why the runloop
        what it is
        how to use it
    (address the "do I need to know it" question)
    my goals for reader after reading this:
        don't be scared of the runloop
        understand how to wield it skillfully

```

## What will we do?

We are about to take a deep dive into the Ember JS runloop. Why? Because eventually you need to.
Together we will answer these questions:

2. What problems does the runloop address.
1. What even is this "runloop" thing?
3. How can I use it.

Hopefully by the end of this we will have the required background to understand the
[Official Ember Run-loop guide](http://emberjs.com/guides/understanding-ember/run-loop/) and the [Ember
API docs](http://emberjs.com/api/) on the topic.

# section: why a runloop?

```
    background (the environment ember lives in)
        JS event loop
        all about events:
            where they come from
            what they are
        examples of how vanialla JS handles them
        show timeline of how vanilla JS responds to events
        show how ember is just a fancy example of handling events
        discuss the ways in which the vanilla approach doesn't scale well if you are doing lots of work
        end with a clear statement of the problems that the runloop solves
```

## Background

When does Javascript run?

While parsing your HTML the browser executes each `<script>` that it finds as it
finds them (there are some exceptions to this e.g. `defer`). This "setup phase" happens well
before the user sees any content or gets a chance to do anything so how does it
help?

The browser has a built-in set of _events_ that it watches for all the time:
These include

* User moved their mouse
* The DOM has been completely built
* User clicked on something
* All assets have been loaded on the page (`window.load`
* User typed a key in a form input

How does the browser know when to bother JS about an event? Well JS is lazy but
well perpared!

During its setup phase, JS prepared its work space (or `mise en place` if you
prefer) - it created the objects it will need later to respond to orders
(events) from the browser and told the browser in detail what events it cares
about e.g.

> Hey browser, you need to wake me up whenever the user scrolls the page or
> clicks on an element with the `#do-stuff` id.

The description above makes it look like the browser the one giving all the
orders but the browser is a team player and has a few things it can do to help
JS do its job.

1. Timers. JS can use the browser like an alarm clock
    > Hey browser, there is a chunk of work I need to do in 5 seconds. Can you
    > make a new "event" for me that will fire when that time has elapsed so you
    > can wake me up to do that work.
2. Talking to other systems. If JS needs to send or receive data to other
computers it asks the browser to do it and the browser promises to wake JS up
again and report back how it got on
    > JS: Hey browser, I want to get whatever data is at http://foo.com/things.json
    > please.
    > Browser: Sure thing but it might take a while (networks can be slow), I'll
    > try to get that data and wake you up again when it is done. What do you
    > want me to do when it comes back?
    > JS: I have two chunks of work ready to go (one for a successful and one
    > for a failure) so just wake me up to run them when you finish
    > Browser: cool.
Developers call this _talking to other systems_ stuff Web APIs e.g. XHR requests, Web workers
etc.

### What does "wake up JS" mean?

There is no one Javascript "intellegence" to wake up - there is only chunks of
work. During the setup phase the browser considers a whole script a chunk of
work and will run it from top to bottom but for the rest of the time, the
_chunk of work_ is a Javascript function. JS functions are neatly packaged units
of work that can be passed around and stored so are perfect for this job.

The browser does not wake up JS and ask it to figure out what to do in response
- it needs JS to tell it exactly what chunk of work JS wants to run


JS can use these services of the browser both during its setup phase and while
responding to another event e.g. part of JS response to a "click" event on a
certain element might be to retrieve some data from the network and also
schedule a timer to do some future work.

The general pattern of how javascript does work is
1. In the short _setup phase_ the browser runs each script from start to finish. JS
uses this as time to do some preparation for its real job.
2. In response to events. Many events come from the user but JS can also
schedule events for itself by using the many services (web APIs) that the
browser provides.

Most of a JS applications life is spent in section 2 above so we can visualise
our app as a "thing which is mostly sleeping but when woken by the browser
responds quickly to the event that work it before going back to sleep again"

```
TODO:
    talk about event bubbling and capturing but not in heaps of detail
        they just need to understand that listening on the bubbling is more
        usual but that the capturing is possible so they will understand how
        they could make JS run before ember runs its response
```

### A little more on event listening

We need to know a little more detail on how Javascript tells the browser what
events it cares about.

The browser takes the string of HTML it got from the server and parses
("understands") it into a _tree like_ structure in memory. We call this "tree
structure" the Document Object Model or DOM for short. It is commonly called a
"tree structure" but is usually visualied as an "upside down tree" or the root
system of a tree.

[diagram of simple DOM tree here]

The interface that the browser presents to JS makes it look like events come
"from" particular nodes in this tree.

Lets discuss

1. How JS can register its interest in hearing about certain events from
certain nodes
2. How the browser figures out what JS chunks of work to call when an event
actually arrives

Timeline of response to browser event
![graph](https://docs.google.com/drawings/d/10HAJdly4R_31NE0n7Lt8XcLr_TlYwfsal-SZl7pINsM/pub?w=498&amp;h=749)

```
use a simpler version of the diagram above
```

## An example with code

Lets look again at our sample set of events and see how JS might schedule work

* User moved their mouse
* The DOM has been completely built
* User clicked on something

```html
<!DOCTYPE HTML>
<html>
  <head>
    <meta charset="utf-8">
    <title>Plain old Javascript way</title>
    <script>
        // give the browser a function ("chunk of work") to run when certain
        // event happens

    </script>
  </head>
  <body>
    <button id="do-thing">Do the thing!</button>
  </body>
</html>
```


```html
<!DOCTYPE HTML>
<html>
  <head>
    <meta charset="utf-8">
    <title>jQuery way</title>
    <script src="node_modules/jquery/dist/jquery.js"></script>
    <script>
        // Tell the browser (via jQuery) that we have a function (chunk of work)
        // we want it to run when DOM is fully parsed and ready i.e.
        // DOMContentLoaded event happens
        $(document).ready(
            function () { // <-- the chunk of work
                // I am run by the browser when the DOM is ready. It is a common
                // pattern for me to register JS for other browser events e.g.
                // "click" because the DOM might not have been complete before
                // this event fired.


                // TODO: in vanilla js do I have to wait for DOMContentLoaded
                // before I can register listeners?
            }
        );
    </script>
  </head>
  <body>
    <button id="do-thing">Do the thing!</button>
  </body>
</html>
```

A discussion of the full timeline (including ember):

```
    we should use a cut down version of this here and the full one later
-- some custom JS before the ember.js script e.g. jquery, your own stuff
-- the ember.js script
    executed as soon as the browser finds it
    creates a bunch of objects in memory
    adds handlers to a number of browser events. in particular adds a callback
    that will "boot" the ember app when DOMContentLoaded is fired by the browser
-- Ember is sitting in memory, waiting, doing nothing
-- Your app script is found and executed by browser
    it registers a bunch of new objects in memory and configures some of the
    existing ember ones. Ember can now do useful work when it boots
-- some other JS is found and executed

-- ... relatively speaking a long time passes ...

-- DOMContentLoaded is fired!
    ember boots - it creates a bunch of new objects in memory and draws stuff to
    the element in the DOM that you gave it as rootElement

-- JS goes to sleep waiting for the next event

-- Some browser event happens e.g. click
    ember has registered a handler for many browser events so it responds
    part of its response involves running code from your application objects
    e.g. route, controller. There are many things Ember can do in response e.g.
    send data to a server, draw new things on the page but whatever they are
    they are registered ahead of time and run now.

-- JS goes to sleep waiting for the next event

Questions:
How can I schedule JS to run *before* Ember?
    A: you probably shouldn't
    Add listener directly to an element that is not `<body>`
    Add listener to the capturing phase

Without knowing the internals of how Ember handles events it is difficult to
definitely get in front of it

We want to play nicely with Ember
```

### Enter the Ember!

```
extend from the discussiona bove
```

So far so good but no Ember yet!

Ember is basically a set of big event handlers!
    The ember boot process can be thought of as a handler that runs in response
    to getting the 'DOMContentLoaded' event from the browser.

Your app is a customisation and extension of these handlers.

TODO: explain how your app relates to ember framework which in turn relates to handling events

Embers work in response to your app has some natural phases to it. Rather than
just doing work as it appears in the code, ember responds to your app by
scheduling work on an internal set of work queues (one for each phase) and runs them in
order. A consequence of this "schedule and execute" approach is that all DOM
rendering happens on one queue. It is not correct to say that the runloop is the
"gatekeeper" to the DOM, rather that "coordinated DOM access" is a pleaseant
(and deliberate!) side-effect of this approach.

This is the runloop.

So the Ember Runloop is *not* solving the exact same problem as Angular dirty
checking (TODO: Check this!), but they do have some things in common.




Timeline of response to browser event
![graph](https://docs.google.com/drawings/d/10HAJdly4R_31NE0n7Lt8XcLr_TlYwfsal-SZl7pINsM/pub?w=498&amp;h=749)

# section: what is the runloop?

```
    the ember solution: run-loop
        demo how to instrument the runloop in a simple app
    go ghrough some detailed examples of event handling w. runloop added
        explain the bandaid on "non runloop aware code" that is autoruns
    explain granularity of the api

    discuss how often runloops happen, how long they last
    trade-offs of the runloop
        - extra complexity to understand
        + better performance

    briefly discuss some alternate solutions
        (mostly cover how they are/are not solving the same problems, not so
        much *how* they work
        angular dirty checking
            what problems does it solve (compare to the set the runloop solves)
            trade-offs compared to runloop
        react
            what problems does it solve (compare to the set the runloop solves)
            trade-offs compared to runloop
```


# Section: How do I use the runloop?

```
    the API
        give a high-level overview, help people mentally categorise it
        what are the main categories of methods
            which ones create new runloops
            which ones assume an existing one
            which ones perform a runloop cycle synchronously
            which ones do that at some time in the future

    when do I _need_ to know about runloop API
        1. non ember js - show w. timeline how using vanilla JS outside runloop causes problem in ember

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

