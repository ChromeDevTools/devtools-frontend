// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {spyCall} from '../../testing/ExpectStubCall.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelsCommon from '../common/common.js';

import * as MobileThrottling from './mobile_throttling.js';

const {CPUPerformanceTier, ThrottlingManager} = MobileThrottling.ThrottlingManager;
const {ThrottlingPresets} = MobileThrottling.ThrottlingPresets;

describeWithEnvironment('ThrottlingManager', () => {
  describe('OfflineToolbarCheckbox', () => {
    it('has initial checked state which depends on throttling setting', () => {
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = ThrottlingManager.instance({forceNew: true});

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
      const throttlingManager = ThrottlingManager.instance({forceNew: true});
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
      const throttlingManager = ThrottlingManager.instance({forceNew: true});

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
      const cpuThrottlingPresets = ThrottlingPresets.cpuThrottlingPresets;
      const throttlingManager = ThrottlingManager.instance({forceNew: true});
      const selector = throttlingManager.createCPUThrottlingSelector().control;
      assert.strictEqual(cpuThrottlingPresets[selector.selectedIndex()],
                         PanelsCommon.CPUThrottlingOption.NoThrottlingOption);

      throttlingManager.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.ExtraSlowThrottlingOption);
      assert.strictEqual(cpuThrottlingPresets[selector.selectedIndex()],
                         PanelsCommon.CPUThrottlingOption.ExtraSlowThrottlingOption);

      throttlingManager.setCPUThrottlingOption(PanelsCommon.CPUThrottlingOption.NoThrottlingOption);
      assert.strictEqual(cpuThrottlingPresets[selector.selectedIndex()],
                         PanelsCommon.CPUThrottlingOption.NoThrottlingOption);
    });
  });
  describe('DataSaverEmulation', () => {
    it('creates a select element which updates the data saver setting and triggers emulation', async () => {
      const connection = new MockCDPConnection();
      connection.setSuccessHandler('Emulation.setDataSaverOverride', () => ({}));
      const target = createTarget({connection});
      const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(emulationModel);
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.dataSaverSettingDescriptor);

      const select = ThrottlingManager.instance({forceNew: true}).createSaveDataOverrideSelector();
      renderElementIntoDOM(select);
      await UI.Widget.Widget.allUpdatesComplete;
      const options = Array.from(select.options);
      assert.deepEqual(
          options.map(option => option.textContent),
          ['\'Save-Data\': default', '\'Save-Data\': on', '\'Save-Data\': off']);

      let emulationModelSpy = spyCall(emulationModel, 'setDataSaverOverride');
      select.value = SDK.EmulationModel.DataSaverOverride.ENABLED;
      select.dispatchEvent(new Event('change'));
      assert.strictEqual(setting.get(), SDK.EmulationModel.DataSaverOverride.ENABLED);
      assert.strictEqual((await emulationModelSpy).args[0], SDK.EmulationModel.DataSaverOverride.ENABLED);

      emulationModelSpy = spyCall(emulationModel, 'setDataSaverOverride');
      select.value = SDK.EmulationModel.DataSaverOverride.DISABLED;
      select.dispatchEvent(new Event('change'));
      assert.strictEqual(setting.get(), SDK.EmulationModel.DataSaverOverride.DISABLED);
      assert.strictEqual((await emulationModelSpy).args[0], SDK.EmulationModel.DataSaverOverride.DISABLED);

      emulationModelSpy = spyCall(emulationModel, 'setDataSaverOverride');
      select.value = SDK.EmulationModel.DataSaverOverride.UNSET;
      select.dispatchEvent(new Event('change'));
      assert.strictEqual(setting.get(), SDK.EmulationModel.DataSaverOverride.UNSET);
      assert.strictEqual((await emulationModelSpy).args[0], SDK.EmulationModel.DataSaverOverride.UNSET);

      await UI.Widget.Widget.allUpdatesComplete;
      target.dispose('test');
    });

    it('restores the selected option from setting when re-created', async () => {
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.dataSaverSettingDescriptor);
      setting.set(SDK.EmulationModel.DataSaverOverride.ENABLED);

      const select = ThrottlingManager.instance({forceNew: true}).createSaveDataOverrideSelector();
      renderElementIntoDOM(select);
      await UI.Widget.Widget.allUpdatesComplete;

      assert.strictEqual(select.value, SDK.EmulationModel.DataSaverOverride.ENABLED);
      assert.strictEqual(select.selectedIndex, 1);
    });

    it('updates selection when setting changes', async () => {
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.dataSaverSettingDescriptor);
      const select = ThrottlingManager.instance({forceNew: true}).createSaveDataOverrideSelector();
      renderElementIntoDOM(select);
      await UI.Widget.Widget.allUpdatesComplete;

      assert.strictEqual(select.value, SDK.EmulationModel.DataSaverOverride.UNSET);

      setting.set(SDK.EmulationModel.DataSaverOverride.DISABLED);
      await UI.Widget.Widget.allUpdatesComplete;
      assert.strictEqual(select.value, SDK.EmulationModel.DataSaverOverride.DISABLED);
      assert.strictEqual(select.selectedIndex, 2);
    });

    it('stops listening to setting changes when removed from DOM', async () => {
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.dataSaverSettingDescriptor);
      const select = ThrottlingManager.instance({forceNew: true}).createSaveDataOverrideSelector();
      renderElementIntoDOM(select);
      await UI.Widget.Widget.allUpdatesComplete;

      const widget = UI.Widget.Widget.get(select);
      assert.isNotNull(widget);
      const requestUpdateSpy = sinon.spy(widget as UI.Widget.Widget, 'requestUpdate');

      select.remove();
      await new Promise(resolve => setTimeout(resolve, 0));

      setting.set(SDK.EmulationModel.DataSaverOverride.ENABLED);
      sinon.assert.notCalled(requestUpdateSpy);
    });
  });
  describe('CPU Performance', () => {
    it('updates the effective CPU performance tier when selecting constant slowdown factors', async () => {
      // Set the host default tier to "Ultra".
      const connection = new MockCDPConnection();
      const tierValue = SDK.CPUThrottlingManager.tierToNumber(CPUPerformanceTier.Ultra);
      connection.setSuccessHandler('Runtime.evaluate', ({expression}) => {
        assert.strictEqual(expression, 'navigator.cpuPerformance');
        return {result: {value: tierValue, type: Protocol.Runtime.RemoteObjectType.Number}};
      });
      createTarget({connection});
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = ThrottlingManager.instance({forceNew: true});
      await SDK.CPUThrottlingManager.CPUThrottlingManager.instance().updateHostDefaultCPUPerformanceTier();
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);

      const selectorWrapper = throttlingManager.createCPUThrottlingSelector();
      const selector = selectorWrapper.control;
      const options = ThrottlingPresets.cpuThrottlingPresets;

      // Select MidTierThrottlingOption (4x slowdown)
      const midIndex = options.indexOf(PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption);
      selector.setSelectedIndex(midIndex);
      selector.element.dispatchEvent(new Event('change'));
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Mid);

      // Select LowTierThrottlingOption (6x slowdown)
      const lowIndex = options.indexOf(PanelsCommon.CPUThrottlingOption.LowTierThrottlingOption);
      selector.setSelectedIndex(lowIndex);
      selector.element.dispatchEvent(new Event('change'));
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);

      // Select ExtraSlowThrottlingOption (20x slowdown)
      const extraSlowIndex = options.indexOf(PanelsCommon.CPUThrottlingOption.ExtraSlowThrottlingOption);
      selector.setSelectedIndex(extraSlowIndex);
      selector.element.dispatchEvent(new Event('change'));
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);

      // Select NoThrottlingOption (1x no throttling)
      const noIndex = options.indexOf(PanelsCommon.CPUThrottlingOption.NoThrottlingOption);
      selector.setSelectedIndex(noIndex);
      selector.element.dispatchEvent(new Event('change'));
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);
    });

    it('updates the effective CPU performance tier when selecting mobile presets', async () => {
      // Set the host default tier to "Ultra".
      const connection = new MockCDPConnection();
      const tierValue = SDK.CPUThrottlingManager.tierToNumber(CPUPerformanceTier.Ultra);
      connection.setSuccessHandler('Runtime.evaluate', ({expression}) => {
        assert.strictEqual(expression, 'navigator.cpuPerformance');
        return {result: {value: tierValue, type: Protocol.Runtime.RemoteObjectType.Number}};
      });
      createTarget({connection});
      SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
      const throttlingManager = ThrottlingManager.instance({forceNew: true});
      await SDK.CPUThrottlingManager.CPUThrottlingManager.instance().updateHostDefaultCPUPerformanceTier();
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);

      // Simulate calibration on an Ultra host (actualScore: 3000).
      // Calibration produces r_mid = 3000 / 1000 = 3.0 and r_low = 3000 / 264 ≈ 11.4.
      // `CPUThrottlingManager.calculatedCPUPerformanceTier` is designed to map these values to
      // `CPUPerformanceTier.Mid` and `CPUPerformanceTier.Low`, respectively.
      const calibratedSetting = Common.Settings.Settings.instance().createSetting(
          'calibrated-cpu-throttling', {}, Common.Settings.SettingStorageType.GLOBAL);
      calibratedSetting.set({
        low: 11.4,
        mid: 3.0,
        actualScore: 3000,
      });

      const selectorWrapper = throttlingManager.createCPUThrottlingSelector();
      const selector = selectorWrapper.control;
      const options = ThrottlingPresets.cpuThrottlingPresets;

      // Select CalibratedMidTierMobileThrottlingOption
      const midIndex = options.indexOf(PanelsCommon.CPUThrottlingOption.CalibratedMidTierMobileThrottlingOption);
      selector.setSelectedIndex(midIndex);
      selector.element.dispatchEvent(new Event('change'));
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Mid);

      // Select CalibratedLowTierMobileThrottlingOption
      const lowIndex = options.indexOf(PanelsCommon.CPUThrottlingOption.CalibratedLowTierMobileThrottlingOption);
      selector.setSelectedIndex(lowIndex);
      selector.element.dispatchEvent(new Event('change'));
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);

      // Select NoThrottlingOption (1x no throttling)
      const noIndex = options.indexOf(PanelsCommon.CPUThrottlingOption.NoThrottlingOption);
      selector.setSelectedIndex(noIndex);
      selector.element.dispatchEvent(new Event('change'));
      assert.strictEqual(throttlingManager.effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);
    });
  });
});
