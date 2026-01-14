// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler
} from '../../testing/MockConnection.js';
import type * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithMockConnection('ElementsPanel', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    Root.Runtime.experiments.register('apca', '');
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
});
