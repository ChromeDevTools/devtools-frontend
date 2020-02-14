// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

import {networkPresets, NetworkThrottlingConditionsGroup} from './ThrottlingPresets.js';  // eslint-disable-line no-unused-vars

export class NetworkThrottlingSelector {
  /**
   * @param {function(!Array<!NetworkThrottlingConditionsGroup>):!Array<?SDK.NetworkManager.Conditions>} populateCallback
   * @param {function(number)} selectCallback
   * @param {!Common.Settings.Setting<!Array<!SDK.NetworkManager.Conditions>>} customNetworkConditionsSetting
   */
  constructor(populateCallback, selectCallback, customNetworkConditionsSetting) {
    this._populateCallback = populateCallback;
    this._selectCallback = selectCallback;
    this._customNetworkConditionsSetting = customNetworkConditionsSetting;
    this._customNetworkConditionsSetting.addChangeListener(this._populateOptions, this);
    self.SDK.multitargetNetworkManager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, this._networkConditionsChanged, this);
    /** @type {!Array<?SDK.NetworkManager.Conditions>} */
    this._options;
    this._populateOptions();
  }

  revealAndUpdate() {
    Common.Revealer.reveal(this._customNetworkConditionsSetting);
    this._networkConditionsChanged();
  }

  /**
   * @param {!SDK.NetworkManager.Conditions} conditions
   */
  optionSelected(conditions) {
    self.SDK.multitargetNetworkManager.setNetworkConditions(conditions);
  }

  _populateOptions() {
    const disabledGroup = {
      title: Common.UIString.UIString('Disabled'),
      items: [SDK.NetworkManager.NoThrottlingConditions]
    };
    const presetsGroup = {title: Common.UIString.UIString('Presets'), items: networkPresets};
    const customGroup = {title: Common.UIString.UIString('Custom'), items: this._customNetworkConditionsSetting.get()};
    this._options = this._populateCallback([disabledGroup, presetsGroup, customGroup]);
    if (!this._networkConditionsChanged()) {
      for (let i = this._options.length - 1; i >= 0; i--) {
        if (this._options[i]) {
          this.optionSelected(/** @type {!SDK.NetworkManager.Conditions} */ (this._options[i]));
          break;
        }
      }
    }
  }

  /**
   * @return {boolean} returns false if selected condition no longer exists
   */
  _networkConditionsChanged() {
    const value = self.SDK.multitargetNetworkManager.networkConditions();
    for (let index = 0; index < this._options.length; ++index) {
      const option = this._options[index];
      if (option && option.download === value.download && option.upload === value.upload &&
          option.latency === value.latency && option.title === value.title) {
        this._selectCallback(index);
        return true;
      }
    }
    return false;
  }
}
