// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

async function parseEvents(events: readonly Trace.Types.Events.Event[]) {
  Trace.Handlers.ModelHandlers.AnimationFrames.reset();
  Trace.Handlers.ModelHandlers.AnimationFrames.handleUserConfig({
    ...Trace.Types.Configuration.defaults(),
    enableAnimationsFrameHandler: true,
  });

  for (const event of events) {
    Trace.Handlers.ModelHandlers.AnimationFrames.handleEvent(event);
  }
  await Trace.Handlers.ModelHandlers.AnimationFrames.finalize();
}

describe('AnimationFramesHandler', () => {
  it('can group all related animation frame events', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-animation-frames.json.gz');
    await parseEvents(events);
    const data = Trace.Handlers.ModelHandlers.AnimationFrames.data();
    assert.lengthOf(data.animationFrames, 32);
    const firstFrame = data.animationFrames[0];
    assert.strictEqual(firstFrame.args.data.beginEvent.args?.animation_frame_timing_info.duration_ms, 76);
    assert.strictEqual(firstFrame.dur, Trace.Types.Timing.Micro(76038));
  });

  it('links an animation frame to its presentation event', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-animation-frames.json.gz');
    await parseEvents(events);
    const data = Trace.Handlers.ModelHandlers.AnimationFrames.data();
    const firstFrame = data.animationFrames[0];
    const presentationEvent = data.presentationForFrame.get(firstFrame);
    assert.isDefined(presentationEvent);
    assert.strictEqual(presentationEvent.args?.id, firstFrame.args.data.beginEvent.args?.id);
  });
});
