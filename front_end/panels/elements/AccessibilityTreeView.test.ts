// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

const MAIN_FRAME_ID = 'MAIN_FRAME_ID' as Protocol.Page.FrameId;

describeWithEnvironment('AccessibilityTreeView', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget();
  });

  const updatesUiOnEvent = (inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const view = new Elements.AccessibilityTreeView.AccessibilityTreeView();
    renderElementIntoDOM(view);

    const model = target.model(SDK.AccessibilityModel.AccessibilityModel);
    assert.exists(model);
    sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getOutermostFrame').returns({
      id: MAIN_FRAME_ID,
    } as SDK.ResourceTreeModel.ResourceTreeFrame);

    const rootPayload: Protocol.Accessibility.AXNode = {
      nodeId: 'root-id' as Protocol.Accessibility.AXNodeId,
      ignored: false,
      role: {type: 'role' as Protocol.Accessibility.AXValueType, value: 'document'},
      name: {type: 'computedString' as Protocol.Accessibility.AXValueType, value: 'Root Node'},
      frameId: MAIN_FRAME_ID,
    };

    const renderSpy = sinon.spy(view, 'requestUpdate');
    model.loadComplete({root: rootPayload});

    let isTreeUpdated = false;
    if (inScope) {
      assert.exists(renderSpy.firstCall);
      await view.updateComplete;
      isTreeUpdated = true;
    } else {
      await view.updateComplete;
    }
    const treeOutline = view.contentElement.querySelector('devtools-tree-outline');
    const isTreeRendered = Boolean(treeOutline && treeOutline.data.tree.length > 0);
    assert.strictEqual(isTreeRendered, isTreeUpdated);
    view.detach();
  };

  it('updates UI on in scope update event', updatesUiOnEvent(true));
  it('does not update UI on out of scope update event', updatesUiOnEvent(false));

  describe('copying nodes', function() {
    it('copies selected node on context menu copy action', async () => {
      const view = new Elements.AccessibilityTreeView.AccessibilityTreeView();
      renderElementIntoDOM(view);
      await view.updateComplete;

      const axNode = {
        id: () => '1',
        getFrameId: () => 'frame1',
        role: () => ({value: 'heading'}),
        name: () => ({value: 'Title'}),
        properties: () => [],
        ignored: () => false,
        isDOMNode: () => false,
        accessibilityModel: () => ({
          requestAXChildren: async () => [],
        }),
        getChildren: SDK.AccessibilityModel.AccessibilityNode.prototype.getChildren,
        axNodeToText: SDK.AccessibilityModel.AccessibilityNode.prototype.axNodeToText,
      } as unknown as SDK.AccessibilityModel.AccessibilityNode;

      const treeOutline = view.contentElement.querySelector('devtools-tree-outline');
      assert.exists(treeOutline);
      treeOutline.dispatchEvent(new TreeOutline.TreeOutline.ItemSelectedEvent({
        treeNodeData: axNode,
        id: '1',
      }));

      const event = new MouseEvent('contextmenu', {bubbles: true});
      const customEvent = new TreeOutline.TreeOutline.ItemContextMenuEvent(
          {treeNodeData: axNode, id: '1'} as unknown as
              TreeOutline.TreeOutlineUtils.TreeNode<Elements.AccessibilityTreeUtils.AXTreeNodeData>,
          event);
      const showStub = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();

      treeOutline.dispatchEvent(customEvent);

      sinon.assert.called(showStub);
      view.detach();
    });

    it('copies selected node on copy event', async () => {
      const view = new Elements.AccessibilityTreeView.AccessibilityTreeView();
      renderElementIntoDOM(view);
      await view.updateComplete;

      const axNode = {
        id: () => '1',
        getFrameId: () => 'frame1',
        role: () => ({value: 'heading'}),
        name: () => ({value: 'Title'}),
        properties: () => [],
        ignored: () => false,
        isDOMNode: () => false,
        accessibilityModel: () => ({
          requestAXChildren: async () => [],
        }),
        getChildren: SDK.AccessibilityModel.AccessibilityNode.prototype.getChildren,
        axNodeToText: SDK.AccessibilityModel.AccessibilityNode.prototype.axNodeToText,
      } as unknown as SDK.AccessibilityModel.AccessibilityNode;

      const treeOutline = view.contentElement.querySelector('devtools-tree-outline');
      assert.exists(treeOutline);
      treeOutline.dispatchEvent(new TreeOutline.TreeOutline.ItemSelectedEvent({
        treeNodeData: axNode,
        id: '1',
      }));

      const copyStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');

      const event = new Event('copy', {bubbles: true});
      const container = view.contentElement.querySelector('.accessibility-tree-view-container');
      assert.exists(container);
      container.dispatchEvent(event);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      sinon.assert.calledWith(copyStub, 'heading "Title"\n');

      copyStub.restore();
      view.detach();
    });

    it('highlights DOM node on itemmouseover event', async () => {
      const view = new Elements.AccessibilityTreeView.AccessibilityTreeView();
      renderElementIntoDOM(view);
      await view.updateComplete;

      const highlightStub = sinon.stub();
      const axNode = {
        highlightDOMNode: highlightStub,
      } as unknown as SDK.AccessibilityModel.AccessibilityNode;

      const treeOutline = view.contentElement.querySelector('devtools-tree-outline');
      assert.exists(treeOutline);

      treeOutline.dispatchEvent(new TreeOutline.TreeOutline.ItemMouseOverEvent({
        treeNodeData: axNode,
        id: '1',
      }));

      sinon.assert.calledOnce(highlightStub);
      view.detach();
    });
  });

  it('renders the accessibility tree screenshot', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const view = new Elements.AccessibilityTreeView.AccessibilityTreeView();

    const refreshSpy = sinon.spy(view, 'refreshAccessibilityTree');

    const model = target.model(SDK.AccessibilityModel.AccessibilityModel);
    assert.exists(model);

    sinon.stub(SDK.FrameManager.FrameManager.instance(), 'getOutermostFrame').returns({
      id: MAIN_FRAME_ID,
    } as SDK.ResourceTreeModel.ResourceTreeFrame);
    const rootPayload: Protocol.Accessibility.AXNode = {
      nodeId: 'root-id' as Protocol.Accessibility.AXNodeId,
      ignored: false,
      role: {type: 'role' as Protocol.Accessibility.AXValueType, value: 'document'},
      name: {type: 'computedString' as Protocol.Accessibility.AXValueType, value: 'Root Node'},
      childIds: ['child-id' as Protocol.Accessibility.AXNodeId],
      frameId: MAIN_FRAME_ID,
    };

    const childPayload: Protocol.Accessibility.AXNode = {
      nodeId: 'child-id' as Protocol.Accessibility.AXNodeId,
      ignored: false,
      role: {type: 'role' as Protocol.Accessibility.AXValueType, value: 'button'},
      name: {type: 'computedString' as Protocol.Accessibility.AXValueType, value: 'Child Node'},
      parentId: 'root-id' as Protocol.Accessibility.AXNodeId,
    };

    sinon.stub(model.agent, 'invoke_getChildAXNodes').resolves({
      nodes: [childPayload],
      getError: () => undefined,
    });

    model.loadComplete({root: rootPayload});
    renderElementIntoDOM(view, {includeCommonStyles: true});

    assert.exists(refreshSpy.firstCall);
    await refreshSpy.firstCall.returnValue;

    view.element.style.width = '300px';
    view.element.style.height = '100px';

    await assertScreenshot('elements/accessibility_tree_view.png');
    view.detach();
  });
});
