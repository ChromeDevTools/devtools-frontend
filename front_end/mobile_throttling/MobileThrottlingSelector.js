// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';

import {Events, throttlingManager} from './ThrottlingManager.js';
import {Conditions, ConditionsList, MobileThrottlingConditionsGroup, ThrottlingPresets} from './ThrottlingPresets.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Text to indicate something is not enabled
  */
  disabled: 'Disabled',
  /**
  *@description Title for a group of configuration options
  */
  presets: 'Presets',
  /**
  *@description Text in Mobile Throttling Selector of the Network panel
  */
  advanced: 'Advanced',
};
const str_ = i18n.i18n.registerUIStrings('mobile_throttling/MobileThrottlingSelector.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class MobileThrottlingSelector {
  /**
   * @param {function(!Array<!MobileThrottlingConditionsGroup>):!ConditionsList} populateCallback
   * @param {function(number):void} selectCallback
   */
  constructor(populateCallback, selectCallback) {
    this._populateCallback = populateCallback;
    this._selectCallback = selectCallback;
    throttlingManager().addEventListener(Events.RateChanged, this._conditionsChanged, this);
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, this._conditionsChanged, this);
    /** @type {!ConditionsList} */
    this._options = this._populateOptions();
    this._conditionsChanged();
  }

  /**
   * @param {!Conditions} conditions
   */
  optionSelected(conditions) {
    SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(conditions.network);
    throttlingManager().setCPUThrottlingRate(conditions.cpuThrottlingRate);
  }

  /**
   * @return {!ConditionsList}
   */
  _populateOptions() {
    const disabledGroup = {
      title: i18nString(UIStrings.disabled),
      items: [ThrottlingPresets.getNoThrottlingConditions()]
    };
    const presetsGroup = {title: i18nString(UIStrings.presets), items: ThrottlingPresets.getMobilePresets()};
    const advancedGroup = {title: i18nString(UIStrings.advanced), items: ThrottlingPresets.getAdvancedMobilePresets()};
    return this._populateCallback([disabledGroup, presetsGroup, advancedGroup]);
  }

  _conditionsChanged() {
    const networkConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    const cpuThrottlingRate = throttlingManager().cpuThrottlingRate();
    for (let index = 0; index < this._options.length; ++index) {
      const option = this._options[index];
      if (option && 'network' in option && option.network === networkConditions &&
          option.cpuThrottlingRate === cpuThrottlingRate) {
        this._selectCallback(index);
        return;
      }
    }

    const customConditions = ThrottlingPresets.getCustomConditions();
    for (let index = 0; index < this._options.length; ++index) {
      const item = this._options[index];
      if (item && item.title === customConditions.title && item.description === customConditions.description) {
        this._selectCallback(index);
        return;
      }
    }
  }
}
