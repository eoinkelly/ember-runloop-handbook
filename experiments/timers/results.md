# noisy runloop results

I setup a minimal ember app with a version of the runloop that had comments added

Ember ran 1 runloop to boot the app and show the page

It ran *many* runloops as I moved my mouse over the area of DOM that the ember app was in

Then I turned off mousemove events to cut down on the noise

QUESTION: is monitoring mousemove a perf problem?


```js
// Disable Ember's built-in events
Ember.Application.initializer({
  name: 'disable-built-in-events',

  initialize: function(container, application) {
    var events = container.lookup('event_dispatcher:main').events;
    delete events.mousemove;
    delete events.mouseenter;
    delete events.mouseleave;
    delete events.mousedown;
    delete events.mouseup;
    delete events.focusin;
    delete events.focusout;
  }
});
```

It seems that ember runs exactly 1 runloop in response to each DOM event that it
monitors

In the example of a click event on a some nested views, every view will get a
chance to handle the click - this means that the ember event handler code gets
called multiple times for each event (once for each view in the heirarchy) -
each one of those calls has its own runloop!

Q: How many runloops will happen as a result of my click
A: each click triggers 3 DOM events (mousedown, mouseup, click)
    each view (anything with a .ember-view class) is an event handler
    so the answer is:

    3 * num views in heirarchy

A click fires 3 DOM events (mousedown, mouseup,  click (in that order)) so triggers 3 runloops

typing a single character in a text field triggers the following 6 events (in this order):

keydown, keypress, keyup, input, keyup, change

Total num runloops for typing a char in text field = 6 * nested-views

In my tests I saw an extra runloop sometimes - is this due to some timer/network
stuff I'm not monitoring?

=> runloops are very granular - ember runs a *lot* of them
=> runloop is part of an individual ember view's response to an event (DOM, timer, network)
    it is more correct to say that the ember-view use the runloop rather than
    ember as a whole
    Q: are there other parts of ember that use runloops?
    * ember views decide how to respond to a user event and they schedule that
    * work in a runloop.
    ? are those runloops coalesced together? i.e. Ember.run() *always* kicks off
    a new runloop - are built-in ember views better at sharing whatever the open
    runloop is?
        if view-A opens a runloop and adds work
            then view-B adds work to it
        then A is finished adding work and so is B
        so who ends(flushes it) - if A does so it might surprise B
        so views probably don't share runloops (this is supported by my tests)
        CHECK THIS!

TODO see if I can log a "runloop id" so I can match up the start and end of runloops

QUESTION: I thought that there was a central runloop that most bits of ember
scheduled stuff on but it is a much more granular thing - it seems that the
central one would be more efficient in some ways. Why aren't they using it?

