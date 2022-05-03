// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {MobileThrottlingSelector} from './MobileThrottlingSelector.js';
import {NetworkThrottlingSelector} from './NetworkThrottlingSelector.js';

import type {
  Conditions, ConditionsList, MobileThrottlingConditionsGroup, NetworkThrottlingConditionsGroup} from
  './ThrottlingPresets.js';
import {ThrottlingPresets} from './ThrottlingPresets.js';

const UIStrings = {
  /**
  *@description Text with two placeholders separated by a colon
  *@example {Node removed} PH1
  *@example {div#id1} PH2
  */
  sS: '{PH1}: {PH2}',
  /**
  *@description Text in Throttling Manager of the Network panel
  */
  add: 'Add…',
  /**
  *@description Accessibility label for custom add network throttling option
  *@example {Custom} PH1
  */
  addS: 'Add {PH1}',
  /**
  *@description Text to indicate the network connectivity is offline
  */
  offline: 'Offline',
  /**
  *@description Text in Throttling Manager of the Network panel
  */
  forceDisconnectedFromNetwork: 'Force disconnected from network',
  /**
  *@description Text for throttling the network
  */
  throttling: 'Throttling',
  /**
  *@description Icon title in Throttling Manager of the Network panel
  */
  cpuThrottlingIsEnabled: 'CPU throttling is enabled',
  /**
  *@description Screen reader label for a select box that chooses the CPU throttling speed in the Performance panel
  */
  cpuThrottling: 'CPU throttling',
  /**
  *@description Text for no network throttling
  */
  noThrottling: 'No throttling',
  /**
  *@description Text in Throttling Manager of the Network panel
  *@example {2} PH1
  */
  dSlowdown: '{PH1}× slowdown',
};
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/ThrottlingManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let throttlingManagerInstance: ThrottlingManager;

export class ThrottlingManager {
  private readonly cpuThrottlingControls: Set<UI.Toolbar.ToolbarComboBox>;
  private readonly cpuThrottlingRates: number[];
  private readonly customNetworkConditionsSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions[]>;
  private readonly currentNetworkThrottlingConditionsSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions>;
  private lastNetworkThrottlingConditions!: SDK.NetworkManager.Conditions;
  private readonly cpuThrottlingManager: SDK.CPUThrottlingManager.CPUThrottlingManager;

  private constructor() {
    this.cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
    this.cpuThrottlingControls = new Set();
    this.cpuThrottlingRates = ThrottlingPresets.cpuThrottlingPresets;
    this.customNetworkConditionsSetting = Common.Settings.Settings.instance().moduleSetting('customNetworkConditions');
    this.currentNetworkThrottlingConditionsSetting = Common.Settings.Settings.instance().createSetting(
        'preferredNetworkCondition', SDK.NetworkManager.NoThrottlingConditions);

    this.currentNetworkThrottlingConditionsSetting.setSerializer(new SDK.NetworkManager.ConditionsSerializer());

    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, () => {
          this.lastNetworkThrottlingConditions = this.currentNetworkThrottlingConditionsSetting.get();
          this.currentNetworkThrottlingConditionsSetting.set(
              SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions());
        });

