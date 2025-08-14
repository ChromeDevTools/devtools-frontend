// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Trace from '../../../models/trace/trace.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {
  clearAllMockConnectionResponseHandlers,
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../../testing/MockConnection.js';
import {allThreadEntriesInTrace} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Utils from './utils.js';

describeWithMockConnection('EntryNodes', function() {
  beforeEach(async () => {
    clearAllMockConnectionResponseHandlers();
  });

  describe('nodeIdsForEvent', () => {
    it('identifies node ids for a Layout event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const layoutEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isLayout);
      assert.isOk(layoutEvent);
      const nodeIds = Utils.EntryNodes.nodeIdsForEvent(parsedTrace, layoutEvent);
      assert.deepEqual(Array.from(nodeIds), [2]);
    });

    it('identifies node ids for a LayoutShift event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const layoutShiftEvent = parsedTrace.LayoutShifts.clusters[0].events.at(0);
      assert.isOk(layoutShiftEvent);
      const nodeIds = Utils.EntryNodes.nodeIdsForEvent(parsedTrace, layoutShiftEvent);
      assert.deepEqual(Array.from(nodeIds), [
        193,
        195,
        178,
        189,
        188,
      ]);
    });

    it('identifies node ids for a Paint event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const paintEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isPaint);
      assert.isOk(paintEvent);
      const nodeIds = Utils.EntryNodes.nodeIdsForEvent(parsedTrace, paintEvent);
      assert.deepEqual(Array.from(nodeIds), [75]);
    });

    it('identifies node ids for a PaintImage event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const paintImageEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isPaintImage);
      assert.isOk(paintImageEvent);
      const nodeIds = Utils.EntryNodes.nodeIdsForEvent(parsedTrace, paintImageEvent);
      assert.deepEqual(Array.from(nodeIds), [107]);
    });

    it('identifies node ids for a ScrollLayer event', async function() {
      // This trace chosen as it happens to have ScrollLayer events, unlike the
      // web-dev traces used in tests above.
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
      const scrollLayerEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isScrollLayer);
      assert.isOk(scrollLayerEvent);
      const nodeIds = Utils.EntryNodes.nodeIdsForEvent(parsedTrace, scrollLayerEvent);
      assert.deepEqual(Array.from(nodeIds), [4]);
    });

    it('identifies node ids for a DecodeImage event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const decodeImageEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isDecodeImage);
      assert.isOk(decodeImageEvent);
      const nodeIds = Utils.EntryNodes.nodeIdsForEvent(parsedTrace, decodeImageEvent);
      assert.deepEqual(Array.from(nodeIds), [240]);
    });

    it('identifies node ids for a DrawLazyPixelRef event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const drawLazyPixelRefEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isDrawLazyPixelRef);
      assert.isOk(drawLazyPixelRefEvent);
      const nodeIds = Utils.EntryNodes.nodeIdsForEvent(parsedTrace, drawLazyPixelRefEvent);
      assert.deepEqual(Array.from(nodeIds), [212]);
    });

    it('identifies node ids for a MarkLCP event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const lcpCandidateEvent =
          parsedTrace.PageLoadMetrics.allMarkerEvents.find(Trace.Types.Events.isLargestContentfulPaintCandidate);
      assert.isOk(lcpCandidateEvent);
      const nodeIds = Utils.EntryNodes.nodeIdsForEvent(parsedTrace, lcpCandidateEvent);
      assert.deepEqual(Array.from(nodeIds), [209]);
    });
  });

  describe('relatedDomNodesForEvent', () => {
    function nodeId(x: number): Protocol.DOM.NodeId {
      return x as Protocol.DOM.NodeId;
    }
    function backendNodeId(x: number): Protocol.DOM.BackendNodeId {
      return x as Protocol.DOM.BackendNodeId;
    }

    it('returns the related DOM nodes', async function() {
      // Load in a trace and find an event that has one related node with an ID of 2.
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const layoutEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isLayout);
      assert.isOk(layoutEvent);
      const nodeIds = Utils.EntryNodes.nodeIdsForEvent(parsedTrace, layoutEvent);
      assert.deepEqual(Array.from(nodeIds), [2]);

      // Create a mock target, dom model, document and node, using the ID of 2 to match with the event above
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);
      const documentNode = {nodeId: nodeId(1)};
      const domNode = new SDK.DOMModel.DOMNode(domModel);
      domNode.id = nodeId(2);

      // Set related CDP methods responses to return our mock document and node.
      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNode.id]}));
      setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));

      // Register the mock document and node in DOMModel, these use the mock responses set above.
      await domModel.requestDocument();
      domModel.registerNode(domNode);

      const result = await Utils.EntryNodes.relatedDOMNodesForEvent(parsedTrace, layoutEvent);
      assert.isNotNull(result);
      const entries = Array.from(result.entries());
      assert.deepEqual(entries, [[backendNodeId(2), domNode]]);
    });
  });
});
