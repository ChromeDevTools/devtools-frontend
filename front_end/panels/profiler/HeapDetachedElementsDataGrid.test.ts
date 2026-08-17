// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as Profiler from './profiler.js';

describeWithEnvironment('HeapDetachedElementsDataGrid', () => {
  setupLocaleHooks();

  let domModel: SDK.DOMModel.DOMModel;

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    const universe = new TestUniverse();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    sinon.stub(IssuesManager.IssuesManager.IssuesManager, 'instance').returns(universe.issuesManager);

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

  it('renders node count and devtools-widget cells declaratively', async () => {
    const component = new Profiler.HeapDetachedElementsDataGrid.HeapDetachedElementsDataGrid();
    component.data = {
      detachedElements: [createDetachedElementInfo()],
      domModel,
    };
    renderElementIntoDOM(component);
    await raf();

    assert.isNotNull(component.contentElement);
    const dataGrid = component.contentElement.querySelector('devtools-data-grid');
    assert.isNotNull(dataGrid);

    const rows = dataGrid.querySelectorAll('tr');
    assert.lengthOf(rows, 2);  // Header row + 1 data row

    const cells = rows[1].querySelectorAll('td');
    assert.lengthOf(cells, 2);

    // Check devtools-widget
    const widget = cells[0].querySelector('devtools-widget');
    assert.isNotNull(widget);
    const legacyWidget = (widget as HTMLElement & {getWidget(): Object}).getWidget();
    assert.isDefined(legacyWidget);

    // Check node count
    assert.strictEqual(cells[1].textContent, '2');
  });

  it('renders correctly when detachedElements is empty', async () => {
    const component = new Profiler.HeapDetachedElementsDataGrid.HeapDetachedElementsDataGrid();
    component.data = {
      detachedElements: [],
      domModel,
    };
    renderElementIntoDOM(component);
    await raf();

    assert.isNotNull(component.contentElement);
    const dataGrid = component.contentElement.querySelector('devtools-data-grid');
    assert.isNotNull(dataGrid);

    const rows = dataGrid.querySelectorAll('tr');
    assert.lengthOf(rows, 1);  // Only header row
  });

  it('updates data grid rows when data is updated', async () => {
    const component = new Profiler.HeapDetachedElementsDataGrid.HeapDetachedElementsDataGrid();
    component.data = {
      detachedElements: [],
      domModel,
    };
    renderElementIntoDOM(component);
    await raf();

    let rows = component.contentElement.querySelector('devtools-data-grid')!.querySelectorAll('tr');
    assert.lengthOf(rows, 1);

    component.data = {
      detachedElements: [createDetachedElementInfo()],
      domModel,
    };
    await raf();

    rows = component.contentElement.querySelector('devtools-data-grid')!.querySelectorAll('tr');
    assert.lengthOf(rows, 2);
  });

  it('calculates nodeCount correctly when detached elements have nested child nodes', async () => {
    const nestedElementInfo = createDetachedElementInfo();
    nestedElementInfo.treeNode.childNodeCount = 2;
    nestedElementInfo.treeNode.children = [
      {
        nodeId: 2 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: 1,
        nodeName: 'div',
        localName: 'div',
        nodeValue: '',
      },
      {
        nodeId: 3 as Protocol.DOM.NodeId,
        backendNodeId: 3 as Protocol.DOM.BackendNodeId,
        nodeType: 1,
        nodeName: 'span',
        localName: 'span',
        nodeValue: '',
        childNodeCount: 1,
        children: [
          {
            nodeId: 4 as Protocol.DOM.NodeId,
            backendNodeId: 4 as Protocol.DOM.BackendNodeId,
            nodeType: 3,
            nodeName: '#text',
            localName: '',
            nodeValue: 'Hello',
          },
        ],
      },
    ];
    const component = new Profiler.HeapDetachedElementsDataGrid.HeapDetachedElementsDataGrid();
    component.data = {
      detachedElements: [nestedElementInfo],
      domModel,
    };
    renderElementIntoDOM(component);
    await raf();

    const rows = component.contentElement.querySelector('devtools-data-grid')!.querySelectorAll('tr');
    assert.lengthOf(rows, 2);
    const cells = rows[1].querySelectorAll('td');
    assert.lengthOf(cells, 2);
    assert.strictEqual(cells[1].textContent, '4');  // 1 root + 2 children + 1 grandchild
  });

  it('renders gracefully when data is set to undefined detachedElements', async () => {
    const component = new Profiler.HeapDetachedElementsDataGrid.HeapDetachedElementsDataGrid();
    component.data = {
      // @ts-expect-error Testing invalid data
      detachedElements: undefined,
      domModel,
    };
    renderElementIntoDOM(component);
    await raf();

    assert.isNotNull(component.contentElement);
    const dataGrid = component.contentElement.querySelector('devtools-data-grid');
    assert.isNotNull(dataGrid);
    const rows = dataGrid!.querySelectorAll('tr');
    assert.lengthOf(rows, 1);  // Should be empty
  });
});
