
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


$(document).ready(function () {
  $('body').on('click', '.foo', function (evt) {
    console.log('hi from raw event');
  });
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

