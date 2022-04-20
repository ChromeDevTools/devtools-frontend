// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as TimelineModel from '../../../../../../front_end/models/timeline_model/timeline_model.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import {createTarget} from '../../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent, setMockConnectionResponseHandler} from '../../../helpers/MockConnection.js';

const {assert} = chai;
let tracingModel: SDK.TracingModel.TracingModel;
let doneCallback: () => void;
let target: SDK.Target.Target;
const donePromise = new Promise<void>(resolve => {
  doneCallback = resolve;
});

class FakeClient implements Timeline.TimelineController.Client {
  recordingProgress(): void {
    // Added to implement the Client interface.
  }
  loadingStarted(): void {
    // Added to implement the Client interface.
  }
  processingStarted(): void {
    // Added to implement the Client interface.
  }
  loadingProgress(): void {
    // Added to implement the Client interface.
  }
  tracingComplete(): void {
    // Added to implement the Client interface.
  }

  loadingComplete(pTracingModel: SDK.TracingModel.TracingModel|null): void {
    if (!pTracingModel) {
      throw new Error('Received null tracing model');
    }
    tracingModel = pTracingModel;
    doneCallback();
  }
}
describeWithMockConnection('Interactions lane', () => {
  const noop = () => ({});
  const traceEvents = [
    {
      'args': {
        'data': {
          'frameTreeNodeId': 12,
          'frames': [
            {
              'frame': '8CAAEA14554319E6DA0E988CC37DC306',
              'name': '',
              'processId': 2382793,
              'url': 'chrome://whats-new/',
            },
            {
              'frame': 'A44AAF3E680BFC760BCE98807B7944B0',
              'name': '',
              'parent': '8CAAEA14554319E6DA0E988CC37DC306',
              'processId': 2383045,
              'url': 'https://www.google.com/chrome/whats-new/m100/?latest=true&feedback=false',
            },
          ],
          'persistentIds': true,
        },
      },
      'cat': 'disabled-by-default-devtools.timeline',
      'name': 'TracingStartedInBrowser',
      'ph': 'I',
      'pid': 2382651,
      's': 't',
      'tid': 2382651,
      'ts': 1158767319614,
      'tts': 5401914,
    },
    {
      'args': {'name': 'Renderer'},
      'cat': '__metadata',
      'name': 'process_name',
      'ph': 'M',
      'pid': 2382793,
      'tid': 0,
      'ts': 0,
    },
    {
      'args': {'name': 'CrBrowserMain'},
      'cat': '__metadata',
      'name': 'thread_name',
      'ph': 'M',
      'pid': 2382651,
      'tid': 2382651,
      'ts': 0,
    },
    {
      'args': {
        'chrome_latency_info': {
          'component_info': [
            {'component_type': 'COMPONENT_INPUT_EVENT_LATENCY_BEGIN_RWH', 'time_us': 1158774585455},
            {'component_type': 'COMPONENT_INPUT_EVENT_LATENCY_ORIGINAL', 'time_us': 1158774583000},
            {'component_type': 'COMPONENT_INPUT_EVENT_LATENCY_UI', 'time_us': 1158774585356},
            {'component_type': 'COMPONENT_INPUT_EVENT_LATENCY_RENDERER_MAIN', 'time_us': 1158774585939},
            {'component_type': 'COMPONENT_INPUT_EVENT_LATENCY_RENDERING_SCHEDULED_MAIN', 'time_us': 1158774586017},
            {'component_type': 'COMPONENT_INPUT_EVENT_LATENCY_RENDERER_SWAP', 'time_us': 1158774613687},
            {'component_type': 'COMPONENT_DISPLAY_COMPOSITOR_RECEIVED_FRAME', 'time_us': 1158774613930},
            {'component_type': 'COMPONENT_INPUT_EVENT_GPU_SWAP_BUFFER', 'time_us': 1158774625401},
            {'component_type': 'COMPONENT_INPUT_EVENT_LATENCY_FRAME_SWAP', 'time_us': 1158774625401},
          ],
          'is_coalesced': false,
          'trace_id': 1150,
        },
      },
      'cat': 'benchmark,latencyInfo,rail',
      'id': '0x1eb',
      'name': 'InputLatency::RawKeyDown',
      'ph': 'b',
      'pid': 2382651,
      'tid': 2382651,
      'ts': 1158774583000,
    },
    {
      'args': {'chrome_latency_info': {'step': 'STEP_SEND_INPUT_EVENT_UI', 'trace_id': 1150}},
      'cat': 'input,benchmark,devtools.timeline',
      'dur': 93,
      'name': 'LatencyInfo.Flow',
      'ph': 'X',
      'pid': 2382651,
      'tdur': 93,
      'tid': 2382651,
      'ts': 1158774585491,
      'tts': 6223490,
    },
    {
      'args': {},
      'cat': 'benchmark,latencyInfo,rail',
      'id': '0x1eb',
      'name': 'InputLatency::RawKeyDown',
      'ph': 'e',
      'pid': 2382651,
      'tid': 2382651,
      'ts': 1158774625401,
    },
  ];
  let flamechartdataProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider;
  let controller: Timeline.TimelineController.TimelineController;
  beforeEach(() => {
    // The following requests are fired as part of suspending all targets with the timeline
    // controller.
    // As such we must provide even a basic reponse (in this case an empty object) to each
    // message.
    setMockConnectionResponseHandler('DOM.disable', noop);
    setMockConnectionResponseHandler('CSS.disable', noop);
    setMockConnectionResponseHandler('Debugger.disable', noop);
    setMockConnectionResponseHandler('Debugger.setAsyncCallStackDepth', noop);
    setMockConnectionResponseHandler('Overlay.disable', noop);
    setMockConnectionResponseHandler('Target.setAutoAttach', noop);

    // And the same with reenabling for the resume call.
    setMockConnectionResponseHandler('DOM.enable', noop);
    setMockConnectionResponseHandler('CSS.enable', noop);
    setMockConnectionResponseHandler('Debugger.enable', () => ({debuggerId: '1'}));
    setMockConnectionResponseHandler('Overlay.enable', noop);
    setMockConnectionResponseHandler('Page.setLifecycleEventsEnabled', noop);
    setMockConnectionResponseHandler('Overlay.setShowViewportSizeOnResize', noop);
    setMockConnectionResponseHandler('Page.reload', noop);
    setMockConnectionResponseHandler('Tracing.end', () => {
      window.setTimeout(
          () => dispatchEvent(target, 'Tracing.tracingComplete', {dataLossOccurred: false}),
          500,
      );
      return {};
    });
    setMockConnectionResponseHandler('Tracing.start', noop);
    target = createTarget();
    const client = new FakeClient();
    flamechartdataProvider = new Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider();
    controller = new Timeline.TimelineController.TimelineController(target, client);
  });

  it('creates the input lane data from latency trace events.', async () => {
    await controller.startRecording({}, []);
    dispatchEvent(target, 'Tracing.dataCollected', {value: traceEvents});
    const performanceModel = await controller.stopRecording();
    await donePromise;
    performanceModel.setTracingModel(tracingModel);
    flamechartdataProvider.setModel(performanceModel);
    flamechartdataProvider.timelineData();
    const timelineModel = performanceModel.timelineModel();
    const inputTrack = timelineModel.tracks().find(t => t.type === TimelineModel.TimelineModel.TrackType.Input);
    if (!inputTrack) {
      assert.fail('Could not find the input track.');
      return;
    }
    // Test the track isn't empty.
    assert.lengthOf(inputTrack.asyncEvents, 1);

    const eventFromInputTrack = inputTrack.asyncEvents[0];

    const eventBegin = eventFromInputTrack.steps[0];
    const eventEnd = eventFromInputTrack.steps[1];

    // Test the duration of the event.
    assert.deepEqual(eventFromInputTrack.duration, eventEnd.startTime - eventBegin.startTime);

    // Test the event is added to the TimelineFlameChartDataProvider
    const dataProviderEvent = flamechartdataProvider.entryDataByIndex(1);
    if (!(dataProviderEvent instanceof SDK.TracingModel.Event)) {
      assert.fail('Found unexpected type for timeline flame chart entry');
      return;
    }
    assert.deepEqual(eventBegin, dataProviderEvent);

    const inputDelayForEvent =
        TimelineModel.TimelineModel.TimelineData.forEvent(dataProviderEvent).timeWaitingForMainThread;
    // Test the input delay of the event.
    assert.strictEqual(inputDelayForEvent, 2.938999891281128);
  });
});
