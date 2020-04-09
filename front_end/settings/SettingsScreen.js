/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {UI.View.ViewLocationResolver}
 * @unrestricted
 */
export class SettingsScreen extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('settings/settingsScreen.css');

    this.contentElement.classList.add('settings-window-main');
    this.contentElement.classList.add('vbox');

    const settingsLabelElement = createElement('div');
    const settingsTitleElement =
        UI.Utils.createShadowRootWithCoreStyles(settingsLabelElement, 'settings/settingsScreen.css')
            .createChild('div', 'settings-window-title');

    UI.ARIAUtils.markAsHeading(settingsTitleElement, 1);
    settingsTitleElement.textContent = ls`Settings`;

    this._tabbedLocation = UI.ViewManager.ViewManager.instance().createTabbedLocation(
        () => SettingsScreen._revealSettingsScreen(), 'settings-view');
    const tabbedPane = this._tabbedLocation.tabbedPane();
    tabbedPane.leftToolbar().appendToolbarItem(new UI.Toolbar.ToolbarItem(settingsLabelElement));
    tabbedPane.setShrinkableTabs(false);
    tabbedPane.makeVerticalTabLayout();

    if (!Root.Runtime.experiments.isEnabled('customKeyboardShortcuts')) {
      const shortcutsView = new UI.View.SimpleView(ls`Shortcuts`);
      self.UI.shortcutsScreen.createShortcutsTabView().show(shortcutsView.element);
      this._tabbedLocation.appendView(shortcutsView);
    }
    tabbedPane.show(this.contentElement);
    tabbedPane.selectTab('preferences');
    tabbedPane.addEventListener(UI.TabbedPane.Events.TabInvoked, this._tabInvoked, this);
    this._reportTabOnReveal = false;
  }

  /**
   * @return {!SettingsScreen}
   */
  static _revealSettingsScreen() {
    /** @type {!SettingsScreen} */
    const settingsScreen = self.runtime.sharedInstance(SettingsScreen);
    if (settingsScreen.isShowing()) {
      return settingsScreen;
    }

    settingsScreen._reportTabOnReveal = true;
    const dialog = new UI.Dialog.Dialog();
    dialog.contentElement.tabIndex = -1;
    dialog.addCloseButton();
    dialog.setOutsideClickCallback(() => {});
    dialog.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.PierceGlassPane);
    dialog.setOutsideTabIndexBehavior(UI.Dialog.OutsideTabIndexBehavior.PreserveMainViewTabIndex);
    settingsScreen.show(dialog.contentElement);
    dialog.show();

    return settingsScreen;
  }

  /**
   * @param {{name: (string|undefined), focusTabHeader: (boolean|undefined)}=} options
   */
  static async _showSettingsScreen(options = {}) {
    const {name, focusTabHeader} = options;
    const settingsScreen = SettingsScreen._revealSettingsScreen();

    settingsScreen._selectTab(name || 'preferences');
    const tabbedPane = settingsScreen._tabbedLocation.tabbedPane();
    await tabbedPane.waitForTabElementUpdate();
    if (focusTabHeader) {
      tabbedPane.focusSelectedTabHeader();
    } else {
      tabbedPane.focus();
    }
  }

  /**
   * @override
   * @param {string} locationName
   * @return {?UI.View.ViewLocation}
   */
  resolveLocation(locationName) {
    return this._tabbedLocation;
  }

  /**
   * @param {string} name
   */
  _selectTab(name) {
    this._tabbedLocation.tabbedPane().selectTab(name, /* userGesture */ true);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _tabInvoked(event) {
    const eventData = /** @type {!UI.TabbedPane.EventData} */ (event.data);
    if (!eventData.isUserGesture) {
      return;
    }

    const prevTabId = eventData.prevTabId;
    const tabId = eventData.tabId;
    if (!this._reportTabOnReveal && prevTabId && prevTabId === tabId) {
      return;
    }

    this._reportTabOnReveal = false;
    this._reportSettingsPanelShown(tabId);
  }

  /**
   * @param {string} tabId
   */
  _reportSettingsPanelShown(tabId) {
    if (tabId === ls`Shortcuts`) {
      Host.userMetrics.settingsPanelShown('shortcuts');
      return;
    }

    Host.userMetrics.settingsPanelShown(tabId);
  }
}

