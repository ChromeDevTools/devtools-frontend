// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

MobileThrottling.MobileThrottlingSelector = class {
  /**
   * @param {function(!Array<!MobileThrottling.MobileThrottlingConditionsGroup>):!MobileThrottling.ConditionsList} populateCallback
   * @param {function(number)} selectCallback
   */
  constructor(populateCallback, selectCallback) {
    this._populateCallback = populateCallback;
    this._selectCallback = selectCallback;
    MobileThrottling.throttlingManager().addEventListener(
        MobileThrottling.ThrottlingManager.Events.RateChanged, this._conditionsChanged, this);
    SDK.multitargetNetworkManager.addEventListener(
        SDK.MultitargetNetworkManager.Events.ConditionsChanged, this._conditionsChanged, this);
    /** @type {!MobileThrottling.ConditionsList} */
    this._options = this._populateOptions();
    this._conditionsChanged();
  }

  /**
   * @param {!MobileThrottling.Conditions} conditions
   */
  optionSelected(conditions) {
    SDK.multitargetNetworkManager.setNetworkConditions(conditions.network);
    MobileThrottling.throttlingManager().setCPUThrottlingRate(conditions.cpuThrottlingRate);
  }

  /**
   * @return {!MobileThrottling.ConditionsList}
   */
  _populateOptions() {
    var disabledGroup = {title: Common.UIString('Disabled'), items: [MobileThrottling.NoThrottlingConditions]};
    var presetsGroup = {title: Common.UIString('Presets'), items: MobileThrottling.mobilePresets};
    var advancedGroup = {title: Common.UIString('Advanced'), items: MobileThrottling.advancedMobilePresets};
    return this._populateCallback([disabledGroup, presetsGroup, advancedGroup]);
  }

  _conditionsChanged() {
    var networkConditions = SDK.multitargetNetworkManager.networkConditions();
    var cpuThrottlingRate = MobileThrottling.throttlingManager().cpuThrottlingRate();
    for (var index = 0; index < this._options.length; ++index) {
      var option = this._options[index];
      if (option && option.network === networkConditions && option.cpuThrottlingRate === cpuThrottlingRate) {
        this._selectCallback(index);
        return;
      }
    }
    this._selectCallback(this._options.indexOf(MobileThrottling.CustomConditions));
  }
};
