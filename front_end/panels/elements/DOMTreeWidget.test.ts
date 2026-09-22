// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as ChangeTracker from '../../models/change_tracker/change_tracker.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {assertScreenshot, renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
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
      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, [], view);
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
      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, [], view);
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
      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, [], view);
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
        const domTree =
            new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, [], Elements.ElementsTreeOutline.DEFAULT_VIEW);
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

    it('shows preview when hovering over a link in DECLARATIVE_VIEW', async () => {
      const clock = sinon.useFakeTimers();
      try {
        const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, [],
                                                                       Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
        domTree.markAsRoot();
        renderElementIntoDOM(domTree);
        domTree.performUpdate();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        const link = tree.createChild('span');
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

  describe('issue tooltip popover', () => {
    it('shows issue tooltip when hovering over a violating element in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
        });
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const widgetElement = tree.shadowRoot?.querySelector('devtools-widget');
        assert.exists(widgetElement);
        const widget = UI.Widget.Widget.get(widgetElement) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(widget);

        const mockIssue = new IssuesManager.GenericIssue.GenericIssue({
          errorType: Protocol.Audits.GenericIssueErrorType.FormLabelForNameError,
          frameId: '1' as Protocol.Page.FrameId,
        },
                                                                      null);

        sinon.stub(widget, 'issues').get(() => [mockIssue]);

        const violatingTag = widget.contentElement.querySelector('.webkit-html-tag-name');
        assert.exists(violatingTag);
        violatingTag.classList.add('violating-element');
        violatingTag.boxInWindow = () => new AnchorBox(0, 0, 10, 10);

        const issueHelper = domTree.issuePopoverHelperForTest();
        assert.exists(issueHelper);

        const event = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        Object.defineProperty(event, 'composedPath', {
          value: () => [violatingTag],
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const request = (issueHelper as any).getRequest(event);
        assert.exists(request);
        assert.deepEqual(request.box, new AnchorBox(0, 0, 10, 10));

        const popover = new UI.GlassPane.GlassPane();
        const shown = await request.show(popover);
        assert.isTrue(shown);
        const content = popover.contentElement.querySelector('.squiggles-content');
        assert.exists(content);
        assert.include(content.textContent, 'Incorrect use of <label for=FORM_ELEMENT>');
      } finally {
        domTree.detach();
      }
    });

    it('shows issue tooltip when hovering over an attribute violating element in DEFAULT_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          attributes: ['id', 'test-id'],
        });
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(domModel);
        assert.exists(treeOutline);
        const treeElement = treeOutline.findTreeElement(rootNode);
        assert.exists(treeElement);

        const mockIssue = new IssuesManager.GenericIssue.GenericIssue({
          errorType: Protocol.Audits.GenericIssueErrorType.FormLabelForNameError,
          frameId: '1' as Protocol.Page.FrameId,
          violatingNodeAttribute: 'id',
        },
                                                                      null);

        sinon.stub(treeElement.widget, 'issues').get(() => [mockIssue]);

        const violatingAttr = treeElement.listItemElement.querySelector('.webkit-html-attribute-name');
        assert.exists(violatingAttr);
        violatingAttr.classList.add('violating-element');
        violatingAttr.boxInWindow = () => new AnchorBox(0, 0, 10, 10);

        const issueHelper = domTree.issuePopoverHelperForTest();
        assert.exists(issueHelper);

        const event = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        Object.defineProperty(event, 'composedPath', {
          value: () => [violatingAttr],
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const request = (issueHelper as any).getRequest(event);
        assert.exists(request);
        assert.deepEqual(request.box, new AnchorBox(0, 0, 10, 10));

        const popover = new UI.GlassPane.GlassPane();
        const shown = await request.show(popover);
        assert.isTrue(shown);
        const content = popover.contentElement.querySelector('.squiggles-content');
        assert.exists(content);
        assert.include(content.textContent, 'Incorrect use of <label for=FORM_ELEMENT>');
      } finally {
        domTree.detach();
      }
    });

    it('hides popovers when selectDOMNode, hideImagePreview, and detach are called', () => {
      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget();
      domTree.markAsRoot();
      renderElementIntoDOM(domTree);
      domTree.performUpdate();

      const imagePopover = domTree.imagePreviewPopoverForTest();
      assert.exists(imagePopover);
      const imageHideSpy = sinon.spy(imagePopover, 'hide');

      const issueHelper = domTree.issuePopoverHelperForTest();
      assert.exists(issueHelper);
      const issueHideSpy = sinon.spy(issueHelper, 'hidePopover');

      domTree.hideImagePreview();
      sinon.assert.calledOnce(imageHideSpy);

      domTree.selectDOMNode(null);
      sinon.assert.calledTwice(imageHideSpy);
      sinon.assert.calledOnce(issueHideSpy);

      domTree.detach();
      sinon.assert.calledThrice(imageHideSpy);
      sinon.assert.calledTwice(issueHideSpy);
    });
  });

  interface TestDOMNodeConfig {
    nodeId: number;
    nodeName: string;
    nodeType?: number;
    attributes?: string[];
    nodeValue?: string;
    children?: TestDOMNodeConfig[];
    adoptedStyleSheets?: Protocol.DOM.StyleSheetId[];
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
        // eslint-disable-next-line @devtools/no-adopted-style-sheets
        adoptedStyleSheets: nodeConfig.adoptedStyleSheets,
        childNodeCount: nodeConfig.children?.length ?? 0,
        children: nodeConfig.children?.map(child => convertNode(child, nodeConfig.nodeId as Protocol.DOM.NodeId)),
      };
    };

    const payload = convertNode(config, parentId);
    const node = (payload.nodeName === '#document' || payload.nodeType === Node.DOCUMENT_NODE) ?
        new SDK.DOMModel.DOMDocument(domModel, payload) :
        SDK.DOMModel.DOMNode.create(domModel, null, false, payload);
    assert.isNotNull(node);
    return node;
  }

  function setupDOMTreeWidget(
      target: SDK.Target.Target,
      view?: Elements.ElementsTreeOutline.View,
      options?: {includeCommonStyles?: boolean},
      ): {domTree: Elements.ElementsTreeOutline.DOMTreeWidget, domModel: SDK.DOMModel.DOMModel} {
    const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
    if (!('restore' in domModel.requestDocument)) {
      sinon.stub(domModel, 'requestDocument').resolves(null);
    }
    const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, [], view);
    domTree.markAsRoot();
    renderElementIntoDOM(domTree, options);
    domTree.performUpdate();
    domTree.modelAdded(domModel);
    return {domTree, domModel};
  }

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
  describe('context menu', () => {
    it('allows default context menu on text selection when editing', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);
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
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);
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

    it('collapses children of a node in DEFAULT_VIEW', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {
              nodeId: 2,
              nodeName: 'DIV',
              children: [
                {
                  nodeId: 3,
                  nodeName: 'SPAN',
                  children: [{nodeId: 4, nodeName: 'B'}],
                },
              ],
            },
          ],
        });
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(domModel);
        assert.exists(treeOutline);
        const rootTreeElement = treeOutline.findTreeElement(rootNode);
        assert.exists(rootTreeElement);
        await rootTreeElement.expandRecursively();

        const childNode = rootNode.children()![0];
        const childTreeElement = treeOutline.findTreeElement(childNode);
        assert.exists(childTreeElement);
        assert.isTrue(childTreeElement.expanded);

        domTree.collapseChildren(rootNode);

        assert.isTrue(rootTreeElement.expanded);
        assert.isFalse(childTreeElement.expanded);
      } finally {
        domTree.detach();
      }
    });

    it('highlights closing tag and not opening tag when hovering over expanded closing tag in DEFAULT_VIEW',
       async () => {
         const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);
         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'DIV',
             children: [
               {nodeId: 2, nodeName: 'P'},
             ],
           });
           domTree.rootDOMNode = rootNode;
           domTree.performUpdate();
           await waitForTreeUpdates();

           const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(domModel);
           assert.exists(treeOutline);
           const rootTreeElement = treeOutline.findTreeElement(rootNode);
           assert.exists(rootTreeElement);
           rootTreeElement.expand();
           await waitForTreeUpdates();

           const closingTreeElement = rootTreeElement.childAt(rootTreeElement.childCount() - 1) as
               Elements.ElementsTreeElement.ElementsTreeElement;
           assert.exists(closingTreeElement);
           assert.isTrue(closingTreeElement.isClosingTag());

           const highlightSpy = sinon.spy(domModel.overlayModel(), 'highlightInOverlay');

           // Hover over the opening tag first.
           rootTreeElement.listItemElement.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
           assert.isTrue(rootTreeElement.hovered);
           assert.isTrue(rootTreeElement.listItemElement.classList.contains('hovered'));
           assert.isFalse(closingTreeElement.hovered);
           assert.isFalse(closingTreeElement.listItemElement.classList.contains('hovered'));
           assert.strictEqual(domTree.hoveredDOMNode(), rootNode);

           // Move hover to the closing tag.
           closingTreeElement.listItemElement.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
           assert.isFalse(rootTreeElement.hovered);
           assert.isFalse(rootTreeElement.listItemElement.classList.contains('hovered'));
           assert.isTrue(closingTreeElement.hovered);
           assert.isTrue(closingTreeElement.listItemElement.classList.contains('hovered'));
           assert.strictEqual(domTree.hoveredDOMNode(), rootNode);
           sinon.assert.calledWith(highlightSpy, sinon.match({node: rootNode}), 'all', true);

           // Move mouse away.
           treeOutline.elementInternal.dispatchEvent(new MouseEvent('mouseleave'));
           assert.isFalse(closingTreeElement.hovered);
           assert.isFalse(closingTreeElement.listItemElement.classList.contains('hovered'));
           assert.isNull(domTree.hoveredDOMNode());
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

    it('renders exactly one selection fill element on tree element level for DOM nodes, shortcuts, and adopted style sheets',
       async () => {
         const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
         const sheetId = 'sheet-selection-test' as Protocol.DOM.StyleSheetId;
         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: '#document',
             adoptedStyleSheets: [sheetId],
             children: [
               {
                 nodeId: 2,
                 nodeName: 'HTML',
                 children: [
                   {
                     nodeId: 3,
                     nodeName: 'BODY',
                     children: [{nodeId: 4, nodeName: 'DIALOG'}],
                   },
                 ],
               },
             ],
           });
           const adoptedSheet = rootNode.adoptedStyleSheetsForNode[0];
           sinon.stub(adoptedSheet.cssModel, 'getStyleSheetText').resolves('.a {}');
           adoptedSheet.cssModel.styleSheetAdded({
             styleSheetId: sheetId,
             frameId: '' as Protocol.Page.FrameId,
             sourceURL: '',
             title: '',
             origin: 'regular' as Protocol.CSS.StyleSheetOrigin,
             disabled: false,
             isInline: false,
             isMutable: true,
             isConstructed: true,
             startLine: 0,
             startColumn: 0,
             endLine: 0,
             endColumn: 5,
             length: 5,
             loadingFailed: false,
           });

           const dialogNode = rootNode.children()![0].children()![0].children()![0];
           const shortcut = new SDK.DOMModel.DOMNodeShortcut(domModel.target(), dialogNode.backendNodeId(),
                                                             Node.ELEMENT_NODE, 'DIALOG');
           domModel.dispatchEventToListeners(SDK.DOMModel.Events.TopLayerElementsChanged, {
             document: rootNode as SDK.DOMModel.DOMDocument,
             documentShortcuts: [shortcut],
           });

           domTree.rootDOMNode = rootNode;
           domTree.setNodeExpanded(rootNode, true);
           domTree.setNodeExpanded(rootNode.children()![0], true);
           domTree.setNodeExpanded(rootNode.children()![0].children()![0], true);
           domTree.setAdoptedStyleSheetsExpanded(rootNode, true);
           domTree.setAdoptedStyleSheetExpanded(adoptedSheet, true);
           domTree.setTopLayerExpanded(rootNode as SDK.DOMModel.DOMDocument, true);
           domTree.performUpdate();
           await waitForTreeUpdates();

           const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
           assert.exists(tree);

           const listItems = tree.shadowRoot?.querySelectorAll('li');
           assert.exists(listItems);
           assert.isAbove(listItems.length, 5);

           for (const li of listItems) {
             const selections = li.querySelectorAll('.selection');
             assert.lengthOf(selections, 1, `Expected exactly 1 .selection element in row: ${li.textContent}`);
             assert.exists(li.querySelector(':scope > .selection.fill'),
                           `Expected selection fill at tree element level in row: ${li.textContent}`);
             assert.isNull(li.querySelector('.tree-element-title .selection'),
                           `Expected no selection fill inside title/widget in row: ${li.textContent}`);
           }
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

    it('collapses children of a node', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {
              nodeId: 2,
              nodeName: 'DIV',
              children: [
                {
                  nodeId: 3,
                  nodeName: 'SPAN',
                  children: [{nodeId: 4, nodeName: 'B'}],
                },
              ],
            },
          ],
        });
        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        const childNode = rootNode.children()![0];
        const grandChildNode = childNode.children()![0];
        domTree.setNodeExpanded(childNode, true);
        domTree.setNodeExpanded(grandChildNode, true);
        domTree.performUpdate();
        await waitForTreeUpdates();

        assert.isTrue(domTree.isNodeExpanded(rootNode));
        assert.isTrue(domTree.isNodeExpanded(childNode));
        assert.isTrue(domTree.isNodeExpanded(grandChildNode));

        domTree.collapseChildren(rootNode);
        await waitForTreeUpdates();

        assert.isTrue(domTree.isNodeExpanded(rootNode));
        assert.isFalse(domTree.isNodeExpanded(childNode));
        assert.isFalse(domTree.isNodeExpanded(grandChildNode));

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree')!;
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElement = internalTree.rootElement().children()[0];
        const childTreeElement = rootTreeElement.children()[0];
        assert.isFalse(childTreeElement.expanded);
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

    it('automatically expands html element and renders its children when root is document in DECLARATIVE_VIEW',
       async () => {
         const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
         try {
           domTree.omitRootDOMNode = true;
           const docNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeType: Node.DOCUMENT_NODE,
             nodeName: '#document',
             children: [
               {
                 nodeId: 2,
                 nodeName: 'HTML',
                 attributes: ['lang', 'en'],
                 children: [
                   {nodeId: 3, nodeName: 'HEAD'},
                   {nodeId: 4, nodeName: 'BODY'},
                 ],
               },
             ],
           });
           const htmlNode = docNode.children()![0];

           domTree.rootDOMNode = docNode;
           domTree.performUpdate();

           await waitForTreeUpdates();

           assert.isTrue(domTree.isNodeExpanded(htmlNode));

           const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
           assert.exists(tree);

           const internalTree = tree.getInternalTreeOutlineForTest();
           const rootElements = internalTree.rootElement().children();
           assert.lengthOf(rootElements, 1);
           const htmlTreeElement = rootElements[0];
           assert.isTrue(htmlTreeElement.expanded);
           assert.isTrue(htmlTreeElement.listItemElement.classList.contains('always-parent'));
           assert.lengthOf(htmlTreeElement.children(), 3);
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

        // Closing DIV (depth 1 in tree hierarchy, not expandable): 12 * (1 - 1) + 12 = 12.
        const closingDivTreeElement = rootTreeElements[0].children()[1];
        const closingDivWidgetElement = closingDivTreeElement.listItemElement.querySelector('devtools-widget');
        const closingDivWidget =
            UI.Widget.Widget.get(closingDivWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.strictEqual(closingDivWidget.computeLeftIndent, 12);
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

    it('clears previous search match highlights when navigating to a new match in default (imperative) view',
       async () => {
         SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
         const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
         sinon.stub(domModel, 'requestDocument').resolves(null);
         const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);
         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'DIV',
             children: [
               {nodeId: 2, nodeName: 'P', attributes: ['id', 'match-one']},
               {nodeId: 3, nodeName: 'P', attributes: ['id', 'match-two']},
             ],
           });
           domTree.omitRootDOMNode = true;
           domTree.rootDOMNode = rootNode;
           domTree.performUpdate();

           await UI.Widget.Widget.allUpdatesComplete;

           const p1 = rootNode.children()![0];
           const p2 = rootNode.children()![1];

           // 1. Highlight first match
           domTree.highlightMatch(p1, 'match');
           await UI.Widget.Widget.allUpdatesComplete;

           let highlights = CSS.highlights.get(Highlighting.HighlightManager.HIGHLIGHT_REGISTRY);
           assert.exists(highlights);
           assert.strictEqual(highlights.size, 1);

           const treeElement1 = domTree.treeElementForNode(p1) as Elements.ElementsTreeElement.ElementsTreeElement;
           assert.isNotNull(treeElement1);
           assert.strictEqual(treeElement1.widget.searchQuery, 'match');

           // 2. Navigate to second match (which deselects treeElement1 and triggers its performUpdate)
           domTree.highlightMatch(p2, 'match');
           await UI.Widget.Widget.allUpdatesComplete;

           assert.isNull(treeElement1.widget.searchQuery);
           highlights = CSS.highlights.get(Highlighting.HighlightManager.HIGHLIGHT_REGISTRY);
           assert.exists(highlights);
           assert.strictEqual(highlights.size, 1);

           const treeElement2 = domTree.treeElementForNode(p2) as Elements.ElementsTreeElement.ElementsTreeElement;
           assert.isNotNull(treeElement2);
           assert.strictEqual(treeElement2.widget.searchQuery, 'match');
           const activeRange = Array.from(highlights)[0];
           assert.isTrue(treeElement2.listItemElement.contains(activeRange.startContainer));
         } finally {
           domTree.detach();
         }
       });

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
           domTree.updateModifiedNodes();
           await waitForTreeUpdates();

           // Verify attributes on pWidget are updated without duplicates
           pAttrs = pWidget.contentElement.querySelectorAll('.webkit-html-attribute');
           assert.lengthOf(pAttrs, 2);
           assert.strictEqual(getText(pAttrs[0]), 'class="intro"');
           assert.strictEqual(getText(pAttrs[1]), 'data-test="123"');

           // 2. Remove attribute via domModel.attributeRemoved
           domModel.attributeRemoved(pNode.id, 'class');
           domTree.updateModifiedNodes();
           await waitForTreeUpdates();

           // Verify only remaining attribute is rendered
           pAttrs = pWidget.contentElement.querySelectorAll('.webkit-html-attribute');
           assert.lengthOf(pAttrs, 1);
           assert.strictEqual(getText(pAttrs[0]), 'data-test="123"');
         } finally {
           domTree.detach();
         }
       });

    it('applies DOM update highlight animation on attribute modified and fires onElementsTreeUpdated in DECLARATIVE_VIEW',
       async () => {
         const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
         sinon.stub(domModel, 'requestDocument').resolves(null);
         const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
         try {
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'DIV',
             children: [
               {nodeId: 2, nodeName: 'P', attributes: ['class', 'intro']},
             ],
           });
           const pNode = rootNode.children()![0];
           domTree.rootDOMNode = rootNode;
           domTree.setNodeExpanded(rootNode, true);
           domTree.performUpdate();

           await waitForTreeUpdates();

           const updatedNodesPromise = new Promise<SDK.DOMModel.DOMNode[]>(resolve => {
             domTree.onElementsTreeUpdated = (event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode[]>) => {
               resolve(event.data);
             };
           });

           // Modify attribute
           domModel.attributeModified(pNode.id, 'class', 'updated');
           assert.isTrue(domTree.updateRecordsForTest().has(pNode));
           domTree.updateModifiedNodes();
           assert.strictEqual(domTree.updateRecordsForTest().size, 0);

           const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
           assert.exists(tree);
           const internalTree = tree.getInternalTreeOutlineForTest();
           const pTreeElement = internalTree.rootElement().children()[0].children()[0];
           const pWidgetElement = pTreeElement.listItemElement.querySelector('devtools-widget');
           const pWidget = UI.Widget.Widget.get(pWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
           assert.exists(pWidget);

           await pWidget.updateComplete;
           const highlighted = pWidget.contentElement.querySelectorAll('.dom-update-highlight');
           assert.isAtLeast(highlighted.length, 1);

           const updatedNodes = await updatedNodesPromise;
           assert.deepEqual(updatedNodes, [pNode]);
         } finally {
           domTree.detach();
         }
       });

    it('applies DOM update highlight animation on character data modified in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: '#text', nodeValue: 'Hello'},
          ],
        });
        const textNode = rootNode.children()![0];
        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        // Modify character data
        domModel.characterDataModified(textNode.id, 'World');
        assert.isTrue(domTree.updateRecordsForTest().has(textNode));
        domTree.updateModifiedNodes();
        assert.strictEqual(domTree.updateRecordsForTest().size, 0);

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElement = internalTree.rootElement().children()[0];
        const rootWidgetElement = rootTreeElement.listItemElement.querySelector('devtools-widget');
        const rootWidget = UI.Widget.Widget.get(rootWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(rootWidget);

        await rootWidget.updateComplete;
        const highlighted = rootWidget.contentElement.querySelectorAll('.dom-update-highlight');
        assert.isAtLeast(highlighted.length, 1);
      } finally {
        domTree.detach();
      }
    });

    it('continues receiving DOMModel updates after detach and re-show in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: 'P', attributes: ['class', 'intro']},
          ],
        });
        const pNode = rootNode.children()![0];
        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();
        await waitForTreeUpdates();

        // Simulate panel switch: detach, then show again
        domTree.detach();
        renderElementIntoDOM(domTree);
        await waitForTreeUpdates();

        // Modify attribute
        domModel.attributeModified(pNode.id, 'class', 'updated');
        assert.isTrue(domTree.updateRecordsForTest().has(pNode));
        domTree.updateModifiedNodes();
        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const pTreeElement = internalTree.rootElement().children()[0].children()[0];
        const pWidgetElement = pTreeElement.listItemElement.querySelector('devtools-widget');
        const pWidget = UI.Widget.Widget.get(pWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(pWidget);

        const getText = (el: Element): string => el.textContent?.replace(/\u200B/g, '') ?? '';
        const pAttrs = pWidget.contentElement.querySelectorAll('.webkit-html-attribute');
        assert.lengthOf(pAttrs, 1);
        assert.strictEqual(getText(pAttrs[0]), 'class="updated"');
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
        const editorContainer = pWidgetElement?.querySelector('.elements-tree-editor');
        assert.exists(editorContainer);
        let mousedownBubbled = false;
        pTreeElement.listItemElement.addEventListener('mousedown', () => {
          mousedownBubbled = true;
        });
        editorContainer.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
        assert.isFalse(mousedownBubbled);
        assert.isTrue(pWidget.isEditing);

        // Cancel editing
        multiline.cancel();
        assert.isNull(domTree.multilineEditing());
        assert.isFalse(pWidget.isEditing);
      } finally {
        domTree.detach();
      }
    });

    it('hides children and closing tag when editing an element with children as HTML in DECLARATIVE_VIEW', async () => {
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
        sinon.stub(rootNode, 'getOuterHTML').resolves('<div id="test-div"><p class="intro"></p></div>');

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElement = internalTree.rootElement().children()[0];
        assert.exists(rootTreeElement);

        // Before edit: root has 2 children (p child and closing tag) and is a parent
        assert.lengthOf(rootTreeElement.children(), 2);
        assert.isTrue(rootTreeElement.listItemElement.classList.contains('parent'));

        // Start Edit as HTML on rootNode
        domTree.toggleEditAsHTML(rootNode);

        await waitForTreeUpdates();

        const multiline = domTree.multilineEditing();
        assert.exists(multiline);
        assert.strictEqual(domTree.multilineEditingNode(), rootNode);

        // While editing: children and closing tag are hidden, parent disclosure styling is removed, and editor is present
        assert.lengthOf(rootTreeElement.children(), 0);
        assert.isFalse(rootTreeElement.listItemElement.classList.contains('parent'));
        const editor = rootTreeElement.listItemElement.querySelector('.elements-tree-editor');
        assert.exists(editor);

        // Cancel editing restores children and closing tag
        multiline.cancel();
        await waitForTreeUpdates();

        assert.isNull(domTree.multilineEditing());
        assert.isNull(domTree.multilineEditingNode());
        assert.lengthOf(rootTreeElement.children(), 2);
        assert.isTrue(rootTreeElement.listItemElement.classList.contains('parent'));
        assert.isNull(rootTreeElement.listItemElement.querySelector('.elements-tree-editor'));
      } finally {
        domTree.detach();
      }
    });

    it('cleans up multilineEditingNode when Edit as HTML is requested during active inline edit in DECLARATIVE_VIEW',
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
           sinon.stub(rootNode, 'getOuterHTML').resolves('<div id="test-div"><p class="intro"></p></div>');

           domTree.rootDOMNode = rootNode;
           domTree.setNodeExpanded(rootNode, true);
           domTree.performUpdate();

           await waitForTreeUpdates();

           const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
           assert.exists(tree);
           const internalTree = tree.getInternalTreeOutlineForTest();
           const rootTreeElement = internalTree.rootElement().children()[0];
           const rootWidgetElement = rootTreeElement.listItemElement.querySelector('devtools-widget');
           const rootWidget =
               UI.Widget.Widget.get(rootWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
           assert.exists(rootWidget);

           // Start inline attribute editing on rootWidget
           rootWidget.triggerEditAttribute('id');
           await waitForTreeUpdates();
           assert.isTrue(rootWidget.isEditing);

           // Trigger Edit as HTML while inline editing is active
           domTree.toggleEditAsHTML(rootNode);
           await waitForTreeUpdates();

           // Editing aborts, multilineEditingNode should be cleaned up, and children should remain visible
           assert.isNull(domTree.multilineEditingNode());
           assert.lengthOf(rootTreeElement.children(), 2);

           rootWidget.editing?.cancel();
         } finally {
           domTree.detach();
         }
       });

    it('cleans up multilineEditingNode when getOuterHTML fails in DECLARATIVE_VIEW', async () => {
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
        // Simulate backend error returning undefined
        sinon.stub(rootNode, 'getOuterHTML').resolves(undefined as unknown as string);

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElement = internalTree.rootElement().children()[0];

        // Trigger Edit as HTML
        domTree.toggleEditAsHTML(rootNode);
        await waitForTreeUpdates();

        // multilineEditingNode should be cleaned up and children restored
        assert.isNull(domTree.multilineEditingNode());
        assert.lengthOf(rootTreeElement.children(), 2);
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

    it('triggers in-place editing on Enter and edit-as-html on F2 in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          attributes: ['id', 'test-div'],
          children: [
            {nodeId: 2, nodeName: 'SPAN'},
            {nodeId: 3, nodeName: '#text', nodeValue: 'Hello world', nodeType: Node.TEXT_NODE},
          ],
        });
        const spanNode = rootNode.children()![0];
        const textNode = rootNode.children()![1];

        domTree.rootDOMNode = rootNode;
        domTree.expandRoot = true;
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        // 1. Enter on element with attributes -> edits first attribute
        domTree.selectDOMNode(rootNode);
        await waitForTreeUpdates();

        tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
        await waitForTreeUpdates();

        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElement = internalTree.rootElement().children()[0];
        const rootWidgetElement = rootTreeElement.listItemElement.querySelector('devtools-widget');
        const rootWidget = UI.Widget.Widget.get(rootWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(rootWidget);
        assert.isTrue(rootWidget.isEditing);

        // End editing
        rootWidget.editing?.cancel();

        // 2. Enter on element with no attributes -> adds new attribute
        domTree.selectDOMNode(spanNode);
        await waitForTreeUpdates();

        tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
        await waitForTreeUpdates();

        const spanTreeElement = rootTreeElement.children()[0];
        const spanWidgetElement = spanTreeElement.listItemElement.querySelector('devtools-widget');
        const spanWidget = UI.Widget.Widget.get(spanWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(spanWidget);
        assert.isTrue(spanWidget.isEditing);

        // End editing
        spanWidget.editing?.cancel();

        // 3. Enter on text node -> edits text node
        domTree.selectDOMNode(textNode);
        await waitForTreeUpdates();

        tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
        await waitForTreeUpdates();

        const textTreeElement = rootTreeElement.children()[1];
        const textWidgetElement = textTreeElement.listItemElement.querySelector('devtools-widget');
        const textWidget = UI.Widget.Widget.get(textWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(textWidget);
        assert.isTrue(textWidget.isEditing);

        // End editing
        textWidget.editing?.cancel();

        // 4. Enter on element with boolean attribute (no value) -> edits attribute
        const btnNode = createTestDOMTree(domModel, {
          nodeId: 4,
          nodeName: 'BUTTON',
          attributes: ['disabled', ''],
        });
        btnNode.parentNode = rootNode;
        rootNode.childrenInternal!.push(btnNode);
        domTree.performUpdate();
        await waitForTreeUpdates();

        domTree.selectDOMNode(btnNode);
        await waitForTreeUpdates();

        tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
        await waitForTreeUpdates();

        const btnTreeElement = rootTreeElement.children()[2];
        const btnWidgetElement = btnTreeElement.listItemElement.querySelector('devtools-widget');
        const btnWidget = UI.Widget.Widget.get(btnWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(btnWidget);
        assert.isTrue(btnWidget.isEditing);
        btnWidget.editing?.cancel();

        // 5. F2 on element -> triggers toggleEditAsHTML
        const toggleEditAsHTMLSpy = sinon.spy(domTree, 'toggleEditAsHTML');
        domTree.selectDOMNode(rootNode);
        await waitForTreeUpdates();

        tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'F2', bubbles: true}));
        sinon.assert.calledWith(toggleEditAsHTMLSpy, rootNode);
      } finally {
        domTree.detach();
      }
    });

    it('triggers in-place editing on double click in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          attributes: ['id', 'test-div'],
          children: [],
        });

        domTree.rootDOMNode = rootNode;
        domTree.expandRoot = true;
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElement = internalTree.rootElement().children()[0];
        const rootWidgetElement = rootTreeElement.listItemElement.querySelector('devtools-widget');
        const rootWidget = UI.Widget.Widget.get(rootWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(rootWidget);

        domTree.selectDOMNode(rootNode);
        await waitForTreeUpdates();

        const attrElement = rootWidget.contentElement.querySelector('.webkit-html-attribute');
        assert.exists(attrElement);

        const dblClickEvent = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
        attrElement.dispatchEvent(dblClickEvent);
        await waitForTreeUpdates();

        assert.isTrue(rootWidget.isEditing);
        assert.isTrue(dblClickEvent.defaultPrevented,
                      'dblclick event should be prevented to stop tree expansion toggle');

        rootWidget.editing?.cancel();
      } finally {
        domTree.detach();
      }
    });

    it('does not abort in-place editing on second double click on expandable node in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          attributes: ['class', 'foo'],
          children: [
            {nodeId: 2, nodeName: 'SPAN'},
          ],
        });

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElement = internalTree.rootElement().children()[0];
        assert.isFalse(rootTreeElement.expanded);

        const rootWidgetElement = rootTreeElement.listItemElement.querySelector('devtools-widget');
        const rootWidget = UI.Widget.Widget.get(rootWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(rootWidget);

        domTree.selectDOMNode(rootNode);
        await waitForTreeUpdates();

        const attrElement = rootWidget.contentElement.querySelector('.webkit-html-attribute');
        assert.exists(attrElement);

        // First double-click starts editing
        const firstDblClick = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
        attrElement.dispatchEvent(firstDblClick);
        await waitForTreeUpdates();

        assert.isTrue(rootWidget.isEditing);
        assert.isFalse(rootTreeElement.expanded);

        // Second double-click (e.g. word selection) must not steal focus and abort editing
        const activeBefore = (rootTreeElement.listItemElement.getRootNode() as ShadowRoot).activeElement as HTMLElement;
        const secondDblClick = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
        (activeBefore ?? attrElement).dispatchEvent(secondDblClick);

        assert.isTrue(rootWidget.isEditing);

        rootWidget.editing?.cancel();
      } finally {
        domTree.detach();
      }
    });

    it('triggers in-place editing on Enter and edit-as-html on F2 in DEFAULT_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          attributes: ['id', 'test-div'],
          children: [
            {nodeId: 2, nodeName: 'SPAN'},
            {nodeId: 3, nodeName: '#text', nodeValue: 'Hello world', nodeType: Node.TEXT_NODE},
          ],
        });
        const spanNode = rootNode.children()![0];
        const textNode = rootNode.children()![1];

        domTree.rootDOMNode = rootNode;
        domTree.expandRoot = true;
        domTree.performUpdate();

        await waitForTreeUpdates();

        const treeOutline = domTree.getTreeOutlineForTesting();
        assert.exists(treeOutline);

        // 1. Enter on element with attributes -> edits first attribute
        domTree.selectDOMNode(rootNode);
        await waitForTreeUpdates();

        const rootTreeElement =
            treeOutline.findTreeElement(rootNode) as Elements.ElementsTreeElement.ElementsTreeElement;
        assert.exists(rootTreeElement);

        rootTreeElement.onenter();
        await waitForTreeUpdates();

        assert.isTrue(rootTreeElement.widget.isEditing);
        rootTreeElement.widget.editing?.cancel();

        // 2. Enter on element with no attributes -> adds new attribute
        domTree.selectDOMNode(spanNode);
        await waitForTreeUpdates();

        const spanTreeElement =
            treeOutline.findTreeElement(spanNode) as Elements.ElementsTreeElement.ElementsTreeElement;
        assert.exists(spanTreeElement);

        spanTreeElement.onenter();
        await waitForTreeUpdates();

        assert.isTrue(spanTreeElement.widget.isEditing);
        spanTreeElement.widget.editing?.cancel();

        // 3. Enter on text node -> edits text node
        domTree.selectDOMNode(textNode);
        await waitForTreeUpdates();

        const textTreeElement =
            treeOutline.findTreeElement(textNode) as Elements.ElementsTreeElement.ElementsTreeElement;
        assert.exists(textTreeElement);

        textTreeElement.onenter();
        await waitForTreeUpdates();

        assert.isTrue(textTreeElement.widget.isEditing);
        textTreeElement.widget.editing?.cancel();

        // 4. F2 on element -> triggers toggleEditAsHTML
        const toggleEditAsHTMLSpy = sinon.spy(domTree, 'toggleEditAsHTML');
        domTree.selectDOMNode(rootNode);
        await waitForTreeUpdates();

        treeOutline.elementInternal.dispatchEvent(new KeyboardEvent('keydown', {key: 'F2', bubbles: true}));
        sinon.assert.calledWith(toggleEditAsHTMLSpy, rootNode);
      } finally {
        domTree.detach();
      }
    });

    it('renders and reveals top layer shortcuts in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: '#document',
          children: [
            {
              nodeId: 2,
              nodeName: 'HTML',
              children: [
                {
                  nodeId: 3,
                  nodeName: 'BODY',
                  children: [
                    {nodeId: 4, nodeName: 'DIALOG', attributes: ['open', '']},
                  ],
                },
              ],
            },
          ],
        });
        const dialogNode = rootNode.children()![0].children()![0].children()![0];

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();
        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        // 1. Initially no top-layer container because no shortcuts exist
        assert.isNull(tree.shadowRoot?.querySelector('.elements-tree-top-layer-container'));

        // 2. Dispatch TopLayerElementsChanged
        const shortcut = new SDK.DOMModel.DOMNodeShortcut(domModel.target(), dialogNode.backendNodeId(),
                                                          Node.ELEMENT_NODE, 'DIALOG');
        domModel.dispatchEventToListeners(SDK.DOMModel.Events.TopLayerElementsChanged, {
          document: rootNode as SDK.DOMModel.DOMDocument,
          documentShortcuts: [shortcut],
        });
        await waitForTreeUpdates();

        // Top layer container is now rendered
        const topLayerContainer = tree.shadowRoot?.querySelector('.elements-tree-top-layer-container');
        assert.exists(topLayerContainer);

        // 3. Expand top layer container
        domTree.setTopLayerExpanded(rootNode as SDK.DOMModel.DOMDocument, true);
        await waitForTreeUpdates();

        const shortcutElement = tree.shadowRoot?.querySelector('.elements-tree-shortcut');
        assert.exists(shortcutElement);
        assert.include(shortcutElement.textContent, '<dialog>');

        // 4. Reveal top layer element via revealInTopLayer
        domTree.revealInTopLayer(dialogNode);
        await waitForTreeUpdates();
        assert.isTrue(domTree.isTopLayerExpanded(rootNode as SDK.DOMModel.DOMDocument));

        // 5. Click reveal adorner
        sinon.stub(shortcut.deferredNode, 'resolvePromise').resolves(dialogNode);
        const revealAdorner = shortcutElement.querySelector('devtools-adorner');
        assert.exists(revealAdorner);

        const selectDOMNodeSpy = sinon.spy(domTree, 'selectDOMNode');
        revealAdorner.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        await waitForTreeUpdates();

        sinon.assert.calledWith(selectDOMNodeSpy, dialogNode, true);
      } finally {
        domTree.detach();
      }
    });

    it('delegates revealInTopLayer to elementsTreeOutline in DEFAULT_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: '#document',
          children: [
            {
              nodeId: 2,
              nodeName: 'HTML',
              children: [
                {
                  nodeId: 3,
                  nodeName: 'BODY',
                  children: [
                    {nodeId: 4, nodeName: 'DIALOG'},
                  ],
                },
              ],
            },
          ],
        });
        const dialogNode = rootNode.children()![0].children()![0].children()![0];

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const treeOutline = domTree.getTreeOutlineForTesting();
        assert.exists(treeOutline);

        const revealInTopLayerSpy = sinon.spy(treeOutline, 'revealInTopLayer');
        domTree.revealInTopLayer(dialogNode);

        sinon.assert.calledWith(revealInTopLayerSpy, dialogNode);
      } finally {
        domTree.detach();
      }
    });

    it('renders and reveals adopted style sheets in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const sheetId = 'sheet-id' as Protocol.DOM.StyleSheetId;
      const initialCSS = '.button { color: blue; }';

      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: '#document',
          adoptedStyleSheets: [sheetId],
          children: [
            {
              nodeId: 2,
              nodeName: 'HTML',
              children: [],
            },
          ],
        });
        const adoptedSheet = rootNode.adoptedStyleSheetsForNode[0];
        assert.exists(adoptedSheet);

        sinon.stub(adoptedSheet.cssModel, 'getStyleSheetText').resolves(initialCSS);
        adoptedSheet.cssModel.styleSheetAdded({
          styleSheetId: sheetId,
          frameId: '' as Protocol.Page.FrameId,
          sourceURL: '',
          title: '',
          origin: 'regular' as Protocol.CSS.StyleSheetOrigin,
          disabled: false,
          isInline: false,
          isMutable: true,
          isConstructed: true,
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: initialCSS.length,
          length: initialCSS.length,
          loadingFailed: false,
        });

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();
        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        // 1. #adopted-style-sheets container is rendered, but children are not yet rendered (lazy ifExpanded)
        const adoptedStyleSheetsContainer = tree.shadowRoot?.querySelector('.elements-tree-adopted-style-sheets');
        assert.exists(adoptedStyleSheetsContainer);
        assert.include(adoptedStyleSheetsContainer.textContent, '#adopted-style-sheets');
        assert.isNull(tree.shadowRoot?.querySelector('.elements-tree-adopted-style-sheet'));

        // 2. Expand #adopted-style-sheets container
        domTree.setAdoptedStyleSheetsExpanded(rootNode, true);
        await waitForTreeUpdates();

        const adoptedStyleSheetElement = tree.shadowRoot?.querySelector('.elements-tree-adopted-style-sheet');
        assert.exists(adoptedStyleSheetElement);
        assert.include(adoptedStyleSheetElement.textContent, '#adopted-style-sheet');
        assert.isNull(tree.shadowRoot?.querySelector('.elements-tree-adopted-style-sheet-contents'));

        // 3. Expand #adopted-style-sheet item
        domTree.setAdoptedStyleSheetExpanded(adoptedSheet, true);
        await waitForTreeUpdates();

        const contentsElement = tree.shadowRoot?.querySelector('.elements-tree-adopted-style-sheet-contents');
        assert.exists(contentsElement);
        const textSpan = contentsElement.querySelector('.webkit-html-text-node');
        assert.exists(textSpan);
        assert.include(textSpan.textContent, '.button { color: blue; }');
        assert.strictEqual(window.getComputedStyle(textSpan).whiteSpace, 'pre-wrap');

        // 4. Select adopted style sheet
        domTree.selectDOMNode(adoptedSheet);
        await waitForTreeUpdates();
        assert.isTrue(domTree.isAdoptedStyleSheetsExpanded(rootNode));
      } finally {
        domTree.detach();
      }
    });

    it('renders adopted style sheets when omitRootDOMNode is true in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const sheetId = 'sheet-id' as Protocol.DOM.StyleSheetId;

      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      domTree.omitRootDOMNode = true;

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: '#document',
          adoptedStyleSheets: [sheetId],
          children: [
            {
              nodeId: 2,
              nodeName: 'HTML',
              children: [],
            },
          ],
        });
        const adoptedSheet = rootNode.adoptedStyleSheetsForNode[0];
        assert.exists(adoptedSheet);

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        const adoptedStyleSheetsContainer = tree.shadowRoot?.querySelector('.elements-tree-adopted-style-sheets');
        assert.exists(adoptedStyleSheetsContainer);
        assert.include(adoptedStyleSheetsContainer.textContent, '#adopted-style-sheets');
      } finally {
        domTree.detach();
      }
    });

    it('delegates highlightAdoptedStyleSheet to elementsTreeOutline in DEFAULT_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const sheetId = 'sheet-id' as Protocol.DOM.StyleSheetId;
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: '#document',
          adoptedStyleSheets: [sheetId],
          children: [
            {
              nodeId: 2,
              nodeName: 'HTML',
              children: [],
            },
          ],
        });
        const adoptedSheet = rootNode.adoptedStyleSheetsForNode[0];
        assert.exists(adoptedSheet);

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const treeOutline = domTree.getTreeOutlineForTesting();
        assert.exists(treeOutline);

        const highlightSpy = sinon.spy(treeOutline, 'highlightAdoptedStyleSheet');
        domTree.selectDOMNode(adoptedSheet);

        sinon.assert.calledWith(highlightSpy, adoptedSheet);
      } finally {
        domTree.detach();
      }
    });

    it('renders gutter marker decorations in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: '#document',
          children: [
            {
              nodeId: 2,
              nodeName: 'DIV',
              attributes: ['id', 'marker-test'],
              children: [],
            },
          ],
        });
        const divNode = rootNode.children()![0];
        assert.exists(divNode);
        divNode.setMarker('breakpoint-marker', true);

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);

        const divTreeElement = rootTreeElements[0];
        assert.exists(divTreeElement);
        const divWidgetElement = divTreeElement.listItemElement.querySelector('devtools-widget');
        const divWidget = UI.Widget.Widget.get(divWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(divWidget);

        // Wait for the 100ms #decorationsThrottler delay to settle before waiting for tree updates.
        await new Promise(resolve => setTimeout(resolve, 150));
        await waitForTreeUpdates();

        const gutter = divWidget.contentElement.querySelector('.gutter-container.has-decorations');
        assert.exists(gutter);
        const decoration = gutter.querySelector('.elements-gutter-decoration');
        assert.exists(decoration);
        const container = gutter.querySelector('.elements-gutter-decoration-container');
        assert.exists(container);
        assert.include(container.getAttribute('title'), 'DOM breakpoint');
      } finally {
        domTree.detach();
      }
    });

    it('renders descendant gutter marker decorations for collapsed nodes in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: '#document',
          children: [
            {
              nodeId: 2,
              nodeName: 'DIV',
              attributes: ['id', 'parent-div'],
              children: [
                {
                  nodeId: 3,
                  nodeName: 'SPAN',
                  attributes: ['id', 'child-span'],
                  children: [],
                },
              ],
            },
          ],
        });
        const divNode = rootNode.children()![0];
        assert.exists(divNode);
        const spanNode = divNode.children()![0];
        assert.exists(spanNode);
        spanNode.setMarker('breakpoint-marker', true);

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);

        const divTreeElement = rootTreeElements[0];
        assert.exists(divTreeElement);
        const divWidgetElement = divTreeElement.listItemElement.querySelector('devtools-widget');
        const divWidget = UI.Widget.Widget.get(divWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(divWidget);

        // Wait for the 100ms #decorationsThrottler delay to settle before waiting for tree updates.
        await new Promise(resolve => setTimeout(resolve, 150));
        await waitForTreeUpdates();

        const gutter = divWidget.contentElement.querySelector('.gutter-container.has-decorations');
        assert.exists(gutter);
        const descendantDecoration =
            gutter.querySelector('.elements-gutter-decoration.elements-has-decorated-children');
        assert.exists(descendantDecoration);
        const container = gutter.querySelector('.elements-gutter-decoration-container');
        assert.exists(container);
        assert.include(container.getAttribute('title'), 'Children');
        assert.include(container.getAttribute('title'), 'DOM breakpoint');
      } finally {
        domTree.detach();
      }
    });

    it('limits expanded children and renders "Show all nodes" button in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const childNodes = Array.from({length: 10}, (_, i) => ({
                                                      nodeId: i + 2,
                                                      nodeName: 'SPAN',
                                                      attributes: ['id', `child-${i + 1}`],
                                                    }));
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: childNodes,
        });

        domTree.setExpandedChildrenLimit(rootNode, 5);
        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        // Find the expand all button in shadow root.
        const expandAllItem = tree.shadowRoot?.querySelector('.elements-tree-expand-all');
        assert.exists(expandAllItem);
        const button = expandAllItem.querySelector('devtools-button');
        assert.exists(button);
        assert.include(button.textContent, 'Show all nodes (5 more)');

        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);
        const childTreeElements = rootTreeElements[0].children();
        // 5 children plus 1 expand-all item plus 1 closing tag tree element = 7
        assert.lengthOf(childTreeElements, 7);
      } finally {
        domTree.detach();
      }
    });

    it('expands children limit when "Show all nodes" button is clicked in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const childNodes = Array.from({length: 10}, (_, i) => ({
                                                      nodeId: i + 2,
                                                      nodeName: 'SPAN',
                                                      attributes: ['id', `child-${i + 1}`],
                                                    }));
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: childNodes,
        });

        domTree.setExpandedChildrenLimit(rootNode, 5);
        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        const expandAllItem = tree.shadowRoot?.querySelector('.elements-tree-expand-all');
        assert.exists(expandAllItem);
        const button = expandAllItem.querySelector('devtools-button');
        assert.exists(button);

        button.click();
        await waitForTreeUpdates();

        // Verify the limit was expanded.
        assert.isAtLeast(domTree.expandedChildrenLimit(rootNode), 10);

        // Verify the expand-all button is now gone.
        const updatedExpandAllItem = tree.shadowRoot?.querySelector('.elements-tree-expand-all');
        assert.isNull(updatedExpandAllItem);

        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);
        const childTreeElements = rootTreeElements[0].children();
        // 10 children plus 1 closing tag tree element = 11
        assert.lengthOf(childTreeElements, 11);
      } finally {
        domTree.detach();
      }
    });

    it('auto-expands children limit when hidden child beyond limit is selected in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const childNodes = Array.from({length: 10}, (_, i) => ({
                                                      nodeId: i + 2,
                                                      nodeName: 'SPAN',
                                                      attributes: ['id', `child-${i + 1}`],
                                                    }));
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: childNodes,
        });

        const tenthChild = rootNode.children()![9];
        assert.exists(tenthChild);

        domTree.setExpandedChildrenLimit(rootNode, 5);
        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);

        // Check before selection that expand all item is present.
        assert.exists(tree.shadowRoot?.querySelector('.elements-tree-expand-all'));

        // Select 10th child, which should reveal and auto-expand the limit.
        domTree.selectDOMNode(tenthChild);
        await waitForTreeUpdates();

        // Verify the limit was expanded to at least 10.
        assert.isAtLeast(domTree.expandedChildrenLimit(rootNode), 10);

        // Verify the expand-all button is gone.
        assert.isNull(tree.shadowRoot?.querySelector('.elements-tree-expand-all'));

        // Verify the 10th child is selected.
        assert.strictEqual(domTree.selectedDOMNode(), tenthChild);
      } finally {
        domTree.detach();
      }
    });

    it('renders "Show all nodes" button with depth 0 indent when omitRootDOMNode is true in DECLARATIVE_VIEW',
       async () => {
         const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
         sinon.stub(domModel, 'requestDocument').resolves(null);
         const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

         try {
           const childNodes = Array.from({length: 10}, (_, i) => ({
                                                         nodeId: i + 2,
                                                         nodeName: 'DIV',
                                                         attributes: ['id', `child-${i + 1}`],
                                                       }));
           const rootNode = createTestDOMTree(domModel, {
             nodeId: 1,
             nodeName: 'BODY',
             children: childNodes,
           });

           domTree.omitRootDOMNode = true;
           domTree.setExpandedChildrenLimit(rootNode, 5);
           domTree.rootDOMNode = rootNode;
           domTree.performUpdate();

           await waitForTreeUpdates();

           const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
           assert.exists(tree);

           const internalTree = tree.getInternalTreeOutlineForTest();
           const rootTreeElements = internalTree.rootElement().children();
           // 5 child root elements plus 1 expand-all element = 6
           assert.lengthOf(rootTreeElements, 6);

           const expandAllTreeElement =
               rootTreeElements[5] as UI.TreeOutline.TreeElement & {configElement?: HTMLElement};
           assert.exists(expandAllTreeElement.listItemElement.querySelector('.elements-tree-expand-all') ??
                         expandAllTreeElement.listItemElement.classList.contains('elements-tree-expand-all'));
           // Indent for depth 0 without children should be 12 * (0 - 1) + 12 = 0px.
           assert.strictEqual(expandAllTreeElement.configElement?.style.getPropertyValue('--indent'), '0px');
         } finally {
           domTree.detach();
         }
       });

    it('auto-expands children limit when ancestor children are loaded asynchronously in DECLARATIVE_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const childNodes = Array.from({length: 10}, (_, i) => ({
                                                      nodeId: i + 2,
                                                      nodeName: 'SPAN',
                                                      attributes: ['id', `child-${i + 1}`],
                                                    }));
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: childNodes,
        });

        const tenthChild = rootNode.children()![9];
        assert.exists(tenthChild);

        // Simulate children not yet loaded initially on rootNode.
        sinon.stub(rootNode, 'children').callsFake(() => null);
        sinon.stub(rootNode, 'getChildNodes').callsFake(callback => {
          (rootNode.children as sinon.SinonStub).restore();
          if (callback) {
            callback(rootNode.children());
          }
        });

        domTree.setExpandedChildrenLimit(rootNode, 5);
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();

        await waitForTreeUpdates();

        // Select 10th child while rootNode children() was initially null.
        domTree.selectDOMNode(tenthChild);
        await waitForTreeUpdates();

        // Verify that getChildNodes loaded children and expanded the limit.
        assert.isAtLeast(domTree.expandedChildrenLimit(rootNode), 10);
      } finally {
        domTree.detach();
      }
    });

    it('synchronizes expandedChildrenLimit with treeElement in DEFAULT_VIEW', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DEFAULT_VIEW);

      try {
        const childNodes = Array.from({length: 10}, (_, i) => ({
                                                      nodeId: i + 2,
                                                      nodeName: 'SPAN',
                                                      attributes: ['id', `child-${i + 1}`],
                                                    }));
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: childNodes,
        });

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(domModel);
        assert.exists(treeOutline);
        const treeElement = treeOutline.findTreeElement(rootNode);
        assert.exists(treeElement);

        // 1. Updating limit via ElementsTreeOutline updates DOMTreeWidget
        treeOutline.setExpandedChildrenLimit(treeElement, 5);
        assert.strictEqual(treeElement.expandedChildrenLimit(), 5);
        assert.strictEqual(domTree.expandedChildrenLimit(rootNode), 5);

        // 2. Updating limit via DOMTreeWidget updates ElementsTreeOutline
        domTree.setExpandedChildrenLimit(rootNode, 15);
        assert.strictEqual(treeElement.expandedChildrenLimit(), 15);
        assert.strictEqual(domTree.expandedChildrenLimit(rootNode), 15);
      } finally {
        domTree.detach();
      }
    });

    it('separates hover highlight between opening tag and closing tag in declarative view', async () => {
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
            },
          ],
        });
        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);

        const openingDivTreeElement = rootTreeElements[0];
        const closingDivTreeElement = rootTreeElements[0].children()[1];
        assert.exists(openingDivTreeElement);
        assert.exists(closingDivTreeElement);

        // 1. Hover opening tag
        domTree.setHoveredNode(rootNode, /* showInfo= */ true, /* isClosingTag= */ false);
        await waitForTreeUpdates();

        assert.strictEqual(domTree.hoveredDOMNode(), rootNode);
        assert.isFalse(domTree.hoveredClosingTag());
        assert.isTrue(openingDivTreeElement.listItemElement.classList.contains('hovered'));
        assert.isFalse(closingDivTreeElement.listItemElement.classList.contains('hovered'));

        const openingWidgetElement = openingDivTreeElement.listItemElement.querySelector('devtools-widget');
        const openingWidget =
            UI.Widget.Widget.get(openingWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.isTrue(openingWidget.hovered);

        const closingWidgetElement = closingDivTreeElement.listItemElement.querySelector('devtools-widget');
        const closingWidget =
            UI.Widget.Widget.get(closingWidgetElement!) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.isFalse(closingWidget.hovered);

        // 2. Hover closing tag
        domTree.setHoveredNode(rootNode, /* showInfo= */ true, /* isClosingTag= */ true);
        await waitForTreeUpdates();

        assert.strictEqual(domTree.hoveredDOMNode(), rootNode);
        assert.isTrue(domTree.hoveredClosingTag());
        assert.isFalse(openingDivTreeElement.listItemElement.classList.contains('hovered'));
        assert.isTrue(closingDivTreeElement.listItemElement.classList.contains('hovered'));
        assert.isFalse(openingWidget.hovered);
        assert.isTrue(closingWidget.hovered);

        // 3. Clear hover
        domTree.setHoveredNode(null);
        await waitForTreeUpdates();

        assert.isNull(domTree.hoveredDOMNode());
        assert.isFalse(domTree.hoveredClosingTag());
        assert.isFalse(openingDivTreeElement.listItemElement.classList.contains('hovered'));
        assert.isFalse(closingDivTreeElement.listItemElement.classList.contains('hovered'));

        // 4. Hover closing tag via mousemove event
        closingDivTreeElement.listItemElement.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
        await waitForTreeUpdates();

        assert.strictEqual(domTree.hoveredDOMNode(), rootNode);
        assert.isTrue(domTree.hoveredClosingTag());
        assert.isFalse(openingDivTreeElement.listItemElement.classList.contains('hovered'));
        assert.isTrue(closingDivTreeElement.listItemElement.classList.contains('hovered'));
        assert.isFalse(openingWidget.hovered);
        assert.isTrue(closingWidget.hovered);

        // 5. Hover opening tag via mousemove event
        openingDivTreeElement.listItemElement.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
        await waitForTreeUpdates();

        assert.strictEqual(domTree.hoveredDOMNode(), rootNode);
        assert.isFalse(domTree.hoveredClosingTag());
        assert.isTrue(openingDivTreeElement.listItemElement.classList.contains('hovered'));
        assert.isFalse(closingDivTreeElement.listItemElement.classList.contains('hovered'));
        assert.isTrue(openingWidget.hovered);
        assert.isFalse(closingWidget.hovered);
      } finally {
        domTree.detach();
      }
    });

    it('attaches dragstart and dragend listeners to closing tags in declarative view', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'BODY',
          children: [
            {
              nodeId: 2,
              nodeName: 'DIV',
              children: [
                {
                  nodeId: 3,
                  nodeName: 'SPAN',
                },
              ],
            },
          ],
        });
        domTree.rootDOMNode = rootNode;
        const divNode = rootNode.children()![0];
        domTree.setNodeExpanded(rootNode, true);
        domTree.setNodeExpanded(divNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        const divTreeElement = rootTreeElements[0].children()[0];
        const closingDivTreeElement = divTreeElement.children()[1];
        assert.exists(closingDivTreeElement);

        assert.strictEqual(closingDivTreeElement.listItemElement.getAttribute('draggable'), 'true');

        const dragStartSpy = sinon.spy(domTree, 'onDragStart');
        const dragEndSpy = sinon.spy(domTree, 'onDragEnd');

        const dragEvent = new DragEvent('dragstart', {bubbles: true, cancelable: true});
        closingDivTreeElement.listItemElement.dispatchEvent(dragEvent);
        sinon.assert.calledOnce(dragStartSpy);
        assert.strictEqual(dragStartSpy.firstCall.args[0], divNode);

        const dragEndEvent = new DragEvent('dragend', {bubbles: true, cancelable: true});
        closingDivTreeElement.listItemElement.dispatchEvent(dragEndEvent);
        sinon.assert.calledOnce(dragEndSpy);
      } finally {
        domTree.detach();
      }
    });

    it('supports closing tag selection and clones style attribute with --indent', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {
              nodeId: 2,
              nodeName: 'SECTION',
              children: [
                {
                  nodeId: 3,
                  nodeName: 'P',
                },
              ],
            },
          ],
        });
        domTree.rootDOMNode = rootNode;
        domTree.selectEnabled = true;
        domTree.setNodeExpanded(rootNode, true);
        const sectionNode = rootNode.children()![0];
        domTree.setNodeExpanded(sectionNode, true);
        domTree.performUpdate();

        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const internalTree = tree.getInternalTreeOutlineForTest();
        const rootTreeElements = internalTree.rootElement().children();
        assert.lengthOf(rootTreeElements, 1);

        const openingDivTreeElement = rootTreeElements[0];
        const sectionTreeElement = rootTreeElements[0].children()[0];
        const closingSectionTreeElement = sectionTreeElement.children()[1];
        const closingDivTreeElement = rootTreeElements[0].children()[1];

        // Verify style attribute containing --indent is cloned to listItemElement in shadow DOM
        assert.isNotEmpty(openingDivTreeElement.listItemElement.style.getPropertyValue('--indent'));
        assert.strictEqual(closingDivTreeElement.listItemElement.style.getPropertyValue('--indent'), '12px');

        // Root node is not draggable (no parent element)
        assert.strictEqual(closingDivTreeElement.listItemElement.getAttribute('draggable'), 'false');
        // SECTION node is draggable (has parent element)
        assert.strictEqual(closingSectionTreeElement.listItemElement.getAttribute('draggable'), 'true');

        // Programmatic SelectEvent with selectedByUser: false should be ignored
        closingDivTreeElement.listItemElement.dispatchEvent(
            new UI.TreeOutline.TreeViewElement.SelectEvent({selectedByUser: false}));
        assert.isFalse(domTree.selectedClosingTag());

        // Select closing tag via user SelectEvent
        closingDivTreeElement.listItemElement.dispatchEvent(
            new UI.TreeOutline.TreeViewElement.SelectEvent({selectedByUser: true}));
        await waitForTreeUpdates();

        assert.strictEqual(domTree.selectedDOMNode(), rootNode);
        assert.isTrue(domTree.selectedClosingTag());

        const openingWidget =
            UI.Widget.Widget.get(openingDivTreeElement.listItemElement.querySelector('devtools-widget')!) as
            Elements.ElementsTreeElement.ElementsTreeWidget;
        const closingWidget =
            UI.Widget.Widget.get(closingDivTreeElement.listItemElement.querySelector('devtools-widget')!) as
            Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.isFalse(openingWidget.selected);
        assert.isTrue(closingWidget.selected);
        assert.isFalse(openingDivTreeElement.listItemElement.classList.contains('selected'));
        assert.isTrue(closingDivTreeElement.listItemElement.classList.contains('selected'));
      } finally {
        domTree.detach();
      }
    });

    it('focuses devtools-tree when focus() is called and when selecting with focus', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [{nodeId: 2, nodeName: '#text', nodeValue: 'text'}],
        });

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const devtoolsTree = domTree.contentElement.querySelector('devtools-tree');
        assert.exists(devtoolsTree);
        const focusSpy = sinon.spy(devtoolsTree, 'focus');

        domTree.focus();
        sinon.assert.calledOnce(focusSpy);

        // Also test selectDOMNode with focus=true
        focusSpy.resetHistory();
        domTree.selectDOMNode(rootNode, /* focus= */ true);
        sinon.assert.calledOnce(focusSpy);
      } finally {
        domTree.detach();
      }
    });

    it('selects DOM node without expanding ancestors in selectDOMNodeWithoutReveal', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [{
            nodeId: 2,
            nodeName: 'P',
            children: [{nodeId: 3, nodeName: '#text', nodeValue: 'text'}],
          }],
        });

        const pNode = rootNode.children()![0];
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        assert.isFalse(domTree.isNodeExpanded(rootNode));

        const selectedChangedSpy = sinon.spy(domTree, 'onSelectedNodeChanged');

        domTree.selectDOMNodeWithoutReveal(pNode);
        await waitForTreeUpdates();
        assert.strictEqual(domTree.selectedDOMNode(), pNode);
        assert.isFalse(domTree.isNodeExpanded(rootNode));
        sinon.assert.calledOnce(selectedChangedSpy);
        assert.deepEqual(selectedChangedSpy.firstCall.args[0].data, {node: pNode, focus: false});

        // Calling again with same node is idempotent (does not emit SelectedNodeChanged)
        selectedChangedSpy.resetHistory();
        domTree.selectDOMNodeWithoutReveal(pNode);
        sinon.assert.notCalled(selectedChangedSpy);

        // If closing tag is selected, selectDOMNodeWithoutReveal resets closing tag and emits event
        domTree.selectDOMNode(rootNode, false, true);
        assert.isTrue(domTree.selectedClosingTag());
        selectedChangedSpy.resetHistory();
        domTree.selectDOMNodeWithoutReveal(rootNode);
        assert.isFalse(domTree.selectedClosingTag());
        sinon.assert.calledOnce(selectedChangedSpy);
      } finally {
        domTree.detach();
      }
    });

    it('calculates truncated lines accurately with adopted style sheets and top-layer shortcuts', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const sheetId = 'sheet-1' as Protocol.DOM.StyleSheetId;
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: '#document',
          nodeType: Node.DOCUMENT_NODE,
          adoptedStyleSheets: [sheetId],
          children: [
            {
              nodeId: 2,
              nodeName: 'HTML',
              children: [],
            },
          ],
        });
        const adoptedSheet = rootNode.adoptedStyleSheetsForNode[0];
        assert.exists(adoptedSheet);
        sinon.stub(adoptedSheet.cssModel, 'getStyleSheetText').resolves('');
        adoptedSheet.cssModel.styleSheetAdded({
          styleSheetId: sheetId,
          frameId: '' as Protocol.Page.FrameId,
          sourceURL: '',
          title: '',
          origin: 'regular' as Protocol.CSS.StyleSheetOrigin,
          disabled: false,
          isInline: false,
          isMutable: true,
          isConstructed: true,
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
          length: 0,
          loadingFailed: false,
        });

        const shortcutChild = new SDK.DOMModel.DOMNodeShortcut(domModel.target(), 99 as Protocol.DOM.BackendNodeId,
                                                               Node.ELEMENT_NODE, 'SPAN');
        const shortcutParent = new SDK.DOMModel.DOMNodeShortcut(domModel.target(), 98 as Protocol.DOM.BackendNodeId,
                                                                Node.ELEMENT_NODE, 'DIALOG');
        shortcutParent.childShortcuts.push(shortcutChild);

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.maxRows = 1;

        domModel.dispatchEventToListeners(SDK.DOMModel.Events.TopLayerElementsChanged, {
          document: rootNode as SDK.DOMModel.DOMDocument,
          documentShortcuts: [shortcutParent],
        });

        // Initially:
        // 1. #document (1 row)
        // 2. #adopted-style-sheets collapsed (1 row)
        // 3. <html></html> (1 row)
        // 4. #top-layer collapsed (1 row)
        // Total = 4 rows. With maxRows = 1, truncated = 3 lines.
        domTree.performUpdate();
        await waitForTreeUpdates();

        let showAllButton = domTree.contentElement.querySelector('.elements-tree-show-all') as HTMLElement;
        assert.exists(showAllButton);
        assert.include(showAllButton.textContent, 'Show all (3 lines)');

        // Expand #adopted-style-sheets (+1 row for sheet) and the sheet itself (+1 row for content) -> Total = 6 rows (5 truncated)
        domTree.setAdoptedStyleSheetsExpanded(rootNode, true);
        domTree.setAdoptedStyleSheetExpanded(adoptedSheet, true);
        domTree.performUpdate();
        await waitForTreeUpdates();

        showAllButton = domTree.contentElement.querySelector('.elements-tree-show-all') as HTMLElement;
        assert.include(showAllButton.textContent, 'Show all (5 lines)');

        // Expand #top-layer (+1 row for <dialog>) and the <dialog> shortcut (+1 row for <span>) -> Total = 8 rows (7 truncated)
        domTree.setTopLayerExpanded(rootNode as SDK.DOMModel.DOMDocument, true);
        domTree.setTopLayerShortcutExpanded(shortcutParent, true);
        domTree.performUpdate();
        await waitForTreeUpdates();

        showAllButton = domTree.contentElement.querySelector('.elements-tree-show-all') as HTMLElement;
        assert.include(showAllButton.textContent, 'Show all (7 lines)');
      } finally {
        domTree.detach();
      }
    });

    it('updates adorners via updateNodeAdorners', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [{nodeId: 2, nodeName: '#text', nodeValue: 'text'}],
        });

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const devtoolsTree = domTree.contentElement.querySelector('devtools-tree');
        assert.exists(devtoolsTree?.shadowRoot);
        const widgetEl = devtoolsTree.shadowRoot.querySelector('devtools-widget');
        assert.exists(widgetEl);
        const widget = UI.Widget.Widget.get(widgetEl) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(widget);
        const updateAdornersSpy = sinon.spy(widget, 'updateAdorners');

        domTree.updateNodeAdorners(rootNode);
        await waitForTreeUpdates();
        sinon.assert.calledOnce(updateAdornersSpy);

        // Subsequent update should flush dirty adorners state.
        domTree.performUpdate();
        await waitForTreeUpdates();
        assert.isFalse(widget.adornersDirty);

        // Swapping node on bound widget should not call clearView.
        const clearViewSpy = sinon.spy(widget, 'clearView');
        const otherNode = createTestDOMTree(domModel, {
          nodeId: 3,
          nodeName: 'SPAN',
          children: [],
        });
        widget.node = otherNode;
        sinon.assert.notCalled(clearViewSpy);
      } finally {
        domTree.detach();
      }
    });

    it('selects node and highlights attribute in highlightNodeAttribute', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          attributes: ['class', 'test-class'],
          children: [{nodeId: 2, nodeName: '#text', nodeValue: 'text'}],
        });

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const devtoolsTree = domTree.contentElement.querySelector('devtools-tree');
        assert.exists(devtoolsTree?.shadowRoot);
        const widgetEl = devtoolsTree.shadowRoot.querySelector('devtools-widget');
        assert.exists(widgetEl);
        const widget = UI.Widget.Widget.get(widgetEl) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(widget);
        const highlightSpy = sinon.spy(widget, 'highlightAttribute');

        domTree.highlightNodeAttribute(rootNode, 'class');
        assert.strictEqual(domTree.selectedDOMNode(), rootNode);
        await waitForTreeUpdates();
        sinon.assert.calledOnceWithExactly(highlightSpy, 'class');
      } finally {
        domTree.detach();
      }
    });

    it('handles maxRows truncation and clears on show all click', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: 'SPAN', children: [{nodeId: 3, nodeName: '#text', nodeValue: '1'}]},
            {nodeId: 4, nodeName: 'SPAN', children: [{nodeId: 5, nodeName: '#text', nodeValue: '2'}]},
            {nodeId: 6, nodeName: 'SPAN', children: [{nodeId: 7, nodeName: '#text', nodeValue: '3'}]},
          ],
        });

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.maxRows = 2;
        domTree.performUpdate();
        await waitForTreeUpdates();

        const disclosure = domTree.contentElement.querySelector('.elements-disclosure') as HTMLElement;
        assert.exists(disclosure);
        assert.isTrue(disclosure.classList.contains('elements-tree-truncated'));
        assert.strictEqual(disclosure.style.getPropertyValue('--max-rows'), '2');

        const showAllButton = domTree.contentElement.querySelector('.elements-tree-show-all') as HTMLElement;
        assert.exists(showAllButton);
        assert.include(showAllButton.textContent, 'Show all (3 lines)');

        showAllButton.click();
        assert.isUndefined(domTree.maxRows);

        await waitForTreeUpdates();
        assert.isNull(domTree.contentElement.querySelector('.elements-tree-show-all'));
        assert.isFalse(disclosure.classList.contains('elements-tree-truncated'));
      } finally {
        domTree.detach();
      }
    });

    it('recovers selection to next sibling, previous sibling, or parent when selected node is removed', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: 'SPAN'},
            {nodeId: 3, nodeName: 'P'},
            {nodeId: 4, nodeName: 'A'},
          ],
        });

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();
        await waitForTreeUpdates();

        const [spanNode, pNode, aNode] = rootNode.children()!;

        // 1. Remove first child (SPAN) -> selects next sibling (P)
        domTree.selectDOMNode(spanNode);
        assert.strictEqual(domTree.selectedDOMNode(), spanNode);
        rootNode.childrenInternal = [pNode, aNode];
        pNode.previousSibling = null;
        domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: spanNode, parent: rootNode});
        assert.strictEqual(domTree.selectedDOMNode(), pNode);

        // 2. Remove last child (A) -> selects previous sibling (P)
        domTree.selectDOMNode(aNode);
        assert.strictEqual(domTree.selectedDOMNode(), aNode);
        rootNode.childrenInternal = [pNode];
        pNode.nextSibling = null;
        domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: aNode, parent: rootNode});
        assert.strictEqual(domTree.selectedDOMNode(), pNode);

        // 3. Remove only child (P) -> selects parent (DIV)
        rootNode.childrenInternal = [];
        domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: pNode, parent: rootNode});
        assert.strictEqual(domTree.selectedDOMNode(), rootNode);
      } finally {
        domTree.detach();
      }
    });

    it('validates and updates selected node when showComments is toggled off', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          children: [
            {nodeId: 2, nodeName: '#comment', nodeValue: 'test comment', nodeType: Node.COMMENT_NODE},
            {nodeId: 3, nodeName: 'SPAN'},
          ],
        });

        domTree.showComments = true;
        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();
        await waitForTreeUpdates();

        const [commentNode, spanNode] = rootNode.children()!;
        domTree.selectDOMNode(commentNode);
        assert.strictEqual(domTree.selectedDOMNode(), commentNode);

        // Hiding comments should validate selection and fall back to next visible sibling (SPAN)
        domTree.showComments = false;
        assert.strictEqual(domTree.selectedDOMNode(), spanNode);
      } finally {
        domTree.detach();
      }
    });

    it('guards focusout during editAsHTML and stops click propagation on editor container', async () => {
      const {domTree, domModel} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
        });
        sinon.stub(rootNode, 'getOuterHTML').resolves('<div>hello</div>');
        const setOuterHTMLStub = sinon.stub(rootNode, 'setOuterHTML').resolves();

        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();
        await waitForTreeUpdates();

        await domTree.toggleEditAsHTML(rootNode, true);
        await waitForTreeUpdates();

        const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree');
        assert.exists(tree);
        const widgetEl = tree.shadowRoot?.querySelector('devtools-widget');
        assert.exists(widgetEl);
        const widget = UI.Widget.Widget.get(widgetEl) as Elements.ElementsTreeElement.ElementsTreeWidget;
        assert.exists(widget);
        assert.isTrue(widget.isEditing);

        const editorContainer = widget.contentElement.querySelector('.elements-tree-editor') as HTMLElement;
        assert.exists(editorContainer);

        // 1. Click inside editorContainer does not bubble up
        const parentClickSpy = sinon.spy();
        widget.contentElement.addEventListener('click', parentClickSpy);
        editorContainer.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        sinon.assert.notCalled(parentClickSpy);

        // 2. focusout with relatedTarget inside widget.contentElement should NOT commit edit
        const textEditor = editorContainer.querySelector('devtools-text-editor') as HTMLElement;
        assert.exists(textEditor);
        const cmContent = textEditor.shadowRoot?.querySelector('.cm-content') as HTMLElement;
        assert.exists(cmContent);
        cmContent.dispatchEvent(
            new FocusEvent('focusout', {bubbles: true, composed: true, relatedTarget: widget.contentElement}));
        assert.isTrue(widget.isEditing);
        sinon.assert.notCalled(setOuterHTMLStub);

        // 3. focusout with relatedTarget outside widget.contentElement SHOULD commit edit
        const outsideEl = document.createElement('div');
        cmContent.dispatchEvent(new FocusEvent('focusout', {bubbles: true, composed: true, relatedTarget: outsideEl}));
        assert.isFalse(widget.isEditing);
      } finally {
        domTree.detach();
      }
    });

    it('triggers showContextMenu on opening and closing tag right-click', async () => {
      const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      sinon.stub(domModel, 'requestDocument').resolves(null);
      const {domTree} = setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);

      try {
        const rootNode = createTestDOMTree(domModel, {
          nodeId: 1,
          nodeName: 'DIV',
          attributes: ['id', 'test'],
          children: [{
            nodeId: 2,
            nodeName: 'SPAN',
            children: [{nodeId: 3, nodeName: '#text', nodeValue: 'text'}],
          }],
        });

        domTree.rootDOMNode = rootNode;
        domTree.setNodeExpanded(rootNode, true);
        domTree.performUpdate();
        await waitForTreeUpdates();

        const showContextMenuStub = sinon.stub(domTree, 'showContextMenu').resolves(undefined);

        const devtoolsTree = domTree.contentElement.querySelector('devtools-tree');
        assert.exists(devtoolsTree?.shadowRoot);
        const widgetEls = Array.from(devtoolsTree.shadowRoot.querySelectorAll('devtools-widget'));
        const widgets = widgetEls.map(el => UI.Widget.Widget.get(el))
                            .filter((w): w is Elements.ElementsTreeElement.ElementsTreeWidget =>
                                        w instanceof Elements.ElementsTreeElement.ElementsTreeWidget);
        const openingWidget = widgets.find(w => w.node === rootNode && !w.isClosingTag);
        assert.exists(openingWidget);
        const closingWidget = widgets.find(w => w.node === rootNode && w.isClosingTag);
        assert.exists(closingWidget);

        // 1. Right-click opening tag li
        const openingLi = openingWidget.element.closest('li');
        assert.exists(openingLi);

        openingLi.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, composed: true}));
        sinon.assert.calledOnce(showContextMenuStub);
        assert.strictEqual(showContextMenuStub.firstCall.args[0], rootNode);
        assert.instanceOf(showContextMenuStub.firstCall.args[1], MouseEvent);

        // 2. Right-click closing tag li
        showContextMenuStub.resetHistory();
        const closingLi = closingWidget.element.closest('li');
        assert.exists(closingLi);

        closingLi.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, composed: true}));
        sinon.assert.calledOnce(showContextMenuStub);
        assert.strictEqual(showContextMenuStub.firstCall.args[0], rootNode);
        assert.instanceOf(showContextMenuStub.firstCall.args[1], MouseEvent);
      } finally {
        domTree.detach();
      }
    });
  });

  describe('removing nodes', () => {
    it('removes a hidden node only after unhiding it has completed', async () => {
      const testDomModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      const rootNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'DIV',
        localName: 'div',
        nodeValue: '',
        childNodeCount: 1,
        children: [{
          nodeId: 2 as Protocol.DOM.NodeId,
          parentId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'P',
          localName: 'p',
          nodeValue: '',
          childNodeCount: 0,
        }],
      }) as SDK.DOMModel.DOMNode;
      const node = rootNode.children()![0];

      const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget();
      try {
        domTree.rootDOMNode = rootNode;
        domTree.performUpdate();

        sinon.stub(node, 'isToggledToHidden').returns(true);
        let finishUnhiding!: () => void;
        sinon.stub(node, 'toggleHideElement').returns(new Promise<void>(resolve => {
          finishUnhiding = resolve;
        }));
        const removeNodeStub = sinon.stub(node, 'removeNode').resolves();

        const removal = domTree.removeNode(node);
        // The node must stay in the tree until it is visible again, so that an undo restores it in a
        // consistent state.
        sinon.assert.notCalled(removeNodeStub);

        finishUnhiding();
        await removal;

        sinon.assert.calledOnce(removeNodeStub);
      } finally {
        domTree.detach();
      }
    });
  });

  describe('screenshots', () => {
    function disableEditorCursor(root: Node|null): void {
      if (!root) {
        return;
      }
      if (root instanceof HTMLElement && root.tagName.toLowerCase() === 'devtools-text-editor') {
        if (root.shadowRoot) {
          const style = document.createElement('style');
          style.textContent = '.cm-cursorLayer { display: none !important; animation: none !important; }';
          root.shadowRoot.appendChild(style);
        }
      }
      if (root instanceof HTMLElement && root.shadowRoot) {
        disableEditorCursor(root.shadowRoot);
      }
      for (const child of root.childNodes) {
        disableEditorCursor(child);
      }
    }

    describe('expanding', () => {
      it('renders screenshot of deeply nested expanded tree', async () => {
        const {domTree, domModel} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});
        try {
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            attributes: ['id', 'container', 'class', 'main-view'],
            children: [
              {
                nodeId: 2,
                nodeName: 'UL',
                attributes: ['class', 'item-list'],
                children: [
                  {
                    nodeId: 3,
                    nodeName: 'LI',
                    attributes: ['class', 'item active'],
                    children: [{
                      nodeId: 4,
                      nodeName: 'A',
                      attributes: ['href', '#section1'],
                      children: [{nodeId: 5, nodeName: '#text', nodeValue: 'First Link'}],
                    }],
                  },
                  {
                    nodeId: 6,
                    nodeName: 'LI',
                    attributes: ['class', 'item'],
                    children: [{
                      nodeId: 7,
                      nodeName: 'A',
                      attributes: ['href', '#section2'],
                      children: [{nodeId: 8, nodeName: '#text', nodeValue: 'Second Link'}],
                    }],
                  },
                ],
              },
            ],
          });
          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          await domTree.expandRecursively(rootNode);

          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_expanded_nested.png');
        } finally {
          domTree.detach();
        }
      });

      it('renders screenshot of expanded node with "Show all nodes" limit', async () => {
        const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
        sinon.stub(domModel, 'requestDocument').resolves(null);
        const {domTree} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});

        try {
          const childNodes = Array.from({length: 10}, (_, i) => ({
                                                        nodeId: i + 2,
                                                        nodeName: 'SPAN',
                                                        attributes: ['id', `child-${i + 1}`],
                                                      }));
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            attributes: ['id', 'list-container'],
            children: childNodes,
          });

          domTree.setExpandedChildrenLimit(rootNode, 5);
          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setNodeExpanded(rootNode, true);
          domTree.performUpdate();

          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_expand_all.png');
        } finally {
          domTree.detach();
        }
      });
    });

    describe('collapsing', () => {
      it('renders screenshot of collapsed root node with children', async () => {
        const {domTree, domModel} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});
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
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setNodeExpanded(rootNode, false);
          domTree.performUpdate();

          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_collapsed_root.png');
        } finally {
          domTree.detach();
        }
      });

      it('renders screenshot of partially collapsed tree', async () => {
        const {domTree, domModel} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});
        try {
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            attributes: ['id', 'app-root'],
            children: [
              {
                nodeId: 2,
                nodeName: 'HEADER',
                attributes: ['class', 'header-bar'],
                children: [
                  {nodeId: 3, nodeName: 'H1', children: [{nodeId: 4, nodeName: '#text', nodeValue: 'Site Header'}]},
                ],
              },
              {
                nodeId: 5,
                nodeName: 'MAIN',
                attributes: ['class', 'content-area'],
                children: [
                  {
                    nodeId: 6,
                    nodeName: 'P',
                    children: [{nodeId: 7, nodeName: '#text', nodeValue: 'Main content paragraph'}],
                  },
                ],
              },
              {
                nodeId: 8,
                nodeName: 'FOOTER',
                attributes: ['class', 'footer-bar'],
                children: [
                  {nodeId: 9, nodeName: 'SPAN', children: [{nodeId: 10, nodeName: '#text', nodeValue: 'Footer text'}]},
                ],
              },
            ],
          });
          const headerNode = rootNode.children()![0];
          const mainNode = rootNode.children()![1];
          const footerNode = rootNode.children()![2];

          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setNodeExpanded(rootNode, true);
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setNodeExpanded(headerNode, false);
          domTree.setNodeExpanded(mainNode, true);
          domTree.setNodeExpanded(footerNode, false);
          domTree.performUpdate();

          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_partially_collapsed.png');
        } finally {
          domTree.detach();
        }
      });
    });

    describe('highlighting', () => {
      it('renders screenshot of selected element node', async () => {
        const {domTree, domModel} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});
        try {
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            attributes: ['id', 'container', 'class', 'main-view'],
            children: [
              {nodeId: 2, nodeName: 'H1', children: [{nodeId: 3, nodeName: '#text', nodeValue: 'Title'}]},
            ],
          });
          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setNodeExpanded(rootNode, true);
          domTree.selectDOMNode(rootNode, true);
          domTree.performUpdate();

          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_selected_node.png');
        } finally {
          domTree.detach();
        }
      });

      it('renders screenshot of search match highlighting', async () => {
        SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
        const {domTree, domModel} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});
        try {
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            attributes: ['id', 'container'],
            children: [
              {nodeId: 2, nodeName: 'P', attributes: ['class', 'search-target']},
            ],
          });
          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setNodeExpanded(rootNode, true);
          domTree.performUpdate();
          await waitForTreeUpdates();

          const pNode = rootNode.children()![0];
          domTree.highlightMatch(pNode, 'search-target');
          domTree.performUpdate();
          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_search_match.png');
        } finally {
          domTree.detach();
        }
      });

      it('renders screenshot of selected closing tag', async () => {
        const {domTree, domModel} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});
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
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setNodeExpanded(rootNode, true);
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.selectDOMNode(rootNode, /* focus= */ true, /* isClosingTag= */ true);
          domTree.performUpdate();
          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_selected_closing_tag.png');
        } finally {
          domTree.detach();
        }
      });

      it('renders screenshot of hovered opening tag', async () => {
        SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
        const {domTree, domModel} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});
        try {
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            attributes: ['id', 'container', 'class', 'main-view'],
            children: [
              {nodeId: 2, nodeName: 'P', attributes: ['class', 'text']},
            ],
          });
          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setNodeExpanded(rootNode, true);
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setHoveredNode(rootNode, /* showInfo= */ true, /* isClosingTag= */ false);
          domTree.performUpdate();
          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_hovered_opening_tag.png');
        } finally {
          domTree.detach();
        }
      });

      it('renders screenshot of hovered closing tag', async () => {
        SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
        const {domTree, domModel} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});
        try {
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            attributes: ['id', 'container', 'class', 'main-view'],
            children: [
              {nodeId: 2, nodeName: 'P', attributes: ['class', 'text']},
            ],
          });
          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setNodeExpanded(rootNode, true);
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setHoveredNode(rootNode, /* showInfo= */ true, /* isClosingTag= */ true);
          domTree.performUpdate();
          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_hovered_closing_tag.png');
        } finally {
          domTree.detach();
        }
      });
    });

    describe('editing', () => {
      function cancelActiveEditing(domTree: Elements.ElementsTreeOutline.DOMTreeWidget): void {
        const tree = domTree.contentElement.querySelector('devtools-tree');
        if (tree) {
          for (const el of tree.getInternalTreeOutlineForTest().element.querySelectorAll('devtools-widget')) {
            const widget = UI.Widget.Widget.get(el) as Elements.ElementsTreeElement.ElementsTreeWidget | undefined;
            widget?.editing?.cancel();
          }
          return;
        }
        const treeOutline = domTree.getTreeOutlineForTesting();
        if (treeOutline) {
          let item: UI.TreeOutline.TreeElement|null = treeOutline.rootElement();
          while (item) {
            if (item instanceof Elements.ElementsTreeElement.ElementsTreeElement) {
              item.widget.editing?.cancel();
            }
            item = item.traverseNextTreeElement(false, null, true);
          }
        }
      }

      it('renders screenshot of in-place attribute editing', async () => {
        const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
        sinon.stub(domModel, 'requestDocument').resolves(null);
        const {domTree} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});

        try {
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            attributes: ['id', 'test-div', 'class', 'main'],
            children: [],
          });
          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.selectDOMNode(rootNode);
          await waitForTreeUpdates();

          domTree.startEditing(rootNode);
          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_editing_attribute.png');
        } finally {
          cancelActiveEditing(domTree);
          domTree.detach();
        }
      });

      it('renders screenshot of multiline Edit as HTML', async () => {
        const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
        sinon.stub(domModel, 'requestDocument').resolves(null);
        const {domTree} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});

        try {
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            attributes: ['id', 'html-edit-div', 'class', 'container'],
            children: [
              {
                nodeId: 2,
                nodeName: 'HEADER',
                children: [
                  {
                    nodeId: 3,
                    nodeName: 'H1',
                    children: [{nodeId: 4, nodeName: '#text', nodeValue: 'Title'}],
                  },
                ],
              },
              {
                nodeId: 5,
                nodeName: 'P',
                children: [{nodeId: 6, nodeName: '#text', nodeValue: 'Some content'}],
              },
            ],
          });
          sinon.stub(rootNode, 'getOuterHTML')
              .resolves(
                  '<div id="html-edit-div" class="container">\n  <header>\n    <h1>Title</h1>\n  </header>\n  <p>Some content</p>\n</div>');

          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.toggleEditAsHTML(rootNode);
          await waitForTreeUpdates();
          disableEditorCursor(domTree.contentElement);

          await assertScreenshot('elements/dom_tree_widget_edit_as_html.png');
        } finally {
          domTree.multilineEditing()?.cancel();
          domTree.detach();
        }
      });

      it('renders screenshot of adding new attribute', async () => {
        const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
        sinon.stub(domModel, 'requestDocument').resolves(null);
        const {domTree} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});

        try {
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            attributes: [],
            children: [],
          });
          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.selectNodeAfterEdit(false, null, rootNode, 'forward');
          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_editing_new_attribute.png');
        } finally {
          cancelActiveEditing(domTree);
          domTree.detach();
        }
      });

      it('renders screenshot of in-place text node editing', async () => {
        const domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
        sinon.stub(domModel, 'requestDocument').resolves(null);
        const {domTree} = setupDOMTreeWidget(target, undefined, {includeCommonStyles: true});

        try {
          const rootNode = createTestDOMTree(domModel, {
            nodeId: 1,
            nodeName: 'DIV',
            children: [
              {nodeId: 2, nodeName: '#text', nodeValue: 'Editable text content', nodeType: Node.TEXT_NODE},
            ],
          });
          const textNode = rootNode.children()![0];
          domTree.rootDOMNode = rootNode;
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.setNodeExpanded(rootNode, true);
          domTree.performUpdate();
          await waitForTreeUpdates();

          domTree.selectDOMNode(textNode);
          await waitForTreeUpdates();

          domTree.startEditing(rootNode);
          await waitForTreeUpdates();

          await assertScreenshot('elements/dom_tree_widget_editing_text_node.png');
        } finally {
          cancelActiveEditing(domTree);
          domTree.detach();
        }
      });
    });
  });

  describe('DOM change tracking', () => {
    let tracker: ChangeTracker.ChangeTracker.ChangeTracker;
    let domTree: Elements.ElementsTreeOutline.DOMTreeWidget;
    let rootNode: SDK.DOMModel.DOMNode;
    let childNode1: SDK.DOMModel.DOMNode;
    let childNode2: SDK.DOMModel.DOMNode;

    beforeEach(() => {
      updateHostConfig({
        devToolsComments: {
          enabled: true,
        },
      });
      universe.commentManager.setAgentAttached(true);
      tracker = universe.changeTracker;
      const testDomModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      rootNode = SDK.DOMModel.DOMNode.create(testDomModel, null, false, {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'DIV',
        localName: 'div',
        nodeValue: '',
        childNodeCount: 2,
        children: [
          {
            nodeId: 2 as Protocol.DOM.NodeId,
            parentId: 1 as Protocol.DOM.NodeId,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'P',
            localName: 'p',
            nodeValue: '',
            childNodeCount: 0,
          },
          {
            nodeId: 3 as Protocol.DOM.NodeId,
            parentId: 1 as Protocol.DOM.NodeId,
            backendNodeId: 3 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'SPAN',
            localName: 'span',
            nodeValue: '',
            childNodeCount: 0,
          },
        ],
      }) as SDK.DOMModel.DOMNode;
      childNode1 = rootNode.children()![0];
      childNode2 = rootNode.children()![1];

      domTree = new Elements.ElementsTreeOutline.DOMTreeWidget(undefined, [tracker]);
      domTree.omitRootDOMNode = true;
      domTree.rootDOMNode = rootNode;
      domTree.performUpdate();
    });

    afterEach(() => {
      domTree.detach();
    });

    /**
     * `ChangeTracker` records the location of a change on the comment thread it
     * creates, not on the `ChangeRecord` itself, so the affected node has to be
     * read back from the `CommentManager`.
     */
    function lastChangeBackendNodeId(): number|undefined {
      return universe.commentManager.getCommentThreads().at(-1)?.anchor.node?.backendNodeId;
    }

    it('records a change when removeNode is called', async () => {
      sinon.stub(childNode1, 'removeNode').callsFake(async callback => {
        callback?.(null);
      });
      await domTree.removeNode(childNode1);

      const record = tracker.getLastChange();
      assert.exists(record);
      assert.strictEqual(record?.description, 'Removed node <p>');
      assert.strictEqual(lastChangeBackendNodeId(), 2);
    });

    it('does not record a change when removeNode fails with an error', async () => {
      sinon.stub(childNode1, 'removeNode').callsFake(async callback => {
        callback?.('Could not remove node');
      });
      await domTree.removeNode(childNode1);

      const record = tracker.getLastChange();
      assert.isUndefined(record);
    });

    it('unhides hidden node before removal without emitting a visibility change', async () => {
      sinon.stub(childNode1, 'isToggledToHidden').returns(true);
      const toggleHideStub = sinon.stub(childNode1, 'toggleHideElement').resolves();
      sinon.stub(childNode1, 'removeNode').callsFake(async callback => {
        callback?.(null);
      });
      await domTree.removeNode(childNode1);

      sinon.assert.calledOnce(toggleHideStub);
      const changes = tracker.getChanges();
      assert.lengthOf(changes, 1);
      assert.strictEqual(changes[0].description, 'Removed node <p>');
    });

    it('records a change when duplicateNode is called', async () => {
      const duplicatedNode = SDK.DOMModel.DOMNode.create(childNode1.domModel(), null, false, {
        nodeId: 4 as Protocol.DOM.NodeId,
        parentId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 4 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'P',
        localName: 'p',
        nodeValue: '',
        childNodeCount: 0,
      });
      sinon.stub(childNode1, 'duplicate').resolves({error: null, node: duplicatedNode});
      domTree.duplicateNode(childNode1);
      await new Promise(resolve => setTimeout(resolve, 0));

      const record = tracker.getLastChange();
      assert.exists(record);
      assert.strictEqual(record?.description, 'Duplicated node <p>');
      assert.strictEqual(lastChangeBackendNodeId(), 4);
    });

    it('does not record a change when duplicateNode fails with an error', async () => {
      sinon.stub(childNode1, 'duplicate').resolves({error: 'Error duplicating node', node: null});
      domTree.duplicateNode(childNode1);
      await new Promise(resolve => setTimeout(resolve, 0));

      const record = tracker.getLastChange();
      assert.isUndefined(record);
    });

    it('records a change when pasteNode is called with copied node', () => {
      const clonedNode = SDK.DOMModel.DOMNode.create(childNode1.domModel(), null, false, {
        nodeId: 4 as Protocol.DOM.NodeId,
        parentId: 3 as Protocol.DOM.NodeId,
        backendNodeId: 4 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'P',
        localName: 'p',
        nodeValue: '',
        childNodeCount: 0,
      });
      sinon.stub(childNode1, 'copyTo').callsFake((_targetNode, _anchorNode, callback) => {
        callback?.(null, clonedNode);
      });
      domTree.setClipboardData({node: childNode1, isCut: false});

      domTree.pasteNode(childNode2);

      const record = tracker.getLastChange();
      assert.exists(record);
      assert.strictEqual(record?.description, 'Pasted node <p>');
      assert.strictEqual(lastChangeBackendNodeId(), 4);
    });

    it('does not record a change when pasteNode copyTo fails with an error', () => {
      sinon.stub(childNode1, 'copyTo').callsFake((_targetNode, _anchorNode, callback) => {
        callback?.('Error copying node', null);
      });
      domTree.setClipboardData({node: childNode1, isCut: false});

      domTree.pasteNode(childNode2);

      const record = tracker.getLastChange();
      assert.isUndefined(record);
    });

    it('records a change when pasteNode is called with cut node', () => {
      sinon.stub(childNode1, 'moveTo').callsFake((_targetNode, _anchorNode, callback) => {
        callback?.(null, childNode1);
      });
      domTree.setClipboardData({node: childNode1, isCut: true});

      domTree.pasteNode(childNode2);

      const record = tracker.getLastChange();
      assert.exists(record);
      assert.strictEqual(record?.description, 'Pasted (moved) node <p>');
      assert.strictEqual(lastChangeBackendNodeId(), 2);
    });

    it('does not record a change when pasteNode with cut node fails with an error', () => {
      sinon.stub(childNode1, 'moveTo').callsFake((_targetNode, _anchorNode, callback) => {
        callback?.('Error moving node', null);
      });
      domTree.setClipboardData({node: childNode1, isCut: true});

      domTree.pasteNode(childNode2);

      const record = tracker.getLastChange();
      assert.isUndefined(record);
    });

    it('records a change when reordering nodes with Ctrl+Up and Ctrl+Down', () => {
      sinon.stub(childNode2, 'moveTo').callsFake((_targetNode, _anchorNode, callback) => {
        callback?.(null, childNode2);
      });
      domTree.selectDOMNode(childNode2);

      const isMac = Host.Platform.isMac();
      const upEvent = new KeyboardEvent('keydown', {key: 'ArrowUp', ctrlKey: !isMac, metaKey: isMac, bubbles: true});
      domTree.onKeyDown(upEvent);

      let record = tracker.getLastChange();
      assert.exists(record);
      assert.strictEqual(record?.description, 'Moved node <span> up');
      assert.strictEqual(lastChangeBackendNodeId(), 3);

      sinon.stub(childNode1, 'moveTo').callsFake((_targetNode, _anchorNode, callback) => {
        callback?.(null, childNode1);
      });
      domTree.selectDOMNode(childNode1);

      const downEvent =
          new KeyboardEvent('keydown', {key: 'ArrowDown', ctrlKey: !isMac, metaKey: isMac, bubbles: true});
      domTree.onKeyDown(downEvent);

      record = tracker.getLastChange();
      assert.exists(record);
      assert.strictEqual(record?.description, 'Moved node <p> down');
      assert.strictEqual(lastChangeBackendNodeId(), 2);
    });

    it('does not record a change when reordering nodes fails with an error', () => {
      sinon.stub(childNode2, 'moveTo').callsFake((_targetNode, _anchorNode, callback) => {
        callback?.('Error moving node', null);
      });
      domTree.selectDOMNode(childNode2);

      const isMac = Host.Platform.isMac();
      const upEvent = new KeyboardEvent('keydown', {key: 'ArrowUp', ctrlKey: !isMac, metaKey: isMac, bubbles: true});
      domTree.onKeyDown(upEvent);

      const record = tracker.getLastChange();
      assert.isUndefined(record);
    });

    it('records a change when drag and drop moves a node', () => {
      sinon.stub(childNode1, 'moveTo').callsFake((_targetNode, _anchorNode, callback) => {
        callback?.(null, childNode1);
      });

      domTree.moveNode(childNode1, childNode2, /* isClosingTag= */ false);

      const record = tracker.getLastChange();
      assert.exists(record);
      assert.strictEqual(record?.description, 'Moved node <p> via drag and drop');
      assert.strictEqual(lastChangeBackendNodeId(), 2);
    });

    it('does not record a change when drag and drop move fails with an error', () => {
      sinon.stub(childNode1, 'moveTo').callsFake((_targetNode, _anchorNode, callback) => {
        callback?.('Error moving node', null);
      });

      domTree.moveNode(childNode1, childNode2, /* isClosingTag= */ false);

      const record = tracker.getLastChange();
      assert.isUndefined(record);
    });

    it('records a change when toggleHideElement is called', () => {
      sinon.stub(childNode1, 'toggleHideElement');
      sinon.stub(childNode1, 'isToggledToHidden').returns(false);

      void domTree.toggleHideElement(childNode1);

      const record = tracker.getLastChange();
      assert.exists(record);
      assert.strictEqual(record?.description, 'Hid element <p>');
      assert.strictEqual(lastChangeBackendNodeId(), 2);
    });

    it('ignores late requestDocument resolution for a DOMModel that was removed via modelRemoved', async () => {
      const {domTree, domModel: primaryDomModel} =
          setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW);
      const prerenderTarget = createTarget({type: SDK.Target.Type.FRAME, subtype: 'prerender'});
      const prerenderDomModel = prerenderTarget.model(SDK.DOMModel.DOMModel)!;

      try {
        const primaryDoc = createTestDOMTree(primaryDomModel, {
                             nodeId: 1,
                             nodeType: Node.DOCUMENT_NODE,
                             nodeName: '#document',
                             children: [{nodeId: 2, nodeName: 'HTML'}],
                           }) as SDK.DOMModel.DOMDocument;
        const prerenderDoc = createTestDOMTree(prerenderDomModel, {
                               nodeId: 10,
                               nodeType: Node.DOCUMENT_NODE,
                               nodeName: '#document',
                               children: [{nodeId: 11, nodeName: 'HTML'}],
                             }) as SDK.DOMModel.DOMDocument;

        let resolvePrerenderDocument!: (doc: SDK.DOMModel.DOMDocument|null) => void;
        const prerenderExistingDocStub = sinon.stub(prerenderDomModel, 'existingDocument').returns(null);
        sinon.stub(prerenderDomModel, 'requestDocument').returns(new Promise(resolve => {
          resolvePrerenderDocument = resolve;
        }));

        sinon.stub(primaryDomModel, 'existingDocument').returns(primaryDoc);

        // Wire prerenderDomModel and then remove it before its requestDocument() resolves.
        domTree.modelAdded(prerenderDomModel);
        domTree.modelRemoved(prerenderDomModel);

        // Wire primaryDomModel which sets rootDOMNode to primaryDoc.
        domTree.modelAdded(primaryDomModel);
        assert.strictEqual(domTree.rootDOMNode, primaryDoc);

        const onDocumentUpdatedSpy = sinon.spy(domTree, 'onDocumentUpdated');

        // Resolve the stale prerender requestDocument() promise.
        resolvePrerenderDocument(prerenderDoc);
        await new Promise<void>(resolve => queueMicrotask(resolve));

        // Ensure rootDOMNode remains primaryDoc and onDocumentUpdated was not called for prerenderDomModel.
        assert.strictEqual(domTree.rootDOMNode, primaryDoc);
        sinon.assert.notCalled(onDocumentUpdatedSpy);

        // Removing the active primaryDomModel clears rootDOMNode.
        domTree.modelRemoved(primaryDomModel);
        assert.isNull(domTree.rootDOMNode);

        // Manually switching to prerenderDomModel (e.g. via target selector) renders prerenderDoc.
        prerenderExistingDocStub.returns(prerenderDoc);
        domTree.modelAdded(prerenderDomModel);
        assert.strictEqual(domTree.rootDOMNode, prerenderDoc);
      } finally {
        domTree.detach();
        prerenderTarget.dispose('test cleanup');
      }
    });
  });

  it('preserves syntax highlighting colors when a tree element is selected and focused in DECLARATIVE_VIEW',
     async () => {
       const {domTree, domModel} =
           setupDOMTreeWidget(target, Elements.ElementsTreeOutline.DECLARATIVE_VIEW, {includeCommonStyles: true});
       try {
         const rootNode = createTestDOMTree(domModel, {
           nodeId: 1,
           nodeName: 'DIV',
           children: [{nodeId: 2, nodeName: 'SPAN', attributes: ['id', 'main', 'class', 'container']}],
         });
         const childNode = rootNode.children()![0];
         domTree.rootDOMNode = rootNode;
         domTree.selectEnabled = true;
         domTree.setNodeExpanded(rootNode, true);
         domTree.performUpdate();
         await waitForTreeUpdates();

         const tree = domTree.contentElement.querySelector<UI.TreeOutline.TreeViewElement>('devtools-tree')!;
         const internalTree = tree.getInternalTreeOutlineForTest();
         const initialChildElement = internalTree.rootElement().children()[0].children()[0];
         assert.exists(initialChildElement);
         assert.isFalse(initialChildElement.selected);

         const initialTagEl = initialChildElement.listItemElement.querySelector('.webkit-html-tag-name')!;
         const initialAttrNameEl = initialChildElement.listItemElement.querySelector('.webkit-html-attribute-name')!;
         const initialAttrValueEl = initialChildElement.listItemElement.querySelector('.webkit-html-attribute-value')!;
         const unselectedTagColor = window.getComputedStyle(initialTagEl).color;
         const unselectedAttrNameColor = window.getComputedStyle(initialAttrNameEl).color;
         const unselectedAttrValueColor = window.getComputedStyle(initialAttrValueEl).color;

         // Select and focus the child tree element.
         domTree.selectDOMNode(childNode, /* focus= */ true);
         await waitForTreeUpdates();

         const selectedChildElement = internalTree.rootElement().children()[0].children()[0];
         selectedChildElement.listItemElement.focus();
         assert.isTrue(selectedChildElement.selected);
         assert.strictEqual(tree.shadowRoot?.activeElement, selectedChildElement.listItemElement);

         const tagNameEl = selectedChildElement.listItemElement.querySelector('.webkit-html-tag-name')!;
         const attrNameEl = selectedChildElement.listItemElement.querySelector('.webkit-html-attribute-name')!;
         const attrValueEl = selectedChildElement.listItemElement.querySelector('.webkit-html-attribute-value')!;

         // Syntax highlighting token colors must remain unchanged when selected and focused.
         assert.strictEqual(window.getComputedStyle(tagNameEl).color, unselectedTagColor);
         assert.strictEqual(window.getComputedStyle(attrNameEl).color, unselectedAttrNameColor);
         assert.strictEqual(window.getComputedStyle(attrValueEl).color, unselectedAttrValueColor);
       } finally {
         domTree.detach();
       }
     });
});
