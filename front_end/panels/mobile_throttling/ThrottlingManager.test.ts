// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {dispatchClickEvent} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as MobileThrottling from './mobile_throttling.js';

describeWithEnvironment('ThrottlingManager', () => {
  describe('OfflineToolbarCheckbox', () => {
    it('has initial checked state which depends on throttling setting', () => {
      const throttlingManager = MobileThrottling.ThrottlingManager.throttlingManager();

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.OfflineConditions);
      let checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isTrue(checkbox.checked());

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK.NetworkManager.Slow4GConditions);
      checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isFalse(checkbox.checked());
    });

    it('listens to changes in throttling setting', () => {
      const throttlingManager = MobileThrottling.ThrottlingManager.throttlingManager();
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
      const throttlingManager = MobileThrottling.ThrottlingManager.throttlingManager();
      const multiTargetNetworkManager = SDK.NetworkManager.MultitargetNetworkManager.instance();

      multiTargetNetworkManager.setNetworkConditions(SDK.NetworkManager.OfflineConditions);
      const checkbox = throttlingManager.createOfflineToolbarCheckbox();
      assert.isTrue(checkbox.checked());

      dispatchClickEvent(checkbox.inputElement);
      assert.isFalse(checkbox.checked());
      assert.strictEqual(SDK.NetworkManager.NoThrottlingConditions, multiTargetNetworkManager.networkConditions());

      multiTargetNetworkManager.setNetworkConditions(SDK.NetworkManager.Slow3GConditions);
      assert.isFalse(checkbox.checked());

      dispatchClickEvent(checkbox.inputElement);
      assert.isTrue(checkbox.checked());
      assert.strictEqual(SDK.NetworkManager.OfflineConditions, multiTargetNetworkManager.networkConditions());

      dispatchClickEvent(checkbox.inputElement);
      assert.isFalse(checkbox.checked());
      assert.strictEqual(SDK.NetworkManager.Slow3GConditions, multiTargetNetworkManager.networkConditions());
    });
  });
  describe('CPU throttling', () => {
    it('listens to changes in cpu throttling setting', () => {
      const cpuThrottlingPresets = MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets;
      const throttlingManager = MobileThrottling.ThrottlingManager.throttlingManager();
      const selector = throttlingManager.createCPUThrottlingSelector();
      assert.strictEqual(
          cpuThrottlingPresets[selector.selectedIndex()], SDK.CPUThrottlingManager.CPUThrottlingRates.NO_THROTTLING);

      SDK.CPUThrottlingManager.CPUThrottlingManager.instance().setCPUThrottlingRate(
          SDK.CPUThrottlingManager.CPUThrottlingRates.EXTRA_SLOW);
      assert.strictEqual(
          cpuThrottlingPresets[selector.selectedIndex()], SDK.CPUThrottlingManager.CPUThrottlingRates.EXTRA_SLOW);

      SDK.CPUThrottlingManager.CPUThrottlingManager.instance().setCPUThrottlingRate(
          SDK.CPUThrottlingManager.CPUThrottlingRates.NO_THROTTLING);
      assert.strictEqual(
          cpuThrottlingPresets[selector.selectedIndex()], SDK.CPUThrottlingManager.CPUThrottlingRates.NO_THROTTLING);
    });
  });
});