/**
 * @unrestricted
 */
class SettingsTab extends UI.Widget.VBox {
  /**
   * @param {string} name
   * @param {string=} id
   */
  constructor(name, id) {
    super();
    this.element.classList.add('settings-tab-container');
    if (id) {
      this.element.id = id;
    }
    const header = this.element.createChild('header');
    header.createChild('h1').createTextChild(name);
    this.containerElement = this.element.createChild('div', 'settings-container-wrapper')
                                .createChild('div', 'settings-tab settings-content settings-container');
  }

  /**
   *  @param {string=} name
   *  @return {!Element}
   */
  _appendSection(name) {
    const block = this.containerElement.createChild('div', 'settings-block');
    if (name) {
      UI.ARIAUtils.markAsGroup(block);
      const title = block.createChild('div', 'settings-section-title');
      title.textContent = name;
      UI.ARIAUtils.markAsHeading(title, 2);
      UI.ARIAUtils.setAccessibleName(block, name);
    }
    return block;
  }
}

/**
 * @unrestricted
 */
export class GenericSettingsTab extends SettingsTab {
  constructor() {
    super(Common.UIString.UIString('Preferences'), 'preferences-tab-content');

    /** @const */
    const explicitSectionOrder =
        ['', 'Appearance', 'Sources', 'Elements', 'Network', 'Performance', 'Console', 'Extensions'];
    /** @type {!Map<string, !Element>} */
    this._nameToSection = new Map();
    for (const sectionName of explicitSectionOrder) {
      this._sectionElement(sectionName);
    }
    self.runtime.extensions('setting').forEach(this._addSetting.bind(this));
    self.runtime.extensions(UI.SettingsUI.SettingUI).forEach(this._addSettingUI.bind(this));

    this._appendSection().appendChild(
        UI.UIUtils.createTextButton(Common.UIString.UIString('Restore defaults and reload'), restoreAndReload));

    function restoreAndReload() {
      Common.Settings.Settings.instance().clearAll();
      Components.Reload.reload();
    }
  }

  /**
   * @param {!Root.Runtime.Extension} extension
   * @return {boolean}
   */
  static isSettingVisible(extension) {
    const descriptor = extension.descriptor();
    if (!('title' in descriptor)) {
      return false;
    }
    if (!('category' in descriptor)) {
      return false;
    }
    return true;
  }

  /**
   * @param {!Root.Runtime.Extension} extension
   */
  _addSetting(extension) {
    if (!GenericSettingsTab.isSettingVisible(extension)) {
      return;
    }
    const sectionElement = this._sectionElement(extension.descriptor()['category']);
    const setting = Common.Settings.Settings.instance().moduleSetting(extension.descriptor()['settingName']);
    const settingControl = UI.SettingsUI.createControlForSetting(setting);
    if (settingControl) {
      sectionElement.appendChild(settingControl);
    }
  }

  /**
   * @param {!Root.Runtime.Extension} extension
   */
  _addSettingUI(extension) {
    const descriptor = extension.descriptor();
    const sectionName = descriptor['category'] || '';
    extension.instance().then(appendCustomSetting.bind(this));

    /**
     * @param {!Object} object
     * @this {GenericSettingsTab}
     */
    function appendCustomSetting(object) {
      const settingUI = /** @type {!UI.SettingsUI.SettingUI} */ (object);
      const element = settingUI.settingElement();
      if (element) {
        this._sectionElement(sectionName).appendChild(element);
      }
    }
  }

  /**
   * @param {string} sectionName
   * @return {!Element}
   */
  _sectionElement(sectionName) {
    let sectionElement = this._nameToSection.get(sectionName);
    if (!sectionElement) {
      const uiSectionName = sectionName && Common.UIString.UIString(sectionName);
      sectionElement = this._appendSection(uiSectionName);
      this._nameToSection.set(sectionName, sectionElement);
    }
    return sectionElement;
  }
}

/**
 * @unrestricted
 */
