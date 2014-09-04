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


/**
 * Make the Ember Runloop noisy on the console to help visualise what it is
 * doing.
 *
 * Obviously this will not help performance so
 * NEVER EVER RUN THIS IN PRODUCTION MMMKAY...
 *
 */

(function () {
  var bb =        Ember.run.backburner,
      oldBegin =  bb.begin,
      oldEnd =    bb.end,
      runLoopId = 0;

  Ember.run.backburner.begin = function () {
    oldBegin.apply(bb, arguments);
    bb.currentInstance.__uniqueId = ++runLoopId;
    Ember.debug('Starting runloop: ' + bb.currentInstance.__uniqueId);
  };

  Ember.run.backburner.end= function () {
    var currentId = bb.currentInstance.__uniqueId;
    Ember.debug('Ending & flushing runloop: ' + currentId);
    oldEnd.apply(bb, arguments);
  };


}());

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

var old_init = Todos._initialize;

// Ember.run.backburner.instanceStack
// Ember.run.backburner.currentInstance

function queuesReport (queues) {
  jQuery.each(queues, function (idx, queue) {
    var name = queue.name;
    Ember.debug('Queue ' + name + ' length: ' + queue._queue.length);
  });
}

Todos._initialize = function () {
  Ember.debug('I am _initialize(). I am the callback that the first runloop manages');
  old_init.apply(Todos, arguments);
  queuesReport(Ember.run.backburner.currentInstance.queues);
  Ember.debug('At end of _initialize(). Has extra work been scheduled on the current runloop?');
};

Todos.Router.map(function() {
    this.resource('todos', { path: '/' });
});
