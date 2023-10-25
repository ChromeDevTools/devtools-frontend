// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Common from '../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {
  DevToolsTimelineCategory,
  makeFakeSDKEventFromPayload,
  StubbedThread,
} from '../../helpers/TraceHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

// Various events listing processes and threads used by all the tests.
const preamble = [
  {
    'args': {'name': 'CrBrowserMain'},
    'cat': '__metadata',
    'name': 'thread_name',
    'ph': 'M',
    'pid': 1537480,
    'tid': 1537480,
    'ts': 0,
  },
  {
    'args': {'name': 'CrRendererMain'},
    'cat': '__metadata',
    'name': 'thread_name',
    'ph': 'M',
    'pid': 1537729,
    'tid': 1,
    'ts': 0,
  },
  {
    'args': {'name': 'AuctionV8HelperThread'},
    'cat': '__metadata',
    'name': 'thread_name',
    'ph': 'M',
    'pid': 1538739,
    'tid': 7,
    'ts': 0,
  },
  {
    'args': {'name': 'AuctionV8HelperThread'},
    'cat': '__metadata',
    'name': 'thread_name',
    'ph': 'M',
    'pid': 1538738,
    'tid': 7,
    'ts': 0,
  },
  // A child thread in the worklet process which has some events, it's supposed to
  // be skipped.
  {
    'args': {'name': 'Chrome_ChildIOThread'},
    'cat': '__metadata',
    'name': 'thread_name',
    'ph': 'M',
    'pid': 1538738,
    'tid': 4,
    'ts': 0,
  },
  {
    'args': {},
    'cat': 'disabled-by-default-devtools.timeline',
    'dur': 94,
    'name': 'RunTask',
    'ph': 'X',
    'pid': 1538738,
    'tdur': 93,
    'tid': 4,
    'ts': 962632609083,
    'tts': 3006,
  },
  {
    'args': {'name': 'Renderer'},
    'cat': '__metadata',
    'name': 'process_name',
    'ph': 'M',
    'pid': 1537729,
    'tid': 0,
    'ts': 0,
  },
  {
    'args': {'name': 'Browser'},
    'cat': '__metadata',
    'name': 'process_name',
    'ph': 'M',
    'pid': 1537480,
    'tid': 0,
    'ts': 0,
  },
  {
    'args': {'name': 'Service: auction_worklet.mojom.AuctionWorkletService'},
    'cat': '__metadata',
    'name': 'process_name',
    'ph': 'M',
    'pid': 1538739,
    'tid': 0,
    'ts': 0,
  },
  {
    'args': {'name': 'Service: auction_worklet.mojom.AuctionWorkletService'},
    'cat': '__metadata',
    'name': 'process_name',
    'ph': 'M',
    'pid': 1538738,
    'tid': 0,
    'ts': 0,
  },
  {
    'args': {
      'data': {
        'frameTreeNodeId': 7,
        'frames': [{
          'frame': '76213A7F71B7ACD4C6551AC68B888978',
          'name': '',
          'processId': 1537729,
          'url': 'https://192.168.0.105/run.html',
        }],
        'persistentIds': true,
      },
    },
    'cat': 'disabled-by-default-devtools.timeline',
    'name': 'TracingStartedInBrowser',
    'ph': 'I',
    'pid': 1537480,
    's': 't',
    'tid': 1537480,
    'ts': 962632191080,
    'tts': 23601918,
  },
  {
    'args': {
      'data': {
        'frame': '76213A7F71B7ACD4C6551AC68B888978',
        'name': '',
        'processId': 1537729,
        'url': 'https://192.168.0.105/run.html',
      },
    },
    'cat': 'disabled-by-default-devtools.timeline',
    'name': 'FrameCommittedInBrowser',
    'ph': 'I',
    'pid': 1537480,
    's': 't',
    'tid': 1537480,
    'ts': 962632244598,
    'tts': 23622650,
  },
];

class TrackSummary {
  name: string = '';
  type: TimelineModel.TimelineModel.TrackType = TimelineModel.TimelineModel.TrackType.Other;
  forMainFrame: boolean = false;
  url: Platform.DevToolsPath.UrlString = Platform.DevToolsPath.EmptyUrlString;
  threadName: string = '';
  threadId: number = -1;
  processId: number = -1;
  processName: string = '';
}