export class ExperimentsSettingsTab extends SettingsTab {
  constructor() {
    super(Common.UIString.UIString('Experiments'), 'experiments-tab-content');

    const experiments = Root.Runtime.experiments.allConfigurableExperiments().sort();
    const unstableExperiments = experiments.filter(e => e.unstable);
    const stableExperiments = experiments.filter(e => !e.unstable);
    if (stableExperiments.length) {
      const experimentsSection = this._appendSection();
      const warningMessage = Common.UIString.UIString('These experiments could be dangerous and may require restart.');
      experimentsSection.appendChild(this._createExperimentsWarningSubsection(warningMessage));
      for (const experiment of stableExperiments) {
        experimentsSection.appendChild(this._createExperimentCheckbox(experiment));
      }
    }
    if (unstableExperiments.length) {
      const experimentsSection = this._appendSection();
      const warningMessage =
          Common.UIString.UIString('These experiments are particularly unstable. Enable at your own risk.');
      experimentsSection.appendChild(this._createExperimentsWarningSubsection(warningMessage));
      for (const experiment of unstableExperiments) {
        experimentsSection.appendChild(this._createExperimentCheckbox(experiment));
      }
    }
  }

  /**
   * @param {string} warningMessage
   * @return {!Element} element
   */
  _createExperimentsWarningSubsection(warningMessage) {
    const subsection = createElement('div');
    const warning = subsection.createChild('span', 'settings-experiments-warning-subsection-warning');
    warning.textContent = Common.UIString.UIString('WARNING:');
    subsection.createTextChild(' ');
    const message = subsection.createChild('span', 'settings-experiments-warning-subsection-message');
    message.textContent = warningMessage;
    return subsection;
  }

  _createExperimentCheckbox(experiment) {
    const label = UI.UIUtils.CheckboxLabel.create(Common.UIString.UIString(experiment.title), experiment.isEnabled());
    const input = label.checkboxElement;
    input.name = experiment.name;
    function listener() {
      experiment.setEnabled(input.checked);
    }
    input.addEventListener('click', listener, false);

    const p = createElement('p');
    p.className = experiment.unstable && !experiment.isEnabled() ? 'settings-experiment-unstable' : '';
    p.appendChild(label);
    return p;
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    let screen;
    switch (actionId) {
      case 'settings.show':
        SettingsScreen._showSettingsScreen({focusTabHeader: true});
        return true;
      case 'settings.documentation':
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
            UI.UIUtils.addReferrerToURL('https://developers.google.com/web/tools/chrome-devtools/'));
        return true;
      case 'settings.shortcuts':
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.SettingsOpenedFromMenu);
        screen = {name: ls`Shortcuts`, focusTabHeader: true};
        if (Root.Runtime.experiments.isEnabled('customKeyboardShortcuts')) {
          screen = {name: 'keybinds', focusTabHeader: true};
        }
        SettingsScreen._showSettingsScreen(screen);
        return true;
    }
    return false;
  }
}

/**
 * @implements {Common.Revealer.Revealer}
 * @unrestricted
 */
export class Revealer {
  /**
   * @override
   * @param {!Object} object
   * @return {!Promise}
   */
  reveal(object) {
    console.assert(object instanceof Common.Settings.Setting);
    const setting = /** @type {!Common.Settings.Setting} */ (object);
    let success = false;

    self.runtime.extensions('setting').forEach(revealModuleSetting);
    self.runtime.extensions(UI.SettingsUI.SettingUI).forEach(revealSettingUI);
    self.runtime.extensions('view').forEach(revealSettingsView);

    return success ? Promise.resolve() : Promise.reject();

    /**
     * @param {!Root.Runtime.Extension} extension
     */
    function revealModuleSetting(extension) {
      if (!GenericSettingsTab.isSettingVisible(extension)) {
        return;
      }
      if (extension.descriptor()['settingName'] === setting.name) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
        SettingsScreen._showSettingsScreen();
        success = true;
      }
    }

    /**
     * @param {!Root.Runtime.Extension} extension
     */
    function revealSettingUI(extension) {
      const settings = extension.descriptor()['settings'];
      if (settings && settings.indexOf(setting.name) !== -1) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
        SettingsScreen._showSettingsScreen();
        success = true;
      }
    }

    /**
     * @param {!Root.Runtime.Extension} extension
     */
    function revealSettingsView(extension) {
      const location = extension.descriptor()['location'];
      if (location !== 'settings-view') {
        return;
      }
      const settings = extension.descriptor()['settings'];
      if (settings && settings.indexOf(setting.name) !== -1) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
        SettingsScreen._showSettingsScreen({name: extension.descriptor()['id']});
        success = true;
      }
    }
  }
}
