// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

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
