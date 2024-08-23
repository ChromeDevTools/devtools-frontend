// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Layers from './layers.js';

describeWithMockConnection('LayersPanel', () => {
  let target: SDK.Target.Target;
  let prerenderTarget: SDK.Target.Target;

  beforeEach(async () => {
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    stubNoopSettings();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  it('udpates 3d view when layer painted', async () => {
    const panel = Layers.LayersPanel.LayersPanel.instance({forceNew: true});
    const layerTreeModel = target.model(Layers.LayerTreeModel.LayerTreeModel);
    assert.exists(layerTreeModel);
    const updateLayerSnapshot = sinon.stub(panel.layers3DView, 'updateLayerSnapshot');
    const LAYER = {id: () => 'TEST_LAYER'} as Layers.LayerTreeModel.AgentLayer;
    layerTreeModel.dispatchEventToListeners(Layers.LayerTreeModel.Events.LayerPainted, LAYER);
    assert.isTrue(updateLayerSnapshot.calledOnceWith(LAYER));
  });

  it('can handle scope switches', async () => {
    const panel = Layers.LayersPanel.LayersPanel.instance({forceNew: true});
    const primaryLayerTreeModel = target.model(Layers.LayerTreeModel.LayerTreeModel);
    assert.exists(primaryLayerTreeModel);
    const prerenderLayerTreeModel = prerenderTarget.model(Layers.LayerTreeModel.LayerTreeModel);
    assert.exists(prerenderLayerTreeModel);
    const updateLayerSnapshot = sinon.stub(panel.layers3DView, 'updateLayerSnapshot');

    const LAYER_1 = {id: () => 'TEST_LAYER_1'} as Layers.LayerTreeModel.AgentLayer;
    const LAYER_2 = {id: () => 'TEST_LAYER_2'} as Layers.LayerTreeModel.AgentLayer;
    primaryLayerTreeModel.dispatchEventToListeners(Layers.LayerTreeModel.Events.LayerPainted, LAYER_1);
    prerenderLayerTreeModel.dispatchEventToListeners(Layers.LayerTreeModel.Events.LayerPainted, LAYER_2);
    assert.isTrue(updateLayerSnapshot.calledOnceWith(LAYER_1));

    updateLayerSnapshot.reset();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(prerenderTarget);
    primaryLayerTreeModel.dispatchEventToListeners(Layers.LayerTreeModel.Events.LayerPainted, LAYER_1);
    prerenderLayerTreeModel.dispatchEventToListeners(Layers.LayerTreeModel.Events.LayerPainted, LAYER_2);
    assert.isTrue(updateLayerSnapshot.calledOnceWith(LAYER_2));
  });
});
