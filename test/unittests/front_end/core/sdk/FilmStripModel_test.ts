// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {allModelsFromFile} from '../../helpers/TraceHelpers.js';

describeWithEnvironment('FilmStripModel', () => {
  it('parses out frames from a trace', async () => {
    const {tracingModel} = await allModelsFromFile('web-dev.json.gz');
    const filmStrip = new SDK.FilmStripModel.FilmStripModel(tracingModel);
    assert.strictEqual(filmStrip.frames().length, 5);
  });

  it('exposes the image for each frame', async () => {
    const {tracingModel} = await allModelsFromFile('web-dev.json.gz');
    const filmStrip = new SDK.FilmStripModel.FilmStripModel(tracingModel);
    const allImages = await Promise.all(filmStrip.frames().map(frame => {
      return frame.imageDataPromise();
    }));
    // Ensure that the image for each frame exists and returns a string.
    assert.isTrue(allImages.every(imageStr => imageStr && imageStr.length > 0));
  });

  it('returns the frame closest to the given timestamp', async () => {
    const {tracingModel} = await allModelsFromFile('web-dev.json.gz');
    const filmStrip = new SDK.FilmStripModel.FilmStripModel(tracingModel);
    const frameTimestamps = filmStrip.frames().map(frame => frame.timestamp);
    assert.deepEqual(frameTimestamps, [1020034823.345, 1020034961.883, 1020035045.298, 1020035061.981, 1020035112.03]);

    const timestampNearestFirstFrame = frameTimestamps[0] + 10;
    assert.strictEqual(filmStrip.frameByTimestamp(timestampNearestFirstFrame), filmStrip.frames().at(0));
    const timestampNearestThirdFrame = frameTimestamps[2] + 10;
    assert.strictEqual(filmStrip.frameByTimestamp(timestampNearestThirdFrame), filmStrip.frames().at(2));

    const timestampBeforeAnyFrames = frameTimestamps[0] - 100;
    assert.isNull(filmStrip.frameByTimestamp(timestampBeforeAnyFrames));
  });

  describe('creating frames', () => {
    it('can create a frame from a screenshot snapshot event or a trace engine snapshot event and both are equivalent',
       async () => {
         const {tracingModel, traceParsedData} = await allModelsFromFile('web-dev.json.gz');
         const browserMain = SDK.TracingModel.TracingModel.browserMainThread(tracingModel);
         const sdkSnapshot = browserMain?.events().find(event => {
           return event.name === 'Screenshot';
         });
         if (!sdkSnapshot) {
           throw new Error('Could not find expected screenshot event');
         }
         const traceEngineSnapshot = traceParsedData.Screenshots.at(0);
         if (!traceEngineSnapshot) {
           throw new Error('Could not find expected screenshot event');
         }
         const filmStrip = new SDK.FilmStripModel.FilmStripModel(tracingModel);
         const frameFromSDK =
             SDK.FilmStripModel.Frame.fromSnapshot(filmStrip, sdkSnapshot as SDK.TracingModel.ObjectSnapshot, 0);
         const frameFromTrace = SDK.FilmStripModel.Frame.fromTraceEvent(filmStrip, traceEngineSnapshot, 0);
         const imageDataSDK = await frameFromSDK.imageDataPromise();
         const imageDataTrace = await frameFromTrace.imageDataPromise();
         assert.typeOf(imageDataSDK, 'string');
         assert.typeOf(imageDataTrace, 'string');
         assert.strictEqual(imageDataTrace, imageDataSDK);
       });
  });
});
