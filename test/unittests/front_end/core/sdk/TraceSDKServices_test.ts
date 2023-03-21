// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  clearAllMockConnectionResponseHandlers,
  clearMockConnectionResponseHandler,
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';
import {loadModelDataFromTraceFile, setTraceModelTimeout} from '../../helpers/TraceHelpers.js';

function nodeId<T extends Protocol.DOM.BackendNodeId|Protocol.DOM.NodeId>(x: number): T {
  return x as T;
}

describeWithMockConnection('TraceSDKServices', function() {
  setTraceModelTimeout(this);

  beforeEach(async () => {
    clearAllMockConnectionResponseHandlers();
    SDK.TraceSDKServices._TEST_clearCache();
  });

  describe('DOMNodeLookup', function() {
    it('returns the DOM Node for the given node ID', async () => {
      // Create a mock target, dom model, document and node.
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assertNotNullOrUndefined(domModel);
      const documentNode = {nodeId: nodeId(1)};
      const domNode = new SDK.DOMModel.DOMNode(domModel);
      domNode.id = nodeId(2);

      // Set related CDP methods responses to return our mock document and node.
      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNode.id]}));
      setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));

      // Register the mock document and node in DOMModel, these use the mock responses set above.
      await domModel.requestDocument();
      domModel.registerNode(domNode);

      const modelData = await loadModelDataFromTraceFile('cls-single-frame.json.gz');
      const result = await SDK.TraceSDKServices.domNodeForBackendNodeID(modelData, nodeId(2));
      assert.strictEqual(result, domNode);

      // Clear the mock and re-set it to return nothing to test the bad path.
      clearMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend');
      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: []}));
      const doesNotExistResult = await SDK.TraceSDKServices.domNodeForBackendNodeID(modelData, nodeId(99));
      assert.isNull(doesNotExistResult);
    });

    it('caches the call and does not look up a node more than once per model data', async () => {
      // Create a mock target, dom model, document and node.
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assertNotNullOrUndefined(domModel);
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
      const modelData1 = {} as unknown as TraceEngine.Handlers.Types.TraceParseData;
      const modelData2 = {} as unknown as TraceEngine.Handlers.Types.TraceParseData;
      const result = await SDK.TraceSDKServices.domNodeForBackendNodeID(modelData1, nodeId(2));
      assert.isNotNull(result);
      // Look it up again to test the cache.
      await SDK.TraceSDKServices.domNodeForBackendNodeID(modelData1, nodeId(2));
      await SDK.TraceSDKServices.domNodeForBackendNodeID(modelData2, nodeId(2));
      // The call with the new model data did not hit the cache.
      assert.strictEqual(pushNodesSpy.callCount, 2);
    });

    it('can look up multiple nodes at once', async () => {
      // Create a mock target, dom model, document and node.
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assertNotNullOrUndefined(domModel);
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
      const modelData = {} as unknown as TraceEngine.Handlers.Types.TraceParseData;
      const result =
          await SDK.TraceSDKServices.domNodesForMultipleBackendNodeIds(modelData, new Set([nodeId(2), nodeId(3)]));
      assert.isNotNull(result);
      const entries = Array.from(result.entries());
      assert.deepEqual(entries, [
        [nodeId<Protocol.DOM.BackendNodeId>(2), domNodeId2],
        [nodeId<Protocol.DOM.BackendNodeId>(3), domNodeId3],
      ]);
    });
  });

  describe('LayoutShifts', () => {
    it('returns a list of sources for the given event', async () => {
      // Create a mock target, dom model, document and node.
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assertNotNullOrUndefined(domModel);
      const documentNode = {nodeId: 1 as Protocol.DOM.NodeId};
      const domNode = new SDK.DOMModel.DOMNode(domModel);
      domNode.id = 2 as Protocol.DOM.NodeId;

      // Set related CDP methods responses to return our mock document and node.
      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNode.id]}));
      setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));

      // Register the mock document and node in DOMModel, these use the mock responses set above.
      await domModel.requestDocument();
      domModel.registerNode(domNode);

      const modelData = {} as unknown as TraceEngine.Handlers.Types.TraceParseData;
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
      } as unknown as TraceEngine.Types.TraceEvents.TraceEventLayoutShift;
      const sources = await SDK.TraceSDKServices.sourcesForLayoutShift(modelData, event);
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
      const impactedNodes: TraceEngine.Types.TraceEvents.TraceImpactedNode[] = [
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
      const mockShift = {args: {data: {impacted_nodes: impactedNodes}}} as
          TraceEngine.Types.TraceEvents.TraceEventLayoutShift;
      const modelData = {} as unknown as TraceEngine.Handlers.Types.TraceParseData;
      const normalized = await SDK.TraceSDKServices.normalizedImpactedNodesForLayoutShift(modelData, mockShift);
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

  describe('getMetadataForRecording', () => {
    it('returns the associated metadata', async () => {
      const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
      sinon.stub(cpuThrottlingManager, 'hasPrimaryPageTargetSet').returns(true);
      sinon.stub(cpuThrottlingManager, 'getHardwareConcurrency').returns(Promise.resolve(1));
      sinon.stub(cpuThrottlingManager, 'cpuThrottlingRate').returns(2);
      const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      sinon.stub(networkManager, 'networkConditions').returns({
        title: 'Slow 3G',
        download: 1,
        upload: 1,
        latency: 1,
      });
      const metadata = await SDK.TraceSDKServices.getMetadataForRecording();
      assert.deepEqual(metadata, {
        source: 'DevTools',
        cpuThrottling: 2,
        networkThrottling: 'Slow 3G',
        hardwareConcurrency: 1,
      });
    });

    it('calls the title function if the network condition title is a function', async () => {
      const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
      sinon.stub(cpuThrottlingManager, 'hasPrimaryPageTargetSet').returns(true);
      sinon.stub(cpuThrottlingManager, 'getHardwareConcurrency').returns(Promise.resolve(1));
      sinon.stub(cpuThrottlingManager, 'cpuThrottlingRate').returns(2);
      const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      sinon.stub(networkManager, 'networkConditions').returns({
        title: () => 'Slow 3G',
        download: 1,
        upload: 1,
        latency: 1,
      });
      const metadata = await SDK.TraceSDKServices.getMetadataForRecording();
      assert.deepEqual(metadata, {
        source: 'DevTools',
        cpuThrottling: 2,
        networkThrottling: 'Slow 3G',
        hardwareConcurrency: 1,
      });
    });

    it('does not return hardware concurrency if the manager has no target', async () => {
      const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
      sinon.stub(cpuThrottlingManager, 'hasPrimaryPageTargetSet').returns(false);
      const getHardwareConcurrencyStub = sinon.stub(cpuThrottlingManager, 'getHardwareConcurrency');
      sinon.stub(cpuThrottlingManager, 'cpuThrottlingRate').returns(2);
      const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      sinon.stub(networkManager, 'networkConditions').returns({
        title: () => 'Slow 3G',
        download: 1,
        upload: 1,
        latency: 1,
      });
      const metadata = await SDK.TraceSDKServices.getMetadataForRecording();
      assert.deepEqual(metadata, {
        source: 'DevTools',
        cpuThrottling: 2,
        networkThrottling: 'Slow 3G',
        hardwareConcurrency: undefined,
      });
      assert.strictEqual(getHardwareConcurrencyStub.callCount, 0);
    });
  });
});
