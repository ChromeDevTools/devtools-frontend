// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {createTarget} from '../../../helpers/EnvironmentHelpers.js';
import {
  clearAllMockConnectionResponseHandlers,
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../../helpers/MockConnection.js';

import type * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';

describeWithMockConnection('LayoutShifts', () => {
  beforeEach(async () => {
    clearAllMockConnectionResponseHandlers();
    TraceModel.SDKServices.LayoutShifts._TEST_clearCache();
  });

  it('returns a list of sources for the given event', async () => {
    // Create a mock target, dom model, document and node.
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      assert.fail('DOM model not found.');
    }
    const documentNode = {nodeId: 1 as Protocol.DOM.NodeId};
    const domNode = new SDK.DOMModel.DOMNode(domModel);
    domNode.id = 2 as Protocol.DOM.NodeId;

    // Set related CDP methods responses to return our mock document and node.
    setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNode.id]}));
    setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));

    // Register the mock document and node in DOMModel, these use the mock responses set above.
    await domModel.requestDocument();
    domModel.registerNode(domNode);

    const modelData = {} as unknown as TraceModel.Handlers.Types.TraceParseData;
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
    } as unknown as TraceModel.Types.TraceEvents.TraceEventLayoutShift;
    const sources = await TraceModel.SDKServices.LayoutShifts.sourcesForLayoutShift(modelData, event);
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
    const impactedNodes: TraceModel.Types.TraceEvents.TraceImpactedNode[] = [
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
        TraceModel.Types.TraceEvents.TraceEventLayoutShift;
    const modelData = {} as unknown as TraceModel.Handlers.Types.TraceParseData;
    const normalized =
        await TraceModel.SDKServices.LayoutShifts.normalizedImpactedNodesForLayoutShift(modelData, mockShift);
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
