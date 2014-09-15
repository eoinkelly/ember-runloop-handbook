/**
 * Vuvuzela
 *
 * Make the Ember Runloop noisy on the console to help visualise its action.
 *
 * This patch will seriously degrade the performance of your Ember application
 * so should never be applied to production code.
 *
 */

Vuvuzela = (function () {
  var bb =        Ember.run.backburner,
      oldBegin =  bb.begin,
      oldEnd =    bb.end,
      oldFlush =  bb.flush,
      runLoopId = 0;

  Ember.run.backburner.begin = function () {
    oldBegin.apply(bb, arguments);
    bb.currentInstance.__uniqueId = ++runLoopId;
    Ember.debug('Opening queues in Runloop: ' + bb.currentInstance.__uniqueId);
  };

  Ember.run.backburner.end = function () {
    var currentId = bb.currentInstance.__uniqueId;
    Ember.debug('Closing queues in Runloop ' + currentId + ' to outside code');
    Ember.debug('The queues look like:' + queuesReport());
    oldEnd.apply(bb, arguments);
  };

  Ember.run.backburner.flush = function () {
    var currentId = bb.currentInstance.__uniqueId;
    Ember.debug('Flushing queues in Runloop: ' + currentId);
    oldFlush.apply(bb, arguments);
  };

  function queuesReport() {
    var names = Ember.run.queues;
    var queues = Ember.run.backburner.currentInstance.queues;

    var reports = names.map(function (name) {
      return name + ": items:" + queues[name]._queue.length + " (4 items per job)\n";
    });
    return reports.join('\n* ');
  }

  // var setup = function (App) {
  //   // var old_initialize = App._initialize;
  //   // App._initialize = function () {
  //   //   Ember.debug('At start of _initialize() the queues look like:' + queuesReport());
  //   //   old_initialize.apply(App, arguments);
  //   //   Ember.debug('At end of _initialize() the queues look like:' + queuesReport());
  //   // };
  //   // var dispatcher = App.__container__.lookup('event_dispatcher:main');
  //   // var oldHandler = dispatcher.setupHandler;
  //   // dispatcher.setupHandler = function(rootElement, event, eventName) {
  //   //   // Ember.debug('Handling event: ' + eventName);
  //   //   oldHandler.apply(dispatcher, arguments);
  //   // }
  // };
  //
  // return {
  //   debug: Ember.debug
  // };
}());
