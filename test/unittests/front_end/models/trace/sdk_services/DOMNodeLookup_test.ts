// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {createTarget} from '../../../helpers/EnvironmentHelpers.js';
import {
  clearAllMockConnectionResponseHandlers,
  clearMockConnectionResponseHandler,
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../../helpers/MockConnection.js';

import type * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import {loadModelDataFromTraceFile, setTraceModelTimeout} from '../../../helpers/TraceHelpers.js';

function nodeId<T extends Protocol.DOM.BackendNodeId|Protocol.DOM.NodeId>(x: number): T {
  return x as T;
}

describeWithMockConnection('DOMNodeLookup', function() {
  setTraceModelTimeout(this);
  beforeEach(async () => {
    clearAllMockConnectionResponseHandlers();
    TraceModel.SDKServices.DOMNodeLookup._TEST_clearCache();
  });

  it('returns the DOM Node for the given node ID', async () => {
    // Create a mock target, dom model, document and node.
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      assert.fail('DOM model not found.');
    }
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
    const result = await TraceModel.SDKServices.DOMNodeLookup.forNodeId(modelData, nodeId(2));
    assert.strictEqual(result, domNode);

    // Clear the mock and re-set it to return nothing to test the bad path.
    clearMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend');
    setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: []}));
    const doesNotExistResult = await TraceModel.SDKServices.DOMNodeLookup.forNodeId(modelData, nodeId(99));
    assert.isNull(doesNotExistResult);
  });

  it('caches the call and does not look up a node more than once per model data', async () => {
    // Create a mock target, dom model, document and node.
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      assert.fail('DOM model not found.');
    }
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
    const modelData1 = {} as unknown as TraceModel.Handlers.Types.TraceParseData;
    const modelData2 = {} as unknown as TraceModel.Handlers.Types.TraceParseData;
    const result = await TraceModel.SDKServices.DOMNodeLookup.forNodeId(modelData1, nodeId(2));
    assert.isNotNull(result);
    // Look it up again to test the cache.
    await TraceModel.SDKServices.DOMNodeLookup.forNodeId(modelData1, nodeId(2));
    await TraceModel.SDKServices.DOMNodeLookup.forNodeId(modelData2, nodeId(2));
    // The call with the new model data did not hit the cache.
    assert.strictEqual(pushNodesSpy.callCount, 2);
  });

  it('can look up multiple nodes at once', async () => {
    // Create a mock target, dom model, document and node.
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      assert.fail('DOM model not found.');
    }
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
    const modelData = {} as unknown as TraceModel.Handlers.Types.TraceParseData;
    const result =
        await TraceModel.SDKServices.DOMNodeLookup.forMultipleNodeIds(modelData, new Set([nodeId(2), nodeId(3)]));
    assert.isNotNull(result);
    const entries = Array.from(result.entries());
    assert.deepEqual(entries, [
      [nodeId<Protocol.DOM.BackendNodeId>(2), domNodeId2],
      [nodeId<Protocol.DOM.BackendNodeId>(3), domNodeId3],
    ]);
  });
});
