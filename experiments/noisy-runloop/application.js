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


*/


var bb = Ember.run.backburner;
var oldBegin = bb.begin;
var oldEnd = bb.end;

window.runLoopId = 0;

Ember.run.backburner.begin = function () {
  oldBegin.apply(bb, arguments);
  bb.currentInstance.__uniqueId = ++window.runLoopId;
  Ember.debug('Starting runloop: begin():  ' + bb.currentInstance.__uniqueId);
};

Ember.run.backburner.end= function () {
  var currentId = bb.currentInstance.__uniqueId;
  Ember.debug('Ending runloop and starting flush: end();' + currentId);
  oldEnd.apply(bb, arguments);
};


Ember.Application.initializer({
  name: 'Stop listening for overly noisy mouse events',

  initialize: function(container, application) {
    var events = container.lookup('event_dispatcher:main').events;
    delete events.mousemove;
    delete events.mouseenter;
    delete events.mouseleave;
  }
});


// Start of demo Ember app
// ***********************

window.Todos = Ember.Application.create({
  // ready: function () {
  //   Ember.run(function () {
  //     Ember.debug('In my own runloop');
  //     $('body').css('background-color', 'pink');
  //     Ember.run(function () {
  //       Ember.debug('In a nested runloop');
  //       $('body').css('background-color', 'red');
  //     });
  //   });
  //   Ember.run(function () {
  //     Ember.debug('In another of my own runloops');
  //     $('body').css('background-color', 'yellow');
  //   });
  // }
});

Todos.Router.map(function() {
    this.resource('todos', { path: '/' });
});
