// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Layers from '../../../../../front_end/panels/layers/layers.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('LayersPanel', async () => {
  beforeEach(async () => {
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    stubNoopSettings();
  });

  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;

    beforeEach(async () => {
      target = targetFactory();
    });

    it('udpates 3d view when layer painted', async () => {
      const panel = Layers.LayersPanel.LayersPanel.instance({forceNew: true});
      const layerTreeModel = target.model(Layers.LayerTreeModel.LayerTreeModel);
      assertNotNullOrUndefined(layerTreeModel);
      const updateLayerSnapshot = sinon.stub(panel.layers3DView, 'updateLayerSnapshot');
      const LAYER = {id: () => 'TEST_LAYER'} as Layers.LayerTreeModel.AgentLayer;
      layerTreeModel.dispatchEventToListeners(Layers.LayerTreeModel.Events.LayerPainted, LAYER);
      assert.isTrue(updateLayerSnapshot.calledOnceWith(LAYER));
    });
  };

  describe('without tab taget', () => tests(() => createTarget()));
  describe('with tab taget', () => tests(() => {
                               const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                               createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                               return createTarget({parentTarget: tabTarget});
                             }));

  it('can handle scope switches', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const primaryTarget = createTarget({parentTarget: tabTarget});

    const panel = Layers.LayersPanel.LayersPanel.instance({forceNew: true});
    const primaryLayerTreeModel = primaryTarget.model(Layers.LayerTreeModel.LayerTreeModel);
    assertNotNullOrUndefined(primaryLayerTreeModel);
    const prerenderLayerTreeModel = prerenderTarget.model(Layers.LayerTreeModel.LayerTreeModel);
    assertNotNullOrUndefined(prerenderLayerTreeModel);
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
