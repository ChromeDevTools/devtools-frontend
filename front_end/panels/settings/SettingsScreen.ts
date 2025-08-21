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
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

/* eslint-disable rulesdir/no-imperative-dom-api */

import '../../ui/components/cards/cards.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as Cards from '../../ui/components/cards/cards.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import {PanelUtils} from '../utils/utils.js';

import * as PanelComponents from './components/components.js';
import type {KeybindsSettingsTab} from './KeybindsSettingsTab.js';
import settingsScreenStyles from './settingsScreen.css.js';

const UIStrings = {

  /**
   * @description Card header in Experiments settings tab that list all available unstable experiments that can be turned on or off.
   */
  unstableExperiments: 'Unstable experiments',
  /**
   * @description Name of the Settings view
   */
  settings: 'Settings',
  /**
   * @description Text for keyboard shortcuts
   */
  shortcuts: 'Shortcuts',
  /**
   * @description Text of button in Settings Screen of the Settings
   */
  restoreDefaultsAndReload: 'Restore defaults and reload',
  /**
   * @description Card header in Experiments settings tab that list all available stable experiments that can be turned on or off.
   */
  experiments: 'Experiments',
  /**
   * @description Message shown in the experiments panel to warn users about any possible unstable features.
   */
  theseExperimentsCouldBeUnstable: 'Warning: These experiments could be unstable or unreliable.',
  /**
   * @description Message text content in Settings Screen of the Settings
   */
  theseExperimentsAreParticularly: 'Warning: These experiments are particularly unstable. Enable at your own risk.',
  /**
   * @description Message to display if a setting change requires a reload of DevTools
   */
  oneOrMoreSettingsHaveChanged: 'One or more settings have changed which requires a reload to take effect',
  /**
   * @description Warning text shown when the user has entered text to filter the
   * list of experiments, but no experiments match the filter.
   */
  noResults: 'No experiments match the filter',
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
  /**
   * @description Text that is usually a hyperlink to a feedback form
   */
  sendFeedback: 'Send feedback',
  /**
   * @description Placeholder text in search bar
   */
  searchExperiments: 'Search experiments',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/SettingsScreen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let settingsScreenInstance: SettingsScreen;

function createSettingsCard(heading: Common.UIString.LocalizedString, ...content: HTMLElement[]): Cards.Card.Card {
  const card = document.createElement('devtools-card');
  card.heading = heading;
  card.append(...content);
  return card;
}

export class SettingsScreen extends UI.Widget.VBox implements UI.View.ViewLocationResolver {
  private readonly tabbedLocation: UI.View.TabbedViewLocation;
  private keybindsTab?: KeybindsSettingsTab;
  private reportTabOnReveal: boolean;

  private constructor() {
    super({useShadowDom: true});
    this.registerRequiredCSS(settingsScreenStyles);

    this.contentElement.classList.add('settings-window-main');
    this.contentElement.classList.add('vbox');

    const settingsLabelElement = document.createElement('div');
    settingsLabelElement.classList.add('settings-window-label-element');
    const settingsTitleElement =
        UI.UIUtils.createShadowRootWithCoreStyles(settingsLabelElement, {cssFile: settingsScreenStyles})
            .createChild('div', 'settings-window-title');

    UI.ARIAUtils.markAsHeading(settingsTitleElement, 1);
    settingsTitleElement.textContent = i18nString(UIStrings.settings);

    this.tabbedLocation = UI.ViewManager.ViewManager.instance().createTabbedLocation(
        () => SettingsScreen.revealSettingsScreen(), 'settings-view');
    const tabbedPane = this.tabbedLocation.tabbedPane();
    tabbedPane.registerRequiredCSS(settingsScreenStyles);
    tabbedPane.headerElement().prepend(settingsLabelElement);
    tabbedPane.setShrinkableTabs(false);
    tabbedPane.makeVerticalTabLayout();
    const keyBindsView = UI.ViewManager.ViewManager.instance().view('keybinds');
    if (keyBindsView) {
      void keyBindsView.widget().then(widget => {
        this.keybindsTab = widget as KeybindsSettingsTab;
      });
    }
    tabbedPane.show(this.contentElement);
    tabbedPane.selectTab('preferences');
    tabbedPane.addEventListener(UI.TabbedPane.Events.TabInvoked, this.tabInvoked, this);
    this.reportTabOnReveal = false;
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): SettingsScreen {
    const {forceNew} = opts;
    if (!settingsScreenInstance || forceNew) {
      settingsScreenInstance = new SettingsScreen();
    }

    return settingsScreenInstance;
  }

  private static revealSettingsScreen(): SettingsScreen {
    const settingsScreen = SettingsScreen.instance();
    if (settingsScreen.isShowing()) {
      return settingsScreen;
    }

    settingsScreen.reportTabOnReveal = true;
    const dialog = new UI.Dialog.Dialog('settings');
    dialog.contentElement.removeAttribute('aria-modal');
    dialog.contentElement.tabIndex = -1;
    dialog.addCloseButton();
    dialog.setOutsideClickCallback(() => {});
    dialog.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.PIERCE_GLASS_PANE);
    dialog.setOutsideTabIndexBehavior(UI.Dialog.OutsideTabIndexBehavior.PRESERVE_MAIN_VIEW_TAB_INDEX);
    settingsScreen.show(dialog.contentElement);
    dialog.setEscapeKeyCallback(settingsScreen.onEscapeKeyPressed.bind(settingsScreen));
    dialog.setMarginBehavior(UI.GlassPane.MarginBehavior.NO_MARGIN);
    dialog.show();
    dialog.contentElement.focus();

    return settingsScreen;
  }

  static async showSettingsScreen(
      options: ShowSettingsScreenOptions|undefined = {name: undefined, focusTabHeader: undefined}): Promise<void> {
    const {name, focusTabHeader} = options;
    const settingsScreen = SettingsScreen.revealSettingsScreen();

    settingsScreen.selectTab(name || 'preferences');
    const tabbedPane = settingsScreen.tabbedLocation.tabbedPane();
    await tabbedPane.waitForTabElementUpdate();
    if (focusTabHeader) {
      tabbedPane.focusSelectedTabHeader();
    } else {
      tabbedPane.focus();
    }
  }

  resolveLocation(_locationName: string): UI.View.ViewLocation|null {
    return this.tabbedLocation;
  }

  private selectTab(name: string): void {
    this.tabbedLocation.tabbedPane().selectTab(name, /* userGesture */ true);
  }

  private tabInvoked(event: Common.EventTarget.EventTargetEvent<UI.TabbedPane.EventData>): void {
    const eventData = event.data;
    if (!eventData.isUserGesture) {
      return;
    }

    const prevTabId = eventData.prevTabId;
    const tabId = eventData.tabId;
    if (!this.reportTabOnReveal && prevTabId && prevTabId === tabId) {
      return;
    }

    this.reportTabOnReveal = false;
    this.reportSettingsPanelShown(tabId);
  }

  private reportSettingsPanelShown(tabId: string): void {
    if (tabId === i18nString(UIStrings.shortcuts)) {
      Host.userMetrics.settingsPanelShown('shortcuts');
      return;
    }

    Host.userMetrics.settingsPanelShown(tabId);
  }

  private onEscapeKeyPressed(event: Event): void {
    if (this.tabbedLocation.tabbedPane().selectedTabId === 'keybinds' && this.keybindsTab) {
      this.keybindsTab.onEscapeKeyPressed(event);
    }
  }
}

