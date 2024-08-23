// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';

import {ThrottlingPresets, type NetworkThrottlingConditionsGroup} from './ThrottlingPresets.js';

const UIStrings = {
  /**
   *@description Text to indicate something is not enabled
   */
  disabled: 'Disabled',
  /**
   *@description Title for a group of configuration options
   */
  presets: 'Presets',
  /**
   *@description Text in Network Throttling Selector of the Network panel
   */
  custom: 'Custom',
};
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/NetworkThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class NetworkThrottlingSelector {
  private populateCallback:
      (arg0: Array<NetworkThrottlingConditionsGroup>) => Array<SDK.NetworkManager.Conditions|null>;
  private readonly selectCallback: (arg0: number) => void;
  private readonly customNetworkConditionsSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions[]>;
  private options!: (SDK.NetworkManager.Conditions|null)[];

  constructor(
      populateCallback: (arg0: Array<NetworkThrottlingConditionsGroup>) => Array<SDK.NetworkManager.Conditions|null>,
      selectCallback: (arg0: number) => void,
      customNetworkConditionsSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions[]>) {
    this.populateCallback = populateCallback;
    this.selectCallback = selectCallback;
    this.customNetworkConditionsSetting = customNetworkConditionsSetting;
    this.customNetworkConditionsSetting.addChangeListener(this.populateOptions, this);
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED, () => {
          this.networkConditionsChanged();
        }, this);
    this.populateOptions();
  }

  revealAndUpdate(): void {
    void Common.Revealer.reveal(this.customNetworkConditionsSetting);
    this.networkConditionsChanged();
  }

  optionSelected(conditions: SDK.NetworkManager.Conditions): void {
    SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(conditions);
  }

  private populateOptions(): void {
    const disabledGroup = {title: i18nString(UIStrings.disabled), items: [SDK.NetworkManager.NoThrottlingConditions]};
    const presetsGroup = {title: i18nString(UIStrings.presets), items: ThrottlingPresets.networkPresets};
    const customGroup = {title: i18nString(UIStrings.custom), items: this.customNetworkConditionsSetting.get()};
    this.options = this.populateCallback([disabledGroup, presetsGroup, customGroup]);
    if (!this.networkConditionsChanged()) {
      for (let i = this.options.length - 1; i >= 0; i--) {
        if (this.options[i]) {
          this.optionSelected(this.options[i] as SDK.NetworkManager.Conditions);
          break;
        }
      }
    }
  }

  /**
   * returns false if selected condition no longer exists
   */
  private networkConditionsChanged(): boolean {
    const value = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    for (let index = 0; index < this.options.length; ++index) {
      const option = this.options[index];
      if (option && SDK.NetworkManager.networkConditionsEqual(value, option)) {
        this.selectCallback(index);
        return true;
      }
    }
    return false;
  }
}
