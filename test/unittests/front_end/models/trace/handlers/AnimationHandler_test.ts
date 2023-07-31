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
      TraceModel.Handlers.ModelHandlers.Animation.handleEvent(event);
    }

    await TraceModel.Handlers.ModelHandlers.Animation.finalize();

    const eventsAmount = TraceModel.Handlers.ModelHandlers.Animation.data().animationsSyntheticEvents.length;
    assert.strictEqual(eventsAmount, 1);
  });

  it('calculates the duration of an animation event correctly', async function() {
    const events = await TraceLoader.rawEvents(this, 'animation.json.gz');

    for (const event of events) {
      TraceModel.Handlers.ModelHandlers.Animation.handleEvent(event);
    }

    await TraceModel.Handlers.ModelHandlers.Animation.finalize();

    const eventDuration = TraceModel.Handlers.ModelHandlers.Animation.data().animationsSyntheticEvents[0].dur;
    assert.strictEqual(eventDuration, 2006450);
  });
});
