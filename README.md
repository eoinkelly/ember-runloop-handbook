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

TODO: with an example show the phases of ember setup

A timelien:

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


### Enter the Ember!

```
extend from the discussiona bove
```
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

