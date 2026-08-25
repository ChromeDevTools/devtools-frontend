// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import {assertScreenshot, renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithEnvironment('DOMTreeWidget', () => {
  let target: SDK.Target.Target;
  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    target = createTarget();
  });

  describe('node highlighting', () => {
    function createDomTree() {
      const elementsTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
      const view = createViewFunctionStub(Elements.ElementsTreeOutline.DOMTreeWidget, {
        elementsTreeOutline,
        alreadyExpandedParentTreeElement: null,
        highlightedTreeElement: null,
        isUpdatingHighlights: false,
      });
      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, view);
      domTree.performUpdate();
      domTree.modelAdded(target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel);
      return {view};
    }

    const highlightsNodeOnRequestEvent = (inScope: boolean) => async () => {
      const {view} = createDomTree();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);

      const model = target.model(SDK.OverlayModel.OverlayModel);
      assert.exists(model);
      const node = new SDK.DOMModel.DOMNode(target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel);

      assert.isNull(view.input.currentHighlightedNode);
      const viewCallCount = view.callCount;
      model.dispatchEventToListeners(SDK.OverlayModel.Events.HIGHLIGHT_NODE_REQUESTED, node);
      if (inScope) {
        await view.nextInput;
        assert.strictEqual(view.input.currentHighlightedNode, node);
        sinon.assert.callCount(view, viewCallCount + 1);
      } else {
        assert.isNull(view.input.currentHighlightedNode);
        sinon.assert.callCount(view, viewCallCount);
      }
    };

    it('highlights node on in scope request event', highlightsNodeOnRequestEvent(true));
    it('does not highlight node on out of scope request event', highlightsNodeOnRequestEvent(false));
  });

  describe('show-html-comments setting', () => {
    it('updates showComments when setting changes', async () => {
      const elementsTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
      const view = createViewFunctionStub(Elements.ElementsTreeOutline.DOMTreeWidget, {
        elementsTreeOutline,
        alreadyExpandedParentTreeElement: null,
        highlightedTreeElement: null,
        isUpdatingHighlights: false,
      });
      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, view);
      domTree.performUpdate();

      assert.isTrue(domTree.showComments);
      assert.isTrue(view.input.showComments);

      const setting = Common.Settings.Settings.instance().moduleSetting('show-html-comments');
      setting.set(false);

      assert.isFalse(domTree.showComments);
      assert.isFalse(view.input.showComments);
    });

    it('removes change listener on detach', async () => {
      const elementsTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
      const view = createViewFunctionStub(Elements.ElementsTreeOutline.DOMTreeWidget, {
        elementsTreeOutline,
        alreadyExpandedParentTreeElement: null,
        highlightedTreeElement: null,
        isUpdatingHighlights: false,
      });
      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, view);
      domTree.performUpdate();

      domTree.detach();
      const setting = Common.Settings.Settings.instance().moduleSetting('show-html-comments');
      const viewCallCount = view.callCount;
      setting.set(false);

      sinon.assert.callCount(view, viewCallCount);
    });
  });

  describe('image preview popover', () => {
    it('shows preview when hovering over a link within the elements tree outline', async () => {
      const clock = sinon.useFakeTimers();
      try {
        const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget();
        domTree.markAsRoot();
        renderElementIntoDOM(domTree);
        domTree.performUpdate();

        const shadowHost = domTree.contentElement.firstElementChild as HTMLElement;
        assert.exists(shadowHost);
        const elementsTreeOutline = shadowHost.shadowRoot?.querySelector('.elements-tree-outline') as HTMLElement;
        assert.exists(elementsTreeOutline);

        const link = elementsTreeOutline.createChild('span');
        link.boxInWindow = () => new AnchorBox(0, 0, 10, 10);
        const imageUrl = Platform.DevToolsPath.urlString`http://example.com/image.png`;
        Elements.ImagePreviewPopover.ImagePreviewPopover.setImageUrl(link, imageUrl);

        const buildStub =
            sinon.stub(Components.ImagePreview.ImagePreview, 'build').resolves(document.createElement('div'));

        const event = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: 5,
          clientY: 5,
        });
        link.dispatchEvent(event);

        for (let i = 0; i < 20; i++) {
          if (buildStub.called) {
            break;
          }
          clock.tick(1);
          await Promise.resolve();
        }

        sinon.assert.calledWith(buildStub, imageUrl, true);
        domTree.detach();
      } finally {
        clock.restore();
      }
    });
  });

  interface TestDOMNodeConfig {
    nodeId: number;
    nodeName: string;
    nodeType?: number;
    attributes?: string[];
    nodeValue?: string;
    children?: TestDOMNodeConfig[];
  }

  function createTestDOMTree(domModel: SDK.DOMModel.DOMModel, config: TestDOMNodeConfig,
                             parentId?: Protocol.DOM.NodeId): SDK.DOMModel.DOMNode {
    const convertNode = (nodeConfig: TestDOMNodeConfig, pId?: Protocol.DOM.NodeId): Protocol.DOM.Node => {
      const isText = nodeConfig.nodeName === '#text';
      return {
        nodeId: nodeConfig.nodeId as Protocol.DOM.NodeId,
        parentId: pId,
        backendNodeId: nodeConfig.nodeId as Protocol.DOM.BackendNodeId,
        nodeType: nodeConfig.nodeType ?? (isText ? Node.TEXT_NODE : Node.ELEMENT_NODE),
        nodeName: nodeConfig.nodeName,
        localName: isText ? '#text' : nodeConfig.nodeName.toLowerCase(),
        nodeValue: nodeConfig.nodeValue ?? '',
        attributes: nodeConfig.attributes,
        childNodeCount: nodeConfig.children?.length ?? 0,
        children: nodeConfig.children?.map(child => convertNode(child, nodeConfig.nodeId as Protocol.DOM.NodeId)),
      };
    };

    const node = SDK.DOMModel.DOMNode.create(domModel, null, false, convertNode(config, parentId));
    assert.isNotNull(node);
    return node;
  }

  function setupDOMTreeWidget(
      target: SDK.Target.Target,
      view?: Elements.ElementsTreeOutline.View,
      options?: {includeCommonStyles?: boolean},
      ): {domTree: Elements.ElementsTreeOutline.DOMTreeWidget, domModel: SDK.DOMModel.DOMModel} {
    const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
    const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, view);
    domTree.markAsRoot();
    renderElementIntoDOM(domTree, options);
    domTree.performUpdate();
    domTree.modelAdded(domModel);
    return {domTree, domModel};
  }

  describe('context menu', () => {
    it('allows default context menu on text selection when editing', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'BODY',
          children: [{nodeId: 2, nodeName: '#text', nodeValue: 'Some text'}],
        });
        domTree.rootDOMNode = rootNode;

        const pNode = rootNode.children()![0];
        domTree.selectDOMNode(pNode);
        const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(domModel);
        assert.exists(treeOutline);
        const treeElement = treeOutline.findTreeElement(pNode) as Elements.ElementsTreeElement.ElementsTreeElement;
        assert.isNotNull(treeElement);

        const textNodeContainer = treeElement.widget.contentElement.querySelector('.webkit-html-text-node');
        assert.isNotNull(textNodeContainer);

        assert.isFalse(UI.UIUtils.isEditing());
        UI.UIUtils.markBeingEdited(textNodeContainer, true);

        assert.isTrue(UI.UIUtils.isEditing());
        const event = new MouseEvent('contextmenu', {bubbles: true, composed: true});
        sinon.stub(treeOutline, 'treeElementFromEventInternal').returns(treeElement);
        const preventDefaultSpy = sinon.spy(event, 'preventDefault');
        textNodeContainer.dispatchEvent(event);
        sinon.assert.notCalled(preventDefaultSpy);
        UI.UIUtils.markBeingEdited(textNodeContainer, false);
      } finally {
        domTree.detach();
      }
    });

    it('prevents default context menu on node selection and no edit', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'BODY',
          children: [{nodeId: 2, nodeName: '#text', nodeValue: 'Some text'}],
        });
        domTree.rootDOMNode = rootNode;

        const pNode = rootNode.children()![0];
        domTree.selectDOMNode(pNode);
        const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(domModel);
        assert.exists(treeOutline);
        const treeElement = treeOutline.findTreeElement(pNode) as Elements.ElementsTreeElement.ElementsTreeElement;
        assert.isNotNull(treeElement);

        assert.isFalse(UI.UIUtils.isEditing());

        const textNodeContainer = treeElement.widget.contentElement.querySelector('.webkit-html-text-node');
        assert.isNotNull(textNodeContainer);

        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          composed: true,
        });
        sinon.stub(treeOutline, 'treeElementFromEventInternal').returns(treeElement);
        const preventDefaultSpy = sinon.spy(event, 'preventDefault');
        textNodeContainer.dispatchEvent(event);

        sinon.assert.called(preventDefaultSpy);
      } finally {
        domTree.detach();
      }
    });
  });

  describe('DEFAULT_VIEW', () => {
    it('renders screenshot of default view', async () => {
      const {domTree, domModel} =
          setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW, {includeCommonStyles: true});
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          attributes: ['id', 'container', 'class', 'main-view'],
          children: [
            {nodeId: 2, nodeName: 'H1', children: [{nodeId: 3, nodeName: '#text', nodeValue: 'Title'}]},
            {nodeId: 4, nodeName: 'SPAN', children: [{nodeId: 5, nodeName: '#text', nodeValue: 'Description'}]},
          ],
        });
        domTree.rootDOMNode = rootNode;
        const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(domModel);
        assert.exists(treeOutline);
        const rootTreeElement = treeOutline.findTreeElement(rootNode);
        assert.exists(rootTreeElement);
        rootTreeElement.expand();
        domTree.performUpdate();

        await new Promise(resolve => setTimeout(resolve, 0));

        await assertScreenshot('elements/elements_tree_outline_default.png');
      } finally {
        domTree.detach();
      }
    });
  });

});
