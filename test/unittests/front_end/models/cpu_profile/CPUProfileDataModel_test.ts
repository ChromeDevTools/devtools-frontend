// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as CPUProfile from '../../../../../front_end/models/cpu_profile/cpu_profile.js';

import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

function makeCallFrame(functionName: string): Protocol.Runtime.CallFrame {
  return {
    functionName,
    scriptId: 'ScriptId',
    url: '',
    lineNumber: 0,
    columnNumber: 0,
  } as unknown as Protocol.Runtime.CallFrame;
}

function getFrameTreeAsString(cpuProfileDataModel: CPUProfile.CPUProfileDataModel.CPUProfileDataModel): string {
  type Entry = {ts: number, dur: number, name: string, selfTime: number, id: number, depth: number};
  const trackingStack: Entry[] = [];
  const resultStack: Entry[] = [];
  let result = '\n';
  const onFrameOpen = (depth: number, node: CPUProfile.ProfileTreeModel.ProfileNode, ts: number) => {
    trackingStack.push({depth, id: node.id, name: node.callFrame.functionName, ts, selfTime: 0, dur: 0});
  };
  const onFrameClose =
      (_depth: number, node: CPUProfile.ProfileTreeModel.ProfileNode, _ts: number, dur: number, selfTime: number) => {
        const entry = trackingStack.pop();
        if (!entry || entry.id !== node.id) {
          throw new Error('Frame open and Frame close callbacks are not balanced');
        }
        entry.dur = dur;
        entry.selfTime = selfTime;
        resultStack.push(entry);
      };
  cpuProfileDataModel.forEachFrame(onFrameOpen, onFrameClose);
  resultStack.sort((a, b) => b.ts - a.ts);
  while (resultStack.length) {
    const entry = resultStack.pop();
    if (!entry) {
      break;
    }
    const {depth, name, ts, dur, selfTime} = entry;
    result += '  '.repeat(depth) +
        `name: ${name} ts: ${ts} dur: ${Math.round(dur * 100) / 100} selfTime: ${Math.round(selfTime * 100) / 100}`;
    result += resultStack.length ? '\n' : '';
  }
  return result;
}

describe('ProfileTreeModel', function() {
  it('calculates self and total times correctly for a CPU profile', () => {
    // Create the following tree:
    //
    //       root (self = 10)
    //     /                 \
    //    A (self = 0)     D (self = 10)
    //  /             \                 \
    // B (self = 20)  C (self = 10)     E (self = 20)
    const callFrameRoot = makeCallFrame('root');
    const root = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameRoot);
    root.self = 10;

    const callFrameA = makeCallFrame('A');
    const nodeA = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameA);
    root.children.push(nodeA);
    nodeA.self = 0;

    const callFrameB = makeCallFrame('B');
    const nodeB = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameB);
    nodeA.children.push(nodeB);
    nodeB.self = 20;

    const callFrameC = makeCallFrame('C');
    const nodeC = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameC);
    nodeA.children.push(nodeC);
    nodeC.self = 10;

    const callFrameD = makeCallFrame('D');
    const nodeD = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameD);
    root.children.push(nodeD);
    nodeD.self = 10;

    const callFrameE = makeCallFrame('E');
    const nodeE = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameE);
    nodeD.children.push(nodeE);
    nodeE.self = 20;

    const profileTreeModel = new CPUProfile.ProfileTreeModel.ProfileTreeModel();
    profileTreeModel.initialize(root);

    assert.strictEqual(profileTreeModel.total, 70);

    assert.strictEqual(root.total, 70);
    assert.strictEqual(root.self, 10);
    assert.strictEqual(nodeA.total, 30);
    assert.strictEqual(nodeA.self, 0);
    assert.strictEqual(nodeB.total, 20);
    assert.strictEqual(nodeB.self, 20);
    assert.strictEqual(nodeC.total, 10);
    assert.strictEqual(nodeC.self, 10);
    assert.strictEqual(nodeD.total, 30);
    assert.strictEqual(nodeD.self, 10);
    assert.strictEqual(nodeE.total, 20);
    assert.strictEqual(nodeE.self, 20);
  });
  it('calculates depth correctly for the nodes in a profile tree', () => {
    // Create the following tree:
    //
    //       root
    //      /    \
    //     A      D
    //   /   \     \
    //  B     C     E
    //               \
    //                F
    const callFrameRoot = makeCallFrame('root');
    const root = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameRoot);

    const callFrameA = makeCallFrame('A');
    const nodeA = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameA);
    root.children.push(nodeA);

    const callFrameB = makeCallFrame('B');
    const nodeB = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameB);
    nodeA.children.push(nodeB);

    const callFrameC = makeCallFrame('C');
    const nodeC = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameC);
    nodeA.children.push(nodeC);

    const callFrameD = makeCallFrame('D');
    const nodeD = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameD);
    root.children.push(nodeD);

    const callFrameE = makeCallFrame('E');
    const nodeE = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameE);
    nodeD.children.push(nodeE);

    const callFrameF = makeCallFrame('F');
    const nodeF = new CPUProfile.ProfileTreeModel.ProfileNode(callFrameF);
    nodeE.children.push(nodeF);

    const profileTreeModel = new CPUProfile.ProfileTreeModel.ProfileTreeModel();
    profileTreeModel.initialize(root);

    assert.strictEqual(profileTreeModel.maxDepth, 3);
    assert.strictEqual(root.depth, -1);
    assert.strictEqual(nodeA.depth, 0);
    assert.strictEqual(nodeB.depth, 1);
    assert.strictEqual(nodeC.depth, 1);
    assert.strictEqual(nodeD.depth, 0);
    assert.strictEqual(nodeE.depth, 1);
    assert.strictEqual(nodeF.depth, 2);
  });
});

