// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';

import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {FakeStorage} from '../../helpers/TimelineHelpers.js';

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

describeWithEnvironment('TimelineModel', () => {
  let tracingModel: SDK.TracingModel.TracingModel;
  let timelineModel: TimelineModel.TimelineModel.TimelineModelImpl;

  function traceWithEvents(events: SDK.TracingManager.EventPayload[]) {
    tracingModel.addEvents((preamble as unknown as SDK.TracingManager.EventPayload[]).concat(events));
    tracingModel.tracingComplete();
    timelineModel.setEvents(tracingModel);
  }

  beforeEach(() => {
    tracingModel = new SDK.TracingModel.TracingModel(new FakeStorage());
    timelineModel = new TimelineModel.TimelineModel.TimelineModelImpl();
  });

  it('creates tracks for auction worklets', () => {
    traceWithEvents([
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
    ] as unknown as SDK.TracingManager.EventPayload[]);
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
      {
        name: '',
        type: TimelineModel.TimelineModel.TrackType.Experience,
        forMainFrame: false,
        url: Platform.DevToolsPath.EmptyUrlString,
        threadName: 'CrRendererMain',
        threadId: 1,
        processId: 1537729,
        processName: 'Renderer',
      },
    ]);
  });

  it('handles auction worklets running in renderer', () => {
    // Also shows it merging the different types, and not
    // throwing away another thread there.
    traceWithEvents([
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
    ] as unknown as SDK.TracingManager.EventPayload[]);
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
      {
        forMainFrame: false,
        name: '',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.Experience,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
    ]);
  });

  it('handles different URLs in same auction worklet thread', () => {
    traceWithEvents([
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
    ] as unknown as SDK.TracingManager.EventPayload[]);
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
      {
        forMainFrame: false,
        name: '',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.Experience,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
    ]);
  });

  it('includes utility process main thread, too', () => {
    traceWithEvents([
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
    ] as unknown as SDK.TracingManager.EventPayload[]);
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
      {
        forMainFrame: false,
        name: '',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: 'Experience',
        url: '',
      },
    ]);
  });

  it('handles auction worklet exit events', () => {
    traceWithEvents([
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
      // This last event is out of range.
      {
        'args': {},
        'cat': 'disabled-by-default-devtools.timeline',
        'dur': 10,
        'name': 'RunTaskC',
        'ph': 'X',
        'pid': 1538739,
        'tid': 7,
        'ts': 962633199670,
      },
    ] as unknown as SDK.TracingManager.EventPayload[]);
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
        name: '',
        type: TimelineModel.TimelineModel.TrackType.Experience,
        forMainFrame: false,
        url: Platform.DevToolsPath.EmptyUrlString,
        threadName: 'CrRendererMain',
        threadId: 1,
        processId: 1537729,
        processName: 'Renderer',
      },
    ]);

    // Now, verify that the actual track honors the timestamp boundaries.
    for (const track of timelineModel.tracks()) {
      if (track.name !== 'Bidder Worklet — https://192.168.0.105') {
        continue;
      }
      assert.deepEqual(track.events.map(event => event.name), ['RunTaskA', 'RunTaskB']);
    }
  });
});
