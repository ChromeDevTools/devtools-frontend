// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as Timeline from '../../panels/timeline/timeline.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {
  getMainThread,
  makeCompleteEvent,
  makeProfileCall,
} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as TimelineModel from '../timeline_model/timeline_model.js';
import * as Trace from '../trace/trace.js';

describeWithEnvironment('TimelineProfileTree', () => {
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
      const root = new TimelineModel.TimelineProfileTree.TopDownRootNode(
          events, [], Trace.Types.Timing.MilliSeconds(0), Trace.Types.Timing.MilliSeconds(200_000));

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
      const root = new TimelineModel.TimelineProfileTree.TopDownRootNode(
          events, [], Trace.Types.Timing.MilliSeconds(0), Trace.Types.Timing.MilliSeconds(200_000));

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
      const root = new TimelineModel.TimelineProfileTree.TopDownRootNode(
          events, [], Trace.Types.Timing.MilliSeconds(0), Trace.Types.Timing.MilliSeconds(200_000));

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
      const root = new TimelineModel.TimelineProfileTree.TopDownRootNode(
          events, [], Trace.Types.Timing.MilliSeconds(0), Trace.Types.Timing.MilliSeconds(200_000));

      const rootChildren = root.children();
      assert.strictEqual(rootChildren.size, 2);

      const rootChildIterator = rootChildren.values();
      assert.strictEqual(
          rootChildIterator.next().value.selfTime, Trace.Helpers.Timing.microSecondsToMilliseconds(eventA.dur));

      const nodeB = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      const nodeBSelfTime = Trace.Types.Timing.MicroSeconds(eventB.dur - eventC.dur - eventD.dur);
      assert.strictEqual(nodeB.selfTime, Trace.Helpers.Timing.microSecondsToMilliseconds(nodeBSelfTime));

      const nodeBChildren = nodeB.children();
      assert.strictEqual(nodeBChildren.size, 2);

      const nodeBChildIterator = nodeBChildren.values();
      assert.strictEqual(
          nodeBChildIterator.next().value.selfTime, Trace.Helpers.Timing.microSecondsToMilliseconds(eventC.dur));

      const nodeD = nodeBChildIterator.next().value;
      const nodeDSelfTime = Trace.Types.Timing.MicroSeconds(eventD.dur - eventE.dur);
      assert.strictEqual(nodeD.selfTime, Trace.Helpers.Timing.microSecondsToMilliseconds(nodeDSelfTime));

      const nodeDChildren = nodeD.children();
      assert.strictEqual(nodeDChildren.size, 1);

      const nodeDChildIterator = nodeDChildren.values();
      const nodeE = nodeDChildIterator.next().value;
      assert.strictEqual(nodeE.selfTime, Trace.Helpers.Timing.microSecondsToMilliseconds(eventE.dur));
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
      const root = new TimelineModel.TimelineProfileTree.TopDownRootNode(
          events, [], Trace.Types.Timing.MilliSeconds(0), Trace.Types.Timing.MilliSeconds(200_000));

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
          events, new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([]), [],
          Trace.Types.Timing.MilliSeconds(0), Trace.Types.Timing.MilliSeconds(200_000), null);
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
          events, new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([]), [],
          Trace.Types.Timing.MilliSeconds(0), Trace.Types.Timing.MilliSeconds(200_000), null);
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
          events, new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([]), [],
          Trace.Types.Timing.MilliSeconds(0), Trace.Types.Timing.MilliSeconds(200_000), null);

      const rootChildren = root.children();
      assert.strictEqual(rootChildren.size, 5);

      const rootChildIterator = rootChildren.values();
      assert.strictEqual(
          rootChildIterator.next().value.selfTime, Trace.Helpers.Timing.microSecondsToMilliseconds(eventA.dur));

      const nodeC = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeC.selfTime, Trace.Helpers.Timing.microSecondsToMilliseconds(eventC.dur));

      const nodeE = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      assert.strictEqual(nodeE.selfTime, Trace.Helpers.Timing.microSecondsToMilliseconds(eventE.dur));

      const nodeD = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      const nodeDSelfTime = Trace.Types.Timing.MicroSeconds(eventD.dur - eventE.dur);
      assert.strictEqual(nodeD.selfTime, Trace.Helpers.Timing.microSecondsToMilliseconds(nodeDSelfTime));

      const nodeB = rootChildIterator.next().value as TimelineModel.TimelineProfileTree.TopDownNode;
      const nodeBSelfTime = Trace.Types.Timing.MicroSeconds(eventB.dur - eventC.dur - eventD.dur);
      assert.strictEqual(nodeB.selfTime, Trace.Helpers.Timing.microSecondsToMilliseconds(nodeBSelfTime));
    });

    it('correctly keeps ProfileCall nodes and uses them to build up the tree', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'mainWasm_profile.json.gz');
      const mainThread = getMainThread(parsedTrace.Renderer);
      const bounds = Trace.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.Meta.traceBounds);

      // Replicate the filters as they would be when renderering in the actual panel.
      const textFilter = new Timeline.TimelineFilters.TimelineRegExp();
      const modelFilters = [
        Timeline.TimelineUIUtils.TimelineUIUtils.visibleEventsFilter(),
        new TimelineModel.TimelineModelFilter.ExclusiveNameFilter([
          Trace.Types.Events.Name.RUN_TASK,
        ]),
      ];
      const root = new TimelineModel.TimelineProfileTree.BottomUpRootNode(
          mainThread.entries, textFilter, modelFilters, bounds.min, bounds.max, null);
      const rootChildren = root.children();
      const values = Array.from(rootChildren.values());
      // Find the list of profile calls that have been calculated as the top level rows in the Bottom Up table.
      const profileCalls = values
                               .filter(
                                   node => node.event && Trace.Types.Events.isProfileCall(node.event) &&
                                       node.event.callFrame.functionName.length > 0)
                               .map(n => n.event as Trace.Types.Events.SyntheticProfileCall);
      const functionNames = profileCalls.map(entry => entry.callFrame.functionName);
      assert.deepEqual(
          functionNames, ['fetch', 'getTime', 'wasm-to-js::l-imports.getTime', 'mainWasm', 'js-to-wasm::i']);
    });
  });

  describe('generateEventID', () => {
    it('generates the right ID for new engine profile call events', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'react-hello-world.json.gz');
      const mainThread = getMainThread(parsedTrace.Renderer);
      const profileCallEntry = mainThread.entries.find(entry => {
        return Trace.Types.Events.isProfileCall(entry) &&
            entry.callFrame.functionName === 'performConcurrentWorkOnRoot';
      });
      if (!profileCallEntry) {
        throw new Error('Could not find a profile call');
      }
      const eventId = TimelineModel.TimelineProfileTree.generateEventID(profileCallEntry);
      assert.strictEqual(eventId, 'f:performConcurrentWorkOnRoot@7');
    });

    it('generates the right ID for new engine native profile call events', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'invalid-animation-events.json.gz', {
        ...Trace.Types.Configuration.defaults(),
        includeRuntimeCallStats: true,
      });

      const mainThread = getMainThread(parsedTrace.Renderer);
      const profileCallEntry = mainThread.entries.find(entry => {
        return Trace.Types.Events.isProfileCall(entry) && entry.callFrame.url === 'native V8Runtime';
      });
      if (!profileCallEntry) {
        throw new Error('Could not find a profile call');
      }
      const eventId = TimelineModel.TimelineProfileTree.generateEventID(profileCallEntry);
      assert.strictEqual(eventId, 'f:Compile@0');
    });
  });

  describe('eventStackFrame', () => {
    it('extracts the stackFrame for ProfileCalls', async function() {
      const event = makeProfileCall('somefunc', 100, 10, undefined, undefined, undefined, 'https://x.com/file.mjs');
      const stackFrame = TimelineModel.TimelineProfileTree.eventStackFrame(event) as Protocol.Runtime.CallFrame;
      assert.strictEqual(stackFrame.functionName, 'somefunc');
      assert.strictEqual(stackFrame.url, 'https://x.com/file.mjs');
    });
  });
});
