/*
Will Ember ever run two runloops at the same time (without me using run())?

Aside: The ember inspector triggers 6 extra runloops at startup when it is enabled.

it seems like ember uses EventDispatcher for all events except
the view compontents for selectbox, textfield etc. register some DOM events of their own

Ember.EventDispatcher handles delegating browser events to their corresponding Ember.Views.

* Ember.Evented
    * This mixin allows for Ember objects to subscribe to and emit events.
    * You mix this into vanilla ember object
    * it provides an interface to stuff in ember-metal/events
* ember-metal/events
    * stores events in 'listeners' attribute of the object's meta key: __ember_meta__

Conclusion: I don't think ember listens for any Network events by default e.g.
it is not aware of XmlHttpRequest, web workers etc.

However RSVP will try to use the most appropraite way of running async code:

```
if we are in node use proccess.nexttick
else try browser mutation observers if they exist
else try to use webworkers message channel
else use setTimeout
```

For timer events, ember seems to wrap all that stuff in the Backburner API
  backburner provides a nicer api (debounce, throttle built-in) and also
  take care of running stuff within a runloop


TODO: dig into XHR properly
  http://www.w3.org/TR/XMLHttpRequest/#event-xhr-timeout

# Browser Events

There are 3 distinct phases to how events are handled

1. Capture phase
2. Target phase
3. Bubble phase

More; http://www.w3.org/TR/DOM-Level-3-Events/#dom-event-architecture

window.addEventListener(...
someDomNode.addEventListener( ...


// Set the onclick attribute of the DOM Node object
button.onclick(function (e) { });
* Downside: can only register one callback for each event
*
button.addEventListener('click', function (e) { ... })

* addEventListener allows you to regiter multiple callbacks for a single event
* on a single node
*

var thing = function (e) { ... };
button.AddEventListener('click', thing);
button.removeEventListener('click', thing);
* You have to name the handler function to be able to remove it

event.preventDefault()
* For _most_ events default action is performed *after* the handlers are run
    * On chrome you cannot intercept keyboard shortcuts to close current tab

event.stopPropagation()
* stop the event bubbling up beyond the current node
* browser will still run all handlers attached to current node ???

event.target
* the dom node that had _focus_ when the event was fired
* normal nodes cannot have focus unless you give them a _tabindex_ attribute
    * Implication: give a node tabindex to make it an event source
    * ?? is stuff bubbled through it too?
* these types of nodes can have focus by default
    * links
    * buttons
    * form field
    * document.body


* keypress is for getting what the user typed

// To get a key out of an input keypress
input.onkeypress(function (e) {
  console.log(String.fromCharCode(e.charCode));
});


* Whenever an element is scrolled the 'scroll' event is fired on it
    * It doesn't happen if element is `position: fixed`

elements receive 'focus' and 'blur' when they get/lose focus
    these events do not propagate to parents!
    the window object gets focus/blur when user tabs to/from it

load
    * fired on both window and document body when the page loads
    * external scripts adn images also have load events

beforeunload


requestAnimationFrame
    * schedules code to run just before the next redrawing
    * sort of a specail setTimeout
    *
cancelAnimationFrame

setTimeout
clearTimeout

setInterval
clearInterval

TODO: dig into browser events properly
  https://developer.mozilla.org/en-US/docs/Web/Events

# Network Events

Come from the browsers Network interfaces. These are:

1. XmlHttpRequest
2. Web sockets
3. Web workers
4. Server sent events
5. others ???

Examples of events:

```
web sockets/web worker/server-sent-event:
  message

xhr:
  loadstaart
  loadend
  timeout
```

*/


var bb = Ember.run.backburner;
var oldBegin = bb.begin;
var oldEnd = bb.end;

window.runLoopId = 0;

Ember.run.backburner.begin = function () {
  oldBegin.apply(bb, arguments);
  bb.currentInstance.__uniqueId = ++window.runLoopId;
  Ember.debug('Started runloop: ' + bb.currentInstance.__uniqueId);
};

Ember.run.backburner.end= function () {
  var currentId = bb.currentInstance.__uniqueId;
  Ember.debug('Ending & flushing runloop:' + currentId);
  oldEnd.apply(bb, arguments);
};


Ember.Application.initializer({
  name: 'stop-noisy-mouse-events',

  initialize: function(container, application) {
    Ember.debug('Tweaking built-in events to my liking');
    var events = container.lookup('event_dispatcher:main').events;
    delete events.mousemove;
    delete events.mouseenter;
    delete events.mouseleave;
  }
});


// Start of demo Ember app
// ***********************

window.Todos = Ember.Application.create({
  ready: function () {
    Ember.run(function () {
      Ember.debug('In my own runloop');
      $('body').css('background-color', 'pink');
      Ember.run(function () {
        Ember.debug('In a nested runloop');
        $('body').css('background-color', 'red');
      });
    });
    Ember.run(function () {
      Ember.debug('In another of my own runloops');
      $('body').css('background-color', 'yellow');
    });
  }
});

Todos.Router.map(function() {
    this.resource('todos', { path: '/' });
});
