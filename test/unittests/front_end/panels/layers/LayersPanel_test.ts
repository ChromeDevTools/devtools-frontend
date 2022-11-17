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
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;

    beforeEach(async () => {
      target = targetFactory();
      const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
      UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
      stubNoopSettings();
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
});
