// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';

import * as MobileThrottling from './mobile_throttling.js';

describeWithEnvironment('ThrottlingManager', () => {
  describe('OfflineToolbarCheckbox', () => {
    it('has initial checked state which depends on throttling setting', () => {
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = MobileThrottling.ThrottlingManager.ThrottlingManager.instance({forceNew: true});

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.OfflineConditions);
      let checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isTrue(checkbox.checked());

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK.NetworkManager.Slow4GConditions);
      checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isFalse(checkbox.checked());
    });

    it('listens to changes in throttling setting', () => {
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = MobileThrottling.ThrottlingManager.ThrottlingManager.instance({forceNew: true});
      const checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isFalse(checkbox.checked());

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.OfflineConditions);
      assert.isTrue(checkbox.checked());

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.NoThrottlingConditions);
      assert.isFalse(checkbox.checked());
    });

    it('updates setting when checkbox is clicked on', () => {
      const multiTargetNetworkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = MobileThrottling.ThrottlingManager.ThrottlingManager.instance({forceNew: true});

      multiTargetNetworkManager.setNetworkConditions(SDK.NetworkManager.OfflineConditions);
      const checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isTrue(checkbox.checked());

      checkbox.element.click();
      assert.isFalse(checkbox.checked());
      assert.strictEqual(SDK.NetworkManager.NoThrottlingConditions, multiTargetNetworkManager.networkConditions());

      multiTargetNetworkManager.setNetworkConditions(SDK.NetworkManager.Slow3GConditions);
      assert.isFalse(checkbox.checked());

      checkbox.element.click();
      assert.isTrue(checkbox.checked());
      assert.strictEqual(SDK.NetworkManager.OfflineConditions, multiTargetNetworkManager.networkConditions());

      checkbox.element.click();
      assert.isFalse(checkbox.checked());
      assert.strictEqual(SDK.NetworkManager.Slow3GConditions, multiTargetNetworkManager.networkConditions());
    });
  });
  describe('CPU throttling', () => {
    it('listens to changes in cpu throttling setting', () => {
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const cpuThrottlingPresets = MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets;
      const throttlingManager = MobileThrottling.ThrottlingManager.ThrottlingManager.instance({forceNew: true});
      const selector = throttlingManager.createCPUThrottlingSelector().control;
      assert.strictEqual(cpuThrottlingPresets[selector.selectedIndex()], SDK.CPUThrottlingManager.NoThrottlingOption);

      SDK.CPUThrottlingManager.CPUThrottlingManager.instance().setCPUThrottlingOption(
          SDK.CPUThrottlingManager.ExtraSlowThrottlingOption);
      assert.strictEqual(
          cpuThrottlingPresets[selector.selectedIndex()], SDK.CPUThrottlingManager.ExtraSlowThrottlingOption);

      SDK.CPUThrottlingManager.CPUThrottlingManager.instance().setCPUThrottlingOption(
          SDK.CPUThrottlingManager.NoThrottlingOption);
      assert.strictEqual(cpuThrottlingPresets[selector.selectedIndex()], SDK.CPUThrottlingManager.NoThrottlingOption);
    });
  });
});

describeWithMockConnection('ThrottlingManager', () => {
  describe('DataSaverEmulation', () => {
    it('creates a select element which sets the data saver emulation mode', async () => {
      setMockConnectionResponseHandler('Emulation.setDataSaverOverride', () => ({}));
      const emulationModel = createTarget().model(SDK.EmulationModel.EmulationModel);
      assert.exists(emulationModel);
      assert.lengthOf(SDK.TargetManager.TargetManager.instance().models(SDK.EmulationModel.EmulationModel), 1);
      assert.strictEqual(
          SDK.TargetManager.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)[0], emulationModel);
      const select = MobileThrottling.ThrottlingManager.ThrottlingManager.instance({forceNew: true})
                         .createSaveDataOverrideSelector();
      const options = select.options();
      assert.deepEqual(
          options.map(option => option.textContent),
          ['\'Save-Data\': default', '\'Save-Data\': force on', '\'Save-Data\': force off']);

      let emulationModelSpy = spyCall(emulationModel, 'setDataSaverOverride');
      select.select(options[0]);
      select.element.dispatchEvent(new Event('change'));
      assert.strictEqual((await emulationModelSpy).args[0], SDK.EmulationModel.DataSaverOverride.UNSET);

      emulationModelSpy = spyCall(emulationModel, 'setDataSaverOverride');
      select.select(options[1]);
      select.element.dispatchEvent(new Event('change'));
      assert.strictEqual((await emulationModelSpy).args[0], SDK.EmulationModel.DataSaverOverride.ENABLED);

      emulationModelSpy = spyCall(emulationModel, 'setDataSaverOverride');
      select.select(options[2]);
      select.element.dispatchEvent(new Event('change'));
      assert.strictEqual((await emulationModelSpy).args[0], SDK.EmulationModel.DataSaverOverride.DISABLED);
    });
  });
});
