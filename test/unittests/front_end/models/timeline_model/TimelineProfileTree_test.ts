// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import {makeCompleteEvent} from '../../helpers/TraceHelpers.js';

describe('TimelineProfileTree', () => {
  describe('TopDownRootNode', () => {
    it('builds the root node and its children properly from an event tree', () => {
      // This builds the following tree:
      // |------------------ROOT---------------------------|
      // |-----A----| |-----B-----| |----------C---------|
      const eventA = makeCompleteEvent('Event A', 0, 40_000);
      const eventB = makeCompleteEvent('Event B', 50_000, 50_000);
      const eventC = makeCompleteEvent('Event C', 150_000, 100_000);
      const events = [
        eventA,
        eventB,
        eventC,
      ];
      const root = new TimelineModel.TimelineProfileTree.TopDownRootNode(events, [], 0, 200_000);

      const children = root.children();
      assert.strictEqual(children.size, 3);

      const nodesIterator = children.values();
      assert.strictEqual(nodesIterator.next().value.event, eventA);
      assert.strictEqual(nodesIterator.next().value.event, eventB);
      assert.strictEqual(nodesIterator.next().value.event, eventC);
    });
    it('builds a top-down tree from an event tree with multiple levels 1', () => {
      // This builds the following tree:
      // |------------ROOT-----------|
      // |-----A----| |-----B-----|
      // |-C-| |-D-|
      const eventA = makeCompleteEvent('Event A', 0, 40_000);
      const eventC = makeCompleteEvent('Event C', 0, 10_000);
      const eventD = makeCompleteEvent('Event D', 10_000, 10_000);
      const eventB = makeCompleteEvent('Event B', 50_000, 50_000);
      // Events must be in order.
      const events = [
        eventA,
        eventC,
        eventD,
        eventB,
      ];
      const root = new TimelineModel.TimelineProfileTree.TopDownRootNode(events, [], 0, 200_000);

      const rootChildren = root.children();
      assert.strictEqual(rootChildren.size, 2);

      const rootChildIterator = rootChildren.values();
      const nodeA = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeA.event, eventA);
      assert.strictEqual(rootChildIterator.next().value.event, eventB);

      const nodeAChildren = nodeA.children();
      assert.strictEqual(nodeAChildren.size, 2);

      const nodeAChildIterator = nodeAChildren.values();
      assert.strictEqual(nodeAChildIterator.next().value.event, eventC);
      assert.strictEqual(nodeAChildIterator.next().value.event, eventD);
    });
    it('builds a top-down tree from an event tree with multiple levels 2', () => {
      // This builds the following tree:
      // |------------ROOT-----------|
      // |-----A----| |-----B-----|
      //               |-C-| |-D-|
      const eventA = makeCompleteEvent('Event A', 0, 40_000);
      const eventB = makeCompleteEvent('Event B', 50_000, 50_000);
      const eventC = makeCompleteEvent('Event C', 50_000, 10_000);
      const eventD = makeCompleteEvent('Event D', 60_000, 10_000);
      // Events must be in order.
      const events = [
        eventA,
        eventB,
        eventC,
        eventD,
      ];
      const root = new TimelineModel.TimelineProfileTree.TopDownRootNode(events, [], 0, 200_000);

      const rootChildren = root.children();
      assert.strictEqual(rootChildren.size, 2);

      const rootChildIterator = rootChildren.values();
      assert.strictEqual(rootChildIterator.next().value.event, eventA);
      const nodeB = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeB.event, eventB);

      const nodeBChildren = nodeB.children();
      assert.strictEqual(nodeBChildren.size, 2);

      const nodeBChildIterator = nodeBChildren.values();
      assert.strictEqual(nodeBChildIterator.next().value.event, eventC);
      assert.strictEqual(nodeBChildIterator.next().value.event, eventD);
    });
    it('calculates the self time for each node in an event tree correctly', () => {
      // This builds the following tree:
      // |------------ROOT-----------|
      // |-----A----| |-------B------|
      //               |-C-| |--D--|
      //                     |-E-|
      const eventA = makeCompleteEvent('Event A', 0, 40_000);
      const eventB = makeCompleteEvent('Event B', 50_000, 50_000);
      const eventC = makeCompleteEvent('Event C', 50_000, 10_000);
      const eventD = makeCompleteEvent('Event D', 60_000, 10_000);
      const eventE = makeCompleteEvent('Event E', 60_000, 5_000);
      // Events must be in order.
      const events = [
        eventA,
        eventB,
        eventC,
        eventD,
        eventE,
      ];
      const root = new TimelineModel.TimelineProfileTree.TopDownRootNode(events, [], 0, 200_000);

      const rootChildren = root.children();
      assert.strictEqual(rootChildren.size, 2);

      const rootChildIterator = rootChildren.values();
      assert.strictEqual(
          rootChildIterator.next().value.selfTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(eventA.dur));

      const nodeB = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      const nodeBSelfTime = TraceEngine.Types.Timing.MicroSeconds(eventB.dur - eventC.dur - eventD.dur);
      assert.strictEqual(nodeB.selfTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(nodeBSelfTime));

      const nodeBChildren = nodeB.children();
      assert.strictEqual(nodeBChildren.size, 2);

      const nodeBChildIterator = nodeBChildren.values();
      assert.strictEqual(
          nodeBChildIterator.next().value.selfTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(eventC.dur));

      const nodeD = nodeBChildIterator.next().value;
      const nodeDSelfTime = TraceEngine.Types.Timing.MicroSeconds(eventD.dur - eventE.dur);
      assert.strictEqual(nodeD.selfTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(nodeDSelfTime));

      const nodeDChildren = nodeD.children();
      assert.strictEqual(nodeDChildren.size, 1);

      const nodeDChildIterator = nodeDChildren.values();
      const nodeE = nodeDChildIterator.next().value;
      assert.strictEqual(nodeE.selfTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(eventE.dur));
    });
  });
  describe('BottomUpRootNode', () => {
    it('builds the root node and its children properly from an event tree', () => {
      // This builds the following tree:
      // |------------------ROOT---------------------------|
      // |-----A----| |-----B-----| |----------C---------|
      const eventA = makeCompleteEvent('Event A', 0, 40_000);
      const eventB = makeCompleteEvent('Event B', 50_000, 50_000);
      const eventC = makeCompleteEvent('Event C', 150_000, 100_000);
      const events = [
        eventA,
        eventB,
        eventC,
      ];
      const root = new TimelineModel.TimelineProfileTree.TopDownRootNode(events, [], 0, 200_000);

      const children = root.children();
      assert.strictEqual(children.size, 3);

      const nodesIterator = children.values();
      assert.strictEqual(nodesIterator.next().value.event, eventA);
      assert.strictEqual(nodesIterator.next().value.event, eventB);
      assert.strictEqual(nodesIterator.next().value.event, eventC);
    });
    it('builds a bottom up tree from an event tree with multiple levels 1', () => {
      // This builds the following tree:
      // |------------ROOT-----------|
      // |-C-||-D-|
      // |-----A----| |-----B-----|
      const eventA = makeCompleteEvent('Event A', 0, 40_000);
      const eventC = makeCompleteEvent('Event C', 0, 10_000);
      const eventD = makeCompleteEvent('Event D', 10_000, 10_000);
      const eventB = makeCompleteEvent('Event B', 50_000, 50_000);
      // Events must be in order.
      const events = [
        eventA,
        eventC,
        eventD,
        eventB,
      ];
      const root = new TimelineModel.TimelineProfileTree.BottomUpRootNode(
          events, new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([]), [], 0, 200_000, null);
      const rootChildren = root.children();
      assert.strictEqual(rootChildren.size, 4);

      const rootChildIterator = rootChildren.values();

      const nodeC = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeC.event, eventC);

      const nodeD = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeD.event, eventD);

      const nodeA = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeA.event, eventA);

      const nodeB = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeB.event, eventB);

      const nodeCChildren = nodeC.children();
      assert.strictEqual(nodeCChildren.size, 1);
      const nodeCChildIterator = nodeCChildren.values();
      assert.strictEqual(nodeCChildIterator.next().value.event, eventA);

      const nodeDChildren = nodeC.children();
      assert.strictEqual(nodeDChildren.size, 1);
      const nodeDChildIterator = nodeDChildren.values();
      assert.strictEqual(nodeDChildIterator.next().value.event, eventA);

      const nodeAChildren = nodeA.children();
      assert.strictEqual(nodeAChildren.size, 0);

      const nodeBChildren = nodeB.children();
      assert.strictEqual(nodeBChildren.size, 0);
    });
    it('builds a tree from an event tree with multiple levels 2', () => {
      // This builds the following tree:
      // |------------ROOT-----------|
      //              |-C-||-D-|
      // |-----A----| |-----B-----|
      const eventA = makeCompleteEvent('Event A', 0, 40_000);
      const eventB = makeCompleteEvent('Event B', 50_000, 50_000);
      const eventC = makeCompleteEvent('Event C', 50_000, 10_000);
      const eventD = makeCompleteEvent('Event D', 60_000, 10_000);
      // Events must be in order.
      const events = [
        eventA,
        eventB,
        eventC,
        eventD,
      ];

      const root = new TimelineModel.TimelineProfileTree.BottomUpRootNode(
          events, new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([]), [], 0, 200_000, null);
      const rootChildren = root.children();
      assert.strictEqual(rootChildren.size, 4);

      const rootChildIterator = rootChildren.values();

      const nodeA = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeA.event, eventA);

      const nodeC = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeC.event, eventC);

      const nodeD = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeD.event, eventD);

      const nodeB = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeB.event, eventB);

      const nodeCChildren = nodeC.children();
      assert.strictEqual(nodeCChildren.size, 1);
      const nodeCChildIterator = nodeCChildren.values();
      assert.strictEqual(nodeCChildIterator.next().value.event, eventB);

      const nodeDChildren = nodeC.children();
      assert.strictEqual(nodeDChildren.size, 1);
      const nodeDChildIterator = nodeDChildren.values();
      assert.strictEqual(nodeDChildIterator.next().value.event, eventB);

      const nodeAChildren = nodeA.children();
      assert.strictEqual(nodeAChildren.size, 0);

      const nodeBChildren = nodeB.children();
      assert.strictEqual(nodeBChildren.size, 0);
    });
    it('calculates the self time for each node in an event tree correctly', () => {
      // This builds the following tree:
      // |------------ROOT-----------|
      //                   |-E-|
      //              |-C-||--D--|
      // |-----A----| |-------B------|
      const eventA = makeCompleteEvent('Event A', 0, 40_000);
      const eventB = makeCompleteEvent('Event B', 50_000, 50_000);
      const eventC = makeCompleteEvent('Event C', 50_000, 10_000);
      const eventD = makeCompleteEvent('Event D', 60_000, 10_000);
      const eventE = makeCompleteEvent('Event E', 60_000, 5_000);
      // Events must be in order.
      const events = [
        eventA,
        eventB,
        eventC,
        eventD,
        eventE,
      ];
      const root = new TimelineModel.TimelineProfileTree.BottomUpRootNode(
          events, new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([]), [], 0, 200_000, null);

      const rootChildren = root.children();
      assert.strictEqual(rootChildren.size, 5);

      const rootChildIterator = rootChildren.values();
      assert.strictEqual(
          rootChildIterator.next().value.selfTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(eventA.dur));

      const nodeC = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeC.selfTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(eventC.dur));

      const nodeE = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeE.selfTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(eventE.dur));

      const nodeD = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      const nodeDSelfTime = TraceEngine.Types.Timing.MicroSeconds(eventD.dur - eventE.dur);
      assert.strictEqual(nodeD.selfTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(nodeDSelfTime));

      const nodeB = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      const nodeBSelfTime = TraceEngine.Types.Timing.MicroSeconds(eventB.dur - eventC.dur - eventD.dur);
      assert.strictEqual(nodeB.selfTime, TraceEngine.Helpers.Timing.microSecondsToMilliseconds(nodeBSelfTime));
    });
  });
});
