// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {
  clearAllMockConnectionResponseHandlers,
  clearMockConnectionResponseHandler,
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../../testing/MockConnection.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

function nodeId<T extends Protocol.DOM.BackendNodeId|Protocol.DOM.NodeId>(x: number): T {
  return x as T;
}

describeWithMockConnection('FetchNodes', function() {
  beforeEach(async () => {
    clearAllMockConnectionResponseHandlers();
    Trace.Extras.FetchNodes.clearCacheForTesting();
  });

  describe('DOMNodeLookup', function() {
    it('returns the DOM Node for the given node ID', async function() {
      // Create a mock target, dom model, document and node.
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

      const {parsedTrace} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
      const result = await Trace.Extras.FetchNodes.domNodeForBackendNodeID(parsedTrace, nodeId(2));
      assert.strictEqual(result, domNode);

      // Clear the mock and re-set it to return nothing to test the bad path.
      clearMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend');
      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: []}));
      const doesNotExistResult = await Trace.Extras.FetchNodes.domNodeForBackendNodeID(parsedTrace, nodeId(99));
      assert.isNull(doesNotExistResult);
    });

    it('caches the call and does not look up a node more than once per model data', async () => {
      // Create a mock target, dom model, document and node.
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);
      const documentNode = {nodeId: nodeId(1)};
      const domNode = new SDK.DOMModel.DOMNode(domModel);
      domNode.id = nodeId(2);
      const pushNodesSpy = sinon.spy(domModel, 'pushNodesByBackendIdsToFrontend');

      // Set related CDP methods responses to return our mock document and node.
      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNode.id]}));
      setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));
      await domModel.requestDocument();
      domModel.registerNode(domNode);

      // The model data is only used as a cache key, so we don't need it to be real to test this.
      const modelData1 = {} as unknown as Trace.Handlers.Types.ParsedTrace;
      const modelData2 = {} as unknown as Trace.Handlers.Types.ParsedTrace;
      const result = await Trace.Extras.FetchNodes.domNodeForBackendNodeID(modelData1, nodeId(2));
      assert.isNotNull(result);
      // Look it up again to test the cache.
      await Trace.Extras.FetchNodes.domNodeForBackendNodeID(modelData1, nodeId(2));
      await Trace.Extras.FetchNodes.domNodeForBackendNodeID(modelData2, nodeId(2));
      // The call with the new model data did not hit the cache.
      assert.strictEqual(pushNodesSpy.callCount, 2);
    });

    it('can look up multiple nodes at once', async () => {
      // Create a mock target, dom model, document and node.
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);
      const documentNode = {nodeId: nodeId(1)};
      const domNodeId2 = new SDK.DOMModel.DOMNode(domModel);
      domNodeId2.id = nodeId(2);
      const domNodeId3 = new SDK.DOMModel.DOMNode(domModel);
      domNodeId3.id = nodeId(3);

      // Set related CDP methods responses to return our mock document and node.
      setMockConnectionResponseHandler(
          'DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNodeId2.id, domNodeId3.id]}));
      setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));
      await domModel.requestDocument();
      domModel.registerNode(domNodeId2);
      domModel.registerNode(domNodeId3);

      // The model data is only used as a cache key, so we don't need it to be real to test this.
      const modelData = {} as unknown as Trace.Handlers.Types.ParsedTrace;
      const result = await Trace.Extras.FetchNodes.domNodesForMultipleBackendNodeIds(modelData, [nodeId(2), nodeId(3)]);
      assert.isNotNull(result);
      const entries = Array.from(result.entries());
      assert.deepEqual(entries, [
        [nodeId<Protocol.DOM.BackendNodeId>(2), domNodeId2],
        [nodeId<Protocol.DOM.BackendNodeId>(3), domNodeId3],
      ]);
    });
  });

  describe('nodeIdsForEvent', () => {
    it('identifies node ids for a Layout event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const layoutEvent = parsedTrace.Renderer.allTraceEntries.find(Trace.Types.Events.isLayout);
      assert.isOk(layoutEvent);
      const nodeIds = Trace.Extras.FetchNodes.nodeIdsForEvent(parsedTrace, layoutEvent);
      assert.deepEqual(Array.from(nodeIds), [2]);
    });

    it('identifies node ids for a LayoutShift event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const layoutShiftEvent = parsedTrace.LayoutShifts.clusters[0].events.at(0);
      assert.isOk(layoutShiftEvent);
      const nodeIds = Trace.Extras.FetchNodes.nodeIdsForEvent(parsedTrace, layoutShiftEvent);
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
      const paintEvent = parsedTrace.Renderer.allTraceEntries.find(Trace.Types.Events.isPaint);
      assert.isOk(paintEvent);
      const nodeIds = Trace.Extras.FetchNodes.nodeIdsForEvent(parsedTrace, paintEvent);
      assert.deepEqual(Array.from(nodeIds), [75]);
    });

    it('identifies node ids for a PaintImage event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-initial-url.json.gz');
      const paintImageEvent = parsedTrace.Renderer.allTraceEntries.find(Trace.Types.Events.isPaintImage);
      assert.isOk(paintImageEvent);
      const nodeIds = Trace.Extras.FetchNodes.nodeIdsForEvent(parsedTrace, paintImageEvent);
      assert.deepEqual(Array.from(nodeIds), [107]);
    });

    it('identifies node ids for a ScrollLayer event', async function() {
      // This trace chosen as it happens to have ScrollLayer events, unlike the
      // web-dev traces used in tests above.
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'extension-tracks-and-marks.json.gz');
      const scrollLayerEvent = parsedTrace.Renderer.allTraceEntries.find(Trace.Types.Events.isScrollLayer);
      assert.isOk(scrollLayerEvent);
      const nodeIds = Trace.Extras.FetchNodes.nodeIdsForEvent(parsedTrace, scrollLayerEvent);
      assert.deepEqual(Array.from(nodeIds), [4]);
    });

    it('identifies node ids for a DecodeImage event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const decodeImageEvent = parsedTrace.Renderer.allTraceEntries.find(Trace.Types.Events.isDecodeImage);
      assert.isOk(decodeImageEvent);
      const nodeIds = Trace.Extras.FetchNodes.nodeIdsForEvent(parsedTrace, decodeImageEvent);
      assert.deepEqual(Array.from(nodeIds), [240]);
    });

    it('identifies node ids for a DrawLazyPixelRef event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const drawLazyPixelRefEvent = parsedTrace.Renderer.allTraceEntries.find(Trace.Types.Events.isDrawLazyPixelRef);
      assert.isOk(drawLazyPixelRefEvent);
      const nodeIds = Trace.Extras.FetchNodes.nodeIdsForEvent(parsedTrace, drawLazyPixelRefEvent);
      assert.deepEqual(Array.from(nodeIds), [212]);
    });

    it('identifies node ids for a MarkLCP event', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const lcpCandidateEvent =
          parsedTrace.PageLoadMetrics.allMarkerEvents.find(Trace.Types.Events.isLargestContentfulPaintCandidate);
      assert.isOk(lcpCandidateEvent);
      const nodeIds = Trace.Extras.FetchNodes.nodeIdsForEvent(parsedTrace, lcpCandidateEvent);
      assert.deepEqual(Array.from(nodeIds), [209]);
    });
  });

  describe('LayoutShifts', () => {
    it('returns a list of sources for the given event', async () => {
      // Create a mock target, dom model, document and node.
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);
      const documentNode = {nodeId: 1 as Protocol.DOM.NodeId};
      const domNode = new SDK.DOMModel.DOMNode(domModel);
      domNode.id = 2 as Protocol.DOM.NodeId;

      // Set related CDP methods responses to return our mock document and node.
      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNode.id]}));
      setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));

      // Register the mock document and node in DOMModel, these use the mock responses set above.
      await domModel.requestDocument();
      domModel.registerNode(domNode);

      const modelData = {} as unknown as Trace.Handlers.Types.ParsedTrace;
      const event = {
        args: {
          data: {
            impacted_nodes: [{
              node_id: 1 as Protocol.DOM.BackendNodeId,
              old_rect: [0, 0, 10, 10],
              new_rect: [0, 0, 20, 20],
            }],
          },
        },
      } as unknown as Trace.Types.Events.LayoutShift;
      const sources = await Trace.Extras.FetchNodes.sourcesForLayoutShift(modelData, event);
      assert.lengthOf(sources, 1);
      assert.deepEqual(sources.at(0), {
        node: domNode,
        previousRect: new DOMRect(0, 0, 10, 10),
        currentRect: new DOMRect(0, 0, 20, 20),
      });
    });

    it('returns normalized nodes if we can calculate the window.devicePixelRatio', async () => {
      createTarget();
      setMockConnectionResponseHandler('Runtime.evaluate', () => ({result: {value: 4, type: 'number'}}));
      const impactedNodes: Trace.Types.Events.TraceImpactedNode[] = [
        {
          new_rect: [0, 0, 40, 80],
          node_id: 1 as Protocol.DOM.BackendNodeId,
          old_rect: [20, 20, 40, 80],
        },
        {
          new_rect: [10, 10, 10, 10],
          node_id: 1 as Protocol.DOM.BackendNodeId,
          old_rect: [0, 0, 10, 10],
        },
      ];
      const mockShift = {args: {data: {impacted_nodes: impactedNodes}}} as Trace.Types.Events.LayoutShift;
      const modelData = {} as unknown as Trace.Handlers.Types.ParsedTrace;
      const normalized = await Trace.Extras.FetchNodes.normalizedImpactedNodesForLayoutShift(modelData, mockShift);
      assert.deepEqual(normalized, [
        {
          new_rect: [0, 0, 10, 20],
          node_id: 1 as Protocol.DOM.BackendNodeId,
          old_rect: [5, 5, 10, 20],
        },
        {
          new_rect: [2.5, 2.5, 2.5, 2.5],
          node_id: 1 as Protocol.DOM.BackendNodeId,
          old_rect: [0, 0, 2.5, 2.5],
        },
      ]);
    });
  });
});
