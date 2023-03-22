// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Network from '../../../../../front_end/panels/network/network.js';
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithMockConnection('NetworkPanel', () => {
  let target: SDK.Target.Target;
  let networkPanel: Network.NetworkPanel.NetworkPanel;

  beforeEach(async () => {
    UI.ActionRegistration.maybeRemoveActionExtension('network.toggle-recording');
    UI.ActionRegistration.registerActionExtension(
        {actionId: 'network.toggle-recording', category: UI.ActionRegistration.ActionCategory.NETWORK});
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});

    target = createTarget();
    const dummyStorage = new Common.Settings.SettingsStorage({});
    for (const settingName
             of ['networkColorCodeResourceTypes', 'network.group-by-frame', 'networkRecordFilmStripSetting']) {
      Common.Settings.registerSettingExtension({
        settingName,
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      });
    }
    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
    });
    networkPanel = Network.NetworkPanel.NetworkPanel.instance({forceNew: true, displayScreenshotDelay: 0});
    networkPanel.markAsRoot();
    networkPanel.show(document.body);
    await coordinator.done();
  });

  afterEach(async () => {
    await coordinator.done();
    networkPanel.detach();
  });

  const tracingTests = (inScope: boolean) => () => {
    it('starts recording on page reload', async () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      Common.Settings.Settings.instance().moduleSetting('networkRecordFilmStripSetting').set(true);
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);
      const tracingManager = target.model(SDK.TracingManager.TracingManager);
      assertNotNullOrUndefined(tracingManager);
      const tracingStart = sinon.spy(tracingManager, 'start');
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.WillReloadPage);
      assert.strictEqual(tracingStart.called, inScope);
    });

    it('stops recording on page load', async () => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      Common.Settings.Settings.instance().moduleSetting('networkRecordFilmStripSetting').set(true);
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);
      const tracingManager = target.model(SDK.TracingManager.TracingManager);
      assertNotNullOrUndefined(tracingManager);
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.WillReloadPage);
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);

      const tracingStop = sinon.spy(tracingManager, 'stop');
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, {resourceTreeModel, loadTime: 42});
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.strictEqual(tracingStop.called, inScope);
    });
  };

  describe('in scope', tracingTests(true));
  describe('out of scpe', tracingTests(false));
});
