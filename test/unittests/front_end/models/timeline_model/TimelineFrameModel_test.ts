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
} from '../../helpers/TimelineHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../helpers/MockConnection.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';

describeWithMockConnection('TimelineFrameModel', () => {
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
      pictureSnapshotEvent: SDK.TracingModel.ObjectSnapshot,
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
          SDK.TracingModel.ObjectSnapshot.fromPayload(pictureEventPayload, fakePaintEvent.thread);

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