function summarize(track: TimelineModel.TimelineModel.Track): TrackSummary {
  return {
    name: track.name,
    type: track.type,
    forMainFrame: track.forMainFrame,
    url: track.url,
    threadName: track.thread ? track.thread.name() : '(no thread)',
    threadId: track.thread ? track.thread.id() : -1,
    processId: track.thread ? track.thread.process().id() : -1,
    processName: track.thread ? track.thread.process().name() : '(no thread)',
  };
}

function summarizeArray(tracks: TimelineModel.TimelineModel.Track[]): TrackSummary[] {
  return tracks.map(summarize);
}

describeWithEnvironment('TimelineModel', function() {
  function traceWithEvents(events: readonly TraceEngine.TracingManager.EventPayload[]): {
    tracingModel: TraceEngine.Legacy.TracingModel,
    timelineModel: TimelineModel.TimelineModel.TimelineModelImpl,
  } {
    const tracingModel = new TraceEngine.Legacy.TracingModel();
    const timelineModel = new TimelineModel.TimelineModel.TimelineModelImpl();
    tracingModel.addEvents((preamble as unknown as TraceEngine.TracingManager.EventPayload[]).concat(events));
    tracingModel.tracingComplete();
    timelineModel.setEvents(tracingModel);
    return {
      tracingModel,
      timelineModel,
    };
  }
  describe('isMarkerEvent', function() {
    it('is true for a timestamp event', async function() {
      // Note: exact trace does not matter here, but we need a real one so all the metadata is set correctly on the TimelineModel
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');

      const timestampEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.TimeStamp,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
      });
      assert.isTrue(timelineModel.isMarkerEvent(timestampEvent));
    });
    it('is true for a Mark First Paint event that is on the main frame', async function() {
      const {timelineModel, traceParsedData} =
          await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markFirstPaintEventOnMainFrame = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkFirstPaint,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          frame: traceParsedData.Meta.mainFrameId,
          data: {},
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markFirstPaintEventOnMainFrame));
    });

    it('is true for a Mark FCP event that is on the main frame', async function() {
      const {timelineModel, traceParsedData} =
          await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markFCPEventOnMainFrame = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkFCP,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          frame: traceParsedData.Meta.mainFrameId,
          data: {},
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markFCPEventOnMainFrame));
    });

    it('is false for a Mark FCP event that is not on the main frame', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markFCPEventOnOtherFrame = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkFCP,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          frame: 'not-main-frame',
          data: {},
        },
      });
      assert.isFalse(timelineModel.isMarkerEvent(markFCPEventOnOtherFrame));
    });

    it('is false for a Mark First Paint event that is not on the main frame', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markFirstPaintEventOnOtherFrame = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkFirstPaint,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          frame: 'not-main-frame',
          data: {},
        },
      });
      assert.isFalse(timelineModel.isMarkerEvent(markFirstPaintEventOnOtherFrame));
    });

    it('is true for a MarkDOMContent event is set to isMainFrame', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markDOMContentEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkDOMContent,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isMainFrame: true,
          },
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markDOMContentEvent));
    });

    it('is true for a MarkDOMContent event that set to isOutermostMainFrame', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markDOMContentEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkDOMContent,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isOutermostMainFrame: true,
          },
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markDOMContentEvent));
    });

    it('is false for a MarkDOMContent event that set to isOutermostMainFrame=false', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markDOMContentEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkDOMContent,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isOutermostMainFrame: false,
          },
        },
      });
      assert.isFalse(timelineModel.isMarkerEvent(markDOMContentEvent));
    });

    it('is false for a MarkDOMContent event that set to isMainFrame=false', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markDOMContentEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkDOMContent,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isMainFrame: false,
          },
        },
      });
      assert.isFalse(timelineModel.isMarkerEvent(markDOMContentEvent));
    });

    it('is true for a MarkLoad event that set to isMainFrame=true', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markLoadEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkLoad,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isMainFrame: true,
          },
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markLoadEvent));
    });

    it('is true for a MarkLCPCandidate event that set to isOutermostMainFrame=true', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markLCPCandidateEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkLCPCandidate,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isOutermostMainFrame: true,
          },
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markLCPCandidateEvent));
    });

    it('is true for a MarkLCPInvalidate event that set to isOutermostMainFrame=true', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const markLCPInvalidateEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkLCPInvalidate,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isOutermostMainFrame: true,
          },
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markLCPInvalidateEvent));
    });

    it('is false for some unrelated event that is never a marker such as an animation', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
      const animationEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.Animation,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        threadId: 1,
      });
      assert.isFalse(timelineModel.isMarkerEvent(animationEvent));
    });
  });
  describe('Track.syncLikeEvents', function() {
    let nestableAsyncEvents: TraceEngine.Legacy.AsyncEvent[];
    let nonNestableAsyncEvents: TraceEngine.Legacy.AsyncEvent[];
    let syncEvents: TraceEngine.Legacy.PayloadEvent[];
    const tracingModel = new TraceEngine.Legacy.TracingModel();
    const process = new TraceEngine.Legacy.Process(tracingModel, 1);
    const thread = new TraceEngine.Legacy.Thread(process, 1);
    const nestableAsyncEventPayloads = [
      {
        'cat': 'blink.console',
        'id': '0x10bd3fa3',
        'name': 'first console time',
        'ph': 'b',
        'ts': 59624383131,
      },
      {
        'cat': 'blink.console',
        'id': '0xf9950a85',
        'name': 'second console time',
        'ph': 'b',
        'ts': 59624483145,
      },
      {
        'cat': 'blink.console',
        'id': '0xf9950a85',
        'name': 'second console time',
        'ph': 'e',
        'ts': 59624983227,
      },
      {
        'cat': 'blink.console',
        'id': '0x10bd3fa3',
        'name': 'first console time',
        'ph': 'e',
        'ts': 59625983390,
      },
      {
        'cat': 'blink.console',
        'id': '0xfbe4a4a7',
        'name': 'third console time',
        'ph': 'b',
        'ts': 59625983458,
      },
      {
        'cat': 'blink.console',
        'id': '0xfbe4a4a7',
        'name': 'third console time',
        'ph': 'e',
        'ts': 59626783430,
      },
    ] as unknown as TraceEngine.TracingManager.EventPayload[];

    const nonNestableAsyncEventPayloads = [
      {
        'cat': 'blink.user_timing',
        'id': '0x10bd3fa3',
        'name': 'MyMark',
        'ph': 'b',
        'ts': 62263114030,
      },
      {
        'cat': 'blink.user_timing',
        'id': '0xf9950a85',
        'name': 'MyOtherMark',
        'ph': 'b',
        'ts': 62263414138,
      },
      {
        'cat': 'blink.user_timing',
        'id': '0x10bd3fa3',
        'name': 'MyMark',
        'ph': 'e',
        'ts': 62263614198,
      },
      {
        'cat': 'blink.user_timing',
        'id': '0xfbe4a4a7',
        'name': 'Zuck',
        'ph': 'b',
        'ts': 62263714283,
      },
      {
        'cat': 'blink.user_timing',
        'id': '0xfbe4a4a7',
        'name': 'Zuck',
        'ph': 'e',
        'ts': 62264214398,
      },
      {
        'cat': 'blink.user_timing',
        'id': '0xf9950a85',
        'name': 'MyOtherMark',
        'ph': 'e',
        'ts': 62264414198,
      },
    ] as unknown as TraceEngine.TracingManager.EventPayload[];

    const syncEventPayloads = [
      {
        'cat': 'blink.user_timing',
        'name': 'myMark',
        'ph': 'R',
        'ts': 62263114056,
      },
      {
        'cat': 'blink.user_timing',
        'name': 'myOtherMark',
        'ph': 'R',
        'ts': 62263414150,
      },
      {
        'cat': 'blink.user_timing',
        'name': 'zuck',
        'ph': 'R',
        'ts': 62263714292,
      },
    ] as unknown as TraceEngine.TracingManager.EventPayload[];

    function buildAsyncEvents(asyncPayloads: TraceEngine.TracingManager.EventPayload[]):
        TraceEngine.Legacy.AsyncEvent[] {
      const builtEvents = new Map<string, TraceEngine.Legacy.AsyncEvent>();
      for (const payload of asyncPayloads) {
        let beginEvent = builtEvents.get(payload.id);
        const event = new TraceEngine.Legacy.AsyncEvent(TraceEngine.Legacy.PayloadEvent.fromPayload(payload, thread));
        if (!beginEvent) {
          beginEvent = new TraceEngine.Legacy.AsyncEvent(event);
          builtEvents.set(payload.id, beginEvent);
        } else {
          beginEvent.addStep(event);
        }
      }
      return [...builtEvents.values()];
    }
    beforeEach(() => {
      nestableAsyncEvents = buildAsyncEvents(nestableAsyncEventPayloads);
      nonNestableAsyncEvents = buildAsyncEvents(nonNestableAsyncEventPayloads);
      syncEvents = syncEventPayloads.map(payload => TraceEngine.Legacy.PayloadEvent.fromPayload(payload, thread));
    });
    it('returns sync and async events if async events can be organized in a tree structure', function() {
      const track = new TimelineModel.TimelineModel.Track();
      track.asyncEvents = nestableAsyncEvents;
      track.events = syncEvents;
      const syncLikeEvents = track.eventsForTreeView();
      assert.strictEqual(syncLikeEvents.length, nestableAsyncEvents.length + syncEvents.length);
      const syncLikeEventIds = syncLikeEvents.map(e => e.id);
      for (const event of [...nestableAsyncEvents, ...syncEvents]) {
        assert.isTrue(syncLikeEventIds.includes(event.id));
      }
    });
    it('returns sync events only if the async event cannot be organized in a tree structure', function() {
      const track = new TimelineModel.TimelineModel.Track();
      track.asyncEvents = nonNestableAsyncEvents;
      track.events = syncEvents;
      const syncLikeEvents = track.eventsForTreeView();
      assert.strictEqual(syncLikeEvents.length, syncEvents.length);
      const syncLikeEventIds = syncLikeEvents.map(e => e.id);
      for (const event of [...syncEvents]) {
        assert.isTrue(syncLikeEventIds.includes(event.id));
      }
    });
  });

  it('creates tracks for auction worklets', function() {
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538738,
            'target': 'a1e485ff-f876-41cb-90ca-85c4b684b302',
            'type': 'seller',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633184323,
        'tts': 23961306,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': 'd11f0ac4-f92c-4d2d-a665-8a00654567f0',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189649,
        'tts': 23962898,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': '7cf70074-8b59-45ef-8f30-0d61c6ce3cd6',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189667,
        'tts': 23962912,
      },
    ] as unknown as TraceEngine.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        name: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.MainThread,
        forMainFrame: true,
        url: 'https://192.168.0.105/run.html' as Platform.DevToolsPath.UrlString,
        threadName: 'CrRendererMain',
        threadId: 1,
        processId: 1537729,
        processName: 'Renderer',
      },
      {
        name: 'Bidder Worklet — https://192.168.0.105',
        type: TimelineModel.TimelineModel.TrackType.Other,
        forMainFrame: false,
        url: 'https://192.168.0.105' as Platform.DevToolsPath.UrlString,
        threadName: 'AuctionV8HelperThread',
        threadId: 7,
        processId: 1538739,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
      },
      {
        name: 'Seller Worklet — https://192.168.0.105',
        type: TimelineModel.TimelineModel.TrackType.Other,
        forMainFrame: false,
        url: 'https://192.168.0.105' as Platform.DevToolsPath.UrlString,
        threadName: 'AuctionV8HelperThread',
        threadId: 7,
        processId: 1538738,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
      },
    ]);
  });

  it('handles auction worklets running in renderer', function() {
    // Also shows it merging the different types, and not
    // throwing away another thread there.
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1537729,
            'target': 'a1e485ff-f876-41cb-90ca-85c4b684b302',
            'type': 'seller',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633184323,
        'tts': 23961306,
      },
      {
        'args': {'name': 'AuctionV8HelperThread'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1537729,
        'tid': 7,
        'ts': 0,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1537729,
            'target': 'd11f0ac4-f92c-4d2d-a665-8a00654567f0',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189649,
        'tts': 23962898,
      },
      {
        'args': {'name': 'ThreadPoolForegroundWorker'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1537729,
        'tid': 15,
        'ts': 0,
      },
      {
        'args': {},
        'cat': 'devtools.timeline,disabled-by-default-v8.gc',
        'dur': 531,
        'name': 'V8.GC_BACKGROUND_UNMAPPER',
        'ph': 'X',
        'pid': 1537729,
        'tdur': 533,
        'tid': 15,
        'ts': 962632415206,
        'tts': 165467,
      },
    ] as unknown as TraceEngine.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        forMainFrame: false,
        name: 'Auction Worklet — https://192.168.0.105',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 7,
        threadName: 'AuctionV8HelperThread',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: 'https://192.168.0.105' as Platform.DevToolsPath.UrlString,
      },
      {
        forMainFrame: true,
        name: 'CrRendererMain',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.MainThread,
        url: 'https://192.168.0.105/run.html' as Platform.DevToolsPath.UrlString,
      },
      {
        forMainFrame: false,
        name: 'ThreadPoolForegroundWorker',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 15,
        threadName: 'ThreadPoolForegroundWorker',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
    ]);
  });

  it('handles different URLs in same auction worklet thread', function() {
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1537729,
            'target': 'a1e485ff-f876-41cb-90ca-85c4b684b302',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633184323,
        'tts': 23961306,
      },
      {
        'args': {'name': 'AuctionV8HelperThread'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1537729,
        'tid': 7,
        'ts': 0,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.106',
            'pid': 1537729,
            'target': 'd11f0ac4-f92c-4d2d-a665-8a00654567f0',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189649,
        'tts': 23962898,
      },
      {
        'args': {'name': 'ThreadPoolForegroundWorker'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1537729,
        'tid': 15,
        'ts': 0,
      },
      {
        'args': {},
        'cat': 'devtools.timeline,disabled-by-default-v8.gc',
        'dur': 531,
        'name': 'V8.GC_BACKGROUND_UNMAPPER',
        'ph': 'X',
        'pid': 1537729,
        'tdur': 533,
        'tid': 15,
        'ts': 962632415206,
        'tts': 165467,
      },
    ] as unknown as TraceEngine.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        forMainFrame: false,
        name: 'Bidder Worklet',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 7,
        threadName: 'AuctionV8HelperThread',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        forMainFrame: true,
        name: 'CrRendererMain',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.MainThread,
        url: 'https://192.168.0.105/run.html' as Platform.DevToolsPath.UrlString,
      },
      {
        forMainFrame: false,
        name: 'ThreadPoolForegroundWorker',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 15,
        threadName: 'ThreadPoolForegroundWorker',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
    ]);
  });

  it('includes utility process main thread, too', function() {
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': 'a1e485ff-f876-41cb-90ca-85c4b684b302',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633184323,
        'tts': 23961306,
      },
      {
        'args': {'name': 'AuctionV8HelperThread'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1538739,
        'tid': 7,
        'ts': 0,
      },
      {
        'args': {'name': 'CrUtilityMain'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1538739,
        'tid': 1,
        'ts': 0,
      },
      {
        'args': {'name': 'ThreadPoolForegroundWorker'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1538739,
        'tid': 15,
        'ts': 0,
      },
      {
        'args': {},
        'cat': 'devtools.timeline,disabled-by-default-v8.gc',
        'dur': 531,
        'name': 'V8.GC_BACKGROUND_UNMAPPER',
        'ph': 'X',
        'pid': 1538739,
        'tdur': 533,
        'tid': 15,
        'ts': 962632415206,
        'tts': 165467,
      },
      {
        'args': {},
        'cat': 'devtools.timeline',
        'dur': 531,
        'name': 'ResourceSendRequest',
        'ph': 'X',
        'pid': 1538739,
        'tdur': 533,
        'tid': 1,
        'ts': 962632415206,
        'tts': 165467,
      },
    ] as unknown as TraceEngine.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: 'Other',
        url: '',
      },
      {
        forMainFrame: true,
        name: 'CrRendererMain',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: 'MainThread',
        url: 'https://192.168.0.105/run.html',
      },
      {
        forMainFrame: false,
        name: 'Bidder Worklet — https://192.168.0.105',
        processId: 1538739,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
        threadId: 7,
        threadName: 'AuctionV8HelperThread',
        type: 'Other',
        url: 'https://192.168.0.105',
      },
      {
        forMainFrame: false,
        name: 'Auction Worklet Service — https://192.168.0.105',
        processId: 1538739,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
        threadId: 1,
        threadName: 'CrUtilityMain',
        type: 'Other',
        url: 'https://192.168.0.105',
      },
    ]);
  });

  it('includes utility process main thread w/M11+ name, too', function() {
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': 'a1e485ff-f876-41cb-90ca-85c4b684b302',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633184323,
        'tts': 23961306,
      },
      {
        'args': {'name': 'AuctionV8HelperThread'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1538739,
        'tid': 7,
        'ts': 0,
      },
      {
        'args': {'name': 'auction_worklet.CrUtilityMain'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1538739,
        'tid': 1,
        'ts': 0,
      },
    ] as unknown as TraceEngine.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: 'Other',
        url: '',
      },
      {
        forMainFrame: true,
        name: 'CrRendererMain',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: 'MainThread',
        url: 'https://192.168.0.105/run.html',
      },
      {
        forMainFrame: false,
        name: 'Auction Worklet Service — https://192.168.0.105',
        processId: 1538739,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
        threadId: 1,
        threadName: 'auction_worklet.CrUtilityMain',
        type: 'Other',
        url: 'https://192.168.0.105',
      },
      {
        forMainFrame: false,
        name: 'Bidder Worklet — https://192.168.0.105',
        processId: 1538739,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
        threadId: 7,
        threadName: 'AuctionV8HelperThread',
        type: 'Other',
        url: 'https://192.168.0.105',
      },
    ]);
  });

  it('handles auction worklet exit events', function() {
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': 'd11f0ac4-f92c-4d2d-a665-8a00654567f0',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189649,
      },
      {
        'args': {},
        'cat': 'disabled-by-default-devtools.timeline',
        'dur': 10,
        'name': 'RunTaskA',
        'ph': 'X',
        'pid': 1538739,
        'tid': 7,
        'ts': 962633189650,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': 'd11f0ac4-f92c-4d2d-a665-8a00654567f0',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletDoneWithProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189669,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': '7cf70074-8b59-45ef-8f30-0d61c6ce3cd6',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189667,
      },
      {
        'args': {},
        'cat': 'disabled-by-default-devtools.timeline',
        'dur': 10,
        'name': 'RunTaskB',
        'ph': 'X',
        'pid': 1538739,
        'tid': 7,
        'ts': 962633189668,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': '7cf70074-8b59-45ef-8f30-0d61c6ce3cd6',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletDoneWithProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633199669,
      },
    ] as unknown as TraceEngine.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        name: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.MainThread,
        forMainFrame: true,
        url: 'https://192.168.0.105/run.html' as Platform.DevToolsPath.UrlString,
        threadName: 'CrRendererMain',
        threadId: 1,
        processId: 1537729,
        processName: 'Renderer',
      },
      {
        name: 'Bidder Worklet — https://192.168.0.105',
        type: TimelineModel.TimelineModel.TrackType.Other,
        forMainFrame: false,
        url: 'https://192.168.0.105' as Platform.DevToolsPath.UrlString,
        threadName: 'AuctionV8HelperThread',
        threadId: 7,
        processId: 1538739,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
      },
    ]);

    // Now, verify that the actual track honors the timestamp boundaries.
    for (const track of timelineModel.tracks()) {
      if (track.name !== 'Bidder Worklet — https://192.168.0.105') {
        continue;
      }
      assert.deepEqual(track.events.map(event => event.name), [
        'thread_name',  // Metadata event for this worklet
        // Tasks within this worklet
        'RunTaskA',
        'RunTaskB',
      ]);
    }
  });

  it('creates tracks for prerender targets', function() {
    const {timelineModel} = traceWithEvents([
      {
        'args': {'name': 'CrRendererMain'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1777777,
        'tid': 1,
        'ts': 0,
      },
      {
        'args': {
          'data': {
            'frame': 'DEADBEEF1234567890987654321ABCDE',
            'name': '',
            'processId': 1777777,
            'url': 'https://192.168.0.105/prerender.html',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'FrameCommittedInBrowser',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962632244598,
        'tts': 23622650,
      },
    ] as unknown as TraceEngine.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        'name': 'CrRendererMain',
        'type': 'MainThread',
        'forMainFrame': true,
        'url': 'https://192.168.0.105/prerender.html',
        'threadName': 'CrRendererMain',
        'threadId': 1,
        'processId': 1777777,
        'processName': '',
      },
      {
        'name': 'Thread 0',
        'type': 'Other',
        'forMainFrame': false,
        'url': '',
        'threadName': '',
        'threadId': 0,
        'processId': 1537729,
        'processName': 'Renderer',
      },
      {
        'name': 'CrRendererMain',
        'type': 'MainThread',
        'forMainFrame': true,
        'url': 'https://192.168.0.105/run.html',
        'threadName': 'CrRendererMain',
        'threadId': 1,
        'processId': 1537729,
        'processName': 'Renderer',
      },
    ]);
  });

  describe('style invalidations', function() {
    /**
     * This helper function is very confusing without context. It is designed
     * to work on a trace generated from
     * https://github.com/ChromeDevTools/performance-stories/tree/main/style-invalidations.
     * Those examples are triggered by the user clicking on a button to initiate
     * certain invalidations that we want to test. However, the act of clicking on
     * the button also triggers an invalidation which we do not necessarily want to
     * include in our results. So, instead we look for the invalidations triggered
     * by the test function that was invoked when we clicked the button. Therefore,
     * this function looks through the trace for all UpdateLayoutTree events, and
     * looks for one where the function in the stack trace matches what's expected.
     * We then return all invalidations for that main event.
     **/
    async function invalidationsFromTestFunction(
        timelineModel: TimelineModel.TimelineModel.TimelineModelImpl,
        testFunctionName: string): Promise<TimelineModel.TimelineModel.InvalidationTrackingEvent[]> {
      let mainTrack: TimelineModel.TimelineModel.Track|null = null;
      for (const track of timelineModel.tracks()) {
        if (track.type === TimelineModel.TimelineModel.TrackType.MainThread && track.forMainFrame) {
          mainTrack = track;
        }
      }
      assertNotNullOrUndefined(mainTrack);
      const rootLayoutUpdateEvent = mainTrack.events.find(event => {
        return event.name === TimelineModel.TimelineModel.RecordType.UpdateLayoutTree &&
            event.args.beginData?.stackTrace?.[0].functionName === testFunctionName;
      });
      assertNotNullOrUndefined(rootLayoutUpdateEvent);
      const invalidationsForEvent =
          TimelineModel.TimelineModel.InvalidationTracker.invalidationEventsFor(rootLayoutUpdateEvent);
      assertNotNullOrUndefined(invalidationsForEvent);
      return invalidationsForEvent;
    }

    function invalidationToBasicObject(invalidation: TimelineModel.TimelineModel.InvalidationTrackingEvent) {
      return {
        reason: invalidation.cause.reason,
        nodeName: invalidation.nodeName,
      };
    }

    it('detects the correct invalidations for a class name being changed', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'invalidate-style-class-name-change.json.gz');
      const invalidations = await invalidationsFromTestFunction(timelineModel, 'testFuncs.changeClassNameAndDisplay');
      // In this trace there are three nodes impacted by the class name change:
      // the two test divs, and the button, which gains the :active pseudo
      // class
      assert.deepEqual(invalidations.map(invalidationToBasicObject), [
        {
          reason: 'PseudoClass',
          nodeName: 'BUTTON id=\'changeClassNameAndDisplay\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementOne\' class=\'red\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementTwo\' class=\'red\'',
        },
      ]);
    });

    it('detects the correct invalidations for an attribute being changed', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'style-invalidation-change-attribute.json.gz');
      const invalidations = await invalidationsFromTestFunction(timelineModel, 'testFuncs.changeAttributeAndDisplay');
      // In this trace there are three nodes impacted by the attribute change:
      // the two test divs, and the button, which gains the :active pseudo
      // class when clicked.
      // However, the two test divs have two invalidations each: one for the attribute, and one for having a pending invalidation list
      assert.deepEqual(invalidations.map(invalidationToBasicObject), [
        {
          reason: 'PseudoClass',
          nodeName: 'BUTTON id=\'changeAttributeAndDisplay\'',
        },
        {
          reason: 'Attribute',
          nodeName: 'DIV id=\'testElementFour\'',
        },
        {
          reason: 'Attribute',
          nodeName: 'DIV id=\'testElementFive\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementFour\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementFive\'',
        },
      ]);
    });
    it('detects the correct invalidations for an ID being changed', async function() {
      const {timelineModel} = await TraceLoader.allModels(this, 'style-invalidation-change-id.json.gz');
      const invalidations = await invalidationsFromTestFunction(timelineModel, 'testFuncs.changeIdAndDisplay');
      // In this trace there are three nodes impacted by the ID change:
      // the two test divs, and the button, which gains the :active pseudo
      // class
      assert.deepEqual(invalidations.map(invalidationToBasicObject), [
        {
          reason: 'PseudoClass',
          nodeName: 'BUTTON id=\'changeIdAndDisplay\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementFour\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementFive\'',
        },
      ]);
    });
  });

  describe('extractCpuProfileDataModel', function() {
    it('handles empty cpuprofile payloads', function() {
      const {timelineModel} = traceWithEvents([
        {
          'args': {'data': {'startTime': 756917095363}},
          'cat': 'disabled-by-default-v8.cpu_profiler',
          'id': '0x1',
          'name': 'Profile',
          'ph': 'P',
          'pid': 1537729,
          'tid': 15,
          'ts': 962632415206,
        },
        {
          'args': {'data': {'startTime': 756917095363}},
          'cat': 'disabled-by-default-v8.cpu_profiler',
          'id': '0x1',
          'name': 'Profile',
          'ph': 'P',
          'pid': 1537729,
          'tid': 15,
          'ts': 962632415207,
        },
      ] as unknown as TraceEngine.TracingManager.EventPayload[]);
      assert.deepStrictEqual(timelineModel.cpuProfiles(), []);
      // Ensure no "Failed to parse CPU profile." messages were posted
      assert.deepStrictEqual(Common.Console.Console.instance().messages(), []);
    });
  });
});

