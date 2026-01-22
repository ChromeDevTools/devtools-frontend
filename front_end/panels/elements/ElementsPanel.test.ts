// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, stubNoopSettings, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler
} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithMockConnection('ElementsPanel', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    Root.Runtime.experiments.register(Root.ExperimentNames.ExperimentName.APCA, '');
    setMockConnectionResponseHandler('DOM.requestChildNodes', () => ({}));
    setMockConnectionResponseHandler('DOM.getDocument', () => ({
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
    setMockConnectionResponseHandler('DOM.copyTo', () => {
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
        } as Protocol.DOM.Node
      });
      return {nodeId: 7 as Protocol.DOM.NodeId};
    });
  });

  const createsTreeOutlines = (inScope: boolean) => () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    assert.strictEqual(Boolean(Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(model)), inScope);

    const subtraget = createTarget({parentTarget: target});
    const submodel = subtraget.model(SDK.DOMModel.DOMModel);
    assert.exists(submodel);
    assert.strictEqual(Boolean(Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(model)), inScope);

    subtraget.dispose('');
    assert.isNull(Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(submodel));
  };

  it('creates tree outlines for in scope models', createsTreeOutlines(true));
  it('does not create tree outlines for out of scope models', createsTreeOutlines(false));

  it('expands the tree even when target added later', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    await model.requestDocument();

    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    renderElementIntoDOM(panel);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(model);
    assert.exists(treeOutline);
    const selectedNode = treeOutline.selectedDOMNode();
    assert.exists(selectedNode);
    const selectedTreeElement = treeOutline.findTreeElement(selectedNode);
    assert.exists(selectedTreeElement);
    assert.isTrue(selectedTreeElement.expanded);
    panel.detach();
  });

  it('searches in in scope models', () => {
    const anotherTarget = createTarget();
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
  });

  it('deleting a node unhides it if it was hidden', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    await model.requestDocument();

    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    panel.markAsRoot();
    renderElementIntoDOM(panel);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(model);
    assert.exists(treeOutline);
    const selectedNode = treeOutline.selectedDOMNode();
    assert.exists(selectedNode);
    const selectedTreeElement = treeOutline.findTreeElement(selectedNode);
    assert.exists(selectedTreeElement);
    assert.isTrue(selectedTreeElement.expanded);

    assert.strictEqual(selectedNode.nodeName(), 'BODY');

    assert.isFalse(treeOutline.isToggledToHidden(selectedNode));

    const mockResolveToObject = sinon.mock().twice().returns({callFunction: () => {}, release: () => {}});
    selectedNode.resolveToObject = mockResolveToObject;

    await treeOutline.toggleHideElement(selectedNode);
    assert.isTrue(treeOutline.isToggledToHidden(selectedNode));

    await selectedTreeElement.remove();
    assert.isFalse(treeOutline.isToggledToHidden(selectedNode));

    panel.detach();
  });

  it('duplicating a hidden node results in a hidden copy', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
    const model = target.model(SDK.DOMModel.DOMModel);
    assert.exists(model);
    await model.requestDocument();

    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    panel.markAsRoot();
    renderElementIntoDOM(panel);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(model);
    assert.exists(treeOutline);
    const selectedNode = treeOutline.selectedDOMNode();
    assert.exists(selectedNode);
    const selectedTreeElement = treeOutline.findTreeElement(selectedNode);
    assert.exists(selectedTreeElement);
    assert.isTrue(selectedTreeElement.expanded);

    assert.strictEqual(selectedNode.nodeName(), 'BODY');

    assert.isFalse(treeOutline.isToggledToHidden(selectedNode));

    const mockResolveToObject = sinon.mock().twice().returns({callFunction: () => {}, release: () => {}});
    selectedNode.resolveToObject = mockResolveToObject;

    // Mock out a few things in the UI that's not necessary for this test.
    const insertChildElement = sinon.mock().atLeast(1).returns(undefined);
    treeOutline.insertChildElement = insertChildElement;
    const animateOnDOMUpdate = sinon.mock().atLeast(1).returns(undefined);
    Elements.ElementsTreeElement.ElementsTreeElement.animateOnDOMUpdate = animateOnDOMUpdate;
    const stylesSidebarPaneUpdate = sinon.mock().atLeast(1).returns(undefined);
    panel.stylesWidget.performUpdate = stylesSidebarPaneUpdate;

    await treeOutline.toggleHideElement(selectedNode);
    assert.isTrue(treeOutline.isToggledToHidden(selectedNode));

    treeOutline.duplicateNode(selectedNode);
    await raf();

    const copiedNode = selectedNode.nextSibling;
    assert.exists(copiedNode);
    assert.strictEqual(copiedNode.nodeName(), 'BODY');
    assert.isTrue(copiedNode !== null && treeOutline.isToggledToHidden(copiedNode));

    treeOutline.runPendingUpdates();

    panel.detach();
  });

  describe('tracking Computed styles', () => {
    const StylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane;
    const ComputedStyleModel = Elements.ComputedStyleModel.ComputedStyleModel;
    const ComputedStyleWidget = Elements.ComputedStyleWidget.ComputedStyleWidget;

    let computedStyleNodeSpy: {
      get: sinon.SinonSpy,
      set: sinon.SinonSpy,
    };
    let panel: Elements.ElementsPanel.ElementsPanel;
    let node: SDK.DOMModel.DOMNode;
    let cssModel: sinon.SinonStubbedInstance<SDK.CSSModel.CSSModel>;

    beforeEach(() => {
      computedStyleNodeSpy = sinon.spy(ComputedStyleModel.prototype, 'node', ['get', 'set']);
      Common.Debouncer.enableTestOverride();
      panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});

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
      Common.Debouncer.disableTestOverride();
      panel.detach();
    });

    it('updates the model when the selected DOM node changes', async () => {
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
      sinon.assert.calledOnceWithExactly(computedStyleNodeSpy.set, node);
    });

    it('enables tracking when a ComputedStyleWidget is created', async () => {
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
      const computedStylesWidget = sinon.createStubInstance(ComputedStyleWidget);
      UI.Context.Context.instance().setFlavor(ComputedStyleWidget, computedStylesWidget);
      await expectCall(cssModel.trackComputedStyleUpdatesForNode);
      sinon.assert.calledOnceWithExactly(cssModel.trackComputedStyleUpdatesForNode, node.id);
    });

    it('stops tracking when the ComputedStyleWidget is removed', async () => {
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

      const computedStylesWidget = sinon.createStubInstance(ComputedStyleWidget);
      UI.Context.Context.instance().setFlavor(ComputedStyleWidget, computedStylesWidget);
      await expectCall(cssModel.trackComputedStyleUpdatesForNode);

      sinon.assert.calledOnceWithExactly(cssModel.trackComputedStyleUpdatesForNode, node.id);
      cssModel.trackComputedStyleUpdatesForNode.resetHistory();

      UI.Context.Context.instance().setFlavor(ComputedStyleWidget, null);
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
