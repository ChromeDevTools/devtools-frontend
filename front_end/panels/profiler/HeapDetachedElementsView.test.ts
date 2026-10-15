// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Elements from '../elements/elements.js';

import * as Profiler from './profiler.js';

const {DetachedElementsProfileView, DetachedElementsProfileType, DetachedElementsProfileHeader} =
    Profiler.HeapDetachedElementsView;

describeWithEnvironment('DetachedElementsProfileView', () => {
  setupLocaleHooks();

  let target: SDK.Target.Target;

  beforeEach(() => {
    const universe = new TestUniverse();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    sinon.stub(IssuesManager.IssuesManager.IssuesManager, 'instance').returns(universe.issuesManager);
    target = universe.createTarget();
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

  function createNestedDetachedElementInfo(): Protocol.DOM.DetachedElementInfo {
    const elementInfo = createDetachedElementInfo();
    elementInfo.treeNode.childNodeCount = 2;
    elementInfo.treeNode.children = [
      {
        nodeId: 2 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'DIV',
        localName: 'div',
        nodeValue: '',
      },
      {
        nodeId: 3 as Protocol.DOM.NodeId,
        backendNodeId: 3 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'SPAN',
        localName: 'span',
        nodeValue: '',
        childNodeCount: 1,
        children: [
          {
            nodeId: 4 as Protocol.DOM.NodeId,
            backendNodeId: 4 as Protocol.DOM.BackendNodeId,
            nodeType: Node.TEXT_NODE,
            nodeName: '#text',
            localName: '',
            nodeValue: 'Hello',
          },
        ],
      },
    ];
    return elementInfo;
  }

  const dataDisplayDelegate: Profiler.ProfileHeader.DataDisplayDelegate = {
    showProfile: () => null,
    showObject: () => {},
    linkifyObject: async () => null,
  };

  function createProfile(detachedElements: Protocol.DOM.DetachedElementInfo[]|null) {
    const heapProfilerModel = target.model(SDK.HeapProfilerModel.HeapProfilerModel);
    assert.isOk(heapProfilerModel);
    return new DetachedElementsProfileHeader(heapProfilerModel, new DetachedElementsProfileType(), detachedElements);
  }

  describe('presenter', () => {
    async function createView(detachedElements: Protocol.DOM.DetachedElementInfo[]|null) {
      const view = createViewFunctionStub(DetachedElementsProfileView);
      const widget = new DetachedElementsProfileView(dataDisplayDelegate, createProfile(detachedElements), view);
      renderElementIntoDOM(widget);
      return await view.nextInput;
    }

    it('parses the profile\'s detached elements into detached DOM nodes', async () => {
      const elementInfo = createDetachedElementInfo();
      const input = await createView([elementInfo]);

      assert.lengthOf(input.parsedElements, 1);
      const [parsed] = input.parsedElements;
      assert.strictEqual(parsed.elementInfo, elementInfo);
      assert.instanceOf(parsed.node, SDK.DOMModel.DOMNode);
      assert.strictEqual(parsed.node.domModel(), target.model(SDK.DOMModel.DOMModel));
      assert.strictEqual(parsed.node.backendNodeId(), elementInfo.treeNode.backendNodeId);
      assert.isTrue(parsed.node.detached);
      assert.strictEqual(parsed.nodeCount, 2);  // 1 root + 1 child
    });

    it('counts nested child nodes', async () => {
      const input = await createView([createNestedDetachedElementInfo()]);

      assert.lengthOf(input.parsedElements, 1);
      assert.strictEqual(input.parsedElements[0].nodeCount, 4);  // 1 root + 2 children + 1 grandchild
    });

    it('passes no elements to the view if the profile has no detached elements', async () => {
      const input = await createView(null);

      assert.lengthOf(input.parsedElements, 0);
    });
  });

  describe('default view', () => {
    async function renderView(detachedElements: Protocol.DOM.DetachedElementInfo[]|null) {
      const widget = new DetachedElementsProfileView(dataDisplayDelegate, createProfile(detachedElements));
      renderElementIntoDOM(widget);
      await widget.updateComplete;

      const dataGrid = widget.contentElement.querySelector('devtools-data-grid');
      assert.isNotNull(dataGrid);
      return dataGrid;
    }

    it('renders a DOM tree widget and the node count for each detached element', async () => {
      const dataGrid = await renderView([createDetachedElementInfo(), createNestedDetachedElementInfo()]);

      const rows = dataGrid.querySelectorAll('tr');
      assert.lengthOf(rows, 3);  // Header row + 2 data rows

      const cells = rows[1].querySelectorAll('td');
      assert.lengthOf(cells, 2);
      const widgetElement = cells[0].querySelector('devtools-widget');
      assert.isNotNull(widgetElement);
      assert.instanceOf(UI.Widget.Widget.get(widgetElement), Elements.DOMTreeWidget.DOMTreeWidget);
      assert.strictEqual(cells[1].textContent, '2');

      assert.strictEqual(rows[2].querySelectorAll('td')[1].textContent, '4');
    });

    it('renders only the header row if there are no detached elements', async () => {
      const dataGrid = await renderView([]);

      assert.lengthOf(dataGrid.querySelectorAll('tr'), 1);
    });
  });
});