    if (this.isDirty()) {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          this.currentNetworkThrottlingConditionsSetting.get());
    }
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ThrottlingManager {
    const {forceNew} = opts;
    if (!throttlingManagerInstance || forceNew) {
      throttlingManagerInstance = new ThrottlingManager();
    }

    return throttlingManagerInstance;
  }

  decorateSelectWithNetworkThrottling(selectElement: HTMLSelectElement): NetworkThrottlingSelector {
    let options: (SDK.NetworkManager.Conditions|null)[] = [];
    const selector = new NetworkThrottlingSelector(populate, select, this.customNetworkConditionsSetting);
    selectElement.addEventListener('change', optionSelected, false);
    return selector;

    function populate(groups: NetworkThrottlingConditionsGroup[]): (SDK.NetworkManager.Conditions|null)[] {
      selectElement.removeChildren();
      options = [];
      for (let i = 0; i < groups.length; ++i) {
        const group = groups[i];
        const groupElement = selectElement.createChild('optgroup') as HTMLOptGroupElement;
        groupElement.label = group.title;
        for (const conditions of group.items) {
          // The title is usually an i18nLazyString except for custom values that are stored in the local storage in the form of a string.
          const title = typeof conditions.title === 'function' ? conditions.title() : conditions.title;
          const option = new Option(title, title);
          UI.ARIAUtils.setAccessibleName(option, i18nString(UIStrings.sS, {PH1: group.title, PH2: title}));
          groupElement.appendChild(option);
          options.push(conditions);
        }
        if (i === groups.length - 1) {
          const option = new Option(i18nString(UIStrings.add), i18nString(UIStrings.add));
          UI.ARIAUtils.setAccessibleName(option, i18nString(UIStrings.addS, {PH1: group.title}));
          groupElement.appendChild(option);
          options.push(null);
        }
      }
      return options;
    }

    function optionSelected(): void {
      if (selectElement.selectedIndex === selectElement.options.length - 1) {
        selector.revealAndUpdate();
      } else {
        const option = options[selectElement.selectedIndex];
        if (option) {
          selector.optionSelected(option);
        }
      }
    }

    function select(index: number): void {
      if (selectElement.selectedIndex !== index) {
        selectElement.selectedIndex = index;
      }
    }
  }

  createOfflineToolbarCheckbox(): UI.Toolbar.ToolbarCheckbox {
    const checkbox = new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.offline), i18nString(UIStrings.forceDisconnectedFromNetwork), forceOffline.bind(this));
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, networkConditionsChanged);
    checkbox.setChecked(
        SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions() ===
        SDK.NetworkManager.OfflineConditions);

    function forceOffline(this: ThrottlingManager): void {
      if (checkbox.checked()) {
        SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
            SDK.NetworkManager.OfflineConditions);
      } else {
        SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
            this.lastNetworkThrottlingConditions);
      }
    }

    function networkConditionsChanged(): void {
      checkbox.setChecked(
          SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions() ===
          SDK.NetworkManager.OfflineConditions);
    }

    return checkbox;
  }

  createMobileThrottlingButton(): UI.Toolbar.ToolbarMenuButton {
    const button = new UI.Toolbar.ToolbarMenuButton(appendItems);
    button.setTitle(i18nString(UIStrings.throttling));
    button.setGlyph('');
    button.turnIntoSelect();
    button.setDarkText();

    let options: ConditionsList = [];
    let selectedIndex = -1;
    const selector = new MobileThrottlingSelector(populate, select);
    return button;

    function appendItems(contextMenu: UI.ContextMenu.ContextMenu): void {
      for (let index = 0; index < options.length; ++index) {
        const conditions = options[index];
        if (!conditions) {
          continue;
        }
        if (conditions.title === ThrottlingPresets.getCustomConditions().title &&
            conditions.description === ThrottlingPresets.getCustomConditions().description) {
          continue;
        }
        contextMenu.defaultSection().appendCheckboxItem(
            conditions.title, selector.optionSelected.bind(selector, conditions as Conditions),
            selectedIndex === index);
      }
    }

    function populate(groups: MobileThrottlingConditionsGroup[]): ConditionsList {
      options = [];
      for (const group of groups) {
        for (const conditions of group.items) {
          options.push(conditions);
        }
        options.push(null);
      }
      return options;
    }

    function select(index: number): void {
      selectedIndex = index;
      const option = options[index];
      if (option) {
        button.setText(option.title);
        button.setTitle(option.description);
      }
    }
  }

  setCPUThrottlingRate(rate: number): void {
    this.cpuThrottlingManager.setCPUThrottlingRate(rate);
    let icon: UI.Icon.Icon|null = null;
    if (rate !== SDK.CPUThrottlingManager.CPUThrottlingRates.NoThrottling) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuThrottlingEnabled);
      icon = UI.Icon.Icon.create('smallicon-warning');
      UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.cpuThrottlingIsEnabled));
    }
    const index = this.cpuThrottlingRates.indexOf(rate);
    for (const control of this.cpuThrottlingControls) {
      control.setSelectedIndex(index);
    }
    UI.InspectorView.InspectorView.instance().setPanelIcon('timeline', icon);
  }

  createCPUThrottlingSelector(): UI.Toolbar.ToolbarComboBox {
    const control = new UI.Toolbar.ToolbarComboBox(
        event => this.setCPUThrottlingRate(this.cpuThrottlingRates[(event.target as HTMLSelectElement).selectedIndex]),
        i18nString(UIStrings.cpuThrottling));
    this.cpuThrottlingControls.add(control);
    const currentRate = this.cpuThrottlingManager.cpuThrottlingRate();

    for (let i = 0; i < this.cpuThrottlingRates.length; ++i) {
      const rate = this.cpuThrottlingRates[i];
      const title = rate === 1 ? i18nString(UIStrings.noThrottling) : i18nString(UIStrings.dSlowdown, {PH1: rate});
      const option = control.createOption(title);
      control.addOption(option);
      if (currentRate === rate) {
        control.setSelectedIndex(i);
      }
    }
    return control;
  }

  private isDirty(): boolean {
    const networkConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    const knownCurrentConditions = this.currentNetworkThrottlingConditionsSetting.get();
    return !SDK.NetworkManager.networkConditionsEqual(networkConditions, knownCurrentConditions);
  }
}

let actionDelegateInstance: ActionDelegate;
export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }
    return actionDelegateInstance;
  }

  handleAction(context: UI.Context.Context, actionId: string): boolean {
    if (actionId === 'network-conditions.network-online') {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.NoThrottlingConditions);
      return true;
    }
    if (actionId === 'network-conditions.network-low-end-mobile') {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK.NetworkManager.Slow3GConditions);
      return true;
    }
    if (actionId === 'network-conditions.network-mid-tier-mobile') {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(SDK.NetworkManager.Fast3GConditions);
      return true;
    }
    if (actionId === 'network-conditions.network-offline') {
      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          SDK.NetworkManager.OfflineConditions);
      return true;
    }
    return false;
  }
}

export function throttlingManager(): ThrottlingManager {
  return ThrottlingManager.instance();
}
