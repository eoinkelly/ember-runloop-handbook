Ember.Application.initializer({
  name: 'Stop listening for overly noisy mouse events',

  initialize: function(container, application) {
    var events = container.lookup('event_dispatcher:main').events;
    delete events.mousemove;
    delete events.mouseenter;
    delete events.mouseleave;
  }
});


$(document).ready(function () {
  $('body').on('click', '.foo', function (evt) {
    console.log('hi from raw event');
  });
});

// Start of demo Ember app
// ***********************

window.Todos = Ember.Application.create({
  ready: function () {
    Ember.debug('putting stuff on next runloop');
    Ember.run.next(function () {
      console.log('hi');
    });
    Ember.run.next(function () {
      console.log('hi again');
    });
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
  }
});

Todos.Router.map(function() {
    this.resource('todos', { path: '/' });
});