describeWithEnvironment('TimelineData', function() {
  function getAllTracingModelPayloadEvents(tracingModel: TraceEngine.Legacy.TracingModel):
      TraceEngine.Legacy.PayloadEvent[] {
    const allSDKEvents = tracingModel.sortedProcesses().flatMap(process => {
      return process.sortedThreads().flatMap(thread => thread.events().filter(TraceEngine.Legacy.eventHasPayload));
    });
    allSDKEvents.sort((eventA, eventB) => {
      if (eventA.startTime > eventB.startTime) {
        return 1;
      }
      if (eventB.startTime > eventA.startTime) {
        return -1;
      }
      return 0;
    });
    return allSDKEvents;
  }

  it('stores data for an SDK.TracingModel.PayloadEvent using the raw payload as the key', async function() {
    const data = await TraceLoader.allModels(this, 'web-dev.json.gz');
    const allSDKEvents = getAllTracingModelPayloadEvents(data.tracingModel);
    // The exact event we use is not important, so let's use the first LCP event.
    const lcpSDKEvent =
        allSDKEvents.find(event => event.name === TimelineModel.TimelineModel.RecordType.MarkLCPCandidate);
    if (!lcpSDKEvent) {
      throw new Error('Could not find SDK Event.');
    }
    const dataForEvent = TimelineModel.TimelineModel.EventOnTimelineData.forEvent(lcpSDKEvent);
    dataForEvent.backendNodeIds.push(123 as Protocol.DOM.BackendNodeId);

    // Now find the same event from the new engine
    const lcpNewEngineEvent = data.traceParsedData.PageLoadMetrics.allMarkerEvents.find(event => {
      return TraceEngine.Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(event);
    });
    if (!lcpNewEngineEvent) {
      throw new Error('Could not find LCP New engine event.');
    }
    // Make sure we got the matching events.
    assert.strictEqual(lcpNewEngineEvent, lcpSDKEvent.rawPayload());

    assert.strictEqual(
        TimelineModel.TimelineModel.EventOnTimelineData.forEvent(lcpSDKEvent).backendNodeIds,
        TimelineModel.TimelineModel.EventOnTimelineData.forEvent(lcpNewEngineEvent).backendNodeIds,
    );
  });

  it('stores data for a constructed event using the event as the key', async function() {
    const thread = StubbedThread.make(1);
    // None of the details here matter, we just need some constructed event.
    const fakeConstructedEvent = new TraceEngine.Legacy.ConstructedEvent(
        'blink.user_timing',
        'some-test-event',
        TraceEngine.Types.TraceEvents.Phase.INSTANT,
        100,
        thread,
    );
    const dataForEvent = TimelineModel.TimelineModel.EventOnTimelineData.forEvent(fakeConstructedEvent);
    dataForEvent.backendNodeIds.push(123 as Protocol.DOM.BackendNodeId);
    assert.strictEqual(dataForEvent, TimelineModel.TimelineModel.EventOnTimelineData.forEvent(fakeConstructedEvent));
  });

  it('extracts backend node ids and image url for a Decode Image event', async function() {
    const data = await TraceLoader.allModels(this, 'web-dev.json.gz');
    const allSDKEvents = getAllTracingModelPayloadEvents(data.tracingModel);

    const decodeImageEvent =
        allSDKEvents.find(event => event.name === TraceEngine.Types.TraceEvents.KnownEventName.DecodeImage);
    if (!decodeImageEvent) {
      throw new Error('Could not find Decode Image event Event.');
    }
    const dataForEvent = TimelineModel.TimelineModel.EventOnTimelineData.forEvent(decodeImageEvent);
    assert.strictEqual(dataForEvent.backendNodeIds[0], 240);
    assert.isTrue(dataForEvent.url?.includes('.jpg'));
  });
});
