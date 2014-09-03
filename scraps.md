
### What does "wake up JS" mean?

There is no one Javascript "intellegence" to wake up - there is only chunks of
work. During the setup phase the browser considers a whole script a chunk of
work and will run it from top to bottom but for the rest of the time, the
_chunk of work_ is a Javascript function.


The browser does not wake up JS and ask it to figure out what to do in response
- it needs JS to tell it exactly what chunk of work JS wants to run


### A little more on event listening

Lets dig a little deeper into how Javascript tells the browser which events it cares about.

We already know that the browser takes the string of HTML it got from the server
and uses it to create  a _tree like_ structure in memory. We call this "tree
structure" the Document Object Model or DOM for short. It is commonly called a
"tree structure" but is usually visualied as an "upside down tree" or the root
system of a tree.

[diagram of simple DOM tree here]

The interface that the browser presents to JS makes it look like events come
"from" particular nodes in this tree.

```
TODO:
    talk about event bubbling and capturing but not in heaps of detail
        they just need to understand that listening on the bubbling is more
        usual but that the capturing is possible so they will understand how
        they could make JS run before ember runs its response
```

Lets discuss

1. How JS can register its interest in hearing about certain events from
certain nodes
2. How the browser figures out what JS chunks of work to call when an event
actually arrives

Timeline of response to browser event
![graph](https://docs.google.com/drawings/d/10HAJdly4R_31NE0n7Lt8XcLr_TlYwfsal-SZl7pINsM/pub?w=498&amp;h=749)

## An example with code

### Just Javascript

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

### jQuery way

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

```
WHERE SHOULD THIS GO?
A discussion of the full timeline (including ember):

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

Timeline of response to browser event
![graph](https://docs.google.com/drawings/d/10HAJdly4R_31NE0n7Lt8XcLr_TlYwfsal-SZl7pINsM/pub?w=498&amp;h=749)

