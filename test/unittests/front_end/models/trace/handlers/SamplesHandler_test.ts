// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {loadEventsFromTraceFile, defaultTraceEvent} from '../../../helpers/TraceHelpers.js';

/**
 * Builds a mock TraceEventComplete.
 */
function makeCompleteEvent(name: string, ts: number, dur: number, cat: string = '*', pid: number = 0, tid: number = 0):
    TraceModel.Types.TraceEvents.TraceEventComplete {
  return {
    args: {},
    cat,
    name,
    ph: TraceModel.Types.TraceEvents.TraceEventPhase.COMPLETE,
    pid: TraceModel.Types.TraceEvents.ProcessID(pid),
    tid: TraceModel.Types.TraceEvents.ThreadID(tid),
    ts: TraceModel.Types.Timing.MicroSeconds(ts),
    dur: TraceModel.Types.Timing.MicroSeconds(dur),
  };
}
/**
 * Builds a mock ProfileChunk.
 */
function makeProfileChunkEvent(
    nodes: {id: number, parent?: number, codeType?: string, url?: string, functionName?: string, scriptId?: number}[],
    samples: number[], timeDeltas: number[], ts: number, cat: string = '', pid: number = 0, tid: number = 0,
    id: string = ''): TraceModel.Types.TraceEvents.TraceEventProfileChunk {
  return {
    cat,
    name: 'ProfileChunk',
    ph: TraceModel.Types.TraceEvents.TraceEventPhase.SAMPLE,
    pid: TraceModel.Types.TraceEvents.ProcessID(pid),
    tid: TraceModel.Types.TraceEvents.ThreadID(tid),
    ts: TraceModel.Types.Timing.MicroSeconds(ts),
    id: TraceModel.Types.TraceEvents.ProfileID(id),
    args: {
      data: {
        cpuProfile: {
          samples: samples.map(TraceModel.Types.TraceEvents.CallFrameID),
          nodes: nodes.map(
              node => ({
                callFrame: {
                  codeType: node.codeType,
                  scriptId: node.scriptId ?? 0,
                  functionName: node.functionName ?? '',
                  url: node.url,
                },
                id: TraceModel.Types.TraceEvents.CallFrameID(node.id),
                parent: node.parent !== undefined ? TraceModel.Types.TraceEvents.CallFrameID(node.parent) : undefined,
              }),
              ),
        },
        timeDeltas: timeDeltas.map(TraceModel.Types.Timing.MicroSeconds),
      },
    },
  };
}
/**
 * Builds a mock ProfileSample.
 */
function makeProfileSample(ts: number, id: number = 0, pid: number = 0, tid: number = 0):
    TraceModel.Handlers.ModelHandlers.Samples.ProfileSample {
  return {
    topmostStackFrame: {nodeId: TraceModel.Types.TraceEvents.CallFrameID(id)},
    pid: TraceModel.Types.TraceEvents.ProcessID(pid),
    tid: TraceModel.Types.TraceEvents.ThreadID(tid),
    ts: TraceModel.Types.Timing.MicroSeconds(ts),
  };
}

async function handleEventsFromTraceFile(name: string):
    Promise<TraceModel.Handlers.ModelHandlers.Samples.SamplesHandlerData> {
  const traceEvents = await loadEventsFromTraceFile(name);
  TraceModel.Handlers.ModelHandlers.Meta.reset();
  TraceModel.Handlers.ModelHandlers.Samples.reset();

  TraceModel.Handlers.ModelHandlers.Meta.initialize();
  TraceModel.Handlers.ModelHandlers.Samples.initialize();

  for (const event of traceEvents) {
    TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
    TraceModel.Handlers.ModelHandlers.Samples.handleEvent(event);
  }

  await TraceModel.Handlers.ModelHandlers.Meta.finalize();
  await TraceModel.Handlers.ModelHandlers.Samples.finalize();

  return TraceModel.Handlers.ModelHandlers.Samples.data();
}

