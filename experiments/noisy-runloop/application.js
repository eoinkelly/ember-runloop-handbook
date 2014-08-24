/*
Will Ember ever run two runloops at the same time (without me using run())?

Aside: The ember inspector triggers 6 extra runloops at startup when it is enabled.

TODO: how to I see ember responding to timers and network events?

TODO: are there other types of events it can respond to?

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
  }
});

Todos.Router.map(function() {
    this.resource('todos', { path: '/' });
});
