// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

describe('AnimationHandler', function() {
  it('calculates the amount of animation events correctly', async function() {
    const events = await TraceLoader.rawEvents(this, 'animation.json.gz');

    for (const event of events) {
      TraceModel.Handlers.ModelHandlers.Animations.handleEvent(event);
    }

    await TraceModel.Handlers.ModelHandlers.Animations.finalize();

    const eventsAmount = TraceModel.Handlers.ModelHandlers.Animations.data().animations.length;
    assert.strictEqual(eventsAmount, 1);
  });

  it('drops any bad animation events', async function() {
    const events = await TraceLoader.rawEvents(this, 'invalid-animation-events.json.gz');

    for (const event of events) {
      TraceModel.Handlers.ModelHandlers.Animations.handleEvent(event);
    }

    await TraceModel.Handlers.ModelHandlers.Animations.finalize();

    const animations = TraceModel.Handlers.ModelHandlers.Animations.data().animations;
    // This trace contains some animation events with bad data. If we do not filter these out, we get 57 events. But if we filter, we get 47. so that is why we expect 47 events here.
    assert.lengthOf(animations, 47);
    // We also ensure all of the events have a positive duration which confirms
    // we filtered out bad data.
    for (const event of animations) {
      assert.isTrue(event.dur > 0);
    }
  });

  it('calculates the duration of an animation event correctly', async function() {
    const events = await TraceLoader.rawEvents(this, 'animation.json.gz');

    for (const event of events) {
      TraceModel.Handlers.ModelHandlers.Animations.handleEvent(event);
    }

    await TraceModel.Handlers.ModelHandlers.Animations.finalize();

    const eventDuration = TraceModel.Handlers.ModelHandlers.Animations.data().animations[0].dur;
    assert.strictEqual(eventDuration, 2006450);
  });
});
