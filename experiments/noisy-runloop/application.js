console.log('hi');

window.Todos = Ember.Application.create({
  ready: function () {
    // This is too late
    // var events = Todos.eventDispatcher.events;
    // delete events.touchMove;
    // Todos.eventDispatcher.events = events;
  }
});

// Ember.Application.initializer({
//   name: 'stop-mousemove',
//
//   initialize: function(container, application) {
//     Ember.debug('Tweaking built-in events to my liking');
//     var events = container.lookup('event_dispatcher:main').events;
//     delete events.mousemove;
//     delete events.mouseenter;
//     delete events.mouseleave;
//   }
// });
// Need to run this when the eventsDispatcher actually exists but before its setup has been run
// var events = Todos.eventDispatcher.events;
// delete events.touchMove;
// Todos.eventDispatcher.events = events;


Todos.Router.map(function() {
    this.resource('todos', { path: '/' });
});
