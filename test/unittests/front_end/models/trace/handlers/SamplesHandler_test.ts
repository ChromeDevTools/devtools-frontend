// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import type * as CPUProfile from '../../../../../../front_end/models/cpu_profile/cpu_profile.js';

import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {getMainThread} from '../../../helpers/TraceHelpers.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

async function handleEventsFromTraceFile(context: Mocha.Context|Mocha.Suite|null, name: string):
    Promise<TraceModel.Handlers.ModelHandlers.Samples.SamplesHandlerData> {
  const traceEvents = await TraceLoader.rawEvents(context, name);
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

describeWithEnvironment('SamplesHandler', function() {
  it('finds all the profiles in a real world recording', async () => {
    const data = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');
    // The same thread id is shared across profiles in the profiled
    // processes.
    const threadId = TraceModel.Types.TraceEvents.ThreadID(1);
    const firstProcessId = TraceModel.Types.TraceEvents.ProcessID(2236123);
    const secondProcessId = TraceModel.Types.TraceEvents.ProcessID(2154214);
    const thirdProcessId = TraceModel.Types.TraceEvents.ProcessID(2236084);

    assert.strictEqual(data.profilesInProcess.size, 3);

    const profilesFirstProcess = data.profilesInProcess.get(firstProcessId);
    assert.strictEqual(profilesFirstProcess?.size, 1);
    assert.isDefined(profilesFirstProcess?.get(threadId));

    const profilesSecondProcess = data.profilesInProcess.get(secondProcessId);
    assert.strictEqual(profilesSecondProcess?.size, 1);
    assert.isDefined(profilesSecondProcess?.get(threadId));

    const profilesThirdProcess = data.profilesInProcess.get(thirdProcessId);
    assert.strictEqual(profilesThirdProcess?.size, 1);
    assert.isDefined(profilesThirdProcess?.get(threadId));
  });
  describe('profile calls building', () => {
    const pid = TraceModel.Types.TraceEvents.ProcessID(0);
    const id = TraceModel.Types.TraceEvents.ProfileID('0');
    const tid = TraceModel.Types.TraceEvents.ThreadID(1);

    function makeProfileChunkEvent(
        nodes: {
          id: number,
          children: number[],
          codeType?: string,
          url?: string,
          functionName?: string,
          scriptId?: number,
        }[],
        samples: number[],
        timeDeltas: number[],
        ts: number,
        ): TraceModel.Types.TraceEvents.TraceEventProfileChunk {
      return {
        cat: '',
        name: 'ProfileChunk',
        ph: TraceModel.Types.TraceEvents.Phase.SAMPLE,
        pid,
        tid: TraceModel.Types.TraceEvents.ThreadID(0),
        ts: TraceModel.Types.Timing.MicroSeconds(ts),
        id: id,
        args: {
          data: {
            cpuProfile: {
              samples: samples.map(TraceModel.Types.TraceEvents.CallFrameID),
              nodes: nodes.map(
                  node => ({
                    ...node,
                    callFrame: {functionName: '', scriptId: 0},
                    id: TraceModel.Types.TraceEvents.CallFrameID(node.id),
                  }),
                  ),
            },
            timeDeltas: timeDeltas.map(TraceModel.Types.Timing.MicroSeconds),
          },
        },
      };
    }
    it('can build profile calls from a CPU profile coming from tracing', async () => {
      const A = 0;
      const B = 1;
      const C = 2;
      const D = 3;
      const E = 4;
      const root = 9;
      const mockProfileEvent: TraceModel.Types.TraceEvents.TraceEventProfile = {
        name: 'Profile',
        id,
        args: {data: {startTime: TraceModel.Types.Timing.MicroSeconds(0)}},
        cat: '',
        pid,
        tid,
        ts: TraceModel.Types.Timing.MicroSeconds(0),
        ph: TraceModel.Types.TraceEvents.Phase.SAMPLE,
      };
      /**
       * +------------> (sample at time)
       * |A|A|A|A|A|A|A|A|A|A|A|A|A|A|A|A|A| |E|E|E|E|E|E|
       * | |B|B|B|B|B|B| |D|D|D|D|D|D| | | | | | | | | | |
       * | | |C|C|C|C| | | | | | | | | | | | | | | | | | |
       * |
       * V (stack trace depth)
       */
      const mockTimeDeltas = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23,
      ];

      const mockSamples = [A, B, C, C, C, C, B, A, D, D, D, D, D, D, A, A, A, E, E, E, E, E, E];
      /*
       *   A   E
       *  / \
       * B   D
       * |
       * C
       */
      const mockChunks = [
        makeProfileChunkEvent([{id: root, children: [A, E]}], [], [], 0),
        makeProfileChunkEvent(
            [{id: A, children: [B, D]}, {id: B, children: [C]}, {id: C, children: []}], mockSamples, mockTimeDeltas, 0),
        makeProfileChunkEvent([{id: D, children: []}], [], [], 0),
        makeProfileChunkEvent([{id: E, children: []}], [], [], 0),
      ];
      TraceModel.Handlers.ModelHandlers.Samples.reset();

      TraceModel.Handlers.ModelHandlers.Samples.initialize();

      for (const event of [mockProfileEvent, ...mockChunks]) {
        TraceModel.Handlers.ModelHandlers.Samples.handleEvent(event);
      }
      await TraceModel.Handlers.ModelHandlers.Samples.finalize();
      const data = TraceModel.Handlers.ModelHandlers.Samples.data();
      const calls = data.profilesInProcess.get(pid)?.get(tid)?.profileCalls;
      const tree = data.profilesInProcess.get(pid)?.get(tid)?.profileTree;
      const expectedResult = [
        {id: A, ts: 0, dur: 154, selfTime: 58, children: [B, D]},
        {id: B, ts: 1, dur: 27, selfTime: 9, children: [C]},
        {id: C, ts: 3, dur: 18, selfTime: 18, children: []},
        {id: D, ts: 36, dur: 69, selfTime: 69, children: []},
        {id: E, ts: 154, dur: 117, selfTime: 117, children: []},
      ];
      const callsTestData = calls?.map(
          c => {
            const children =
                tree?.nodes.get(c.nodeId as TraceModel.Helpers.TreeHelpers.TraceEntryNodeId)?.children || new Set();
            return ({
              id: c.nodeId,
              dur: Math.round(c.dur || 0),
              ts: c.ts,
              selfTime: Math.round(c.selfTime || 0),
              children: [...children].map(child => child.id) || [],
            });
          },
      );

      assert.deepEqual(callsTestData, expectedResult);
    });
    it('can build profile calls from a CPU profile coming from a real world trace', async () => {
      const data = await handleEventsFromTraceFile(this, 'multiple-navigations-with-iframes.json.gz');

      const threadId = TraceModel.Types.TraceEvents.ThreadID(1);
      const firstProcessId = TraceModel.Types.TraceEvents.ProcessID(2236123);
      const profilesFirstProcess = data.profilesInProcess.get(firstProcessId);
      const calls = profilesFirstProcess?.get(threadId)?.profileCalls.slice(0, 5);
      const tree = profilesFirstProcess?.get(threadId)?.profileTree;
      const expectedResult = [
        {'id': 2, 'dur': 392, 'ts': 643496962681, 'selfTime': 392, 'children': []},
        {'id': 3, 'dur': 682, 'ts': 643496963073, 'selfTime': 0, 'children': [4]},
        {'id': 4, 'dur': 682, 'ts': 643496963073, 'selfTime': 160, 'children': [5]},
        {'id': 5, 'dur': 522, 'ts': 643496963233, 'selfTime': 178, 'children': [6, 7]},
        {'id': 6, 'dur': 175, 'ts': 643496963411, 'selfTime': 175, 'children': []},
      ];
      const callsTestData = calls?.map(c => {
        const children =
            tree?.nodes.get(c.nodeId as TraceModel.Helpers.TreeHelpers.TraceEntryNodeId)?.children || new Set();
        return {
          id: c.nodeId,
          dur: Math.round(c.dur || 0),
          ts: c.ts,
          selfTime: Math.round(c.selfTime || 0),
          children: [...children].map(child => child.id) || [],
        };
      });
      assert.deepEqual(callsTestData, expectedResult);
    });
  });
  describe('CPU Profile building', () => {
    it('generates a CPU profile from a trace file', async () => {
      const data = await handleEventsFromTraceFile(this, 'recursive-blocking-js.json.gz');
      assert.strictEqual(data.profilesInProcess.size, 1);
      const profileById = data.profilesInProcess.values().next().value;
      assert.strictEqual(profileById.size, 1);
      const cpuProfileData = profileById.values().next().value as TraceModel.Handlers.ModelHandlers.Samples.ProfileData;
      const cpuProfile = cpuProfileData.rawProfile;
      assert.deepEqual(Object.keys(cpuProfile), ['startTime', 'endTime', 'nodes', 'samples', 'timeDeltas', 'lines']);
      assert.strictEqual(cpuProfile.nodes.length, 153);
      assert.strictEqual(cpuProfile.startTime, 287510826176);
      assert.strictEqual(cpuProfile.endTime, 287510847633);
      assert.strictEqual(cpuProfile.samples?.length, 39471);
      assert.strictEqual(cpuProfile.samples?.length, cpuProfile.timeDeltas?.length);
      assert.strictEqual(cpuProfile.samples?.length, cpuProfile.lines?.length);
    });
  });
  describe('CPU Profile parsing', () => {
    it('generates a parsed CPU profile from a trace file', async () => {
      const data = await handleEventsFromTraceFile(this, 'recursive-blocking-js.json.gz');
      assert.strictEqual(data.profilesInProcess.size, 1);
      const profileById = data.profilesInProcess.values().next().value;
      assert.strictEqual(profileById.size, 1);
      const cpuProfileData = profileById.values().next().value as TraceModel.Handlers.ModelHandlers.Samples.ProfileData;
      const parsedProfile = cpuProfileData.parsedProfile;
      assert.strictEqual(parsedProfile.nodes()?.length, 153);

      // Ensure that we correctly maintain a lineNumber/columnNumber of 0 and don't fall back to -1 because 0 is falsey.
      const nodesWithZeroLineNumber = parsedProfile.nodes()?.filter(node => node.lineNumber === 0) || [];
      assert.lengthOf(nodesWithZeroLineNumber, 15);
      const nodesWithZeroColumnNumber = parsedProfile.nodes()?.filter(node => node.columnNumber === 0) || [];
      assert.lengthOf(nodesWithZeroColumnNumber, 12);
      assert.strictEqual(parsedProfile.gcNode?.id, 36);
      assert.strictEqual(parsedProfile.programNode?.id, 2);
      assert.strictEqual(parsedProfile.profileStartTime, 287510835.138);
      assert.strictEqual(parsedProfile.profileEndTime, 287515908.9025441);
      assert.strictEqual(parsedProfile.maxDepth, 14);
      assert.strictEqual(parsedProfile.samples?.length, 39471);
    });
  });

  describe('getProfileCallFunctionName', () => {
    // Find an event from the trace that represents some work. The use of
    // this specific call frame event is not for any real reason.
    function getProfileEventAndNode(traceData: TraceModel.Handlers.Types.TraceParseData): {
      entry: TraceModel.Types.TraceEvents.TraceEventSyntheticProfileCall,
      profileNode: CPUProfile.ProfileTreeModel.ProfileNode,
    } {
      const mainThread = getMainThread(traceData.Renderer);
      let foundNode: CPUProfile.ProfileTreeModel.ProfileNode|null = null;
      let foundEntry: TraceModel.Types.TraceEvents.TraceEventSyntheticProfileCall|null = null;

      for (const entry of mainThread.entries) {
        if (TraceModel.Types.TraceEvents.isProfileCall(entry) &&
            entry.callFrame.functionName === 'performConcurrentWorkOnRoot') {
          const profile = traceData.Samples.profilesInProcess.get(entry.pid)?.get(entry.tid);
          const node = profile?.parsedProfile.nodeById(entry.nodeId);
          if (node) {
            foundNode = node;
          }
          foundEntry = entry;
          break;
        }
      }
      if (!foundNode) {
        throw new Error('Could not find CPU Profile node.');
      }
      if (!foundEntry) {
        throw new Error('Could not find expected entry.');
      }

      return {
        entry: foundEntry,
        profileNode: foundNode,
      };
    }

    it('falls back to the call frame name if the ProfileNode name is empty', async function() {
      const traceParsedData = await TraceLoader.traceEngine(this, 'react-hello-world.json.gz');
      const {entry, profileNode} = getProfileEventAndNode(traceParsedData);
      // Store and then reset this: we are doing this to test the fallback to
      // the entry callFrame.functionName property. After the assertion we
      // reset this to avoid impacting other tests.
      const originalProfileNodeName = profileNode.functionName;
      profileNode.setFunctionName('');
      assert.strictEqual(
          TraceModel.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(traceParsedData.Samples, entry),
          'performConcurrentWorkOnRoot');
      // St
      profileNode.setFunctionName(originalProfileNodeName);
    });

    it('uses the profile name if it has been set', async function() {
      const traceParsedData = await TraceLoader.traceEngine(this, 'react-hello-world.json.gz');
      const {entry, profileNode} = getProfileEventAndNode(traceParsedData);
      // Store and then reset this: we are doing this to test the fallback to
      // the entry callFrame.functionName property. After the assertion we
      // reset this to avoid impacting other tests.
      const originalProfileNodeName = profileNode.functionName;
      profileNode.setFunctionName('testing-profile-name');
      assert.strictEqual(
          TraceModel.Handlers.ModelHandlers.Samples.getProfileCallFunctionName(traceParsedData.Samples, entry),
          'testing-profile-name');
      profileNode.setFunctionName(originalProfileNodeName);
    });
  });
});