describe('SamplesHandler', () => {
  const withAllowedCodeType = {codeType: 'JS'};
  const withAllowedUrl = {url: 'http://example.com/script.js'};
  const withDisallowedCodeType = {codeType: 'C++'};
  const withDisallowedUrl = {url: 'extensions::foo'};

  it('finds all the profiles in a real world recording', async () => {
    const data = await handleEventsFromTraceFile('multiple-navigations-with-iframes.json.gz');

    const expectedId = TraceModel.Types.TraceEvents.ProfileID('0x1');
    const expectedPid = TraceModel.Types.TraceEvents.ProcessID(2236123);
    const expectedTid = TraceModel.Types.TraceEvents.ThreadID(1);

    const profiles = [...data.profiles];
    assert.strictEqual(profiles.length, 1);

    const [id, profile] = profiles[0];
    assert.strictEqual(id, expectedId, 'Profile ID is incorrect');

    assert.strictEqual(profile.head?.id, expectedId, 'Profile head ID is incorrect');
    assert.strictEqual(profile.head?.pid, expectedPid, 'Process head ID is incorrect');
    assert.strictEqual(profile.head?.tid, expectedTid, 'Thread head ID is incorrect');

    const processes = [...data.processes];
    assert.strictEqual(processes.length, 1);

    const [pid, process] = processes[0];
    assert.strictEqual(pid, expectedPid, 'Process ID is incorrect');

    const threads = [...process.threads];
    assert.strictEqual(threads.length, 1);

    const [tid, thread] = threads[0];
    assert.strictEqual(tid, expectedTid, 'Thread ID is incorrect');

    assert.strictEqual(thread.profile, profile, 'Profile is incorrect');
  });

  it('finds the only profile with samples in a real world recording (1)', async () => {
    const data = await handleEventsFromTraceFile('recursive-blocking-js.json.gz');
    assert.strictEqual(data.processes.size, 1);

    const process = [...data.processes.values()][0];
    assert.strictEqual(process.threads.size, 1);

    const thread = [...process.threads.values()][0];
    assert.strictEqual(thread.profile.chunks.length, 402);
  });

  it('finds the only profile with samples in a real world recording (2)', async () => {
    const data = await handleEventsFromTraceFile('recursive-counting-js.json.gz');
    assert.strictEqual(data.processes.size, 1);

    const process = [...data.processes.values()][0];
    assert.strictEqual(process.threads.size, 1);

    const thread = [...process.threads.values()][0];
    assert.strictEqual(thread.profile.chunks.length, 471);
  });

  it('calculates the total time in a real world recording (1)', async () => {
    const data = await handleEventsFromTraceFile('recursive-blocking-js.json.gz');
    assert.strictEqual(data.processes.size, 1);

    const process = [...data.processes.values()][0];
    assert.strictEqual(process.threads.size, 1);

    const thread = [...process.threads.values()][0];
    assert.strictEqual(thread.dur, TraceModel.Types.Timing.MicroSeconds(2960989));
  });

  it('calculates the total time in a real world recording (2)', async () => {
    const data = await handleEventsFromTraceFile('recursive-counting-js.json.gz');
    assert.strictEqual(data.processes.size, 1);

    const process = [...data.processes.values()][0];
    assert.strictEqual(process.threads.size, 1);

    const thread = [...process.threads.values()][0];
    assert.strictEqual(thread.dur, TraceModel.Types.Timing.MicroSeconds(3176990));
  });

  it('builds processes and threads', async () => {
    const profiles = new Map([
      [
        TraceModel.Types.TraceEvents.ProfileID('1'),
        {} as Partial<TraceModel.Handlers.ModelHandlers.Samples.SamplesProfile>,
      ],
      [
        TraceModel.Types.TraceEvents.ProfileID('2'),
        {
          head: {
            ...defaultTraceEvent,
            pid: TraceModel.Types.TraceEvents.ProcessID(21),
            tid: TraceModel.Types.TraceEvents.ThreadID(22),
            id: '2',
          },
        } as Partial<TraceModel.Handlers.ModelHandlers.Samples.SamplesProfile>,
      ],
      [
        TraceModel.Types.TraceEvents.ProfileID('3'),
        {
          chunks: [{...defaultTraceEvent}],
        } as Partial<TraceModel.Handlers.ModelHandlers.Samples.SamplesProfile>,
      ],
      [
        TraceModel.Types.TraceEvents.ProfileID('4'),
        {
          head: {
            ...defaultTraceEvent,
            pid: TraceModel.Types.TraceEvents.ProcessID(41),
            tid: TraceModel.Types.TraceEvents.ThreadID(42),
            id: '4',
          },
          chunks: [{...defaultTraceEvent}],
        } as Partial<TraceModel.Handlers.ModelHandlers.Samples.SamplesProfile>,
      ],
      [
        TraceModel.Types.TraceEvents.ProfileID('5'),
        {
          head: {
            ...defaultTraceEvent,
            pid: TraceModel.Types.TraceEvents.ProcessID(51),
            tid: TraceModel.Types.TraceEvents.ThreadID(52),
            id: '5',
          },
          chunks: [{...defaultTraceEvent}],
        } as Partial<TraceModel.Handlers.ModelHandlers.Samples.SamplesProfile>,
      ],
    ]);

    const processes =
        new Map<TraceModel.Types.TraceEvents.ProcessID, TraceModel.Handlers.ModelHandlers.Samples.SamplesProcess>();
    TraceModel.Handlers.ModelHandlers.Samples.buildProcessesAndThreads(profiles, processes);

    assert.strictEqual(processes.size, 2);

    const [pid1, process1] = [...processes][0];
    assert.strictEqual(pid1, TraceModel.Types.TraceEvents.ProcessID(41), 'Process ID is incorrect');
    const [pid2, process2] = [...processes][1];
    assert.strictEqual(pid2, TraceModel.Types.TraceEvents.ProcessID(51), 'Process ID is incorrect');

    const threads1 = [...process1.threads];
    assert.strictEqual(threads1.length, 1);
    const threads2 = [...process2.threads];
    assert.strictEqual(threads1.length, 1);

    const [tid1, thread1] = threads1[0];
    assert.strictEqual(tid1, TraceModel.Types.TraceEvents.ThreadID(42), 'Thread ID is incorrect');
    assert.strictEqual(thread1.profile.head.pid, TraceModel.Types.TraceEvents.ProcessID(41), 'Process ID is incorrect');
    assert.strictEqual(thread1.profile.head.tid, TraceModel.Types.TraceEvents.ThreadID(42), 'Thread ID is incorrect');
    assert.strictEqual(thread1.profile.chunks.length, 1, 'Unexpected chunks length');

    const [tid2, thread2] = threads2[0];
    assert.strictEqual(tid2, TraceModel.Types.TraceEvents.ThreadID(52), 'Thread ID is incorrect');
    assert.strictEqual(thread2.profile.head.pid, TraceModel.Types.TraceEvents.ProcessID(51), 'Process ID is incorrect');
    assert.strictEqual(thread2.profile.head.tid, TraceModel.Types.TraceEvents.ThreadID(52), 'Thread ID is incorrect');
    assert.strictEqual(thread2.profile.chunks.length, 1, 'Unexpected chunks length');
  });

  it('can correctly sort a list of profile samples', async () => {
    const data = [
      makeProfileSample(2, 0),
      makeProfileSample(1, 1),
      makeProfileSample(0, 2),
      makeProfileSample(0, 3),
      makeProfileSample(0.5, 4),
      makeProfileSample(1.5, 5),
      makeProfileSample(0.99, 6),
      makeProfileSample(1, 7),
      makeProfileSample(0.5, 8),
    ];

    TraceModel.Handlers.ModelHandlers.Samples.sortProfileSamples(data);

    assert.deepEqual(data.map(e => ({id: e.topmostStackFrame.nodeId, ts: e.ts})), [
      {id: 2, ts: 0},
      {id: 3, ts: 0},
      {id: 4, ts: 0.5},
      {id: 8, ts: 0.5},
      {id: 6, ts: 0.99},
      {id: 1, ts: 1},
      {id: 7, ts: 1},
      {id: 5, ts: 1.5},
      {id: 0, ts: 2},
    ]);
  });

  it('can collect stack traces', async () => {
    const mock = [
      makeProfileChunkEvent([{id: 0}, {id: 1, parent: 0}, {id: 2, parent: 1}], [], [], 0),
      makeProfileChunkEvent([{id: 3, parent: 0}, {id: 4, parent: 3}], [], [], 0),
      makeProfileChunkEvent([{id: 6}], [], [], 0),
      makeProfileChunkEvent([{id: 5, parent: 1}], [], [], 0),
      makeProfileChunkEvent([{id: 7, parent: 6}, {id: 8, parent: 7}], [], [], 0),
      makeProfileChunkEvent([], [], [], 0),
    ];

    const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mock);

    assert.deepEqual([...tree.nodes].map(([id, n]) => [id, {parent: n.parentId, children: [...n.childrenIds]}]) as {}, [
      [0, {parent: null, children: [1, 3]}],
      [1, {parent: 0, children: [2, 5]}],
      [2, {parent: 1, children: []}],
      [3, {parent: 0, children: [4]}],
      [4, {parent: 3, children: []}],
      [6, {parent: null, children: [7]}],
      [5, {parent: 1, children: []}],
      [7, {parent: 6, children: [8]}],
      [8, {parent: 7, children: []}],
    ]);
  });

  it('can collect and filter stack traces', async () => {
    const mock = [
      makeProfileChunkEvent([{id: 0, ...withDisallowedCodeType}, {id: 1, parent: 0}, {id: 2, parent: 1}], [], [], 0),
      makeProfileChunkEvent([{id: 3, parent: 0, ...withDisallowedUrl}, {id: 4, parent: 3}], [], [], 0),
      makeProfileChunkEvent([{id: 6, ...withDisallowedCodeType}], [], [], 0),
      makeProfileChunkEvent([{id: 5, parent: 1}], [], [], 0),
      makeProfileChunkEvent([{id: 7, parent: 6}, {id: 8, parent: 7}], [], [], 0),
      makeProfileChunkEvent([], [], [], 0),
    ];

    const tree =
        TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mock, {filterCodeTypes: true, filterUrls: true});

    assert.deepEqual([...tree.nodes].map(([id, n]) => [id, {parent: n.parentId, children: [...n.childrenIds]}]) as {}, [
      [1, {parent: 0, children: [2, 5]}],
      [2, {parent: 1, children: []}],
      [4, {parent: 3, children: []}],
      [5, {parent: 1, children: []}],
      [7, {parent: 6, children: [8]}],
      [8, {parent: 7, children: []}],
    ]);
  });

  it('can collect samples', async () => {
    const pid = TraceModel.Types.TraceEvents.ProcessID(0);
    const tid = TraceModel.Types.TraceEvents.ThreadID(1);
    const ts = TraceModel.Types.Timing.MicroSeconds(100);

    const mock = [
      makeProfileChunkEvent(
          [{id: 0}, {id: 1, parent: 0}, {id: 2, parent: 1}],
          [0, 0, 1, 2],
          [1, 2, -1, 2],
          0,
          ),
      makeProfileChunkEvent(
          [{id: 3, parent: 0}, {id: 4, parent: 3}],
          [0, 3, 4],
          [1, 9, -1],
          0,
          ),
    ];

    const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mock);
    const samples = TraceModel.Handlers.ModelHandlers.Samples.collectSamples(pid, tid, ts, tree, mock);

    assert.deepEqual(samples, [
      {topmostStackFrame: {nodeId: 0}, tid: 1, pid: 0, ts: 101},
      {topmostStackFrame: {nodeId: 1}, tid: 1, pid: 0, ts: 102},
      {topmostStackFrame: {nodeId: 0}, tid: 1, pid: 0, ts: 103},
      {topmostStackFrame: {nodeId: 2}, tid: 1, pid: 0, ts: 104},
      {topmostStackFrame: {nodeId: 0}, tid: 1, pid: 0, ts: 105},
      {topmostStackFrame: {nodeId: 4}, tid: 1, pid: 0, ts: 113},
      {topmostStackFrame: {nodeId: 3}, tid: 1, pid: 0, ts: 114},
    ]);
  });

  it('can collect and filter samples', async () => {
    const pid = TraceModel.Types.TraceEvents.ProcessID(0);
    const tid = TraceModel.Types.TraceEvents.ThreadID(1);
    const ts = TraceModel.Types.Timing.MicroSeconds(100);

    const mock = [
      makeProfileChunkEvent(
          [{id: 0, ...withDisallowedCodeType}, {id: 1, parent: 0}, {id: 2, parent: 1}],
          [0, 0, 1, 2],
          [1, 2, -1, 2],
          1000,
          ),
      makeProfileChunkEvent(
          [{id: 3, parent: 0, ...withDisallowedUrl}, {id: 4, parent: 3}],
          [0, 3, 4],
          [1, 9, -1],
          2000,
          ),
    ];

    const options = {filterCodeTypes: true, filterUrls: true};
    const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mock);
    const samples = TraceModel.Handlers.ModelHandlers.Samples.collectSamples(pid, tid, ts, tree, mock, options);

    assert.deepEqual(samples, [
      {topmostStackFrame: {nodeId: 1}, tid: 1, pid: 0, ts: 102},
      {topmostStackFrame: {nodeId: 2}, tid: 1, pid: 0, ts: 104},
      {topmostStackFrame: {nodeId: 4}, tid: 1, pid: 0, ts: 113},
    ]);
  });

  it('collects samples where the topmost stack frame is called by allowed code types', async () => {
    const pid = TraceModel.Types.TraceEvents.ProcessID(0);
    const tid = TraceModel.Types.TraceEvents.ThreadID(1);
    const ts = TraceModel.Types.Timing.MicroSeconds(100);

    const A = {id: 0, ...withAllowedUrl, ...withDisallowedCodeType};
    const B = {id: 1, ...withAllowedUrl, ...withAllowedCodeType};
    const C = {id: 2, ...withAllowedUrl, ...withDisallowedCodeType};
    const D = {id: 3, ...withAllowedUrl, ...withAllowedCodeType};

    const mock = [
      makeProfileChunkEvent(
          [A, {...B, parent: A.id}, {...C, parent: B.id}, {...D, parent: C.id}],
          [A.id, B.id, C.id, D.id],
          [1, 1, 1, 1],
          1000,
          ),
    ];

    const options = {filterCodeTypes: true, filterUrls: true};
    const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mock);
    const samples = TraceModel.Handlers.ModelHandlers.Samples.collectSamples(pid, tid, ts, tree, mock, options);

    assert.deepEqual(samples, [
      {topmostStackFrame: {nodeId: B.id}, tid: 1, pid: 0, ts: 102},
      {topmostStackFrame: {nodeId: B.id}, tid: 1, pid: 0, ts: 103},
      {topmostStackFrame: {nodeId: D.id}, tid: 1, pid: 0, ts: 104},
    ]);
  });

  it('collects samples where the topmost stack frame is called by allowed url', async () => {
    const pid = TraceModel.Types.TraceEvents.ProcessID(0);
    const tid = TraceModel.Types.TraceEvents.ThreadID(1);
    const ts = TraceModel.Types.Timing.MicroSeconds(100);

    const A = {id: 0, ...withAllowedCodeType, ...withDisallowedUrl};
    const B = {id: 1, ...withAllowedCodeType, ...withAllowedUrl};
    const C = {id: 2, ...withAllowedCodeType, ...withDisallowedUrl};
    const D = {id: 3, ...withAllowedCodeType, ...withAllowedUrl};

    const mock = [
      makeProfileChunkEvent(
          [A, {...B, parent: A.id}, {...C, parent: B.id}, {...D, parent: C.id}],
          [A.id, B.id, C.id, D.id],
          [1, 1, 1, 1],
          1000,
          ),
    ];

    const options = {filterCodeTypes: true, filterUrls: true};
    const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mock);
    const samples = TraceModel.Handlers.ModelHandlers.Samples.collectSamples(pid, tid, ts, tree, mock, options);

    assert.deepEqual(samples, [
      {topmostStackFrame: {nodeId: B.id}, tid: 1, pid: 0, ts: 102},
      {topmostStackFrame: {nodeId: B.id}, tid: 1, pid: 0, ts: 103},
      {topmostStackFrame: {nodeId: D.id}, tid: 1, pid: 0, ts: 104},
    ]);
  });

  it('can collect boundaries', async () => {
    /**
     * |------------- Task A -------------||-- Task E --|
     *  |-- Task B --||-- Task D --|
     *   |- Task C -|
     */
    const data = [
      makeCompleteEvent('A', 0, 10),  // 0..10
      makeCompleteEvent('B', 1, 3),   // 1..4
      makeCompleteEvent('D', 5, 3),   // 5..8
      makeCompleteEvent('C', 2, 1),   // 2..3
      makeCompleteEvent('E', 11, 3),  // 11..14
    ];

    const pid = TraceModel.Types.TraceEvents.ProcessID(0);
    const tid = TraceModel.Types.TraceEvents.ThreadID(0);
    const threads = new Map([[tid, data]]);
    const processes = new Map([[pid, threads]]);

    const boundaries =
        TraceModel.Handlers.ModelHandlers.Samples.collectBoundaries(processes, pid, tid, {filter: {has: () => true}});
    assert.deepEqual(boundaries, [0, 1, 2, 3, 4, 5, 8, 10, 11, 14]);
  });

  it('can collect and filter boundaries', async () => {
    /**
     * |------------- RunTask ------------||-- Paint --|
     *  |- ParseHTML -||- FunctionCall -|
     *   |- Layout -|
     */
    const data = [
      makeCompleteEvent(TraceModel.Handlers.Types.KnownEventName.RunTask, 0, 10),      // 0..10
      makeCompleteEvent(TraceModel.Handlers.Types.KnownEventName.ParseHTML, 1, 3),     // 1..4
      makeCompleteEvent(TraceModel.Handlers.Types.KnownEventName.FunctionCall, 5, 3),  // 5..8
      makeCompleteEvent(TraceModel.Handlers.Types.KnownEventName.Layout, 2, 1),        // 2..3
      makeCompleteEvent(TraceModel.Handlers.Types.KnownEventName.Paint, 11, 3),        // 11..14
    ];

    const pid = TraceModel.Types.TraceEvents.ProcessID(0);
    const tid = TraceModel.Types.TraceEvents.ThreadID(0);
    const threads = new Map([[tid, data]]);
    const processes = new Map([[pid, threads]]);

    const filter = new Set([TraceModel.Handlers.Types.EventCategory.Other, TraceModel.Handlers.Types.EventCategory.Js]);
    const boundaries = TraceModel.Handlers.ModelHandlers.Samples.collectBoundaries(processes, pid, tid, {filter});
    assert.deepEqual(boundaries, [0, 5, 8, 10]);
  });

  it('can build stack traces', async () => {
    const mock = [
      makeProfileChunkEvent([{id: 0}, {id: 1, parent: 0}, {id: 2, parent: 1}], [], [], 0),
      makeProfileChunkEvent([{id: 3, parent: 0}, {id: 4, parent: 3}], [], [], 0),
      makeProfileChunkEvent([{id: 6}], [], [], 0),
      makeProfileChunkEvent([{id: 5, parent: 1}], [], [], 0),
      makeProfileChunkEvent([{id: 7, parent: 6}, {id: 8, parent: 7}], [], [], 0),
      makeProfileChunkEvent([], [], [], 0),
    ];

    const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mock);

    const expected = [
      [0],
      [0, 1],
      [0, 1, 2],
      [0, 3],
      [0, 3, 4],
      [0, 1, 5],
      [6],
      [6, 7],
      [6, 7, 8],
    ];

    for (let i = 0; i < expected.length; i++) {
      const sample = {topmostStackFrame: {nodeId: TraceModel.Types.TraceEvents.CallFrameID(i)}} as
          TraceModel.Handlers.ModelHandlers.Samples.ProfileSample;
      const trace = TraceModel.Handlers.ModelHandlers.Samples.buildStackTraceAsCallFrameIdsFromId(
          tree, sample.topmostStackFrame.nodeId);
      assert.deepEqual(trace, expected[i]);
    }
  });

  it('can build profile calls', async () => {
    const mock = [
      makeProfileChunkEvent([{id: 0}, {id: 1, parent: 0}, {id: 2, parent: 1}], [], [], 0),
      makeProfileChunkEvent([{id: 3, parent: 0}, {id: 4, parent: 3}], [], [], 0),
      makeProfileChunkEvent([{id: 6}], [], [], 0),
      makeProfileChunkEvent([{id: 5, parent: 1}], [], [], 0),
      makeProfileChunkEvent([{id: 7, parent: 6}, {id: 8, parent: 7}], [], [], 0),
      makeProfileChunkEvent([], [], [], 0),
    ];

    const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mock);

    const expected = [
      {
        stackFrame: {nodeId: 0},
        dur: 0,
        selfDur: 0,
        children: [],
      },
      {
        stackFrame: {nodeId: 0},
        dur: 0,
        selfDur: 0,
        children: [
          {
            stackFrame: {nodeId: 1},
            dur: 0,
            selfDur: 0,
            children: [],
          },
        ],
      },
      {
        stackFrame: {nodeId: 0},
        dur: 0,
        selfDur: 0,
        children: [{
          stackFrame: {nodeId: 1},
          dur: 0,
          selfDur: 0,
          children: [
            {
              stackFrame: {nodeId: 2},
              dur: 0,
              selfDur: 0,
              children: [],
            },
          ],
        }],
      },
      {
        stackFrame: {nodeId: 0},
        dur: 0,
        selfDur: 0,
        children: [{
          stackFrame: {nodeId: 3},
          dur: 0,
          selfDur: 0,
          children: [],
        }],
      },
      {
        stackFrame: {nodeId: 0},
        dur: 0,
        selfDur: 0,
        children: [
          {
            stackFrame: {nodeId: 3},
            dur: 0,
            selfDur: 0,
            children: [
              {
                stackFrame: {nodeId: 4},
                dur: 0,
                selfDur: 0,
                children: [],
              },
            ],
          },
        ],
      },
      {
        stackFrame: {nodeId: 0},
        dur: 0,
        selfDur: 0,
        children: [
          {
            stackFrame: {nodeId: 1},
            dur: 0,
            selfDur: 0,
            children: [
              {
                stackFrame: {nodeId: 5},
                dur: 0,
                selfDur: 0,
                children: [],
              },
            ],
          },
        ],
      },
      {
        stackFrame: {nodeId: 6},
        dur: 0,
        selfDur: 0,
        children: [],
      },
      {
        stackFrame: {nodeId: 6},
        dur: 0,
        selfDur: 0,
        children: [
          {
            stackFrame: {nodeId: 7},
            dur: 0,
            selfDur: 0,
            children: [],
          },
        ],
      },
      {
        stackFrame: {nodeId: 6},
        dur: 0,
        selfDur: 0,
        children: [
          {
            stackFrame: {nodeId: 7},
            dur: 0,
            selfDur: 0,
            children: [
              {
                stackFrame: {nodeId: 8},
                dur: 0,
                selfDur: 0,
                children: [],
              },
            ],
          },
        ],
      },
    ];

    for (let i = 0; i < expected.length; i++) {
      const sample = {topmostStackFrame: {nodeId: TraceModel.Types.TraceEvents.CallFrameID(i)}} as
          TraceModel.Handlers.ModelHandlers.Samples.ProfileSample;
      const call = TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample);
      assert.deepEqual(JSON.stringify(call), JSON.stringify(expected[i]));
    }
  });

  describe('merging', () => {
    const A = 0;
    const B = 1;
    const C = 2;
    const D = 3;
    const E = 4;
    const X = 9;

    /**
     *   A   E
     *  / \
     * B   D
     * |
     * C
     */
    const mockChunks = [
      makeProfileChunkEvent([{id: A}, {id: B, parent: A}, {id: C, parent: B}], [], [], 0),
      makeProfileChunkEvent([{id: D, parent: A}], [], [], 0),
      makeProfileChunkEvent([{id: E}], [], [], 0),
      makeProfileChunkEvent([{id: X}], [], [], 0),
    ];

    /**
     * +------------> (sample at time)
     * |== 1 ==|== 2 ==|== 3 ==|== 4 ==|== 5 ==|== 6 ==|
     * |A|A|A|A|A|A|A|A|A|A|A|A|A|A|A|A|A| |E|E|E|E|E|E|
     * | |B|B|B|B|B|B| |D|D|D|D|D|D| | | | | | | | | | |
     * | | |C|C|C|C| | | | | | | | | | | | | | | | | | |
     * |
     * V (stack trace depth)
     */
    const mockSamples = [
      makeProfileSample(0, A),  makeProfileSample(1, B),  makeProfileSample(2, C),  makeProfileSample(3, C),
      makeProfileSample(4, C),  makeProfileSample(5, C),  makeProfileSample(6, B),  makeProfileSample(7, A),
      makeProfileSample(8, D),  makeProfileSample(9, D),  makeProfileSample(10, D), makeProfileSample(11, D),
      makeProfileSample(12, D), makeProfileSample(13, D), makeProfileSample(14, A), makeProfileSample(15, A),
      makeProfileSample(16, A), makeProfileSample(18, E), makeProfileSample(19, E), makeProfileSample(20, E),
      makeProfileSample(21, E), makeProfileSample(22, E), makeProfileSample(23, E),
    ];
    const mockEvents = [
      makeCompleteEvent('RunTask', 0, 4),   // 0..4
      makeCompleteEvent('RunTask', 4, 4),   // 4..8
      makeCompleteEvent('RunTask', 8, 4),   // 8..12
      makeCompleteEvent('RunTask', 12, 4),  // 12..16
      makeCompleteEvent('RunTask', 16, 4),  // 16..20
      makeCompleteEvent('RunTask', 20, 4),  // 20..24
    ];

    /**
     * +------------> (sample at time)
     * |==== 1 ====|==== 2 ====|==== 3 ====|==== 4 ====|
     * |A|A|A|X|A|A|A|X|A|A|A|X|A|A|A|A|A|X|E|E|E|E|E|E|
     * |B|B|B| |B|B|B| |D|D|D| |D|D| | | | | | | | | | |
     * |C|C|C| |C|C|B| |D|D|D| |D|D| | | | | | | | | | |
     * |
     * V (stack trace depth)
     */
    const mockSamples2 = [
      makeProfileSample(0, C),  makeProfileSample(1, C),  makeProfileSample(2, C),  makeProfileSample(3, X),
      makeProfileSample(4, C),  makeProfileSample(5, C),  makeProfileSample(6, B),  makeProfileSample(7, X),
      makeProfileSample(8, D),  makeProfileSample(9, D),  makeProfileSample(10, D), makeProfileSample(11, X),
      makeProfileSample(12, D), makeProfileSample(13, D), makeProfileSample(14, A), makeProfileSample(15, A),
      makeProfileSample(16, A), makeProfileSample(17, X), makeProfileSample(18, E), makeProfileSample(19, E),
      makeProfileSample(20, E), makeProfileSample(21, E), makeProfileSample(22, E), makeProfileSample(23, E),
    ];
    const mockEvents2 = [
      makeCompleteEvent('RunTask', 0, 6),   // 0..6
      makeCompleteEvent('RunTask', 6, 6),   // 6..12
      makeCompleteEvent('RunTask', 12, 6),  // 12..18
      makeCompleteEvent('RunTask', 18, 6),  // 18..24
    ];

    it('can merge samples (1)', async () => {
      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls =
          mockSamples.map(sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);

      const expected = [
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 0,
          dur: 16,
          selfDur: 6,
          children: [
            {
              stackFrame: {nodeId: 1},
              tid: 0,
              pid: 0,
              ts: 1,
              dur: 5,
              selfDur: 2,
              children: [{
                stackFrame: {nodeId: 2},
                tid: 0,
                pid: 0,
                ts: 2,
                dur: 3,
                selfDur: 3,
                children: [],
              }],
            },
            {
              stackFrame: {nodeId: 3},
              tid: 0,
              pid: 0,
              ts: 8,
              dur: 5,
              selfDur: 5,
              children: [],
            },
          ],
        },
        {
          stackFrame: {nodeId: 4},
          tid: 0,
          pid: 0,
          ts: 18,
          dur: 5,
          selfDur: 5,
          children: [],
        },
      ];

      assert.deepEqual(JSON.stringify(merged), JSON.stringify(expected));
    });

    it('can merge samples with boundaries (1)', async () => {
      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls =
          mockSamples.map(sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));

      const pid = TraceModel.Types.TraceEvents.ProcessID(0);
      const tid = TraceModel.Types.TraceEvents.ThreadID(0);
      const threads = new Map([[tid, mockEvents]]);
      const processes = new Map([[pid, threads]]);
      const boundaries =
          TraceModel.Handlers.ModelHandlers.Samples.collectBoundaries(processes, pid, tid, {filter: {has: () => true}});
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, boundaries);

      const expected = [
        /* Task 1 */
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 0,
          dur: 3,
          selfDur: 1,
          children: [{
            stackFrame: {nodeId: 1},
            tid: 0,
            pid: 0,
            ts: 1,
            dur: 2,
            selfDur: 1,
            children: [{
              stackFrame: {nodeId: 2},
              tid: 0,
              pid: 0,
              ts: 2,
              dur: 1,
              selfDur: 1,
              children: [],
            }],
          }],
        },
        /* Task 2 */
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 4,
          dur: 3,
          selfDur: 1,
          children: [{
            stackFrame: {nodeId: 1},
            tid: 0,
            pid: 0,
            ts: 4,
            dur: 2,
            selfDur: 1,
            children: [{
              stackFrame: {nodeId: 2},
              tid: 0,
              pid: 0,
              ts: 4,
              dur: 1,
              selfDur: 1,
              children: [],
            }],
          }],
        },
        /* Task 3 */
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 8,
          dur: 3,
          selfDur: 0,
          children: [{
            stackFrame: {nodeId: 3},
            tid: 0,
            pid: 0,
            ts: 8,
            dur: 3,
            selfDur: 3,
            children: [],
          }],
        },
        /* Task 4 */
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 12,
          dur: 3,
          selfDur: 2,
          children: [{
            stackFrame: {nodeId: 3},
            tid: 0,
            pid: 0,
            ts: 12,
            dur: 1,
            selfDur: 1,
            children: [],
          }],
        },
        /* Task 5 */
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 16,
          dur: 0,
          selfDur: 0,
          children: [],
        },
        {
          stackFrame: {nodeId: 4},
          tid: 0,
          pid: 0,
          ts: 18,
          dur: 1,
          selfDur: 1,
          children: [],
        },
        /* Task 6 */
        {
          stackFrame: {nodeId: 4},
          tid: 0,
          pid: 0,
          ts: 20,
          dur: 3,
          selfDur: 3,
          children: [],
        },
      ];

      assert.deepEqual(JSON.stringify(merged), JSON.stringify(expected));
    });

    it('can merge samples (2)', async () => {
      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls = mockSamples2.map(
          sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);

      const expected = [
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 0,
          dur: 2,
          selfDur: 0,
          children: [{
            stackFrame: {nodeId: 1},
            tid: 0,
            pid: 0,
            ts: 0,
            dur: 2,
            selfDur: 0,
            children: [{
              stackFrame: {nodeId: 2},
              tid: 0,
              pid: 0,
              ts: 0,
              dur: 2,
              selfDur: 2,
              children: [],
            }],
          }],
        },
        {
          stackFrame: {nodeId: 9},
          tid: 0,
          pid: 0,
          ts: 3,
          dur: 0,
          selfDur: 0,
          children: [],
        },
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 4,
          dur: 2,
          selfDur: 0,
          children: [{
            stackFrame: {nodeId: 1},
            tid: 0,
            pid: 0,
            ts: 4,
            dur: 2,
            selfDur: 1,
            children: [{
              stackFrame: {nodeId: 2},
              tid: 0,
              pid: 0,
              ts: 4,
              dur: 1,
              selfDur: 1,
              children: [],
            }],
          }],
        },
        {
          stackFrame: {nodeId: 9},
          tid: 0,
          pid: 0,
          ts: 7,
          dur: 0,
          selfDur: 0,
          children: [],
        },
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 8,
          dur: 2,
          selfDur: 0,
          children: [{
            stackFrame: {nodeId: 3},
            tid: 0,
            pid: 0,
            ts: 8,
            dur: 2,
            selfDur: 2,
            children: [],
          }],
        },
        {
          stackFrame: {nodeId: 9},
          tid: 0,
          pid: 0,
          ts: 11,
          dur: 0,
          selfDur: 0,
          children: [],
        },
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 12,
          dur: 4,
          selfDur: 3,
          children: [{
            stackFrame: {nodeId: 3},
            tid: 0,
            pid: 0,
            ts: 12,
            dur: 1,
            selfDur: 1,
            children: [],
          }],
        },
        {
          stackFrame: {nodeId: 9},
          tid: 0,
          pid: 0,
          ts: 17,
          dur: 0,
          selfDur: 0,
          children: [],
        },
        {
          stackFrame: {nodeId: 4},
          tid: 0,
          pid: 0,
          ts: 18,
          dur: 5,
          selfDur: 5,
          children: [],
        },
      ];

      assert.deepEqual(JSON.stringify(merged), JSON.stringify(expected));
    });

    it('can merge samples with boundaries (2)', async () => {
      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls = mockSamples2.map(
          sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));

      const pid = TraceModel.Types.TraceEvents.ProcessID(0);
      const tid = TraceModel.Types.TraceEvents.ThreadID(0);
      const threads = new Map([[tid, mockEvents2]]);
      const processes = new Map([[pid, threads]]);
      const boundaries =
          TraceModel.Handlers.ModelHandlers.Samples.collectBoundaries(processes, pid, tid, {filter: {has: () => true}});
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, boundaries);

      const expected = [
        /* Task 1 */
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 0,
          dur: 2,
          selfDur: 0,
          children: [{
            stackFrame: {nodeId: 1},
            tid: 0,
            pid: 0,
            ts: 0,
            dur: 2,
            selfDur: 0,
            children: [{
              stackFrame: {nodeId: 2},
              tid: 0,
              pid: 0,
              ts: 0,
              dur: 2,
              selfDur: 2,
              children: [],
            }],
          }],
        },
        {
          stackFrame: {nodeId: 9},
          tid: 0,
          pid: 0,
          ts: 3,
          dur: 0,
          selfDur: 0,
          children: [],
        },
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 4,
          dur: 1,
          selfDur: 0,
          children: [{
            stackFrame: {nodeId: 1},
            tid: 0,
            pid: 0,
            ts: 4,
            dur: 1,
            selfDur: 0,
            children: [{
              stackFrame: {nodeId: 2},
              tid: 0,
              pid: 0,
              ts: 4,
              dur: 1,
              selfDur: 1,
              children: [],
            }],
          }],
        },
        /* Task 2 */
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 6,
          dur: 0,
          selfDur: 0,
          children: [{
            stackFrame: {nodeId: 1},
            tid: 0,
            pid: 0,
            ts: 6,
            dur: 0,
            selfDur: 0,
            children: [],
          }],
        },
        {
          stackFrame: {nodeId: 9},
          tid: 0,
          pid: 0,
          ts: 7,
          dur: 0,
          selfDur: 0,
          children: [],
        },
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 8,
          dur: 2,
          selfDur: 0,
          children: [{
            stackFrame: {nodeId: 3},
            tid: 0,
            pid: 0,
            ts: 8,
            dur: 2,
            selfDur: 2,
            children: [],
          }],
        },
        {
          stackFrame: {nodeId: 9},
          tid: 0,
          pid: 0,
          ts: 11,
          dur: 0,
          selfDur: 0,
          children: [],
        },
        /* Task 3 */
        {
          stackFrame: {nodeId: 0},
          tid: 0,
          pid: 0,
          ts: 12,
          dur: 4,
          selfDur: 3,
          children: [{
            stackFrame: {nodeId: 3},
            tid: 0,
            pid: 0,
            ts: 12,
            dur: 1,
            selfDur: 1,
            children: [],
          }],
        },
        {
          stackFrame: {nodeId: 9},
          tid: 0,
          pid: 0,
          ts: 17,
          dur: 0,
          selfDur: 0,
          children: [],
        },
        /* Task 4 */
        {
          stackFrame: {nodeId: 4},
          tid: 0,
          pid: 0,
          ts: 18,
          dur: 5,
          selfDur: 5,
          children: [],
        },
      ];

      assert.deepEqual(JSON.stringify(merged), JSON.stringify(expected));
    });
  });

  describe('merging', () => {
    const X = {id: 0, functionName: 'X'};
    const Y = {id: 10, functionName: 'Y'};
    const Y2 = {id: 11, functionName: 'Y'};
    const Z = {id: 20, functionName: 'Z'};
    const Z2 = {id: 21, functionName: 'Z'};
    const W = {id: 30, functionName: 'W'};

    it('can correctly merge consecutive samples (1)', async () => {
      /**
       * X Z
       * | |
       * Y Y
       */
      const mockChunks = [
        makeProfileChunkEvent([X, {...Y, parent: X.id}], [], [], 0),
        makeProfileChunkEvent([Z, {...Y2, parent: Z.id}], [], [], 0),
      ];

      /**
       * +------------> (sample at time)
       * |
       * |X|X|X|Z|Z|Z|
       * |   |Y|Y|
       * |
       * V (stack trace depth)
       */
      const mockSamples = [
        makeProfileSample(0, X.id),
        makeProfileSample(1, X.id),
        makeProfileSample(2, Y.id),
        makeProfileSample(3, Y2.id),
        makeProfileSample(4, Z.id),
        makeProfileSample(5, Z.id),
      ];

      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls =
          mockSamples.map(sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);

      const expected = [
        {
          'stackFrame': {'nodeId': 0},
          'tid': 0,
          'pid': 0,
          'ts': 0,
          'dur': 2,
          'selfDur': 2,
          'children': [{
            'stackFrame': {'nodeId': 10},
            'tid': 0,
            'pid': 0,
            'ts': 2,
            'dur': 0,
            'selfDur': 0,
            'children': [],
          }],
        },
        {
          'stackFrame': {'nodeId': 20},
          'tid': 0,
          'pid': 0,
          'ts': 3,
          'dur': 2,
          'selfDur': 2,
          'children': [{
            'stackFrame': {'nodeId': 11},
            'tid': 0,
            'pid': 0,
            'ts': 3,
            'dur': 0,
            'selfDur': 0,
            'children': [],
          }],
        },
      ];

      assert.deepEqual(JSON.stringify(merged), JSON.stringify(expected));
    });

    it('can correctly merge consecutive samples (2)', async () => {
      /**
       * X Z
       * |
       * Y
       */
      const mockChunks = [
        makeProfileChunkEvent([X, {...Y, parent: X.id}], [], [], 0),
        makeProfileChunkEvent([Z], [], [], 0),
      ];

      /**
       * +------------> (sample at time)
       * |
       * |X|X|X|Z|X|X|X|
       * |   |Y| |Y|
       * |
       * V (stack trace depth)
       */
      const mockSamples = [
        makeProfileSample(0, X.id),
        makeProfileSample(1, X.id),
        makeProfileSample(2, Y.id),
        makeProfileSample(3, Z.id),
        makeProfileSample(4, Y.id),
        makeProfileSample(5, X.id),
        makeProfileSample(6, X.id),
      ];

      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls =
          mockSamples.map(sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);

      const expected = [
        {
          'stackFrame': {'nodeId': 0},
          'tid': 0,
          'pid': 0,
          'ts': 0,
          'dur': 2,
          'selfDur': 2,
          'children': [{
            'stackFrame': {'nodeId': 10},
            'tid': 0,
            'pid': 0,
            'ts': 2,
            'dur': 0,
            'selfDur': 0,
            'children': [],
          }],
        },
        {
          'stackFrame': {'nodeId': 20},
          'tid': 0,
          'pid': 0,
          'ts': 3,
          'dur': 0,
          'selfDur': 0,
          'children': [],
        },
        {
          'stackFrame': {'nodeId': 0},
          'tid': 0,
          'pid': 0,
          'ts': 4,
          'dur': 2,
          'selfDur': 2,
          'children': [{
            'stackFrame': {'nodeId': 10},
            'tid': 0,
            'pid': 0,
            'ts': 4,
            'dur': 0,
            'selfDur': 0,
            'children': [],
          }],
        },
      ];

      assert.deepEqual(JSON.stringify(merged), JSON.stringify(expected));
    });

    it('can correctly merge consecutive samples (3)', async () => {
      /**
       *   X
       *  / \
       * Y   W
       * |   |
       * Z   Z
       */
      const mockChunks = [
        makeProfileChunkEvent([X, {...Y, parent: X.id}, {...Z, parent: Y.id}], [], [], 0),
        makeProfileChunkEvent([{...W, parent: X.id}, {...Z2, parent: W.id}], [], [], 0),
      ];

      /**
       * +------------> (sample at time)
       * |
       * |X|X|X|X|X|X|
       * |Y|Y|Y|W|W|W|
       * |Z|Z|Z|Z|Z|Z|
       * |
       * V (stack trace depth)
       */
      const mockSamples = [
        makeProfileSample(0, Z.id),
        makeProfileSample(1, Z.id),
        makeProfileSample(2, Z.id),
        makeProfileSample(3, Z2.id),
        makeProfileSample(4, Z2.id),
        makeProfileSample(5, Z2.id),
      ];

      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls =
          mockSamples.map(sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);

      const expected = [{
        'stackFrame': {'nodeId': 0},
        'tid': 0,
        'pid': 0,
        'ts': 0,
        'dur': 5,
        'selfDur': 1,
        'children': [
          {
            'stackFrame': {'nodeId': 10},
            'tid': 0,
            'pid': 0,
            'ts': 0,
            'dur': 2,
            'selfDur': 0,
            'children': [{
              'stackFrame': {'nodeId': 20},
              'tid': 0,
              'pid': 0,
              'ts': 0,
              'dur': 2,
              'selfDur': 2,
              'children': [],
            }],
          },
          {
            'stackFrame': {'nodeId': 30},
            'tid': 0,
            'pid': 0,
            'ts': 3,
            'dur': 2,
            'selfDur': 0,
            'children': [{
              'stackFrame': {'nodeId': 21},
              'tid': 0,
              'pid': 0,
              'ts': 3,
              'dur': 2,
              'selfDur': 2,
              'children': [],
            }],
          },
        ],
      }];

      assert.deepEqual(JSON.stringify(merged), JSON.stringify(expected));
    });

    it('can correctly merge consecutive samples (4)', async () => {
      /**
       *   X
       *  / \
       * Y   Y (e.g. same function name, but in a different script)
       */
      const mockChunks = [
        makeProfileChunkEvent([X, {...Y, parent: X.id}], [], [], 0),
        makeProfileChunkEvent([{...Y2, parent: X.id}], [], [], 0),
      ];

      /**
       * +------------> (sample at time)
       * |
       * |X|X|X|X|X|X|
       * |Y|Y|Y|Y|Y|Y|
       * |
       * V (stack trace depth)
       */
      const mockSamples = [
        makeProfileSample(0, Y.id),
        makeProfileSample(1, Y.id),
        makeProfileSample(2, Y.id),
        makeProfileSample(3, Y2.id),
        makeProfileSample(4, Y2.id),
        makeProfileSample(5, Y2.id),
      ];

      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls =
          mockSamples.map(sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);

      const expected = [{
        'stackFrame': {'nodeId': 0},
        'tid': 0,
        'pid': 0,
        'ts': 0,
        'dur': 5,
        'selfDur': 1,
        'children': [
          {
            'stackFrame': {'nodeId': 10},
            'tid': 0,
            'pid': 0,
            'ts': 0,
            'dur': 2,
            'selfDur': 2,
            'children': [],
          },
          {
            'stackFrame': {'nodeId': 11},
            'tid': 0,
            'pid': 0,
            'ts': 3,
            'dur': 2,
            'selfDur': 2,
            'children': [],
          },
        ],
      }];

      assert.deepEqual(JSON.stringify(merged), JSON.stringify(expected));
    });

    it('can correctly merge consecutive samples (5)', async () => {
      /**
       *   X
       *   |
       *   Y
       *  / \
       * Z   Z (e.g. same function name, but in a different script)
       */
      const mockChunks = [
        makeProfileChunkEvent([X, {...Y, parent: X.id}, {...Z, parent: Y.id}], [], [], 0),
        makeProfileChunkEvent([{...Z2, parent: Y.id}], [], [], 0),
      ];

      /**
       * +------------> (sample at time)
       * |
       * |X|X|X|X|X|X|
       * |Y|Y|Y|Y|Y|Y|
       * |Z|Z|Z|Z|Z|Z|
       * |
       * V (stack trace depth)
       */
      const mockSamples = [
        makeProfileSample(0, Z.id),
        makeProfileSample(1, Z.id),
        makeProfileSample(2, Z.id),
        makeProfileSample(3, Z2.id),
        makeProfileSample(4, Z2.id),
        makeProfileSample(5, Z2.id),
      ];

      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls =
          mockSamples.map(sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);

      const expected = [{
        'stackFrame': {'nodeId': 0},
        'tid': 0,
        'pid': 0,
        'ts': 0,
        'dur': 5,
        'selfDur': 0,
        'children': [{
          'stackFrame': {'nodeId': 10},
          'tid': 0,
          'pid': 0,
          'ts': 0,
          'dur': 5,
          'selfDur': 1,
          'children': [
            {
              'stackFrame': {'nodeId': 20},
              'tid': 0,
              'pid': 0,
              'ts': 0,
              'dur': 2,
              'selfDur': 2,
              'children': [],
            },
            {
              'stackFrame': {'nodeId': 21},
              'tid': 0,
              'pid': 0,
              'ts': 3,
              'dur': 2,
              'selfDur': 2,
              'children': [],
            },
          ],
        }],
      }];

      assert.deepEqual(JSON.stringify(merged), JSON.stringify(expected));
    });

    it('can correctly merge consecutive samples (6)', async () => {
      /**
       *   X
       *  / \
       * Y   Y (e.g. same function name, but in a different script)
       * |   |
       * Z   Z
       */
      const mockChunks = [
        makeProfileChunkEvent([X, {...Y, parent: X.id}, {...Z, parent: Y.id}], [], [], 0),
        makeProfileChunkEvent([{...Y2, parent: X.id}, {...Z2, parent: Y2.id}], [], [], 0),
      ];

      /**
       * +------------> (sample at time)
       * |
       * |X|X|X|X|X|X|
       * |Y|Y|Y|Y|Y|Y|
       * |Z|Z|Z|Z|Z|Z|
       * |
       * V (stack trace depth)
       */
      const mockSamples = [
        makeProfileSample(0, Z.id),
        makeProfileSample(1, Z.id),
        makeProfileSample(2, Z.id),
        makeProfileSample(3, Z2.id),
        makeProfileSample(4, Z2.id),
        makeProfileSample(5, Z2.id),
      ];

      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls =
          mockSamples.map(sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);

      const expected = [{
        'stackFrame': {'nodeId': 0},
        'tid': 0,
        'pid': 0,
        'ts': 0,
        'dur': 5,
        'selfDur': 1,
        'children': [
          {
            'stackFrame': {'nodeId': 10},
            'tid': 0,
            'pid': 0,
            'ts': 0,
            'dur': 2,
            'selfDur': 0,
            'children': [{
              'stackFrame': {'nodeId': 20},
              'tid': 0,
              'pid': 0,
              'ts': 0,
              'dur': 2,
              'selfDur': 2,
              'children': [],
            }],
          },
          {
            'stackFrame': {'nodeId': 11},
            'tid': 0,
            'pid': 0,
            'ts': 3,
            'dur': 2,
            'selfDur': 0,
            'children': [{
              'stackFrame': {'nodeId': 21},
              'tid': 0,
              'pid': 0,
              'ts': 3,
              'dur': 2,
              'selfDur': 2,
              'children': [],
            }],
          },
        ],
      }];

      assert.deepEqual(JSON.stringify(merged), JSON.stringify(expected));
    });
  });

  describe('insights helpers', () => {
    const A = 0;
    const B = 1;
    const C = 2;
    const D = 3;
    const E = 4;
    const X = 9;

    /**
     *   A   E X
     *  / \
     * B   D
     * |
     * C
     */
    const mockChunks = [
      makeProfileChunkEvent([{id: A}, {id: B, parent: A}, {id: C, parent: B}], [], [], 0),
      makeProfileChunkEvent([{id: D, parent: A}], [], [], 0),
      makeProfileChunkEvent([{id: E}], [], [], 0),
      makeProfileChunkEvent([{id: X}], [], [], 0),
    ];

    /**
     * +------------> (sample at time)
     * |
     * |A|A|A|A|A|A|A|A|A|A|A|A|A|A|A|A|A| |E|E|E|E|E|E|
     * | |B|B|B|B|B|B| |D|D|D|D|D|D| | | | | | | | | | |
     * | | |C|C|C|C| | | | | | | | | | | | | | | | | | |
     * |
     * V (stack trace depth)
     */
    const mockSamples1 = [
      makeProfileSample(0, A),  makeProfileSample(1, B),  makeProfileSample(2, C),  makeProfileSample(3, C),
      makeProfileSample(4, C),  makeProfileSample(5, C),  makeProfileSample(6, B),  makeProfileSample(7, A),
      makeProfileSample(8, D),  makeProfileSample(9, D),  makeProfileSample(10, D), makeProfileSample(11, D),
      makeProfileSample(12, D), makeProfileSample(13, D), makeProfileSample(14, A), makeProfileSample(15, A),
      makeProfileSample(16, A), makeProfileSample(18, E), makeProfileSample(19, E), makeProfileSample(20, E),
      makeProfileSample(21, E), makeProfileSample(22, E), makeProfileSample(23, E),
    ];

    /**
     * +------------> (sample at time)
     * |
     * |A|A|A|X|A|A|A|X|A|A|A|X|A|A|A|A|A|X|E|E|E|E|E|E|
     * |B|B|B| |B|B|B| |D|D|D| |D|D| | | | | | | | | | |
     * |C|C|C| |C|C|B| |D|D|D| |D|D| | | | | | | | | | |
     * |
     * V (stack trace depth)
     */
    const mockSamples2 = [
      makeProfileSample(0, C),  makeProfileSample(1, C),  makeProfileSample(2, C),  makeProfileSample(3, X),
      makeProfileSample(4, C),  makeProfileSample(5, C),  makeProfileSample(6, B),  makeProfileSample(7, X),
      makeProfileSample(8, D),  makeProfileSample(9, D),  makeProfileSample(10, D), makeProfileSample(11, X),
      makeProfileSample(12, D), makeProfileSample(13, D), makeProfileSample(14, A), makeProfileSample(15, A),
      makeProfileSample(16, A), makeProfileSample(17, X), makeProfileSample(18, E), makeProfileSample(19, E),
      makeProfileSample(20, E), makeProfileSample(21, E), makeProfileSample(22, E), makeProfileSample(23, E),
    ];

    it('can get all functions between timestamps (1)', async () => {
      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls = mockSamples1.map(
          sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);
      const begin = TraceModel.Types.Timing.MicroSeconds(0);
      const end = TraceModel.Types.Timing.MicroSeconds(23);
      const infos = TraceModel.Handlers.ModelHandlers.Samples.getAllFunctionsBetweenTimestamps(merged, begin, end);

      const simplified = [...infos].map(
          fun => [fun.stackFrame.nodeId, {calls: fun.calls.length, total: fun.durPercent, self: fun.selfDurPercent}]);

      const expected = [
        [0, {'calls': 1, 'total': 69.56521739130434, 'self': 26.08695652173913}],
        [1, {'calls': 1, 'total': 21.73913043478261, 'self': 8.695652173913043}],
        [2, {'calls': 1, 'total': 13.043478260869565, 'self': 13.043478260869565}],
        [3, {'calls': 1, 'total': 21.73913043478261, 'self': 21.73913043478261}],
        [4, {'calls': 1, 'total': 21.73913043478261, 'self': 21.73913043478261}],
      ];

      assert.strictEqual(JSON.stringify(simplified), JSON.stringify(expected));
    });

    it('can get all functions between timestamps (2)', async () => {
      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls = mockSamples2.map(
          sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);
      const begin = TraceModel.Types.Timing.MicroSeconds(0);
      const end = TraceModel.Types.Timing.MicroSeconds(23);
      const infos = TraceModel.Handlers.ModelHandlers.Samples.getAllFunctionsBetweenTimestamps(merged, begin, end);

      const simplified = [...infos].map(
          fun => [fun.stackFrame.nodeId, {calls: fun.calls.length, total: fun.durPercent, self: fun.selfDurPercent}]);

      const expected = [
        [0, {'calls': 4, 'total': 43.47826086956522, 'self': 13.043478260869565}],
        [1, {'calls': 2, 'total': 17.391304347826086, 'self': 4.3478260869565215}],
        [2, {'calls': 2, 'total': 13.043478260869565, 'self': 13.043478260869565}],
        [9, {'calls': 4, 'total': 0, 'self': 0}],
        [3, {'calls': 2, 'total': 13.043478260869565, 'self': 13.043478260869565}],
        [4, {'calls': 1, 'total': 21.73913043478261, 'self': 21.73913043478261}],
      ];

      assert.strictEqual(JSON.stringify(simplified), JSON.stringify(expected));
    });

    it('can get all hot functions between timestamps (1)', async () => {
      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls = mockSamples1.map(
          sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);
      const begin = TraceModel.Types.Timing.MicroSeconds(0);
      const end = TraceModel.Types.Timing.MicroSeconds(23);
      const infos =
          TraceModel.Handlers.ModelHandlers.Samples.getAllHotFunctionsBetweenTimestamps(merged, begin, end, 20);

      const simplified = [...infos].map(
          fun => [fun.stackFrame.nodeId, {calls: fun.calls.length, total: fun.durPercent, self: fun.selfDurPercent}]);

      const expected = [
        [0, {'calls': 1, 'total': 69.56521739130434, 'self': 26.08695652173913}],
        [3, {'calls': 1, 'total': 21.73913043478261, 'self': 21.73913043478261}],
        [4, {'calls': 1, 'total': 21.73913043478261, 'self': 21.73913043478261}],
      ];

      assert.strictEqual(JSON.stringify(simplified), JSON.stringify(expected));
    });

    it('can get all hot functions between timestamps (2)', async () => {
      const tree = TraceModel.Handlers.ModelHandlers.Samples.collectStackTraces(mockChunks);
      const calls = mockSamples2.map(
          sample => TraceModel.Handlers.ModelHandlers.Samples.buildProfileCallFromSample(tree, sample));
      const {calls: merged} = TraceModel.Handlers.ModelHandlers.Samples.mergeCalls(calls, []);
      const begin = TraceModel.Types.Timing.MicroSeconds(0);
      const end = TraceModel.Types.Timing.MicroSeconds(23);
      const infos =
          TraceModel.Handlers.ModelHandlers.Samples.getAllHotFunctionsBetweenTimestamps(merged, begin, end, 10);

      const simplified = [...infos].map(
          fun => [fun.stackFrame.nodeId, {calls: fun.calls.length, total: fun.durPercent, self: fun.selfDurPercent}]);

      const expected = [
        [4, {'calls': 1, 'total': 21.73913043478261, 'self': 21.73913043478261}],
        [0, {'calls': 4, 'total': 43.47826086956522, 'self': 13.043478260869565}],
        [2, {'calls': 2, 'total': 13.043478260869565, 'self': 13.043478260869565}],
        [3, {'calls': 2, 'total': 13.043478260869565, 'self': 13.043478260869565}],
      ];

      assert.strictEqual(JSON.stringify(simplified), JSON.stringify(expected));
    });
  });
});
