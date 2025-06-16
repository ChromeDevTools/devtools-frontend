// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';

import * as Insights from './insights.js';

describeWithEnvironment('NetworkDependencyTree', () => {
  let component: Insights.NetworkDependencyTree.NetworkDependencyTree;

  beforeEach(() => {
    // Create a new instance of the component before each test, so the previous number of chains will be cleared.
    component = new Insights.NetworkDependencyTree.NetworkDependencyTree();
  });

  /**
   * Helper function to create a dummy CriticalRequestNode.
   * For the purpose of these unit tests, we only care about the |children| field.
   */
  function createMockNode(options: {
    children?: Trace.Insights.Models.NetworkDependencyTree.CriticalRequestNode[],
  } = {}): Trace.Insights.Models.NetworkDependencyTree.CriticalRequestNode {
    return {
      children: options.children ?? [],
      relatedRequests: new Set(),
      isLongest: false,
      timeFromInitialRequest: Trace.Types.Timing.Micro(0),
      request: createMockSyntheticNetworkRequest(),
    };
  }

  function createMockSyntheticNetworkRequest(): Trace.Types.Events.SyntheticNetworkRequest {
    return {
      args: {
        data: {
          url: 'https://example.com/',
        },
      },
      name: Trace.Types.Events.Name.SYNTHETIC_NETWORK_REQUEST
    } as Trace.Types.Events.SyntheticNetworkRequest;
  }

  it('should return a TableDataRow for a node within the chain limit', () => {
    const children = [];
    for (let i = 0; i < Insights.NetworkDependencyTree.MAX_CHAINS_TO_SHOW; i++) {
      const leaf = createMockNode();
      const chain = createMockNode({children: [leaf]});
      children.push(chain);
    }
    const root = createMockNode({children});

    const rootRow = component.mapNetworkDependencyToRow(root);
    assert.isNotNull(rootRow);
    // There are 5 chains, so no chain will be hidden, so the length should be same as number of chains.
    assert.strictEqual(rootRow.subRows?.length, children.length);
  });

  it('should return a TableDataRow for a node beyond the chain limit', () => {
    const children = [];
    for (let i = 0; i < Insights.NetworkDependencyTree.MAX_CHAINS_TO_SHOW + 1; i++) {
      const leaf = createMockNode();
      const child = createMockNode({
        children: [leaf],
      });
      children.push(child);
    }
    const root = createMockNode({children});

    const rootRow = component.mapNetworkDependencyToRow(root);
    assert.isNotNull(rootRow);
    // There are more than 5 chains, so will cut to 5.
    assert.strictEqual(rootRow.subRows?.length, Insights.NetworkDependencyTree.MAX_CHAINS_TO_SHOW);
  });
});
