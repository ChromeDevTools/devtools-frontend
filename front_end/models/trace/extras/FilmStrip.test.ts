// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceEngine from '../trace.js';

const {assert} = chai;

describeWithEnvironment('FilmStrip', function() {
  it('identifies the frames from a trace', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const filmStrip = TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData);
    assert.lengthOf(filmStrip.frames, 5);
  });

  it('caches the film strip based on the trace data and the zero time', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const filmStrip1 = TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData);
    const filmStrip2 = TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData);
    // It is from cache so you get back the exact same object.
    assert.strictEqual(filmStrip1, filmStrip2);

    const filmStrip3 =
        TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData, TraceEngine.Types.Timing.MicroSeconds(0));
    const filmStrip4 =
        TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData, TraceEngine.Types.Timing.MicroSeconds(5));
    // Not equal as the calls had different start times.
    assert.notStrictEqual(filmStrip3, filmStrip4);
  });

  it('exposes the snapshot string for each frame', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const filmStrip = TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData);
    assert.isTrue(filmStrip.frames.every(frame => {
      return typeof frame.screenshotEvent.args.dataUri === 'string' && frame.screenshotEvent.args.dataUri.length > 0;
    }));
  });

  it('can use a custom zero time to filter out screenshots', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const filmStrip = TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData);
    // Set a custom zero time after the first screenshot and ensure that we now only have four events.
    const newCustomZeroTime = TraceEngine.Types.Timing.MicroSeconds(filmStrip.frames[0].screenshotEvent.ts + 1000);
    const newFilmStrip = TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData, newCustomZeroTime);
    // Check that the new film strip is all the frames other than the first, now we have set a custom time.
    assert.deepEqual(newFilmStrip.frames.map(f => f.screenshotEvent.args.dataUri), [
      filmStrip.frames[1].screenshotEvent.args.dataUri,
      filmStrip.frames[2].screenshotEvent.args.dataUri,
      filmStrip.frames[3].screenshotEvent.args.dataUri,
      filmStrip.frames[4].screenshotEvent.args.dataUri,
    ]);
  });

  it('can return the frame closest to a given timestamp', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const filmStrip = TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData);
    const frameTimestamps = filmStrip.frames.map(frame => frame.screenshotEvent.ts);
    assert.deepEqual(frameTimestamps, [1020034823345, 1020034961883, 1020035045298, 1020035061981, 1020035112030]);

    const timestampNearestFirstFrame = TraceEngine.Types.Timing.MicroSeconds(frameTimestamps[0] + 10);
    assert.strictEqual(
        TraceEngine.Extras.FilmStrip.frameClosestToTimestamp(filmStrip, timestampNearestFirstFrame),
        filmStrip.frames.at(0));
    const timestampNearestThirdFrame = TraceEngine.Types.Timing.MicroSeconds(frameTimestamps[2] + 10);
    assert.strictEqual(
        TraceEngine.Extras.FilmStrip.frameClosestToTimestamp(filmStrip, timestampNearestThirdFrame),
        filmStrip.frames.at(2));

    const timestampBeforeAnyFrames = TraceEngine.Types.Timing.MicroSeconds(frameTimestamps[0] - 100);
    assert.isNull(TraceEngine.Extras.FilmStrip.frameClosestToTimestamp(filmStrip, timestampBeforeAnyFrames));
  });
});
