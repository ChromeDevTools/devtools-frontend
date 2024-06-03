// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
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
                                                            nodeId: 1,
                                                            backendNodeId: 2,
                                                            nodeType: Node.DOCUMENT_NODE,
                                                            nodeName: '#document',
                                                            childNodeCount: 1,
                                                            children: [{
                                                              nodeId: 4,
                                                              parentId: 1,
                                                              backendNodeId: 5,
                                                              nodeType: Node.ELEMENT_NODE,
                                                              nodeName: 'HTML',
                                                              childNodeCount: 1,
                                                              children: [{
                                                                nodeId: 6,
                                                                parentId: 4,
                                                                backendNodeId: 7,
                                                                nodeType: Node.ELEMENT_NODE,
                                                                nodeName: 'BODY',
                                                                childNodeCount: 1,
                                                              }],
                                                            }],
                                                          },
                                                        }));
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
    panel.markAsRoot();
    panel.show(document.body);

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

    assert.isTrue(inScopeSearch.called);
    assert.isFalse(outOfScopeSearch.called);
  });
});
