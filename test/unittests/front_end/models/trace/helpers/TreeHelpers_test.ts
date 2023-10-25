// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {
  getEventsIn,
  makeCompleteEvent,
  makeProfileCall,
  prettyPrint,
} from '../../../helpers/TraceHelpers.js';

describe('TreeHelpers', () => {
  describe('treify', () => {
    it('can build a hierarchy of events without filters', async () => {
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

      TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
      const {tree} = TraceModel.Helpers.TreeHelpers.treify(data, {filter: {has: () => true}});

      assert.strictEqual(tree.maxDepth, 3, 'Got the correct tree max depth');

      const rootsEvents = [...tree.roots].map(n => n ? n.entry : null);
      assert.deepEqual(rootsEvents.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
        {'name': 'A', 'ts': 0, 'dur': 10},
        {'name': 'E', 'ts': 11, 'dur': 3},
      ]);

      const nodeA = [...tree.roots].at(0);
      const nodeE = [...tree.roots].at(1);
      if (!nodeA || !nodeE) {
        assert(false, 'Root nodes were not found');
        return;
      }

      const childrenOfA = getEventsIn(nodeA.children.values());
      assert.deepEqual(childrenOfA.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
        {'name': 'B', 'ts': 1, 'dur': 3},
        {'name': 'D', 'ts': 5, 'dur': 3},
      ]);

      const childrenOfE = getEventsIn(nodeE.children.values());
      assert.deepEqual(childrenOfE, []);

      const nodeB = [...nodeA.children].at(0);
      const nodeD = [...nodeA.children].at(1);
      if (!nodeB || !nodeD) {
        assert(false, 'Child nodes were not found');
        return;
      }

      const childrenOfB = getEventsIn(nodeB.children.values());
      assert.deepEqual(childrenOfB.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
        {'name': 'C', 'ts': 2, 'dur': 1},
      ]);

      const childrenOfD = getEventsIn(nodeD.children.values());
      assert.deepEqual(childrenOfD, []);

      const nodeC = [...nodeB.children].at(0);
      if (!nodeC) {
        assert(false, 'Child nodes were not found');
        return;
      }

      const childrenOfC = getEventsIn(nodeC.children.values());
      assert.deepEqual(childrenOfC, []);
    });

    it('can build a hierarchy of events with filters', async () => {
      /**
       * |------------- Task A -------------||-- ?????? --|
       *  |-- ?????? --||-- Task D --|
       *   |- ?????? -|
       */
      const data = [
        makeCompleteEvent('A', 0, 10),  // 0..10
        makeCompleteEvent('B', 1, 3),   // 1..4
        makeCompleteEvent('D', 5, 3),   // 5..8
        makeCompleteEvent('C', 2, 1),   // 2..3
        makeCompleteEvent('E', 11, 3),  // 11..14
      ];

      TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
      const filter = new Set(['A', 'D']);
      const {tree} = TraceModel.Helpers.TreeHelpers.treify(data, {filter});

      assert.strictEqual(tree.maxDepth, 2, 'Got the correct tree max depth');

      const rootsEvents = [...tree.roots].map(n => n.entry);
      assert.deepEqual(rootsEvents.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
        {'name': 'A', 'ts': 0, 'dur': 10},
      ]);

      const nodeA = [...tree.roots].at(0);
      if (!nodeA) {
        assert(false, 'Root nodes were not found');
        return;
      }

      const childrenOfA = getEventsIn(nodeA.children.values());
      assert.deepEqual(childrenOfA.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
        {'name': 'D', 'ts': 5, 'dur': 3},
      ]);

      const nodeD = [...nodeA.children].at(0);
      if (!nodeD) {
        assert(false, 'Child nodes were not found');
        return;
      }

      const childrenOfD = getEventsIn(nodeD.children.values());
      assert.deepEqual(childrenOfD, []);
    });

    it('can build a hierarchy of events that start and end close to each other', async () => {
      /**
       * |------------- Task A -------------||-- Task E --|
       * |-- Task B --||-- Task D --|
       *   |- Task C -|
       */
      const data = [
        makeCompleteEvent('A', 0, 10),  // 0..10
        makeCompleteEvent('B', 0, 3),   // 0..3 (starts same time as A)
        makeCompleteEvent('D', 3, 3),   // 3..6 (starts when B finishes)
        makeCompleteEvent('C', 2, 1),   // 2..3 (finishes when B finishes)
        makeCompleteEvent('E', 10, 3),  // 10..13 (starts when A finishes)
      ];

      TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
      const {tree} = TraceModel.Helpers.TreeHelpers.treify(data, {filter: {has: () => true}});

      assert.strictEqual(tree.maxDepth, 3, 'Got the correct tree max depth');

      const rootsEvents = [...tree.roots].map(n => n.entry);
      assert.deepEqual(rootsEvents.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
        {'name': 'A', 'ts': 0, 'dur': 10},
        {'name': 'E', 'ts': 10, 'dur': 3},
      ]);

      const nodeA = [...tree.roots].at(0);
      const nodeE = [...tree.roots].at(1);
      if (!nodeA || !nodeE) {
        assert(false, 'Root nodes were not found');
        return;
      }

      const childrenOfA = getEventsIn(nodeA.children.values());
      assert.deepEqual(childrenOfA.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
        {'name': 'B', 'ts': 0, 'dur': 3},
        {'name': 'D', 'ts': 3, 'dur': 3},
      ]);

      const childrenOfE = getEventsIn(nodeE.children.values());
      assert.deepEqual(childrenOfE, []);

      const nodeB = [...nodeA.children].at(0);
      const nodeD = [...nodeA.children].at(1);
      if (!nodeB || !nodeD) {
        assert(false, 'Child nodes were not found');
        return;
      }

      const childrenOfB = getEventsIn(nodeB.children.values());
      assert.deepEqual(childrenOfB.map(e => e ? {name: e.name, ts: e.ts, dur: e.dur} : null) as unknown[], [
        {'name': 'C', 'ts': 2, 'dur': 1},
      ]);

      const childrenOfD = getEventsIn(nodeD.children.values());
      assert.deepEqual(childrenOfD, []);

      const nodeC = [...nodeB.children].at(0);
      if (!nodeC) {
        assert(false, 'Child nodes were not found');
        return;
      }

      const childrenOfC = getEventsIn(nodeC.children.values());
      assert.deepEqual(childrenOfC, []);
    });

    it('correctly calculates the total and self times of a hierarchy of events', async () => {
      /**
       * |------------- Task A -------------||-- Task E --|
       * |-- Task B --||-- Task D --|
       *   |- Task C -|
       */
      const data = [
        makeCompleteEvent('A', 0, 10),  // 0..10
        makeCompleteEvent('B', 0, 3),   // 0..3 (starts same time as A)
        makeCompleteEvent('D', 3, 3),   // 3..6 (starts when B finishes)
        makeCompleteEvent('C', 2, 1),   // 2..3 (finishes when B finishes)
        makeCompleteEvent('E', 10, 3),  // 10..13 (starts when A finishes)
      ] as TraceModel.Types.TraceEvents.TraceEntry[];

      TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
      const {tree} = TraceModel.Helpers.TreeHelpers.treify(data, {filter: {has: () => true}});

      const nodeA = [...tree.roots].at(0);
      const nodeE = [...tree.roots].at(1);
      if (!nodeA || !nodeE) {
        assert(false, 'Root nodes were not found');
        return;
      }
      const taskA = nodeA.entry;
      const taskE = nodeE.entry;
      const nodeD = [...nodeA.children].at(1);
      const nodeB = [...nodeA.children].at(0);
      if (!nodeB || !nodeD) {
        assert(false, 'Child nodes were not found');
        return;
      }
      const taskD = nodeD.entry;
      const taskB = nodeB.entry;

      const nodeC = [...nodeB.children].at(0);

      if (!nodeC) {
        assert(false, 'Child nodes were not found');
        return;
      }
      const taskC = nodeC.entry;

      const taskCTotalTime = taskC.dur;
      if (taskCTotalTime === undefined) {
        assert.fail('Total time for task was not found');
        return;
      }
      assert.strictEqual(taskCTotalTime, TraceModel.Types.Timing.MicroSeconds(1));
      assert.strictEqual(taskC.selfTime, taskCTotalTime);

      const taskBTotalTime = taskB.dur;
      if (taskBTotalTime === undefined) {
        assert.fail('Total time for task was not found');
        return;
      }
      assert.strictEqual(taskBTotalTime, TraceModel.Types.Timing.MicroSeconds(3));
      assert.strictEqual(taskB.selfTime, TraceModel.Types.Timing.MicroSeconds(taskBTotalTime - taskCTotalTime));

      const taskDTotalTime = taskD.dur;
      if (taskDTotalTime === undefined) {
        assert.fail('Total time for task was not found');
        return;
      }
      assert.strictEqual(taskDTotalTime, TraceModel.Types.Timing.MicroSeconds(3));
      assert.strictEqual(taskD.selfTime, taskDTotalTime);

      const taskATotalTime = taskA.dur;
      if (taskATotalTime === undefined) {
        assert.fail('Total time for task was not found');
        return;
      }
      assert.strictEqual(taskATotalTime, TraceModel.Types.Timing.MicroSeconds(10));
      assert.strictEqual(
          taskA.selfTime, TraceModel.Types.Timing.MicroSeconds(taskATotalTime - taskBTotalTime - taskDTotalTime));

      const taskETotalTime = taskE.dur;
      if (taskETotalTime === undefined) {
        assert.fail('Total time for task was not found');
        return;
      }
      assert.strictEqual(taskETotalTime, TraceModel.Types.Timing.MicroSeconds(3));
      assert.strictEqual(taskD.selfTime, taskETotalTime);
    });
    describe('building hierarchies trace events and profile calls', () => {
      it('builds a hierarchy from trace events and profile calls', async () => {
        const evaluateScript = makeCompleteEvent(TraceModel.Types.TraceEvents.KnownEventName.EvaluateScript, 0, 500);
        const v8Run = makeCompleteEvent('v8.run', 10, 490);
        const parseFunction = makeCompleteEvent('V8.ParseFunction', 12, 1);

        const traceEvents: TraceModel.Types.TraceEvents.TraceEntry[] = [evaluateScript, v8Run, parseFunction];

        const profileCalls = [makeProfileCall('a', 100, 200), makeProfileCall('b', 300, 200)];
        const allEntries = TraceModel.Helpers.Trace.mergeEventsInOrder(traceEvents, profileCalls);
        const {tree} = TraceModel.Helpers.TreeHelpers.treify(allEntries, {filter: {has: () => true}});
        assert.strictEqual(prettyPrint(tree), `
-EvaluateScript [0.5ms]
  -v8.run [0.49ms]
    -V8.ParseFunction [0.001ms]
    -ProfileCall (a) [0.2ms]
    -ProfileCall (b) [0.2ms]`);
      });

      it('builds a hierarchy from only profile calls', async () => {
        const allEntries = [
          makeProfileCall('a', 100, 200),
          makeProfileCall('b', 300, 200),
          makeProfileCall('c', 300, 200),
          makeProfileCall('d', 400, 100),
        ];
        const {tree} = TraceModel.Helpers.TreeHelpers.treify(allEntries, {filter: {has: () => true}});
        assert.strictEqual(prettyPrint(tree), `
-ProfileCall (a) [0.2ms]
-ProfileCall (b) [0.2ms]
  -ProfileCall (c) [0.2ms]
    -ProfileCall (d) [0.1ms]`);
      });
    });
  });
  describe('walking trees', () => {
    it('walkEntireTree walks the entire tree and visits all the roots as well as all children', async () => {
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
      TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
      const {tree, entryToNode} = TraceModel.Helpers.TreeHelpers.treify(data, {filter: {has: () => true}});

      const callOrder: Array<{type: 'START' | 'END', entryName: string}> = [];
      function onEntryStart(entry: TraceModel.Types.TraceEvents.TraceEntry): void {
        callOrder.push({type: 'START', entryName: entry.name});
      }
      function onEntryEnd(entry: TraceModel.Types.TraceEvents.TraceEntry): void {
        callOrder.push({type: 'END', entryName: entry.name});
      }
      TraceModel.Helpers.TreeHelpers.walkEntireTree(entryToNode, tree, onEntryStart, onEntryEnd);
      assert.deepEqual(callOrder, [
        {type: 'START', entryName: 'A'},
        {type: 'START', entryName: 'B'},
        {type: 'START', entryName: 'C'},
        {type: 'END', entryName: 'C'},
        {type: 'END', entryName: 'B'},
        {type: 'START', entryName: 'D'},
        {type: 'END', entryName: 'D'},
        {type: 'END', entryName: 'A'},
        {type: 'START', entryName: 'E'},
        {type: 'END', entryName: 'E'},
      ]);
    });

    it('walkEntireTree can take a trace window and will only run for events in that window', async () => {
      /**
       *                | min: 5 - max 10| <<<< custom trace window
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
      TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
      const {tree, entryToNode} = TraceModel.Helpers.TreeHelpers.treify(data, {filter: {has: () => true}});

      const callOrder: Array<{type: 'START' | 'END', entryName: string}> = [];
      function onEntryStart(entry: TraceModel.Types.TraceEvents.TraceEntry): void {
        callOrder.push({type: 'START', entryName: entry.name});
      }
      function onEntryEnd(entry: TraceModel.Types.TraceEvents.TraceEntry): void {
        callOrder.push({type: 'END', entryName: entry.name});
      }
      TraceModel.Helpers.TreeHelpers.walkEntireTree(entryToNode, tree, onEntryStart, onEntryEnd, {
        min: TraceModel.Types.Timing.MicroSeconds(5),
        max: TraceModel.Types.Timing.MicroSeconds(10),
        range: TraceModel.Types.Timing.MicroSeconds(5),
      });

      assert.deepEqual(callOrder, [
        {type: 'START', entryName: 'A'},
        {type: 'START', entryName: 'D'},
        {type: 'END', entryName: 'D'},
        {type: 'END', entryName: 'A'},
      ]);
    });

    it('walkTreeFromEntry walks the tree down and then back up and calls onEntryStart and onEntryEnd', async () => {
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
      TraceModel.Helpers.Trace.sortTraceEventsInPlace(data);
      const {tree, entryToNode} = TraceModel.Helpers.TreeHelpers.treify(data, {filter: {has: () => true}});

      const callOrder: Array<{type: 'START' | 'END', entryName: string}> = [];
      function onEntryStart(entry: TraceModel.Types.TraceEvents.TraceEntry): void {
        callOrder.push({type: 'START', entryName: entry.name});
      }
      function onEntryEnd(entry: TraceModel.Types.TraceEvents.TraceEntry): void {
        callOrder.push({type: 'END', entryName: entry.name});
      }
      const rootNode = Array.from(tree.roots).at(0);
      if (!rootNode) {
        throw new Error('Could not find root node');
      }
      assert.strictEqual(rootNode.entry.name, 'A');
      TraceModel.Helpers.TreeHelpers.walkTreeFromEntry(entryToNode, rootNode.entry, onEntryStart, onEntryEnd);
      assert.deepEqual(callOrder, [
        {type: 'START', entryName: 'A'},
        {type: 'START', entryName: 'B'},
        {type: 'START', entryName: 'C'},
        {type: 'END', entryName: 'C'},
        {type: 'END', entryName: 'B'},
        {type: 'START', entryName: 'D'},
        {type: 'END', entryName: 'D'},
        {type: 'END', entryName: 'A'},
      ]);
    });
  });
});
