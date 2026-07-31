// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as Profiler from './profiler.js';

describe('HeapDetachedElementsDataGridNode', () => {
  setupLocaleHooks();

  let domModel: SDK.DOMModel.DOMModel;

  beforeEach(() => {
    const universe = new TestUniverse();
    const target = universe.createTarget();
    domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
  });

  function createDetachedElementInfo(): Protocol.DOM.DetachedElementInfo {
    return {
      treeNode: {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'DIV',
        localName: 'div',
        nodeValue: '',
        childNodeCount: 1,
        children: [
          {
            nodeId: 2 as Protocol.DOM.NodeId,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.TEXT_NODE,
            nodeName: '#text',
            localName: '',
            nodeValue: 'foo',
          },
        ],
      },
      retainedNodeIds: [1, 2] as Protocol.DOM.NodeId[],
    };
  }

  it('renders node count cell declaratively', () => {
    const node = new Profiler.HeapDetachedElementsDataGrid.HeapDetachedElementsDataGridNode(createDetachedElementInfo(),
                                                                                            domModel);
    const cell = node.createCell('detached-node-count');
    assert.strictEqual(cell.textContent, '2');
  });

  it('renders detached node cell with devtools-widget declaratively', () => {
    const node = new Profiler.HeapDetachedElementsDataGrid.HeapDetachedElementsDataGridNode(createDetachedElementInfo(),
                                                                                            domModel);
    const cell = node.createCell('detached-node');
    const widget = cell.querySelector('devtools-widget');
    assert.isNotNull(widget);
  });
});