describeWithEnvironment('CPUProfileDataModel', () => {
  const buildBasicProfile = (): Protocol.Profiler.Profile => {
    const scriptId = 'Peperoni' as Protocol.Runtime.ScriptId;
    const url = '';
    const lineNumber = -1;
    const columnNumber = -1;
    const profile: Protocol.Profiler.Profile = {
      startTime: 1000,
      endTime: 3000,
      nodes: [
        {
          id: 1,
          hitCount: 0,
          callFrame: {functionName: '(root)', scriptId, url, lineNumber, columnNumber},
          children: [2, 3],
        },
        {id: 2, hitCount: 3, callFrame: {functionName: 'a', scriptId, url, lineNumber, columnNumber}, children: [4, 5]},
        {id: 3, hitCount: 3, callFrame: {functionName: 'b', scriptId, url, lineNumber, columnNumber}, children: [6]},
        {id: 4, hitCount: 2, callFrame: {functionName: 'c', scriptId, url, lineNumber, columnNumber}},
        {id: 5, hitCount: 1, callFrame: {functionName: 'd', scriptId, url, lineNumber, columnNumber}},
        {id: 6, hitCount: 2, callFrame: {functionName: 'e', scriptId, url, lineNumber, columnNumber}, children: [7]},
        {id: 7, hitCount: 2, callFrame: {functionName: 'f', scriptId, url, lineNumber, columnNumber}},
      ],
      samples: [2, 2, 4, 5, 4, 2, 3, 6, 6, 7, 7, 3, 3],
      timeDeltas: new Array(13).fill(100),
    };
    return profile;
  };
  it('builds a tree from a CPU profile', () => {
    const profile = buildBasicProfile();
    // Profile contains this tree:
    //
    //       1
    //     /   \
    //    2     3
    //  /   \     \
    // 4     5     6
    //              \
    //               7
    const cpuProfileDataModel = new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(profile);
    assert.deepEqual(cpuProfileDataModel.root.children.map(n => n.id), [3, 2]);

    const node2 = cpuProfileDataModel.root.children[1];
    assert.strictEqual(node2.id, 2);
    assert.deepEqual(node2.children.map(n => n.id), [5, 4]);

    const node3 = cpuProfileDataModel.root.children[0];
    assert.strictEqual(node3.id, 3);
    assert.deepEqual(node3.children.map(n => n.id), [6]);

    const node6 = node3.children[0];
    assert.strictEqual(node6.id, 6);
    assert.deepEqual(node6.children.map(n => n.id), [7]);
  });
  it('parses JS call frames from a CPU profile', () => {
    // Calls in the profile look roughly like
    //
    // |---------------a--------------||---------b---------|
    //        |---c---||--d--||---c---|  |-------e------|
    //                                      |-----f-----|
    const profile = buildBasicProfile();
    const cpuProfileDataModel = new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(profile);
    const treeAsString = getFrameTreeAsString(cpuProfileDataModel);

    assert.strictEqual(treeAsString, `
name: a ts: 1.1 dur: 0.6 selfTime: 0.3
  name: c ts: 1.3 dur: 0.1 selfTime: 0.1
  name: d ts: 1.4 dur: 0.1 selfTime: 0.1
  name: c ts: 1.5 dur: 0.1 selfTime: 0.1
name: b ts: 1.7 dur: 0.7 selfTime: 0.3
  name: e ts: 1.8 dur: 0.4 selfTime: 0.2
    name: f ts: 2 dur: 0.2 selfTime: 0.2`);
  });

  it('parses a CPU profile without hitcounts', () => {
    const profile = buildBasicProfile();
    for (const node of profile.nodes) {
      node.hitCount = undefined;
    }
    const cpuProfileDataModel = new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(profile);
    const treeAsString = getFrameTreeAsString(cpuProfileDataModel);
    assert.strictEqual(treeAsString, `
name: a ts: 1.1 dur: 0.6 selfTime: 0.3
  name: c ts: 1.3 dur: 0.1 selfTime: 0.1
  name: d ts: 1.4 dur: 0.1 selfTime: 0.1
  name: c ts: 1.5 dur: 0.1 selfTime: 0.1
name: b ts: 1.7 dur: 0.7 selfTime: 0.3
  name: e ts: 1.8 dur: 0.4 selfTime: 0.2
    name: f ts: 2 dur: 0.2 selfTime: 0.2`);
  });
  it('fixes missing samples by replacing them with neighboring stacks', () => {
    const scriptId = 'Peperoni' as Protocol.Runtime.ScriptId;
    const url = '';
    const lineNumber = -1;
    const columnNumber = -1;

    // The calls in the profile look roughly like:
    //
    // |program||-bar-||program||-bar-||program||-bar-||GC||program||-bar-||program||-bar-||-baz-||program||-bar-|
    // |program|       |program|       |program||-foo-|    |program||-foo-||program||-foo-|       |program||-foo-|
    //
    // Which, after accounting for fixable program calls (missing samples), should look as (program samples are
    // replaced with the preceding samples if the bottom frame of both neighboring samples is the same):
    //
    // |program||----------bar------||program||-------bar---------||-baz-||program||-bar-|
    // |program|       |-----foo----||program||-------foo---------|       |program||-foo-|
    //                   |-GC-|
    const profile: Protocol.Profiler.Profile = {
      startTime: 1000,
      endTime: 4000,
      nodes: [
        {
          id: 1,
          hitCount: 0,
          callFrame: {functionName: '(root)', scriptId, url, lineNumber, columnNumber},
          children: [2, 3, 4, 5],
        },
        {
          id: 2,
          hitCount: 1000,
          callFrame: {functionName: '(garbage collector)', scriptId, url, lineNumber, columnNumber},
        },
        {id: 3, hitCount: 1000, callFrame: {functionName: '(program)', scriptId, url, lineNumber, columnNumber}},
        {
          id: 4,
          hitCount: 1000,
          callFrame: {functionName: 'bar', scriptId, url, lineNumber, columnNumber},
          children: [6],
        },
        {id: 5, hitCount: 1000, callFrame: {functionName: 'baz', scriptId, url, lineNumber, columnNumber}},
        {id: 6, hitCount: 1000, callFrame: {functionName: 'foo', scriptId, url, lineNumber, columnNumber}},
      ],
      samples: [3, 4, 3, 4, 3, 6, 2, 2, 3, 6, 6, 3, 6, 5, 3, 6],
    };
    profile.timeDeltas = profile.samples?.map(_ => 1000);
    profile.endTime = profile.startTime + (profile.timeDeltas?.length || 0) * 1000;
    const cpuProfileDataModel = new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(profile);
    const treeAsString = getFrameTreeAsString(cpuProfileDataModel);
    assert.strictEqual(treeAsString, `
name: (program) ts: 2 dur: 1 selfTime: 1
name: bar ts: 3 dur: 7 selfTime: 4
  name: foo ts: 7 dur: 3 selfTime: 1
    name: (garbage collector) ts: 8 dur: 2 selfTime: 2
name: (program) ts: 10 dur: 1 selfTime: 1
name: bar ts: 11 dur: 4 selfTime: 0
  name: foo ts: 11 dur: 4 selfTime: 4
name: baz ts: 15 dur: 1 selfTime: 1
name: (program) ts: 16 dur: 1 selfTime: 1
name: bar ts: 17 dur: 1 selfTime: 0
  name: foo ts: 17 dur: 1 selfTime: 1`);
  });
  it('parses a CPU with GC nodes correctly', () => {
    const scriptId = 'Peperoni' as Protocol.Runtime.ScriptId;
    const url = '';
    const lineNumber = -1;
    const columnNumber = -1;

    // Profile contains this tree:
    //
    //       root
    //     /      \
    //   GC       foo
    //               \
    //                bar

    // The calls in the profile look roughly like:
    //
    // |-------------------foo----------------||--GC--|
    // |---------bar--------|         |--bar--|
    //
    // Which, after accounting for the GC call, should be fixed as:
    // |-----------------------foo------------|
    // |---bar---||---bar---|         |--bar--|
    //                                 |--GC--|
    const profile: Protocol.Profiler.Profile = {
      startTime: 1000,
      endTime: 4000,
      nodes: [
        {
          id: 1,
          hitCount: 0,
          callFrame: {functionName: '(root)', scriptId, url, lineNumber, columnNumber},
          children: [2, 3],
        },
        {
          id: 2,
          hitCount: 1000,
          callFrame: {functionName: '(garbage collector)', scriptId, url, lineNumber, columnNumber},
        },
        {
          id: 3,
          hitCount: 1000,
          callFrame: {functionName: 'foo', scriptId, url, lineNumber, columnNumber},
          children: [4],
        },
        {id: 4, hitCount: 1000, callFrame: {functionName: 'bar', scriptId, url, lineNumber, columnNumber}},
      ],
      timeDeltas: [500, 250, 1000, 250, 1000],
      samples: [4, 4, 3, 4, 2],
    };
    const cpuProfileDataModel = new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(profile);
    const treeAsString = getFrameTreeAsString(cpuProfileDataModel);
    assert.strictEqual(treeAsString, `
name: foo ts: 1.5 dur: 3.13 selfTime: 0.25
  name: bar ts: 1.5 dur: 1.25 selfTime: 1.25
  name: bar ts: 3 dur: 1.63 selfTime: 1
    name: (garbage collector) ts: 4 dur: 0.63 selfTime: 0.63`);
  });
});
