// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

import {Events, throttlingManager} from './ThrottlingManager.js';
import {advancedMobilePresets, Conditions, ConditionsList, CustomConditions, mobilePresets, MobileThrottlingConditionsGroup, NoThrottlingConditions} from './ThrottlingPresets.js';  // eslint-disable-line no-unused-vars

export class MobileThrottlingSelector {
  /**
   * @param {function(!Array<!MobileThrottlingConditionsGroup>):!ConditionsList} populateCallback
   * @param {function(number)} selectCallback
   */
  constructor(populateCallback, selectCallback) {
    this._populateCallback = populateCallback;
    this._selectCallback = selectCallback;
    throttlingManager().addEventListener(Events.RateChanged, this._conditionsChanged, this);
    self.SDK.multitargetNetworkManager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, this._conditionsChanged, this);
    /** @type {!ConditionsList} */
    this._options = this._populateOptions();
    this._conditionsChanged();
  }

  /**
   * @param {!Conditions} conditions
   */
  optionSelected(conditions) {
    self.SDK.multitargetNetworkManager.setNetworkConditions(conditions.network);
    throttlingManager().setCPUThrottlingRate(conditions.cpuThrottlingRate);
  }

  /**
   * @return {!ConditionsList}
   */
  _populateOptions() {
    const disabledGroup = {title: Common.UIString.UIString('Disabled'), items: [NoThrottlingConditions]};
    const presetsGroup = {title: Common.UIString.UIString('Presets'), items: mobilePresets};
    const advancedGroup = {title: Common.UIString.UIString('Advanced'), items: advancedMobilePresets};
    return this._populateCallback([disabledGroup, presetsGroup, advancedGroup]);
  }

  _conditionsChanged() {
    const networkConditions = self.SDK.multitargetNetworkManager.networkConditions();
    const cpuThrottlingRate = throttlingManager().cpuThrottlingRate();
    for (let index = 0; index < this._options.length; ++index) {
      const option = this._options[index];
      if (option && option.network === networkConditions && option.cpuThrottlingRate === cpuThrottlingRate) {
        this._selectCallback(index);
        return;
      }
    }
    this._selectCallback(this._options.indexOf(CustomConditions));
  }
}
