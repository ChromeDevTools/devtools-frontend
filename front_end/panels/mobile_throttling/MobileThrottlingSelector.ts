// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';

import {throttlingManager} from './ThrottlingManager.js';
import {
  ThrottlingPresets,
  type Conditions,
  type ConditionsList,
  type MobileThrottlingConditionsGroup,
} from './ThrottlingPresets.js';

const UIStrings = {
  /**
   *@description Mobile throttling is disabled. The user can select this option to run mobile
   *emulation at a normal speed instead of throttled.
   */
  disabled: 'Disabled',
  /**
   *@description Title for a group of pre-decided configuration options for mobile throttling. These
   *are useful default options that users might want.
   */
  presets: 'Presets',
  /**
   *@description Title for a group of advanced configuration options for mobile throttling, which
   *might not be applicable to every user or situation.
   */
  advanced: 'Advanced',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/MobileThrottlingSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class MobileThrottlingSelector {
  private readonly populateCallback: (arg0: MobileThrottlingConditionsGroup[]) => ConditionsList;
  private readonly selectCallback: (arg0: number) => void;
  private readonly options: ConditionsList;

  constructor(
      populateCallback: (arg0: MobileThrottlingConditionsGroup[]) => ConditionsList,
      selectCallback: (arg0: number) => void) {
    this.populateCallback = populateCallback;
    this.selectCallback = selectCallback;
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener(
        SDK.CPUThrottlingManager.Events.RATE_CHANGED, this.conditionsChanged, this);
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED, this.conditionsChanged, this);
    this.options = this.populateOptions();
    this.conditionsChanged();
  }

  optionSelected(conditions: Conditions): void {
    SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(conditions.network);
    throttlingManager().setCPUThrottlingOption(conditions.cpuThrottlingOption);
  }

  private populateOptions(): ConditionsList {
    const disabledGroup = {
      title: i18nString(UIStrings.disabled),
      items: [ThrottlingPresets.getNoThrottlingConditions()],
    };
    const presetsGroup = {title: i18nString(UIStrings.presets), items: ThrottlingPresets.getMobilePresets()};
    const advancedGroup = {title: i18nString(UIStrings.advanced), items: ThrottlingPresets.getAdvancedMobilePresets()};
    return this.populateCallback([disabledGroup, presetsGroup, advancedGroup]);
  }

  private conditionsChanged(): void {
    this.populateOptions();

    const networkConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    const cpuThrottlingOption = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingOption();
    for (let index = 0; index < this.options.length; ++index) {
      const option = this.options[index];
      if (option && 'network' in option && option.network === networkConditions &&
          option.cpuThrottlingOption === cpuThrottlingOption) {
        this.selectCallback(index);
        return;
      }
    }

    const customConditions = ThrottlingPresets.getCustomConditions();
    for (let index = 0; index < this.options.length; ++index) {
      const item = this.options[index];
      if (item && item.title === customConditions.title && item.description === customConditions.description) {
        this.selectCallback(index);
        return;
      }
    }
  }
}
