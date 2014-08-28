# Ember JS Runloop Handbook

by [Eoin Kelly](https://twitter.com/eoinkelly)

![Creative Commons License](https://i.creativecommons.org/l/by-sa/4.0/88x31.png)


## Current status: Such incomplete, much TODO.

Very much a work in progress. Currently still compiling my notes and researching
topics.

## What will we do?

We are about to take a deep dive into the Ember JS runloop. Why? Because eventually you need to.
Together we will answer these questions:

1. What is this "runloop" thing?
2. What problem does it solve for Ember?
3. How can I use it.

Hopefully by the end of this we will have the required background to understand the
[Official Ember Run-loop guide](http://emberjs.com/guides/understanding-ember/run-loop/) and the [Ember
API docs](http://emberjs.com/api/) on the topic.

```
rough structure

intro
background
    JS event loop
    all about events:
        where they come from
        what they are
    examples of how vanialla JS handles them
    show timeline of how vanilla JS responds to events

outline the problems with vanilla JS approach
the ember solution: run-loop
go ghrough some detailed examples of event handling w. runloop added
demo how to instrument the runloop in your app
explain the bandaid that is autoruns
explain granularity of the api

discuss how often runloops happen, how long they last
discuss trade-offs of the runloop
    - extra complexity to understand
    + better performance

discuss some alternative ideas than the runloop that could solve the same
problem (and the pros/cons associated with them)?
    e.g. angular dirty checking
        ?? react

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


Timeline of response to browser event
![graph](https://docs.google.com/drawings/d/10HAJdly4R_31NE0n7Lt8XcLr_TlYwfsal-SZl7pINsM/pub?w=498&amp;h=749)

## Sources

The primary documentation for the Ember runloop is [Official Ember Run-loop
guide](http://emberjs.com/guides/understanding-ember/run-loop/) and the [Ember
API docs](http://emberjs.com/api/)

These are other sources I studied in compiling this research:

* [Ember source code](https://github.com/emberjs/ember.js)
* Books
    * [Developing an Ember Edge](http://bleedingedgepress.com/our-books/developing-an-ember-edge/)
    * [Ember.js in Action](http://www.manning.com/skeie/)

## Contributing

You should. :-). If you spot any of the (inevitable) errors, omissions, things
which are unclear you would be doing me a great favour by opening an issue.
