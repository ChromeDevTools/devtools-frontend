// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {MobileThrottlingSelector} from './MobileThrottlingSelector.js';
import {NetworkThrottlingSelector} from './NetworkThrottlingSelector.js';
import {Conditions, ConditionsList, cpuThrottlingPresets, CPUThrottlingRates, CustomConditions, MobileThrottlingConditionsGroup, NetworkThrottlingConditionsGroup} from './ThrottlingPresets.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.EmulationModel.EmulationModel>}
 */
export class ThrottlingManager extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    /** @type {!CPUThrottlingRates} */
    this._cpuThrottlingRate = CPUThrottlingRates.NoThrottling;
    /** @type {!Set<!UI.Toolbar.ToolbarComboBox>} */
    this._cpuThrottlingControls = new Set();
    this._cpuThrottlingRates = cpuThrottlingPresets;
    /** @type {!Common.Settings.Setting<!Array<!SDK.NetworkManager.Conditions>>} */
    this._customNetworkConditionsSetting = Common.Settings.Settings.instance().moduleSetting('customNetworkConditions');
    /** @type {!SDK.NetworkManager.Conditions} */
    this._currentNetworkThrottlingConditions = SDK.NetworkManager.NoThrottlingConditions;
    /** @type {!SDK.NetworkManager.Conditions} */
    this._lastNetworkThrottlingConditions;

    self.SDK.multitargetNetworkManager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, () => {
          this._lastNetworkThrottlingConditions = this._currentNetworkThrottlingConditions;
          this._currentNetworkThrottlingConditions = self.SDK.multitargetNetworkManager.networkConditions();
        });

    SDK.SDKModel.TargetManager.instance().observeModels(SDK.EmulationModel.EmulationModel, this);
  }


  /**
   * @param {!HTMLSelectElement} selectElement
   * @return {!NetworkThrottlingSelector}
   */
  decorateSelectWithNetworkThrottling(selectElement) {
    let options = [];
    const selector = new NetworkThrottlingSelector(populate, select, this._customNetworkConditionsSetting);
    selectElement.addEventListener('change', optionSelected, false);
    return selector;

    /**
     * @param {!Array.<!NetworkThrottlingConditionsGroup>} groups
     * @return {!Array<?SDK.NetworkManager.Conditions>}
     */
    function populate(groups) {
      selectElement.removeChildren();
      options = [];
      for (let i = 0; i < groups.length; ++i) {
        const group = groups[i];
        const groupElement = selectElement.createChild('optgroup');
        groupElement.label = group.title;
        for (const conditions of group.items) {
          const title = conditions.title;
          const option = new Option(title, title);
          UI.ARIAUtils.setAccessibleName(option, ls`${group.title}: ${title}`);
          groupElement.appendChild(option);
          options.push(conditions);
        }
        if (i === groups.length - 1) {
          const option = new Option(ls`Add…`, ls`Add…`);
          UI.ARIAUtils.setAccessibleName(option, ls`Add ${group.title}`);
          groupElement.appendChild(option);
          options.push(null);
        }
      }
      return options;
    }

    function optionSelected() {
      if (selectElement.selectedIndex === selectElement.options.length - 1) {
        selector.revealAndUpdate();
      } else {
        selector.optionSelected(options[selectElement.selectedIndex]);
      }
    }

    /**
     * @param {number} index
     */
    function select(index) {
      if (selectElement.selectedIndex !== index) {
        selectElement.selectedIndex = index;
      }
    }
  }

  /**
   * @return {!UI.Toolbar.ToolbarCheckbox}
   */
  createOfflineToolbarCheckbox() {
    const checkbox = new UI.Toolbar.ToolbarCheckbox(
        Common.UIString.UIString('Offline'), Common.UIString.UIString('Force disconnected from network'),
        forceOffline.bind(this));
    self.SDK.multitargetNetworkManager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, networkConditionsChanged);
    checkbox.setChecked(
        self.SDK.multitargetNetworkManager.networkConditions() === SDK.NetworkManager.OfflineConditions);

    /**
     * @this {!ThrottlingManager}
     */
    function forceOffline() {
      if (checkbox.checked()) {
        self.SDK.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.OfflineConditions);
      } else {
        self.SDK.multitargetNetworkManager.setNetworkConditions(this._lastNetworkThrottlingConditions);
      }
    }

    function networkConditionsChanged() {
      checkbox.setChecked(
          self.SDK.multitargetNetworkManager.networkConditions() === SDK.NetworkManager.OfflineConditions);
    }

    return checkbox;
  }


  /**
   * @return {!UI.Toolbar.ToolbarMenuButton}
   */
  createMobileThrottlingButton() {
    const button = new UI.Toolbar.ToolbarMenuButton(appendItems);
    button.setTitle(Common.UIString.UIString('Throttling'));
    button.setGlyph('');
    button.turnIntoSelect();
    button.setDarkText();

    /** @type {!ConditionsList} */
    let options = [];
    let selectedIndex = -1;
    const selector = new MobileThrottlingSelector(populate, select);
    return button;

    /**
     * @param {!UI.ContextMenu.ContextMenu} contextMenu
     */
    function appendItems(contextMenu) {
      for (let index = 0; index < options.length; ++index) {
        const conditions = options[index];
        if (!conditions) {
          continue;
        }
        if (conditions.title === CustomConditions.title && conditions.description === CustomConditions.description) {
          continue;
        }
        contextMenu.defaultSection().appendCheckboxItem(
            Common.UIString.UIString(conditions.title),
            selector.optionSelected.bind(selector, /** @type {!Conditions} */ (conditions)), selectedIndex === index);
      }
    }

    /**
     * @param {!Array.<!MobileThrottlingConditionsGroup>} groups
     * @return {!ConditionsList}
     */
    function populate(groups) {
      options = [];
      for (const group of groups) {
        for (const conditions of group.items) {
          options.push(conditions);
        }
        options.push(null);
      }
      return options;
    }

    /**
     * @param {number} index
     */
    function select(index) {
      selectedIndex = index;
      button.setText(options[index].title);
      button.setTitle(options[index].description);
    }
  }

  /**
   * @return {number}
   */
  cpuThrottlingRate() {
    return this._cpuThrottlingRate;
  }

  /**
   * @param {!CPUThrottlingRates} rate
   */
  setCPUThrottlingRate(rate) {
    this._cpuThrottlingRate = rate;
    for (const emulationModel of SDK.SDKModel.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
      emulationModel.setCPUThrottlingRate(this._cpuThrottlingRate);
    }
    let icon = null;
    if (this._cpuThrottlingRate !== CPUThrottlingRates.NoThrottling) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuThrottlingEnabled);
      icon = UI.Icon.Icon.create('smallicon-warning');
      icon.title = Common.UIString.UIString('CPU throttling is enabled');
    }
    const index = this._cpuThrottlingRates.indexOf(this._cpuThrottlingRate);
    for (const control of this._cpuThrottlingControls) {
      control.setSelectedIndex(index);
    }
    self.UI.inspectorView.setPanelIcon('timeline', icon);
    this.dispatchEventToListeners(Events.RateChanged, this._cpuThrottlingRate);
  }

  /**
   * @override
   * @param {!SDK.EmulationModel.EmulationModel} emulationModel
   */
  modelAdded(emulationModel) {
    if (this._cpuThrottlingRate !== CPUThrottlingRates.NoThrottling) {
      emulationModel.setCPUThrottlingRate(this._cpuThrottlingRate);
    }
  }

  /**
   * @override
   * @param {!SDK.EmulationModel.EmulationModel} emulationModel
   */
  modelRemoved(emulationModel) {
  }

  /**
   * @return {!UI.Toolbar.ToolbarComboBox}
   */
  createCPUThrottlingSelector() {
    const control = new UI.Toolbar.ToolbarComboBox(
        event => this.setCPUThrottlingRate(this._cpuThrottlingRates[event.target.selectedIndex]), ls`CPU throttling`);
    this._cpuThrottlingControls.add(control);
    const currentRate = this._cpuThrottlingRate;

    for (let i = 0; i < this._cpuThrottlingRates.length; ++i) {
      const rate = this._cpuThrottlingRates[i];
      const title =
          rate === 1 ? Common.UIString.UIString('No throttling') : Common.UIString.UIString('%d× slowdown', rate);
      const option = control.createOption(title);
      control.addOption(option);
      if (currentRate === rate) {
        control.setSelectedIndex(i);
      }
    }
    return control;
  }
}

/** @enum {symbol} */
export const Events = {
  RateChanged: Symbol('RateChanged')
};

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    if (actionId === 'network-conditions.network-online') {
      self.SDK.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.NoThrottlingConditions);
      return true;
    }
    if (actionId === 'network-conditions.network-low-end-mobile') {
      self.SDK.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.Slow3GConditions);
      return true;
    }
    if (actionId === 'network-conditions.network-mid-tier-mobile') {
      self.SDK.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.Fast3GConditions);
      return true;
    }
    if (actionId === 'network-conditions.network-offline') {
      self.SDK.multitargetNetworkManager.setNetworkConditions(SDK.NetworkManager.OfflineConditions);
      return true;
    }
    return false;
  }
}

/**
 * @return {!ThrottlingManager}
 */
export function throttlingManager() {
  return self.singleton(ThrottlingManager);
}