interface SettingsTab {
  highlightObject(object: Object): void;
}

export class GenericSettingsTab extends UI.Widget.VBox implements SettingsTab {
  private readonly syncSection = new PanelComponents.SyncSection.SyncSection();
  private readonly settingToControl = new Map<Common.Settings.Setting<unknown>, HTMLElement>();
  private readonly containerElement: HTMLElement;
  #updateSyncSectionTimerId = -1;

  constructor() {
    super({jslog: `${VisualLogging.pane('preferences')}`});
    this.element.classList.add('settings-tab-container');
    this.element.id = 'preferences-tab-content';
    this.containerElement =
        this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');

    this.containerElement.classList.add('settings-multicolumn-card-container');

    // AI, GRID, MOBILE, EMULATION, and RENDERING are intentionally excluded from this list.
    // AI settings are displayed in their own tab.
    const explicitSectionOrder: Common.Settings.SettingCategory[] = [
      Common.Settings.SettingCategory.NONE,
      Common.Settings.SettingCategory.APPEARANCE,
      Common.Settings.SettingCategory.SOURCES,
      Common.Settings.SettingCategory.ELEMENTS,
      Common.Settings.SettingCategory.NETWORK,
      Common.Settings.SettingCategory.PERFORMANCE,
      Common.Settings.SettingCategory.MEMORY,
      Common.Settings.SettingCategory.CONSOLE,
      Common.Settings.SettingCategory.EXTENSIONS,
      Common.Settings.SettingCategory.PERSISTENCE,
      Common.Settings.SettingCategory.DEBUGGER,
      Common.Settings.SettingCategory.GLOBAL,
      Common.Settings.SettingCategory.ACCOUNT,
    ];

    // Some settings define their initial ordering.
    const preRegisteredSettings = Common.Settings.Settings.instance().getRegisteredSettings().sort(
        (firstSetting, secondSetting) => {
          if (firstSetting.order && secondSetting.order) {
            return (firstSetting.order - secondSetting.order);
          }
          if (firstSetting.order) {
            return -1;
          }
          if (secondSetting.order) {
            return 1;
          }
          return 0;
        },
    );

    for (const sectionCategory of explicitSectionOrder) {
      const settingsForSection = preRegisteredSettings.filter(
          setting => setting.category === sectionCategory && GenericSettingsTab.isSettingVisible(setting));
      this.createSectionElement(sectionCategory, settingsForSection);
    }

    const restoreAndReloadButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.restoreDefaultsAndReload), restoreAndReload,
        {jslogContext: 'settings.restore-defaults-and-reload'});
    this.containerElement.appendChild(restoreAndReloadButton);

    function restoreAndReload(): void {
      Common.Settings.Settings.instance().clearAll();
      Components.Reload.reload();
    }
  }

  static isSettingVisible(setting: Common.Settings.SettingRegistration): boolean {
    return Boolean(setting.title?.()) && Boolean(setting.category);
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(GenericSettingsTab, this);
    super.wasShown();
    this.updateSyncSection();
  }

  override willHide(): void {
    if (this.#updateSyncSectionTimerId > 0) {
      window.clearTimeout(this.#updateSyncSectionTimerId);
      this.#updateSyncSectionTimerId = -1;
    }
    super.willHide();
    UI.Context.Context.instance().setFlavor(GenericSettingsTab, null);
  }

  private updateSyncSection(): void {
    if (this.#updateSyncSectionTimerId > 0) {
      window.clearTimeout(this.#updateSyncSectionTimerId);
      this.#updateSyncSectionTimerId = -1;
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(syncInfo => {
      this.syncSection.data = {
        syncInfo,
        syncSetting: Common.Settings.moduleSetting('sync-preferences') as Common.Settings.Setting<boolean>,
      };
      if (!syncInfo.isSyncActive || !syncInfo.arePreferencesSynced) {
        this.#updateSyncSectionTimerId = window.setTimeout(this.updateSyncSection.bind(this), 500);
      }
    });
  }

  private createExtensionSection(settings: Common.Settings.SettingRegistration[]): void {
    const sectionName = Common.Settings.SettingCategory.EXTENSIONS;
    const settingUI = Components.Linkifier.LinkHandlerSettingUI.instance() as UI.SettingsUI.SettingUI;
    const element = settingUI.settingElement();
    if (element) {
      this.createStandardSectionElement(sectionName, settings, element);
    }
  }

  private createSectionElement(
      category: Common.Settings.SettingCategory, settings: Common.Settings.SettingRegistration[]): void {
    // Always create the EXTENSIONS section and append the link handling control.
    if (category === Common.Settings.SettingCategory.EXTENSIONS) {
      this.createExtensionSection(settings);
    } else if (category === Common.Settings.SettingCategory.ACCOUNT && settings.length > 0) {
      const syncCard = createSettingsCard(
          Common.SettingRegistration.getLocalizedSettingsCategory(Common.SettingRegistration.SettingCategory.ACCOUNT),
          this.syncSection);
      this.containerElement.appendChild(syncCard);
    } else if (settings.length > 0) {
      this.createStandardSectionElement(category, settings);
    }
  }

  private createStandardSectionElement(
      category: Common.Settings.SettingCategory, settings: Common.Settings.SettingRegistration[],
      content?: Element): void {
    const uiSectionName = Common.Settings.getLocalizedSettingsCategory(category);
    const sectionElement = document.createElement('div');
    for (const settingRegistration of settings) {
      const setting = Common.Settings.Settings.instance().moduleSetting(settingRegistration.settingName);
      const settingControl = UI.SettingsUI.createControlForSetting(setting);
      if (settingControl) {
        this.settingToControl.set(setting, settingControl);
        sectionElement.appendChild(settingControl);
      }
    }
    if (content) {
      sectionElement.appendChild(content);
    }
    const card = createSettingsCard(uiSectionName, sectionElement);
    this.containerElement.appendChild(card);
  }

  highlightObject(setting: Object): void {
    if (setting instanceof Common.Settings.Setting) {
      const element = this.settingToControl.get(setting);
      if (element) {
        PanelUtils.highlightElement(element);
      }
    }
  }
}

export class ExperimentsSettingsTab extends UI.Widget.VBox implements SettingsTab {
  #experimentsSection: Cards.Card.Card|undefined;
  #unstableExperimentsSection: Cards.Card.Card|undefined;
  private readonly experimentToControl = new Map<Root.Runtime.Experiment, HTMLElement>();
  private readonly containerElement: HTMLElement;

  constructor() {
    super({jslog: `${VisualLogging.pane('experiments')}`});
    this.element.classList.add('settings-tab-container');
    this.element.id = 'experiments-tab-content';
    this.containerElement =
        this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
    this.containerElement.classList.add('settings-card-container');

    const filterSection = this.containerElement.createChild('div');
    filterSection.classList.add('experiments-filter');
    render(
        html`
        <devtools-toolbar>
          <devtools-toolbar-input type="filter" placeholder=${
            i18nString(UIStrings.searchExperiments)} style="flex-grow:1" @change=${
            this.#onFilterChanged.bind(this)}></devtools-toolbar-input>
        </devtools-toolbar>
    `,
        filterSection);
    this.renderExperiments('');
    const filter = filterSection.querySelector('devtools-toolbar-input') as HTMLElement;
    this.setDefaultFocusedElement(filter);
  }

  #onFilterChanged(e: CustomEvent<string>): void {
    this.renderExperiments(e.detail.toLowerCase());
  }

  private renderExperiments(filterText: string): void {
    this.experimentToControl.clear();
    if (this.#experimentsSection) {
      this.#experimentsSection.remove();
    }
    if (this.#unstableExperimentsSection) {
      this.#unstableExperimentsSection.remove();
    }
    const experiments = Root.Runtime.experiments.allConfigurableExperiments().sort();
    const unstableExperiments = experiments.filter(e => e.unstable && e.title.toLowerCase().includes(filterText));
    const stableExperiments = experiments.filter(e => !e.unstable && e.title.toLowerCase().includes(filterText));
    if (stableExperiments.length) {
      const experimentsBlock = document.createElement('div');
      experimentsBlock.classList.add('settings-experiments-block');
      const warningMessage = i18nString(UIStrings.theseExperimentsCouldBeUnstable);
      const warningSection = this.createExperimentsWarningSubsection(warningMessage);
      for (const experiment of stableExperiments) {
        experimentsBlock.appendChild(this.createExperimentCheckbox(experiment));
      }
      this.#experimentsSection =
          createSettingsCard(i18nString(UIStrings.experiments), warningSection, experimentsBlock);
      this.containerElement.appendChild(this.#experimentsSection);
    }
    if (unstableExperiments.length) {
      const experimentsBlock = document.createElement('div');
      experimentsBlock.classList.add('settings-experiments-block');
      const warningMessage = i18nString(UIStrings.theseExperimentsAreParticularly);
      for (const experiment of unstableExperiments) {
        experimentsBlock.appendChild(this.createExperimentCheckbox(experiment));
      }
      this.#unstableExperimentsSection = createSettingsCard(
          i18nString(UIStrings.unstableExperiments), this.createExperimentsWarningSubsection(warningMessage),
          experimentsBlock);
      this.containerElement.appendChild(this.#unstableExperimentsSection);
    }
    if (!stableExperiments.length && !unstableExperiments.length) {
      const warning = document.createElement('span');
      warning.textContent = i18nString(UIStrings.noResults);
      UI.ARIAUtils.LiveAnnouncer.alert(warning.textContent);
      this.#experimentsSection = createSettingsCard(i18nString(UIStrings.experiments), warning);
      this.containerElement.appendChild(this.#experimentsSection);
    }
  }

  private createExperimentsWarningSubsection(warningMessage: string): HTMLElement {
    const subsection = document.createElement('div');
    subsection.classList.add('experiments-warning-subsection');
    const warningIcon = IconButton.Icon.create('warning');
    subsection.appendChild(warningIcon);
    const warning = subsection.createChild('span');
    warning.textContent = warningMessage;
    return subsection;
  }

  private createExperimentCheckbox(experiment: Root.Runtime.Experiment): HTMLParagraphElement {
    const checkbox =
        UI.UIUtils.CheckboxLabel.createWithStringLiteral(experiment.title, experiment.isEnabled(), experiment.name);
    checkbox.classList.add('experiment-label');
    checkbox.name = experiment.name;
    function listener(): void {
      experiment.setEnabled(checkbox.checked);
      Host.userMetrics.experimentChanged(experiment.name, experiment.isEnabled());
      UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(
          i18nString(UIStrings.oneOrMoreSettingsHaveChanged));
    }
    checkbox.addEventListener('click', listener, false);

    const p = document.createElement('p');
    this.experimentToControl.set(experiment, p);
    p.classList.add('settings-experiment');
    if (experiment.unstable && !experiment.isEnabled()) {
      p.classList.add('settings-experiment-unstable');
    }
    p.appendChild(checkbox);

    const experimentLink = experiment.docLink;
    if (experimentLink) {
      const linkButton = new Buttons.Button.Button();
      linkButton.data = {
        iconName: 'help',
        variant: Buttons.Button.Variant.ICON,
        size: Buttons.Button.Size.SMALL,
        jslogContext: `${experiment.name}-documentation`,
        title: i18nString(UIStrings.learnMore),
      };
      linkButton.addEventListener('click', () => UI.UIUtils.openInNewTab(experimentLink));
      linkButton.classList.add('link-icon');

      p.appendChild(linkButton);
    }

    if (experiment.feedbackLink) {
      const link = UI.XLink.XLink.create(
          experiment.feedbackLink, undefined, undefined, undefined, `${experiment.name}-feedback`);
      link.textContent = i18nString(UIStrings.sendFeedback);
      link.classList.add('feedback-link');

      p.appendChild(link);
    }

    return p;
  }

  highlightObject(experiment: Object): void {
    if (experiment instanceof Root.Runtime.Experiment) {
      const element = this.experimentToControl.get(experiment);
      if (element) {
        PanelUtils.highlightElement(element);
      }
    }
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(ExperimentsSettingsTab, this);
    super.wasShown();
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().setFlavor(ExperimentsSettingsTab, null);
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'settings.show':
        void SettingsScreen.showSettingsScreen({focusTabHeader: true} as ShowSettingsScreenOptions);
        return true;
      case 'settings.documentation':
        UI.UIUtils.openInNewTab('https://developer.chrome.com/docs/devtools/');
        return true;
      case 'settings.shortcuts':
        void SettingsScreen.showSettingsScreen({name: 'keybinds', focusTabHeader: true});
        return true;
    }
    return false;
  }
}
export class Revealer implements Common.Revealer.Revealer<Root.Runtime.Experiment|Common.Settings.Setting<unknown>> {
  async reveal(object: Root.Runtime.Experiment|Common.Settings.Setting<unknown>): Promise<void> {
    const context = UI.Context.Context.instance();
    if (object instanceof Root.Runtime.Experiment) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
      await SettingsScreen.showSettingsScreen({name: 'experiments'});
      const experimentsSettingsTab = context.flavor(ExperimentsSettingsTab);
      if (experimentsSettingsTab !== null) {
        experimentsSettingsTab.highlightObject(object);
      }
      return;
    }

    for (const settingRegistration of Common.Settings.Settings.instance().getRegisteredSettings()) {
      if (!GenericSettingsTab.isSettingVisible(settingRegistration)) {
        continue;
      }
      if (settingRegistration.settingName === object.name) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
        await SettingsScreen.showSettingsScreen();
        const genericSettingsTab = context.flavor(GenericSettingsTab);
        if (genericSettingsTab !== null) {
          genericSettingsTab.highlightObject(object);
        }
        return;
      }
    }

    // Reveal settings views
    for (const view of UI.ViewManager.getRegisteredViewExtensions()) {
      const id = view.viewId();
      const location = view.location();
      if (location !== UI.ViewManager.ViewLocationValues.SETTINGS_VIEW) {
        continue;
      }
      const settings = view.settings();
      if (settings && settings.indexOf(object.name) !== -1) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
        await SettingsScreen.showSettingsScreen({name: id});
        const widget = await view.widget();
        if ('highlightObject' in widget && typeof widget.highlightObject === 'function') {
          widget.highlightObject(object);
        }
        return;
      }
    }
  }
}
export interface ShowSettingsScreenOptions {
  name?: string;
  focusTabHeader?: boolean;
}
