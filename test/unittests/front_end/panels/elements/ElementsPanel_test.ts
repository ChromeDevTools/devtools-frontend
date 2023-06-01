// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../../front_end/core/host/host.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Elements from '../../../../../front_end/panels/elements/elements.js';

import type * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../helpers/MockConnection.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {recordedMetricsContain} from '../../helpers/UserMetricsHelpers.js';

const {assert} = chai;

describeWithMockConnection('ElementsPanel', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.FULL_ACCESSIBILITY_TREE, '');
    Root.Runtime.experiments.register('APCA', '');
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

  it('records metrics when the styles and computed tabs are selected', () => {
    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    assertNotNullOrUndefined(panel.sidebarPaneView);
    const tabbedPane = panel.sidebarPaneView.tabbedPane();
    // The first event is not recorded
    tabbedPane.selectTab(Elements.ElementsPanel.SidebarPaneTabId.Styles);

    tabbedPane.selectTab(Elements.ElementsPanel.SidebarPaneTabId.Computed);
    assert.isTrue(
        recordedMetricsContain(
            Host.InspectorFrontendHostAPI.EnumeratedHistogram.ElementsSidebarTabShown,
            Host.UserMetrics.ElementsSidebarTabCodes.Computed),
        'Expected "Computed" tab to show up in metrics');
    assert.isFalse(
        recordedMetricsContain(
            Host.InspectorFrontendHostAPI.EnumeratedHistogram.ElementsSidebarTabShown,
            Host.UserMetrics.ElementsSidebarTabCodes.Styles),
        'Expected "Styles" tab to not show up in metrics');

    tabbedPane.selectTab(Elements.ElementsPanel.SidebarPaneTabId.Styles);
    assert.isTrue(
        recordedMetricsContain(
            Host.InspectorFrontendHostAPI.EnumeratedHistogram.ElementsSidebarTabShown,
            Host.UserMetrics.ElementsSidebarTabCodes.Styles),
        'Expected "Styles" tab to show up in metrics');
  });

  const createsTreeOutlines = (inScope: boolean) => () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    const model = target.model(SDK.DOMModel.DOMModel);
    assertNotNullOrUndefined(model);
    assert.strictEqual(Boolean(Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(model)), inScope);

    const subtraget = createTarget({parentTarget: target});
    const submodel = subtraget.model(SDK.DOMModel.DOMModel);
    assertNotNullOrUndefined(submodel);
    assert.strictEqual(Boolean(Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(model)), inScope);

    subtraget.dispose('');
    assert.isNull(Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(submodel));
  };

  it('creates tree outlines for in scope models', createsTreeOutlines(true));
  it('does not create tree outlines for out of scope models', createsTreeOutlines(false));

  it('expands the tree even when target added later', async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(null);
    const model = target.model(SDK.DOMModel.DOMModel);
    assertNotNullOrUndefined(model);
    await model.requestDocument();

    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    panel.markAsRoot();
    panel.show(document.body);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);

    const treeOutline = Elements.ElementsTreeOutline.ElementsTreeOutline.forDOMModel(model);
    assertNotNullOrUndefined(treeOutline);
    const selectedNode = treeOutline.selectedDOMNode();
    assertNotNullOrUndefined(selectedNode);
    const selectedTreeElement = treeOutline.findTreeElement(selectedNode);
    assertNotNullOrUndefined(selectedTreeElement);
    assert.isTrue(selectedTreeElement.expanded);
    panel.detach();
  });

  it('searches in in scope models', () => {
    const anotherTarget = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const inScopeModel = target.model(SDK.DOMModel.DOMModel);
    assertNotNullOrUndefined(inScopeModel);
    const inScopeSearch = sinon.spy(inScopeModel, 'performSearch');
    const outOfScopeModel = anotherTarget.model(SDK.DOMModel.DOMModel);
    assertNotNullOrUndefined(outOfScopeModel);
    const outOfScopeSearch = sinon.spy(outOfScopeModel, 'performSearch');

    const panel = Elements.ElementsPanel.ElementsPanel.instance({forceNew: true});
    panel.performSearch({query: 'foo'} as UI.SearchableView.SearchConfig, false);

    assert.isTrue(inScopeSearch.called);
    assert.isFalse(outOfScopeSearch.called);
  });
});
