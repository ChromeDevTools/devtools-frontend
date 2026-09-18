// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import {raf, renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
  stubNoopSettings,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall, expectCalled} from '../../testing/ExpectStubCall.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithEnvironment('ElementsPanel', () => {
  let target: SDK.Target.Target;
  let connection: MockCDPConnection;
  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    stubNoopSettings();
    connection = new MockCDPConnection();
    target = createTarget({connection});
    connection.setSuccessHandler('DOM.requestChildNodes', () => ({}));
    connection.setSuccessHandler('DOM.getDocument', () => ({
                                                      root: {
                                                        nodeId: 1 as Protocol.DOM.NodeId,
                                                        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
                                                        nodeType: Node.DOCUMENT_NODE,
                                                        nodeName: '#document',
                                                        childNodeCount: 1,
                                                        children: [{
                                                          nodeId: 4 as Protocol.DOM.NodeId,
                                                          parentId: 1 as Protocol.DOM.NodeId,
                                                          backendNodeId: 5 as Protocol.DOM.BackendNodeId,
                                                          nodeType: Node.ELEMENT_NODE,
                                                          nodeName: 'HTML',
                                                          childNodeCount: 1,
                                                          children: [{
                                                            nodeId: 6 as Protocol.DOM.NodeId,
                                                            parentId: 4 as Protocol.DOM.NodeId,
                                                            backendNodeId: 7 as Protocol.DOM.BackendNodeId,
                                                            nodeType: Node.ELEMENT_NODE,
                                                            nodeName: 'BODY',
                                                            childNodeCount: 1,
                                                          } as Protocol.DOM.Node],
                                                        } as Protocol.DOM.Node],
                                                      },
                                                    } as Protocol.DOM.GetDocumentResponse));
    connection.setSuccessHandler('DOM.copyTo', () => {
      dispatchEvent(target, 'DOM.childNodeInserted', {
        parentNodeId: 4 as Protocol.DOM.NodeId,
        previousNodeId: 6 as Protocol.DOM.NodeId,
        node: {
          nodeId: 7 as Protocol.DOM.NodeId,
          parentId: 4 as Protocol.DOM.NodeId,
          backendNodeId: 8 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'BODY',
          childNodeCount: 1,
        } as Protocol.DOM.Node,
      });
      return {nodeId: 7 as Protocol.DOM.NodeId};
    });
  });

  afterEach(() => {
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
  });

  // Causes unit test execution to abort
  it('expands the tree even when target added later', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    await model.requestDocument();

    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    renderElementIntoDOM(panel);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    const domTree = panel.getDOMTreeWidgetForTesting();
    assert.exists(domTree);
    const selectedNode = domTree.selectedDOMNode();
    assert.exists(selectedNode);
    assert.isTrue(domTree.isNodeExpanded(selectedNode));
    panel.detach();
  });

  // Causes unit test execution to abort
  it('restores the focused node after reload when it becomes available later', async () => {
    const clock = sinon.useFakeTimers();
    try {
      let includeDivInDocument = true;

      const documentResponse = (includeDiv: boolean): Protocol.DOM.GetDocumentResponse => ({
        root: {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.DOCUMENT_NODE,
          nodeName: '#document',
          childNodeCount: 1,
          children: [{
            nodeId: 4 as Protocol.DOM.NodeId,
            parentId: 1 as Protocol.DOM.NodeId,
            backendNodeId: 5 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'HTML',
            childNodeCount: 1,
            children: [{
              nodeId: 6 as Protocol.DOM.NodeId,
              parentId: 4 as Protocol.DOM.NodeId,
              backendNodeId: 7 as Protocol.DOM.BackendNodeId,
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'BODY',
              childNodeCount: includeDiv ? 1 : 0,
              children: includeDiv ? [{
                nodeId: 8 as Protocol.DOM.NodeId,
                parentId: 6 as Protocol.DOM.NodeId,
                backendNodeId: 9 as Protocol.DOM.BackendNodeId,
                nodeType: Node.ELEMENT_NODE,
                nodeName: 'DIV',
                childNodeCount: 0,
                attributes: ['id', 'target'],
              } as Protocol.DOM.Node] :
                                     [],
            } as Protocol.DOM.Node],
          } as Protocol.DOM.Node],
        },
      } as Protocol.DOM.GetDocumentResponse);

      connection.setHandler('DOM.getDocument', null);
      connection.setSuccessHandler('DOM.getDocument', () => documentResponse(includeDivInDocument));
      connection.setSuccessHandler('DOM.pushNodeByPathToFrontend', () => ({
                                                                     nodeId: 8 as Protocol.DOM.NodeId,
                                                                   }));

      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      const model = target.model(SDK.DOMModel.DOMModel);
      assert.exists(model);

      const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
      panel.markAsRoot();
      renderElementIntoDOM(panel);

      await model.requestDocument();

      const inspectedDocument = model.existingDocument();
      assert.exists(inspectedDocument);
      const body = inspectedDocument.body;
      assert.exists(body);
      const bodyChildren = body.children();
      assert.exists(bodyChildren);
      const div = bodyChildren[0];
      assert.exists(div);

      panel.selectDOMNode(div, true);
      assert.strictEqual(panel.selectedDOMNode()?.nodeName(), 'DIV');

      // Simulate a reload where the selected node appears later.
      includeDivInDocument = false;
      dispatchEvent(target, 'DOM.documentUpdated');

      // Wait for the new document to arrive.
      await model.requestDocument();
      await clock.tickAsync(0);

      assert.strictEqual(panel.selectedDOMNode()?.nodeName(), 'BODY');

      // Insert the node later and let the retry logic pick it up.
      await clock.tickAsync(300);
      dispatchEvent(target, 'DOM.childNodeInserted', {
        parentNodeId: 6 as Protocol.DOM.NodeId,
        previousNodeId: 0 as Protocol.DOM.NodeId,
        node: {
          nodeId: 8 as Protocol.DOM.NodeId,
          parentId: 6 as Protocol.DOM.NodeId,
          backendNodeId: 9 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'DIV',
          childNodeCount: 0,
          attributes: ['id', 'target'],
        } as Protocol.DOM.Node,
      });

      await clock.tickAsync(600);

      assert.strictEqual(panel.selectedDOMNode()?.nodeName(), 'DIV');
      panel.detach();

      // Ensure all pending tasks triggered via the fake timers have a chance to
      // complete before the test ends.
      await clock.runAllAsync();
    } finally {
      clock.restore();
    }
  });

  it('searches in in scope models', () => {
    const anotherTarget = createTarget({connection});
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const inScopeModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(inScopeModel);
    const inScopeSearch = sinon.spy(inScopeModel, 'performSearch');
    const outOfScopeModel = anotherTarget.model(SDK.DOMModel.DOMModel);
    assert.exists(outOfScopeModel);
    const outOfScopeSearch = sinon.spy(outOfScopeModel, 'performSearch');

    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    panel.performSearch({query: 'foo'} as UI.SearchableView.SearchConfig, false);

    sinon.assert.called(inScopeSearch);
    sinon.assert.notCalled(outOfScopeSearch);
    anotherTarget.dispose('test');
  });

  it('hides DOM node highlight on search canceled and when navigating search results', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const domModel = target.model(SDK.DOMModel.DOMModel)!;
    const node1 = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    const node2 = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    sinon.stub(domModel, 'performSearch').resolves(2);
    const searchResultStub = sinon.stub(domModel, 'searchResult');
    searchResultStub.withArgs(0).resolves(node1);
    searchResultStub.withArgs(1).resolves(node2);

    const hideStub = sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');
    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});

    panel.performSearch({query: 'div'} as UI.SearchableView.SearchConfig, true);
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.calledOnce(node1.scrollIntoView);

    hideStub.resetHistory();
    panel.jumpToNextSearchResult();
    sinon.assert.calledWith(hideStub, SDK.TargetManager.TargetManager.instance());
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.calledOnce(node2.scrollIntoView);

    hideStub.resetHistory();
    panel.onSearchCanceled();
    sinon.assert.calledWith(hideStub, SDK.TargetManager.TargetManager.instance());

    hideStub.restore();
  });

  // Causes unit test execution to abort
  it('deleting a node unhides it if it was hidden', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    await model.requestDocument();

    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    panel.markAsRoot();
    renderElementIntoDOM(panel);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    const domTree = panel.getDOMTreeWidgetForTesting();
    assert.exists(domTree);
    const selectedNode = domTree.selectedDOMNode();
    assert.exists(selectedNode);
    assert.isTrue(domTree.isNodeExpanded(selectedNode));

    assert.strictEqual(selectedNode.nodeName(), 'BODY');

    assert.isFalse(domTree.isToggledToHidden(selectedNode));

    const mockResolveToObject = sinon.mock().twice().returns({callFunction: () => {}, release: () => {}});
    selectedNode.resolveToObject = mockResolveToObject;

    await domTree.toggleHideElement(selectedNode);
    assert.isTrue(domTree.isToggledToHidden(selectedNode));

    await domTree.removeNode(selectedNode);
    assert.isFalse(domTree.isToggledToHidden(selectedNode));

    panel.detach();
  });

  // Causes unit test execution to abort
  it('duplicating a hidden node results in a hidden copy', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    await model.requestDocument();

    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    panel.markAsRoot();
    renderElementIntoDOM(panel);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    const domTree = panel.getDOMTreeWidgetForTesting();
    assert.exists(domTree);
    const selectedNode = domTree.selectedDOMNode();
    assert.exists(selectedNode);
    assert.isTrue(domTree.isNodeExpanded(selectedNode));

    assert.strictEqual(selectedNode.nodeName(), 'BODY');

    assert.isFalse(domTree.isToggledToHidden(selectedNode));

    const mockResolveToObject = sinon.mock().twice().returns({callFunction: () => {}, release: () => {}});
    selectedNode.resolveToObject = mockResolveToObject;

    // Mock out a few things in the UI that's not necessary for this test.
    const treeOutline = domTree.getTreeOutlineForTesting();
    if (treeOutline) {
      const insertChildElement = sinon.mock().atLeast(1).returns(undefined);
      treeOutline.insertChildElement = insertChildElement;
    }
    const animateOnDOMUpdate = sinon.mock().atLeast(1).returns(undefined);
    Elements.ElementsTreeElement.ElementsTreeElement.animateOnDOMUpdate = animateOnDOMUpdate;
    const stylesSidebarPaneUpdate = sinon.mock().atLeast(1).returns(undefined);
    panel.stylesWidget.performUpdate = stylesSidebarPaneUpdate;

    await domTree.toggleHideElement(selectedNode);
    assert.isTrue(domTree.isToggledToHidden(selectedNode));

    domTree.duplicateNode(selectedNode);
    await raf();

    const copiedNode = selectedNode.nextSibling;
    assert.exists(copiedNode);
    assert.strictEqual(copiedNode.nodeName(), 'BODY');
    assert.isTrue(copiedNode !== null && domTree.isToggledToHidden(copiedNode));

    treeOutline?.runPendingUpdates();

    panel.detach();
  });

  it('updates elements tree after bfcache navigation', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);

    const page1Document = {
      root: {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [{
          nodeId: 4 as Protocol.DOM.NodeId,
          parentId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 5 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'HTML',
          childNodeCount: 1,
          children: [{
            nodeId: 6 as Protocol.DOM.NodeId,
            parentId: 4 as Protocol.DOM.NodeId,
            backendNodeId: 7 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'BODY',
            childNodeCount: 1,
            children: [{
              nodeId: 8 as Protocol.DOM.NodeId,
              parentId: 6 as Protocol.DOM.NodeId,
              backendNodeId: 9 as Protocol.DOM.BackendNodeId,
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'DIV',
              childNodeCount: 0,
              attributes: ['id', 'page1'],
            } as Protocol.DOM.Node],
          } as Protocol.DOM.Node],
        } as Protocol.DOM.Node],
      },
    } as Protocol.DOM.GetDocumentResponse;

    const page2Document = {
      root: {
        nodeId: 11 as Protocol.DOM.NodeId,
        backendNodeId: 12 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [{
          nodeId: 14 as Protocol.DOM.NodeId,
          parentId: 11 as Protocol.DOM.NodeId,
          backendNodeId: 15 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'HTML',
          childNodeCount: 1,
          children: [{
            nodeId: 16 as Protocol.DOM.NodeId,
            parentId: 14 as Protocol.DOM.NodeId,
            backendNodeId: 17 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'BODY',
            childNodeCount: 1,
            children: [{
              nodeId: 18 as Protocol.DOM.NodeId,
              parentId: 16 as Protocol.DOM.NodeId,
              backendNodeId: 19 as Protocol.DOM.BackendNodeId,
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'DIV',
              childNodeCount: 0,
              attributes: ['id', 'page2'],
            } as Protocol.DOM.Node],
          } as Protocol.DOM.Node],
        } as Protocol.DOM.Node],
      },
    } as Protocol.DOM.GetDocumentResponse;

    let currentDocument = page1Document;
    connection.setHandler('DOM.getDocument', null);
    connection.setSuccessHandler('DOM.getDocument', () => currentDocument);

    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    panel.markAsRoot();
    renderElementIntoDOM(panel);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    await model.requestDocument();
    const domTree = panel.getDOMTreeWidgetForTesting();
    assert.exists(domTree);

    // Verify Page 1 is loaded
    assert.strictEqual(domTree.rootDOMNode?.nodeName(), '#document');
    const doc1 = domTree.rootDOMNode as SDK.DOMModel.DOMDocument;
    const body = doc1?.body;
    assert.exists(body);
    const children1 = body!.children();
    assert.exists(children1);
    assert.strictEqual(children1![0].getAttribute('id'), 'page1');

    // Simulate navigation to Page 2
    currentDocument = page2Document;
    dispatchEvent(target, 'DOM.documentUpdated');
    await model.requestDocument();

    // Verify Page 2 is loaded
    const doc2 = domTree.rootDOMNode as SDK.DOMModel.DOMDocument;
    assert.exists(doc2?.body);
    const children2 = doc2.body!.children();
    assert.exists(children2);
    assert.strictEqual(children2![0].getAttribute('id'), 'page2');

    // Simulate BFCache navigation back to Page 1
    currentDocument = page1Document;
    dispatchEvent(target, 'DOM.documentUpdated');
    await model.requestDocument();

    // Verify Page 1 is restored
    const doc3 = domTree.rootDOMNode as SDK.DOMModel.DOMDocument;
    assert.exists(doc3?.body);
    const children3 = doc3.body!.children();
    assert.exists(children3);
    assert.strictEqual(children3![0].getAttribute('id'), 'page1');

    panel.detach();
  });

  describe('tracking and updating Computed styles', () => {
    const StylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane;
    const ComputedStyleModel = ComputedStyle.ComputedStyleModel.ComputedStyleModel;
    const ComputedStyleWidget = Elements.ComputedStyleWidget.ComputedStyleWidget;

    let computedStyleNodeSpy: {
      get: sinon.SinonSpy,
      set: sinon.SinonSpy,
    };
    let computedStyleFetchStylesSpy: sinon.SinonStub;
    let computedStyleFetchCascadeSpy: sinon.SinonStub;
    let panel: Elements.ElementsPanel.ElementsPanel;
    let node: SDK.DOMModel.DOMNode;
    let cssModel: sinon.SinonStubbedInstance<SDK.CSSModel.CSSModel>;
    let computedStylesShowingStub: sinon.SinonStub;

    beforeEach(() => {
      computedStylesShowingStub = sinon.stub(ComputedStyleWidget.prototype, 'isShowing');
      computedStyleFetchStylesSpy = sinon.stub(ComputedStyleModel.prototype, 'fetchComputedStyle').resolves(null);
      computedStyleFetchCascadeSpy = sinon.stub(ComputedStyleModel.prototype, 'fetchMatchedCascade').resolves(null);
      Common.Debouncer.enableTestOverride();
      const viewManager = UI.ViewManager.ViewManager.instance({forceNew: true});
      sinon.stub(viewManager, 'showView');
      panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
      computedStyleNodeSpy = sinon.spy(panel.stylesWidget.computedStyleModel(), 'node', ['get', 'set']);

      cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel, {
        target: sinon.createStubInstance(SDK.Target.Target, {
          model: null,
        }),
      });

      const domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel, {
        cssModel,
      });
      node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
        domModel,
      });
      node.id = 1 as Protocol.DOM.NodeId;
    });

    afterEach(() => {
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
      UI.Context.Context.instance().setFlavor(StylesSidebarPane, null);
      Common.Debouncer.disableTestOverride();
      panel.detach();
    });

    it('updates the model when the selected DOM node changes', async () => {
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
      sinon.assert.calledOnceWithExactly(computedStyleNodeSpy.set, node);
    });

    it('fetches the styles from the computed style model when the dom node changes', async () => {
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
      await expectCalled(computedStyleFetchStylesSpy);
      await expectCalled(computedStyleFetchCascadeSpy);
    });

    it('enables tracking when the ComputedStyleWidget is shown', async () => {
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
      computedStylesShowingStub.callsFake(() => true);

      panel.selectAndShowSidebarTab(Elements.ElementsPanel.SidebarPaneTabId.COMPUTED);
      await expectCall(cssModel.trackComputedStyleUpdatesForNode);
      sinon.assert.calledOnceWithExactly(cssModel.trackComputedStyleUpdatesForNode, node.id);
    });

    it('stops tracking when the ComputedStyleWidget is removed', async () => {
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
      computedStylesShowingStub.callsFake(() => true);
      panel.selectAndShowSidebarTab(Elements.ElementsPanel.SidebarPaneTabId.COMPUTED);

      await expectCall(cssModel.trackComputedStyleUpdatesForNode);
      sinon.assert.calledOnceWithExactly(cssModel.trackComputedStyleUpdatesForNode, node.id);

      cssModel.trackComputedStyleUpdatesForNode.resetHistory();
      computedStylesShowingStub.callsFake(() => false);
      panel.selectAndShowSidebarTab(Elements.ElementsPanel.SidebarPaneTabId.STYLES);
      await expectCall(cssModel.trackComputedStyleUpdatesForNode);
      sinon.assert.calledOnceWithExactly(cssModel.trackComputedStyleUpdatesForNode, undefined);
    });

    it('enables tracking with a StylesSidebarPane and the DevToolsAnimationStylesInStylesTab experiment is enabled',
       async () => {
         UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
         updateHostConfig({
           devToolsAnimationStylesInStylesTab: {
             enabled: true,
           },
         });

         const stylesSidebarPane = sinon.createStubInstance(StylesSidebarPane);
         UI.Context.Context.instance().setFlavor(StylesSidebarPane, stylesSidebarPane);
         await expectCall(cssModel.trackComputedStyleUpdatesForNode);

         sinon.assert.calledOnceWithExactly(cssModel.trackComputedStyleUpdatesForNode, node.id);
       });

    it('stops tracking when the StylesSidebarPane is removed', async () => {
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
      updateHostConfig({
        devToolsAnimationStylesInStylesTab: {
          enabled: true,
        },
      });

      const stylesSidebarPane = sinon.createStubInstance(StylesSidebarPane);
      UI.Context.Context.instance().setFlavor(StylesSidebarPane, stylesSidebarPane);
      await expectCall(cssModel.trackComputedStyleUpdatesForNode);

      sinon.assert.calledOnceWithExactly(cssModel.trackComputedStyleUpdatesForNode, node.id);
      cssModel.trackComputedStyleUpdatesForNode.resetHistory();

      UI.Context.Context.instance().setFlavor(StylesSidebarPane, null);
      await expectCall(cssModel.trackComputedStyleUpdatesForNode);
      sinon.assert.calledOnceWithExactly(cssModel.trackComputedStyleUpdatesForNode, undefined);
    });

    it('does not enabled tracking with a StylesSidebarPane but the DevToolsAnimationStylesInStylesTab experiment is disabled',
       async () => {
         UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
         updateHostConfig({
           devToolsAnimationStylesInStylesTab: {
             enabled: false,
           },
         });
         const stylesSidebarPane = sinon.createStubInstance(StylesSidebarPane);
         UI.Context.Context.instance().setFlavor(StylesSidebarPane, stylesSidebarPane);
         await expectCall(cssModel.trackComputedStyleUpdatesForNode);

         sinon.assert.calledOnceWithExactly(cssModel.trackComputedStyleUpdatesForNode, undefined);
       });
  });
});
