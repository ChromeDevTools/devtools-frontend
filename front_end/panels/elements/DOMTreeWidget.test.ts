// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import {assertScreenshot, renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Highlighting from '../../ui/components/highlighting/highlighting.js';
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

        await UI.Widget.Widget.allUpdatesComplete;

        await assertScreenshot('elements/elements_tree_outline_default.png');
      } finally {
        domTree.detach();
      }
    });
  });

  describe('DECLARATIVE_VIEW', () => {
    it('renders DOM tree declaratively using <devtools-tree> and ElementsTreeWidget', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [{nodeId: 2, nodeName: '#text', nodeValue: 'Hello world'}],
        });
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();

        // Ensure ElementsTreeOutline is not created in declarative mode.
        assert.isUndefined(domTree.getTreeOutlineForTesting());

        // Wait for devtools-tree to render its template.
        await UI.Widget.Widget.allUpdatesComplete;

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);

        // Verify ElementsTreeWidget is rendered for the root node.
        const widgetElement = rootTreeElements[0].listItemElement.querySelector('devtools-widget');
        assert.exists(widgetElement);
        const widget = UI.Widget.Widget.get(widgetElement);
        assert.instanceOf(widget, Elements.ElementsTreeElement.ElementsTreeWidget);
        assert.strictEqual((widget as Elements.ElementsTreeElement.ElementsTreeWidget).node, rootNode);
      } finally {
        domTree.detach();
      }
    });

    it('handles selection and expansion', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [{nodeId: 2, nodeName: 'SPAN'}],
        });
        domTree.rootDOMNode = rootNode;

        const childNode = rootNode.children()![0];
        domTree.selectDOMNode(childNode);
        assert.strictEqual(domTree.selectedDOMNode(), childNode);
        assert.isTrue(domTree.isNodeExpanded(rootNode));

        domTree.setNodeExpanded(rootNode, false);
        assert.isFalse(domTree.isNodeExpanded(rootNode));
      } finally {
        domTree.detach();
      }
    });

    it('supports omitRootDOMNode', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        domTree.omitRootDOMNode = true;
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'BODY',
          children: [{nodeId: 2, nodeName: 'H1'}],
        });
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();

        // Wait for devtools-tree to render its template.
        await UI.Widget.Widget.allUpdatesComplete;

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        const internalTree = tree.getInternalTreeOutlineForTest();
        const children = internalTree.rootElement().children();
        assert.lengthOf(children, 1);

        const widgetElement = children[0].listItemElement.querySelector('devtools-widget');
        assert.exists(widgetElement);
        const widget = UI.Widget.Widget.get(widgetElement) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(widget);
        assert.strictEqual(widget.node, rootNode.children()![0]);
      } finally {
        domTree.detach();
      }
    });

    it('fetches children asynchronously when children are not loaded initially', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        domTree.omitRootDOMNode = true;
        const rootNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 1 as Protocol.DOM.BackendNodeId,
          nodeType: Node.DOCUMENT_NODE,
          nodeName: '#document',
          localName: '',
          nodeValue: '',
          childNodeCount: 1,
        });
        assert.isNotNull(rootNode);

        let getChildNodesCallback: ((children: SDK.DOMModel.DOMNode[]|null) => void)|undefined;
        sinon.stub(rootNode, 'getChildNodes').callsFake(callback => {
          getChildNodesCallback = callback;
          const htmlNode = createTestDOMTree(domModel, {nodeId: 2, nodeName: 'HTML'});
          rootNode.childrenInternal = [htmlNode];
        });

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();

        assert.isDefined(getChildNodesCallback);
        getChildNodesCallback?.(rootNode.childrenInternal);
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        const internalTree = tree.getInternalTreeOutlineForTest();
        const children = internalTree.rootElement().children();
        assert.lengthOf(children, 1);
      } finally {
        domTree.detach();
      }
    });

    it('renders screenshot of declarative view', async () => {
      const {domTree, domModel} =
          setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW, {includeCommonStyles: true});
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
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        await assertScreenshot('elements/elements_tree_outline_declarative.png');
      } finally {
        domTree.detach();
      }
    });

    it('supports maxTreeDepth', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [{
            nodeId: 2,
            nodeName: 'P',
            children: [{nodeId: 3, nodeName: 'SPAN'}],
          }],
        });
        domTree.rootDOMNode = rootNode;
        domTree.maxTreeDepth = 1;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);
      } finally {
        domTree.detach();
      }
    });

    it('filters comment nodes based on showComments setting', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: '#comment', nodeType: Node.COMMENT_NODE, nodeValue: 'comment text'},
            {nodeId: 3, nodeName: 'SPAN'},
          ],
        });
        domTree.rootDOMNode = rootNode;
        domTree.showComments = false;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.isNotEmpty(rootTreeElements);
        // With comments filtered out, child elements are [SPAN, </DIV>].
        const childTreeElements = rootTreeElements[0].children();
        assert.lengthOf(childTreeElements, 2);
        const spanWidgetElement = childTreeElements[0].listItemElement.querySelector('devtools-widget');
        assert.exists(spanWidgetElement);
        const widget = UI.Widget.Widget.get(spanWidgetElement) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.strictEqual(widget.node?.nodeName(), 'SPAN');
      } finally {
        domTree.detach();
      }
    });

    it('sets correct jslog attributes on treeitems', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {nodeId: 1, nodeName: 'DIV'});
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);

        const jslog = rootTreeElements[0].listItemElement.getAttribute('jslog');
        assert.isNotNull(jslog);
        assert.include(jslog, 'TreeItem');
        assert.include(jslog, 'elementsTreeOutline');
      } finally {
        domTree.detach();
      }
    });

    it('computes left indent correctly across nesting levels', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {
              nodeId: 2,
              nodeName: 'SECTION',
              children: [{nodeId: 3, nodeName: 'SPAN'}],
            },
          ],
        });
        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        const sectionNode = rootNode.children()![0];
        domTree.setNodeExpanded(sectionNode, true);
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);

        // Root DIV (depth 0, expandable): 12 * (0 - 1) + 1 = -11.
        const rootWidgetElement = rootTreeElements[0].listItemElement.querySelector('devtools-widget');
        const rootWidget = UI.Widget.Widget.get(rootWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.strictEqual(rootWidget.computeLeftIndent, -11);

        // Section (depth 1, expandable): 12 * (1 - 1) + 1 = 1.
        const sectionTreeElement = rootTreeElements[0].children()[0];
        const sectionWidgetElement = sectionTreeElement.listItemElement.querySelector('devtools-widget');
        const sectionWidget =
            UI.Widget.Widget.get(sectionWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.strictEqual(sectionWidget.computeLeftIndent, 1);

        // Span (depth 2, not expandable): 12 * (2 - 1) + 12 = 24.
        const spanTreeElement = sectionTreeElement.children()[0];
        const spanWidgetElement = spanTreeElement.listItemElement.querySelector('devtools-widget');
        const spanWidget = UI.Widget.Widget.get(spanWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.strictEqual(spanWidget.computeLeftIndent, 24);

        // Closing DIV (depth 0, not expandable): 12 * (0 - 1) + 12 = 0.
        const closingDivTreeElement = rootTreeElements[0].children()[1];
        const closingDivWidgetElement = closingDivTreeElement.listItemElement.querySelector('devtools-widget');
        const closingDivWidget =
            UI.Widget.Widget.get(closingDivWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.strictEqual(closingDivWidget.computeLeftIndent, 0);
      } finally {
        domTree.detach();
      }
    });

    it('highlights and reveals node when highlighted in overlay', async () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {
              nodeId: 2,
              nodeName: 'P',
              children: [{nodeId: 3, nodeName: 'SPAN'}],
            },
          ],
        });
        domTree.rootDOMNode = rootNode;
        // Keep root node and P collapsed initially.
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);
        assert.isFalse(rootTreeElements[0].expanded);

        const overlayModel = target.model(SDK.OverlayModel.OverlayModel);
        assert.exists(overlayModel);
        const pNode = rootNode.children()![0];
        const spanNode = pNode.children()![0];
        assert.strictEqual(spanNode.parentNode, pNode);
        assert.strictEqual(pNode.parentNode, rootNode);

        // Trigger overlay highlight on spanNode.
        overlayModel.dispatchEventToListeners(SDK.OverlayModel.Events.HIGHLIGHT_NODE_REQUESTED, spanNode);
        await new Promise(resolve => setTimeout(resolve, 150));
        await UI.Widget.Widget.allUpdatesComplete;

        assert.isNull(domTree.selectedDOMNode());

        // Ancestors should be auto-expanded to reveal the highlighted node.
        const currentRootTreeElements = internalTree.rootElement().children();
        assert.isNotEmpty(currentRootTreeElements);
        const rootTreeElement = currentRootTreeElements[0];
        assert.isTrue(rootTreeElement.expanded);

        const pTreeElements = rootTreeElement.children();
        assert.isNotEmpty(pTreeElements);
        const pTreeElement = pTreeElements[0];
        assert.isTrue(pTreeElement.expanded);

        const spanTreeElement = pTreeElement.children()[0];
        assert.exists(spanTreeElement);
        assert.isTrue(spanTreeElement.listItemElement.classList.contains('hovered'));

        const spanWidgetElement = spanTreeElement.listItemElement.querySelector('devtools-widget');
        const spanWidget = UI.Widget.Widget.get(spanWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.isTrue(spanWidget.hovered);

        // Clear overlay highlight.
        overlayModel.dispatchEventToListeners(SDK.OverlayModel.Events.INSPECT_MODE_WILL_BE_TOGGLED, overlayModel);
        await new Promise(resolve => setTimeout(resolve, 150));
        await UI.Widget.Widget.allUpdatesComplete;

        assert.isFalse(spanWidget.hovered);
      } finally {
        domTree.detach();
      }
    });

    it('handles keyboard shortcuts (h to toggle hide, Delete to remove, Ctrl+ArrowUp/Down to reorder) in declarative view',
       async () => {
         SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
         const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
         sinon.stub(domModel, 'requestDocument').resolves(null);
         const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'DIV',
             children: [
               {nodeId: 2, nodeName: 'P'},
               {nodeId: 3, nodeName: 'SPAN'},
             ],
           });
           domTree.rootDOMNode = rootNode;
           domTree.expandRoot = true;
           domTree.performUpdate();

           await UI.Widget.Widget.allUpdatesComplete;

           const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
           assert.exists(tree);

           const pNode = rootNode.children()![0];
           const spanNode = rootNode.children()![1];

           // 1. Select pNode and press 'h' to toggle hide.
           domTree.selectDOMNode(pNode);
           await UI.Widget.Widget.allUpdatesComplete;

           const toggleHideSpy = sinon.spy(pNode, 'toggleHideElement');
           tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'h', bubbles: true}));
           sinon.assert.calledOnce(toggleHideSpy);

           // 2. Press Ctrl+ArrowDown (Cmd+ArrowDown on Mac) to move pNode down.
           const moveToSpy = sinon.spy(pNode, 'moveTo');
           const isMac = Host.Platform.isMac();
           tree.dispatchEvent(new KeyboardEvent('keydown', {
             key: 'ArrowDown',
             ctrlKey: !isMac,
             metaKey: isMac,
             bubbles: true,
           }));
           sinon.assert.calledOnce(moveToSpy);

           // 3. Select spanNode and press 'Delete' to remove.
           domTree.selectDOMNode(spanNode);
           await UI.Widget.Widget.allUpdatesComplete;

           const removeSpy = sinon.spy(spanNode, 'removeNode');
           tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'Delete', bubbles: true}));
           sinon.assert.calledOnce(removeSpy);

           // 4. Press 'Backspace' on pNode to remove.
           domTree.selectDOMNode(pNode);
           await UI.Widget.Widget.allUpdatesComplete;

           const removePSpy = sinon.spy(pNode, 'removeNode');
           tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'Backspace', bubbles: true}));
           sinon.assert.calledOnce(removePSpy);

           // 5. Verify selectNodeAfterEdit selects node and restores expansion.
           domTree.selectNodeAfterEdit(/* wasExpanded= */ true, /* error= */ null, pNode);
           assert.strictEqual(domTree.selectedDOMNode(), pNode);
           assert.isTrue(domTree.isNodeExpanded(pNode));
         } finally {
           domTree.detach();
         }
       });

    it('supports copying paths (CSS path, JS path, XPath, full XPath, outerHTML) and styles in DOMTreeWidget',
       async () => {
         SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
         const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
         sinon.stub(domModel, 'requestDocument').resolves(null);
         const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'DIV',
             children: [
               {nodeId: 2, nodeName: 'P', attributes: ['id', 'test-p']},
             ],
           });
           domTree.rootDOMNode = rootNode;
           domTree.expandRoot = true;
           domTree.performUpdate();

           await UI.Widget.Widget.allUpdatesComplete;

           const pNode = rootNode.children()![0];
           const copyTextStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');

           // 1. Copy CSS path
           domTree.copyCSSPath(pNode);
           sinon.assert.calledWith(copyTextStub, sinon.match('#test-p'));

           // 2. Copy JS path
           copyTextStub.resetHistory();
           domTree.copyJSPath(pNode);
           sinon.assert.calledWith(copyTextStub, sinon.match('document.querySelector'));

           // 3. Copy XPath
           copyTextStub.resetHistory();
           domTree.copyXPath(pNode);
           sinon.assert.calledWith(copyTextStub, '//*[@id="test-p"]');

           // 4. Copy full XPath
           copyTextStub.resetHistory();
           domTree.copyFullXPath(pNode);
           sinon.assert.calledWith(copyTextStub, sinon.match('/p'));

           // 5. Copy outer HTML
           copyTextStub.resetHistory();
           sinon.stub(pNode, 'getOuterHTML').resolves('<p id="test-p"></p>');
           await domTree.copyOuterHTML(pNode);
           sinon.assert.calledWith(copyTextStub, '<p id="test-p"></p>');

           // 6. Copy styles
           const cssModel = domModel.cssModel();
           sinon.stub(cssModel, 'cachedMatchedCascadeForNode').resolves(null);
           await domTree.copyStyles(pNode);
         } finally {
           domTree.detach();
         }
       });

    it('supports toggleEditAsHTML and multiline editing in DEFAULT_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          attributes: ['id', 'test-div'],
          children: [
            {nodeId: 2, nodeName: 'P', attributes: ['class', 'intro']},
          ],
        });
        const pNode = rootNode.children()![0];
        sinon.stub(pNode, 'getOuterHTML').resolves('<p class="intro"></p>');

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        // Start Edit as HTML on pNode
        domTree.toggleEditAsHTML(pNode);

        await UI.Widget.Widget.allUpdatesComplete;

        const multiline = domTree.multilineEditing();
        assert.exists(multiline);

        const treeElement = domTree.treeElementForNode(pNode);
        assert.exists(treeElement);
        assert.isTrue(treeElement.widget.isEditing);

        // Cancel editing
        multiline.cancel();
        assert.isNull(domTree.multilineEditing());
        assert.isFalse(treeElement.widget.isEditing);
      } finally {
        domTree.detach();
      }
    });

    it('handles drag and drop reordering in DEFAULT_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: 'P'},
            {nodeId: 3, nodeName: 'SPAN'},
          ],
        });
        const pNode = rootNode.children()![0];
        const spanNode = rootNode.children()![1];
        const moveToStub = sinon.stub(pNode, 'moveTo');

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        assert.isTrue(domTree.isValidDragSource(pNode));
        assert.isFalse(domTree.isValidDragSource(rootNode));

        // 1. Drag start on pNode
        const dataTransfer = new DataTransfer();
        const dragStartEvent = new DragEvent('dragstart', {dataTransfer});
        Object.defineProperty(dragStartEvent, 'target', {value: document.createElement('div')});
        const started = domTree.onDragStart(pNode, dragStartEvent);
        assert.isTrue(started);
        assert.strictEqual(domTree.nodeBeingDragged(), pNode);

        // 2. Drag over spanNode
        assert.isTrue(domTree.isValidDragTarget(spanNode));
        assert.isFalse(domTree.isValidDragTarget(pNode));

        const dragOverEvent = new DragEvent('dragover', {dataTransfer});
        domTree.onDragOver(spanNode, /* isClosingTag= */ false, dragOverEvent);
        assert.deepEqual(domTree.dragOverNode(), {node: spanNode, isClosingTag: false});

        // 3. Drop onto spanNode
        const dropEvent = new DragEvent('drop', {dataTransfer});
        domTree.onDrop(spanNode, /* isClosingTag= */ false, dropEvent);
        assert.isNull(domTree.nodeBeingDragged());
        assert.isNull(domTree.dragOverNode());
        sinon.assert.calledWith(moveToStub, rootNode, spanNode);
      } finally {
        domTree.detach();
      }
    });

    it('handles clipboard operations (cut, copy, paste, .in-clipboard styling, and events) in declarative view',
       async () => {
         SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
         const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
         sinon.stub(domModel, 'requestDocument').resolves(null);
         const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'DIV',
             children: [
               {nodeId: 2, nodeName: 'P'},
               {nodeId: 3, nodeName: 'SPAN'},
             ],
           });
           domTree.rootDOMNode = rootNode;
           domTree.setNodeExpanded(rootNode, true);
           domTree.expandRoot = true;
           domTree.performUpdate();

           await UI.Widget.Widget.allUpdatesComplete;

           const pNode = rootNode.children()![0];
           const spanNode = rootNode.children()![1];

           sinon.stub(pNode, 'getOuterHTML').resolves('<p></p>');
           sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');

           // 1. Cut pNode: verify clipboard state and in-clipboard class
           domTree.performCopyOrCut(/* isCut= */ true, pNode);
           assert.isTrue(domTree.isNodeInClipboard(pNode));
           assert.isFalse(domTree.isNodeInClipboard(spanNode));

           await UI.Widget.Widget.allUpdatesComplete;
           const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
           assert.exists(tree);

           const internalTree = tree.getInternalTreeOutlineForTest();
           const rootTreeElements = internalTree.rootElement().children();
           const pTreeElement = rootTreeElements[0].children()[0];
           assert.isTrue(pTreeElement.listItemElement.classList.contains('in-clipboard'));

           // 2. Paste cut pNode into spanNode
           assert.isTrue(domTree.canPaste(spanNode));
           const moveToSpy = sinon.spy(pNode, 'moveTo');
           domTree.pasteNode(spanNode);
           sinon.assert.calledOnce(moveToSpy);
           assert.isNull(domTree.clipboardData());

           // 3. Copy pNode (not cut)
           domTree.performCopyOrCut(/* isCut= */ false, pNode);
           assert.isFalse(domTree.isNodeInClipboard(pNode));
           assert.isTrue(domTree.canPaste(spanNode));
           const copyToSpy = sinon.spy(pNode, 'copyTo');
           domTree.pasteNode(spanNode);
           sinon.assert.calledOnce(copyToSpy);

           // 4. Reset clipboard on removed node
           domTree.setClipboardData({node: pNode, isCut: true});
           assert.isTrue(domTree.isNodeInClipboard(pNode));
           domTree.resetClipboardIfNeeded(pNode);
           assert.isFalse(domTree.isNodeInClipboard(pNode));

           // 5. Test clipboard events dispatched on <devtools-tree>
           domTree.selectDOMNode(pNode);
           await UI.Widget.Widget.allUpdatesComplete;

           const cutEvent = new CustomEvent('clipboard-cut', {bubbles: true});
           Object.defineProperty(cutEvent, 'target', {value: tree});
           tree.dispatchEvent(cutEvent);
           assert.isTrue(domTree.isNodeInClipboard(pNode));

           const pasteEvent = new CustomEvent('clipboard-paste', {bubbles: true});
           Object.defineProperty(pasteEvent, 'target', {value: tree});
           domTree.selectDOMNode(spanNode);
           tree.dispatchEvent(pasteEvent);
           sinon.assert.calledTwice(moveToSpy);
         } finally {
           domTree.detach();
         }
       });

    it('handles setHoveredNode to highlight node in overlay and clear highlight on null', async () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: 'P'},
          ],
        });
        domTree.rootDOMNode = rootNode;
        domTree.expandRoot = true;
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        const pNode = rootNode.children()![0];
        const highlightSpy = sinon.spy(domModel.overlayModel(), 'highlightInOverlay');
        const hideSpy = sinon.spy(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

        // Hover over pNode.
        domTree.setHoveredNode(pNode, /* showInfo= */ true);
        sinon.assert.calledWith(highlightSpy, sinon.match({node: pNode, selectorList: undefined}), 'all', true);
        assert.strictEqual(domTree.hoveredDOMNode(), pNode);

        // Hovering again with the same node should be a no-op.
        highlightSpy.resetHistory();
        domTree.setHoveredNode(pNode, /* showInfo= */ true);
        sinon.assert.notCalled(highlightSpy);

        // Hover over null to hide highlight.
        domTree.setHoveredNode(null);
        sinon.assert.calledOnce(hideSpy);
        assert.isNull(domTree.hoveredDOMNode());
      } finally {
        domTree.detach();
      }
    });

    it('dispatches mousemove and mouseleave to trigger overlay highlight and .hovered styling in declarative view',
       async () => {
         SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
         const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
         sinon.stub(domModel, 'requestDocument').resolves(null);
         const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'DIV',
             children: [
               {nodeId: 2, nodeName: 'P'},
             ],
           });
           domTree.omitRootDOMNode = true;
           domTree.rootDOMNode = rootNode;
           domTree.performUpdate();

           await UI.Widget.Widget.allUpdatesComplete;

           const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
           assert.exists(tree);
           const internalTree = tree.getInternalTreeOutlineForTest();
           const rootElement = internalTree.rootElement().children()[0];
           const pItem = rootElement.listItemElement;

           const pNode = rootNode.children()![0];
           const highlightSpy = sinon.spy(domModel.overlayModel(), 'highlightInOverlay');
           const hideSpy = sinon.spy(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

           // 1. Dispatch mousemove over P item.
           pItem.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
           sinon.assert.calledWith(highlightSpy, sinon.match({node: pNode}), 'all', true);
           assert.strictEqual(domTree.hoveredDOMNode(), pNode);

           await UI.Widget.Widget.allUpdatesComplete;
           assert.isTrue(pItem.classList.contains('hovered'));

           // 2. Dispatch mouseleave on devtools-tree.
           tree.dispatchEvent(new MouseEvent('mouseleave', {bubbles: true}));
           sinon.assert.calledOnce(hideSpy);
           assert.isNull(domTree.hoveredDOMNode());

           await UI.Widget.Widget.allUpdatesComplete;
           assert.isFalse(pItem.classList.contains('hovered'));
         } finally {
           domTree.detach();
         }
       });

    it('highlights search match and clears match highlights in declarative view', async () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: 'P', attributes: ['id', 'test-paragraph']},
          ],
        });
        domTree.omitRootDOMNode = true;
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        const pNode = rootNode.children()![0];

        // 1. Highlight search match
        domTree.highlightMatch(pNode, 'test-paragraph');
        assert.strictEqual(domTree.searchMatchNode(), pNode);
        assert.strictEqual(domTree.searchMatchQuery(), 'test-paragraph');
        assert.strictEqual(domTree.selectedDOMNode(), pNode);

        await UI.Widget.Widget.allUpdatesComplete;

        const highlights = CSS.highlights.get(Highlighting.HighlightManager.HIGHLIGHT_REGISTRY);
        assert.exists(highlights);
        assert.isAbove(highlights.size, 0);
        assert.isTrue(Array.from(highlights).some(range => range.toString() === 'test-paragraph'));

        // 2. Hide match highlights
        domTree.hideMatchHighlights(pNode);
        assert.isNull(domTree.searchMatchNode());
        assert.isNull(domTree.searchMatchQuery());

        await UI.Widget.Widget.allUpdatesComplete;

        assert.strictEqual(highlights.size, 0);
      } finally {
        domTree.detach();
      }
    });

    it('expands ancestors and selects node when highlightMatch is called on a nested node in declarative view',
       async () => {
         SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
         const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
         sinon.stub(domModel, 'requestDocument').resolves(null);
         const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'DIV',
             children: [
               {
                 nodeId: 2,
                 nodeName: 'SECTION',
                 children: [
                   {nodeId: 3, nodeName: 'SPAN', attributes: ['class', 'highlight-me']},
                 ],
               },
             ],
           });
           domTree.rootDOMNode = rootNode;
           domTree.performUpdate();

           await UI.Widget.Widget.allUpdatesComplete;

           const sectionNode = rootNode.children()![0];
           const spanNode = sectionNode.children()![0];

           assert.isFalse(domTree.isNodeExpanded(sectionNode));

           domTree.highlightMatch(spanNode, 'highlight-me');

           assert.isTrue(domTree.isNodeExpanded(sectionNode));
           assert.strictEqual(domTree.selectedDOMNode(), spanNode);

           await UI.Widget.Widget.allUpdatesComplete;

           const highlights = CSS.highlights.get(Highlighting.HighlightManager.HIGHLIGHT_REGISTRY);
           assert.exists(highlights);
           assert.isAbove(highlights.size, 0);
           assert.isTrue(Array.from(highlights).some(range => range.toString() === 'highlight-me'));
         } finally {
           domTree.detach();
         }
       });

    it('highlights search match and clears match highlights in default (imperative) view', async () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: 'P', attributes: ['id', 'test-default-view']},
          ],
        });
        domTree.omitRootDOMNode = true;
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        const pNode = rootNode.children()![0];

        // 1. Highlight search match
        domTree.highlightMatch(pNode, 'test-default-view');
        assert.strictEqual(domTree.searchMatchNode(), pNode);
        assert.strictEqual(domTree.searchMatchQuery(), 'test-default-view');

        await UI.Widget.Widget.allUpdatesComplete;

        const highlights = CSS.highlights.get(Highlighting.HighlightManager.HIGHLIGHT_REGISTRY);
        assert.exists(highlights);
        assert.isAbove(highlights.size, 0);
        assert.isTrue(Array.from(highlights).some(range => range.toString() === 'test-default-view'));

        // 2. Hide match highlights
        domTree.hideMatchHighlights(pNode);
        assert.isNull(domTree.searchMatchNode());
        assert.isNull(domTree.searchMatchQuery());

        await UI.Widget.Widget.allUpdatesComplete;

        assert.strictEqual(highlights.size, 0);
      } finally {
        domTree.detach();
      }
    });

    it('highlights search match when node is already selected in default (imperative) view', async () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: 'P', attributes: ['id', 'already-selected']},
          ],
        });
        domTree.omitRootDOMNode = true;
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();

        await UI.Widget.Widget.allUpdatesComplete;

        const pNode = rootNode.children()![0];
        domTree.selectDOMNode(pNode);
        assert.strictEqual(domTree.selectedDOMNode(), pNode);

        // Highlight search match on the already selected node
        domTree.highlightMatch(pNode, 'already-selected');
        assert.strictEqual(domTree.searchMatchNode(), pNode);
        assert.strictEqual(domTree.searchMatchQuery(), 'already-selected');

        await UI.Widget.Widget.allUpdatesComplete;

        const highlights = CSS.highlights.get(Highlighting.HighlightManager.HIGHLIGHT_REGISTRY);
        assert.exists(highlights);
        assert.isAbove(highlights.size, 0);
        assert.isTrue(Array.from(highlights).some(range => range.toString() === 'already-selected'));
      } finally {
        domTree.detach();
      }
    });

    // In DECLARATIVE_VIEW, updating DOMTreeWidget renders the outer devtools-tree element.
    // When devtools-tree connects the child devtools-widget elements, their internal
    // ElementsTreeWidgets schedule their render updates in a subsequent microtask/tick.
    // We wait for DOMTreeWidget, yield a tick to allow child widgets to mount, and then
    // await all child widget updates.
    async function waitForTreeUpdates(): Promise<void> {
      await UI.Widget.Widget.allUpdatesComplete;
      await new Promise(resolve => setTimeout(resolve, 0));
      await UI.Widget.Widget.allUpdatesComplete;
    }

    it('updates rendered attributes on AttrModified and AttrRemoved in DECLARATIVE_VIEW without duplicates',
       async () => {
         const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
         sinon.stub(domModel, 'requestDocument').resolves(null);
         const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'DIV',
             attributes: ['id', 'test-div'],
             children: [
               {nodeId: 2, nodeName: 'P', attributes: ['class', 'intro']},
             ],
           });
           const pNode = rootNode.children()![0];
           domTree.rootDOMNode = rootNode;
           domTree.setNodeExpanded(rootNode, true);
           domTree.performUpdate();

           await waitForTreeUpdates();

           const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
           assert.exists(tree);
           const internalTree = tree.getInternalTreeOutlineForTest();
           const rootTreeElements = internalTree.rootElement().children();
           assert.lengthOf(rootTreeElements, 1);

           const getText = (el: Element): string => el.textContent?.replace(/\u200B/g, '') ?? '';

           const rootWidgetElement = rootTreeElements[0].listItemElement.querySelector('devtools-widget');
           const rootWidget =
               UI.Widget.Widget.get(rootWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
           assert.exists(rootWidget);
           const rootAttrs = rootWidget.contentElement.querySelectorAll('.webkit-html-attribute');
           assert.lengthOf(rootAttrs, 1);
           assert.strictEqual(getText(rootAttrs[0]), 'id="test-div"');

           const pTreeElement = rootTreeElements[0].children()[0];
           const pWidgetElement = pTreeElement.listItemElement.querySelector('devtools-widget');
           const pWidget = UI.Widget.Widget.get(pWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
           assert.exists(pWidget);
           let pAttrs = pWidget.contentElement.querySelectorAll('.webkit-html-attribute');
           assert.lengthOf(pAttrs, 1);
           assert.strictEqual(getText(pAttrs[0]), 'class="intro"');

           // 1. Add a new attribute via domModel.attributeModified
           domModel.attributeModified(pNode.id, 'data-test', '123');
           await waitForTreeUpdates();

           // Verify attributes on pWidget are updated without duplicates
           pAttrs = pWidget.contentElement.querySelectorAll('.webkit-html-attribute');
           assert.lengthOf(pAttrs, 2);
           assert.strictEqual(getText(pAttrs[0]), 'class="intro"');
           assert.strictEqual(getText(pAttrs[1]), 'data-test="123"');

           // 2. Remove attribute via domModel.attributeRemoved
           domModel.attributeRemoved(pNode.id, 'class');
           await waitForTreeUpdates();

           // Verify only remaining attribute is rendered
           pAttrs = pWidget.contentElement.querySelectorAll('.webkit-html-attribute');
           assert.lengthOf(pAttrs, 1);
           assert.strictEqual(getText(pAttrs[0]), 'data-test="123"');
         } finally {
           domTree.detach();
         }
       });

    it('starts editing attribute or new attribute on selectNodeAfterEdit with moveDirection in DECLARATIVE_VIEW',
       async () => {
         const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
         sinon.stub(domModel, 'requestDocument').resolves(null);
         const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'DIV',
             attributes: ['id', 'test-div', 'class', 'main'],
             children: [
               {nodeId: 2, nodeName: 'SPAN', attributes: []},
             ],
           });
           const spanNode = rootNode.children()![0];
           domTree.rootDOMNode = rootNode;
           domTree.setNodeExpanded(rootNode, true);
           domTree.performUpdate();

           await waitForTreeUpdates();

           // 1. selectNodeAfterEdit on rootNode with forward moveDirection -> starts editing first attribute ('id')
           domTree.selectNodeAfterEdit(true, null, rootNode, 'forward');

           await waitForTreeUpdates();

           const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
           assert.exists(tree);
           const internalTree = tree.getInternalTreeOutlineForTest();
           const rootTreeElements = internalTree.rootElement().children();
           const rootWidgetElement = rootTreeElements[0].listItemElement.querySelector('devtools-widget');
           const rootWidget =
               UI.Widget.Widget.get(rootWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
           assert.exists(rootWidget);
           assert.isTrue(rootWidget.isEditing);
           rootWidget.editing?.cancel();
           assert.isFalse(rootWidget.isEditing);

           // 2. selectNodeAfterEdit on spanNode (no attributes) with forward moveDirection -> starts adding new attribute
           domTree.selectNodeAfterEdit(false, null, spanNode, 'forward');

           await waitForTreeUpdates();

           const spanTreeElement = rootTreeElements[0].children()[0];
           const spanWidgetElement = spanTreeElement.listItemElement.querySelector('devtools-widget');
           const spanWidget =
               UI.Widget.Widget.get(spanWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
           assert.exists(spanWidget);
           assert.isTrue(spanWidget.isEditing);
           spanWidget.editing?.cancel();
           assert.isFalse(spanWidget.isEditing);
         } finally {
           domTree.detach();
         }
       });

    it('supports toggleEditAsHTML and multiline editing in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          attributes: ['id', 'test-div'],
          children: [
            {nodeId: 2, nodeName: 'P', attributes: ['class', 'intro']},
          ],
        });
        const pNode = rootNode.children()![0];
        sinon.stub(pNode, 'getOuterHTML').resolves('<p class="intro"></p>');

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        // Start Edit as HTML on pNode
        domTree.toggleEditAsHTML(pNode);

        await waitForTreeUpdates();

        const multiline = domTree.multilineEditing();
        assert.exists(multiline);

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        const pTreeElement = rootTreeElements[0].children()[0];
        const pWidgetElement = pTreeElement.listItemElement.querySelector('devtools-widget');
        const pWidget = UI.Widget.Widget.get(pWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(pWidget);
        assert.isTrue(pWidget.isEditing);

        // Cancel editing
        multiline.cancel();
        assert.isNull(domTree.multilineEditing());
        assert.isFalse(pWidget.isEditing);
      } finally {
        domTree.detach();
      }
    });

    it('handles drag and drop reordering and class styling in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: 'P'},
            {nodeId: 3, nodeName: 'SPAN'},
          ],
        });
        const pNode = rootNode.children()![0];
        const spanNode = rootNode.children()![1];
        const moveToStub = sinon.stub(pNode, 'moveTo');

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        const pTreeElement = rootTreeElements[0].children()[0];
        const spanTreeElement = rootTreeElements[0].children()[1];

        assert.isTrue(pTreeElement.listItemElement.draggable);

        // 1. Drag start on pNode via DOM event dispatch (verifying bubbling is stopped)
        const dataTransfer = new DataTransfer();
        const dragStartEvent = new DragEvent('dragstart', {dataTransfer, bubbles: true, cancelable: true});
        pTreeElement.listItemElement.dispatchEvent(dragStartEvent);
        assert.strictEqual(domTree.nodeBeingDragged(), pNode);

        // 2. Drag over spanNode -> verify elements-drag-over class in DOM
        const dragOverEvent = new DragEvent('dragover', {dataTransfer, bubbles: true, cancelable: true});
        spanTreeElement.listItemElement.dispatchEvent(dragOverEvent);

        await waitForTreeUpdates();
        assert.isTrue(spanTreeElement.listItemElement.classList.contains('elements-drag-over'));

        // 3. Drag leave
        const dragLeaveEvent = new DragEvent('dragleave', {dataTransfer, bubbles: true, cancelable: true});
        spanTreeElement.listItemElement.dispatchEvent(dragLeaveEvent);

        await waitForTreeUpdates();
        assert.isFalse(spanTreeElement.listItemElement.classList.contains('elements-drag-over'));

        // 4. Drop onto spanNode
        spanTreeElement.listItemElement.dispatchEvent(dragOverEvent);
        const dropEvent = new DragEvent('drop', {dataTransfer, bubbles: true, cancelable: true});
        spanTreeElement.listItemElement.dispatchEvent(dropEvent);

        await waitForTreeUpdates();
        assert.isNull(domTree.nodeBeingDragged());
        assert.isNull(domTree.dragOverNode());
        assert.isFalse(spanTreeElement.listItemElement.classList.contains('elements-drag-over'));
        sinon.assert.calledWith(moveToStub, rootNode, spanNode);
      } finally {
        domTree.detach();
      }
    });
  });
});
