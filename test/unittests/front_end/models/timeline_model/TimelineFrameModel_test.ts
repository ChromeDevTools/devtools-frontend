// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import {
  makeFakeEventPayload,
  makeFakeSDKEventFromPayload,
} from '../../helpers/TraceHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../helpers/MockConnection.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

describeWithMockConnection('TimelineFrameModel', () => {
  describe('parsing frames', () => {
    it('can parse out a trace and return the frames', async function() {
      const target = createTarget();
      const frameModel = new TimelineModel.TimelineFrameModel.TimelineFrameModel(event => event.name);

      const models = await TraceLoader.allModels(this, 'web-dev.json.gz');

      const mainTrack = models.timelineModel.tracks().find(track => {
        return track.type === TimelineModel.TimelineModel.TrackType.MainThread && track.forMainFrame;
      });
      const mainThread = mainTrack?.thread;
      if (!mainThread) {
        throw new Error('Could not find main thread');
      }

      frameModel.addTraceEvents(target, models.timelineModel.inspectedTargetEvents(), [{
                                  thread: mainThread,
                                  time: mainTrack.events[0].startTime,
                                }]);

      const parsedFrames = frameModel.getFrames();
      assert.lengthOf(frameModel.getFrames(), 3);

      assert.strictEqual(parsedFrames[0].startTime, 1020034959.113);
      assert.strictEqual(parsedFrames[0].duration, 2.7699999809265137);
      assert.isFalse(parsedFrames[0].idle);

      assert.strictEqual(parsedFrames[1].startTime, 1020034961.883);
      assert.strictEqual(parsedFrames[1].duration, 66.73199999332428);
      assert.isFalse(parsedFrames[1].idle);

      assert.strictEqual(parsedFrames[2].startTime, 1020035028.615);
      assert.strictEqual(parsedFrames[2].duration, 16.682999968528748);
      assert.isFalse(parsedFrames[2].idle);
    });

    it('identifies idle frames', async function() {
      const target = createTarget();
      const frameModel = new TimelineModel.TimelineFrameModel.TimelineFrameModel(event => event.name);

      const models = await TraceLoader.allModels(this, 'style-invalidation-change-id.json.gz');

      const mainTrack = models.timelineModel.tracks().find(track => {
        return track.type === TimelineModel.TimelineModel.TrackType.MainThread && track.forMainFrame;
      });
      const mainThread = mainTrack?.thread;
      if (!mainThread) {
        throw new Error('Could not find main thread');
      }

      frameModel.addTraceEvents(target, models.timelineModel.inspectedTargetEvents(), [{
                                  thread: mainThread,
                                  time: mainTrack.events[0].startTime,
                                }]);

      const parsedFrames = frameModel.getFrames();
      assert.isFalse(parsedFrames[0].idle);
      assert.isFalse(parsedFrames[1].idle);
      assert.isFalse(parsedFrames[2].idle);
      assert.isFalse(parsedFrames[3].idle);
      assert.isTrue(parsedFrames[4].idle);
    });
  });

  describe('LayerPaintEvent', () => {
    beforeEach(() => {
      // https://chromedevtools.github.io/devtools-protocol/tot/LayerTree/#method-loadSnapshot
      setMockConnectionResponseHandler('LayerTree.loadSnapshot', async () => {
        return {
          snapshotId: 'fake-snapshot-123',
        };
      });
    });

    function setupLayerPaintEvent(): {
      layerPaintEvent: TimelineModel.TimelineFrameModel.LayerPaintEvent,
      pictureSnapshotEvent: TraceEngine.Legacy.ObjectSnapshot,
    } {
      // To set up this test, we need to do a few things:
      // 1. Create a Paint event with a layer ID
      // 2. Create an event to mimic a snapshot event that contains a base64
      //    encoded snapshot.
      // 3. Create the relationship between them by marking the snapshot
      //    picture event as the picture for the Paint event.
      const target = createTarget();
      const fakePaintEvent = makeFakeSDKEventFromPayload({
        name: 'Paint',
        ts: 1000,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        categories: ['devtools.timeline', 'rail'],
        args: {
          data: {
            layerId: 'layer-1',
          },
        },
      });

      const pictureEventPayload = makeFakeEventPayload({
        name: 'cc:DisplayItemList',
        ph: TraceEngine.Types.TraceEvents.Phase.OBJECT_SNAPSHOT,
        ts: 999,
        categories: ['disabled-by-default-devtools.timeline.picture'],
        args: {
          snapshot: {
            params: {layer_rect: [0, 0, 50, 50]},
            skp64: 'fake-base64-encoded-snapshot',
          },
        },
      });
      const pictureSnapshotEvent =
          TraceEngine.Legacy.ObjectSnapshot.fromPayload(pictureEventPayload, fakePaintEvent.thread);

      TimelineModel.TimelineModel.EventOnTimelineData.forEvent(fakePaintEvent).picture = pictureSnapshotEvent;

      const layerPaintEvent = new TimelineModel.TimelineFrameModel.LayerPaintEvent(fakePaintEvent, target);
      return {layerPaintEvent, pictureSnapshotEvent};
    }

    it('correctly returns the layer ID', async () => {
      const {layerPaintEvent} = setupLayerPaintEvent();

      assert.strictEqual(layerPaintEvent.layerId(), 'layer-1');
    });

    it('can fetch the picture based on the associated event', async () => {
      const {layerPaintEvent} = setupLayerPaintEvent();

      const result = await layerPaintEvent.picturePromise();

      assert.deepEqual(result, {
        rect: [0, 0, 50, 50],
        serializedPicture: 'fake-base64-encoded-snapshot',
      });

      assert.strictEqual(layerPaintEvent.layerId(), 'layer-1');
    });

    it('can load the snapshot from CDP and return a PaintProfilerSnapshot instance', async () => {
      const {layerPaintEvent} = setupLayerPaintEvent();

      const result = await layerPaintEvent.snapshotPromise();

      assert.instanceOf(result?.snapshot, SDK.PaintProfiler.PaintProfilerSnapshot);
    });
  });
});
