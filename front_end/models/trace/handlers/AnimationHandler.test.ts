// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('AnimationHandler', function() {
  it('calculates the amount of animation events correctly', async function() {
    const events = await TraceLoader.rawEvents(this, 'animation.json.gz');

    for (const event of events) {
      Trace.Handlers.ModelHandlers.Animations.handleEvent(event);
    }

    await Trace.Handlers.ModelHandlers.Animations.finalize();

    const eventsAmount = Trace.Handlers.ModelHandlers.Animations.data().animations.length;
    assert.strictEqual(eventsAmount, 1);
  });

  it('drops any bad animation events', async function() {
    const events = await TraceLoader.rawEvents(this, 'invalid-animation-events.json.gz');

    for (const event of events) {
      Trace.Handlers.ModelHandlers.Animations.handleEvent(event);
    }

    await Trace.Handlers.ModelHandlers.Animations.finalize();

    const animations = Trace.Handlers.ModelHandlers.Animations.data().animations;
    // This trace contains 57 'Animation' events but all are from `cat: 'power'`
    // These events are only possible if the trace is captured with 'Show All Events' on.
    assert.lengthOf(animations, 0);
  });

  it('calculates the duration of an animation event correctly', async function() {
    const events = await TraceLoader.rawEvents(this, 'animation.json.gz');

    for (const event of events) {
      Trace.Handlers.ModelHandlers.Animations.handleEvent(event);
    }

    await Trace.Handlers.ModelHandlers.Animations.finalize();
    const animations = Trace.Handlers.ModelHandlers.Animations.data().animations;
    const eventDuration = animations[0].dur;
    assert.strictEqual(eventDuration, 2006450);

    // We also ensure all of the events have a positive duration.
    for (const event of animations) {
      assert.isTrue(event.dur > 0);
    }
  });
});
