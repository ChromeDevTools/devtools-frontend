// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/components/cards/cards.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { PanelUtils } from '../utils/utils.js';
import * as PanelComponents from './components/components.js';
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
};
const str_ = i18n.i18n.registerUIStrings('panels/settings/SettingsScreen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let settingsScreenInstance;
function createSettingsCard(heading, ...content) {
    const card = document.createElement('devtools-card');
    card.heading = heading;
    card.append(...content);
    return card;
}
export class SettingsScreen extends UI.Widget.VBox {
    tabbedLocation;
    keybindsTab;
    reportTabOnReveal;
    constructor() {
        super({ useShadowDom: true });
        this.registerRequiredCSS(settingsScreenStyles);
        this.contentElement.classList.add('settings-window-main');
        this.contentElement.classList.add('vbox');
        const settingsLabelElement = document.createElement('div');
        settingsLabelElement.classList.add('settings-window-label-element');
        const settingsTitleElement = UI.UIUtils.createShadowRootWithCoreStyles(settingsLabelElement, { cssFile: settingsScreenStyles })
            .createChild('div', 'settings-window-title');
        UI.ARIAUtils.markAsHeading(settingsTitleElement, 1);
        settingsTitleElement.textContent = i18nString(UIStrings.settings);
        this.tabbedLocation = UI.ViewManager.ViewManager.instance().createTabbedLocation(() => SettingsScreen.revealSettingsScreen(), 'settings-view');
        const tabbedPane = this.tabbedLocation.tabbedPane();
        tabbedPane.registerRequiredCSS(settingsScreenStyles);
        tabbedPane.headerElement().prepend(settingsLabelElement);
        tabbedPane.setShrinkableTabs(false);
        tabbedPane.makeVerticalTabLayout();
        const keyBindsView = UI.ViewManager.ViewManager.instance().view('keybinds');
        if (keyBindsView) {
            void keyBindsView.widget().then(widget => {
                this.keybindsTab = widget;
            });
        }
        tabbedPane.show(this.contentElement);
        tabbedPane.selectTab('preferences');
        tabbedPane.addEventListener(UI.TabbedPane.Events.TabInvoked, this.tabInvoked, this);
        this.reportTabOnReveal = false;
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!settingsScreenInstance || forceNew) {
            settingsScreenInstance = new SettingsScreen();
        }
        return settingsScreenInstance;
    }
    static revealSettingsScreen() {
        const settingsScreen = SettingsScreen.instance();
        if (settingsScreen.isShowing()) {
            return settingsScreen;
        }
        settingsScreen.reportTabOnReveal = true;
        const dialog = new UI.Dialog.Dialog('settings');
        dialog.contentElement.removeAttribute('aria-modal');
        dialog.contentElement.tabIndex = -1;
        dialog.addCloseButton();
        dialog.setOutsideClickCallback(() => { });
        dialog.setPointerEventsBehavior("PierceGlassPane" /* UI.GlassPane.PointerEventsBehavior.PIERCE_GLASS_PANE */);
        dialog.setOutsideTabIndexBehavior("PreserveMainViewTabIndex" /* UI.Dialog.OutsideTabIndexBehavior.PRESERVE_MAIN_VIEW_TAB_INDEX */);
        settingsScreen.show(dialog.contentElement);
        dialog.setEscapeKeyCallback(settingsScreen.onEscapeKeyPressed.bind(settingsScreen));
        dialog.setMarginBehavior("NoMargin" /* UI.GlassPane.MarginBehavior.NO_MARGIN */);
        dialog.show();
        dialog.contentElement.focus();
        return settingsScreen;
    }
    static async showSettingsScreen(options = { name: undefined, focusTabHeader: undefined }) {
        const { name, focusTabHeader } = options;
        const settingsScreen = SettingsScreen.revealSettingsScreen();
        settingsScreen.selectTab(name || 'preferences');
        const tabbedPane = settingsScreen.tabbedLocation.tabbedPane();
        await tabbedPane.waitForTabElementUpdate();
        if (focusTabHeader) {
            tabbedPane.focusSelectedTabHeader();
        }
        else {
            tabbedPane.focus();
        }
    }
    resolveLocation(_locationName) {
        return this.tabbedLocation;
    }
    selectTab(name) {
        this.tabbedLocation.tabbedPane().selectTab(name, /* userGesture */ true);
    }
    tabInvoked(event) {
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
    reportSettingsPanelShown(tabId) {
        if (tabId === i18nString(UIStrings.shortcuts)) {
            Host.userMetrics.settingsPanelShown('shortcuts');
            return;
        }
        Host.userMetrics.settingsPanelShown(tabId);
    }
    onEscapeKeyPressed(event) {
        if (this.tabbedLocation.tabbedPane().selectedTabId === 'keybinds' && this.keybindsTab) {
            this.keybindsTab.onEscapeKeyPressed(event);
        }
    }
}
export class GenericSettingsTab extends UI.Widget.VBox {
    syncSection = new PanelComponents.SyncSection.SyncSection();
    settingToControl = new Map();
    containerElement;
    #updateSyncSectionTimerId = -1;
    #syncSectionUpdatePromise = null;
    constructor() {
        super({ jslog: `${VisualLogging.pane('preferences')}` });
        this.element.classList.add('settings-tab-container');
        this.element.id = 'preferences-tab-content';
        this.containerElement =
            this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
        this.containerElement.classList.add('settings-multicolumn-card-container');
        // AI, GRID, MOBILE, EMULATION, and RENDERING are intentionally excluded from this list.
        // AI settings are displayed in their own tab.
        const explicitSectionOrder = [
            "" /* Common.Settings.SettingCategory.NONE */,
            "APPEARANCE" /* Common.Settings.SettingCategory.APPEARANCE */,
            "SOURCES" /* Common.Settings.SettingCategory.SOURCES */,
            "ELEMENTS" /* Common.Settings.SettingCategory.ELEMENTS */,
            "NETWORK" /* Common.Settings.SettingCategory.NETWORK */,
            "PERFORMANCE" /* Common.Settings.SettingCategory.PERFORMANCE */,
            "MEMORY" /* Common.Settings.SettingCategory.MEMORY */,
            "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
            "EXTENSIONS" /* Common.Settings.SettingCategory.EXTENSIONS */,
            "PERSISTENCE" /* Common.Settings.SettingCategory.PERSISTENCE */,
            "DEBUGGER" /* Common.Settings.SettingCategory.DEBUGGER */,
            "GLOBAL" /* Common.Settings.SettingCategory.GLOBAL */,
            "ACCOUNT" /* Common.Settings.SettingCategory.ACCOUNT */,
        ];
        // Some settings define their initial ordering.
        const preRegisteredSettings = Common.Settings.Settings.instance().getRegisteredSettings().sort((firstSetting, secondSetting) => {
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
        });
        for (const sectionCategory of explicitSectionOrder) {
            const settingsForSection = preRegisteredSettings.filter(setting => setting.category === sectionCategory && GenericSettingsTab.isSettingVisible(setting));
            this.createSectionElement(sectionCategory, settingsForSection);
        }
        const restoreAndReloadButton = UI.UIUtils.createTextButton(i18nString(UIStrings.restoreDefaultsAndReload), restoreAndReload, { jslogContext: 'settings.restore-defaults-and-reload' });
        this.containerElement.appendChild(restoreAndReloadButton);
        function restoreAndReload() {
            Common.Settings.Settings.instance().clearAll();
            Components.Reload.reload();
        }
    }
    static isSettingVisible(setting) {
        return Boolean(setting.title?.()) && Boolean(setting.category);
    }
    wasShown() {
        UI.Context.Context.instance().setFlavor(GenericSettingsTab, this);
        super.wasShown();
        this.updateSyncSection();
    }
    willHide() {
        if (this.#updateSyncSectionTimerId > 0) {
            window.clearTimeout(this.#updateSyncSectionTimerId);
            this.#updateSyncSectionTimerId = -1;
        }
        super.willHide();
        UI.Context.Context.instance().setFlavor(GenericSettingsTab, null);
    }
    updateSyncSection() {
        if (this.#updateSyncSectionTimerId > 0) {
            window.clearTimeout(this.#updateSyncSectionTimerId);
            this.#updateSyncSectionTimerId = -1;
        }
        this.#syncSectionUpdatePromise =
            new Promise(resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve))
                .then(syncInfo => {
                this.syncSection.data = {
                    syncInfo,
                    syncSetting: Common.Settings.moduleSetting('sync-preferences'),
                    receiveBadgesSetting: Common.Settings.Settings.instance().moduleSetting('receive-gdp-badges'),
                };
                if (!syncInfo.isSyncActive || !syncInfo.arePreferencesSynced) {
                    this.#updateSyncSectionTimerId = window.setTimeout(this.updateSyncSection.bind(this), 500);
                }
            });
    }
    createExtensionSection(settings) {
        const sectionName = "EXTENSIONS" /* Common.Settings.SettingCategory.EXTENSIONS */;
        const settingUI = Components.Linkifier.LinkHandlerSettingUI.instance();
        const element = settingUI.settingElement();
        this.createStandardSectionElement(sectionName, settings, element);
    }
    createSectionElement(category, settings) {
        // Always create the EXTENSIONS section and append the link handling control.
        if (category === "EXTENSIONS" /* Common.Settings.SettingCategory.EXTENSIONS */) {
            this.createExtensionSection(settings);
        }
        else if (category === "ACCOUNT" /* Common.Settings.SettingCategory.ACCOUNT */ && settings.length > 0) {
            const syncCard = createSettingsCard(Common.SettingRegistration.getLocalizedSettingsCategory("ACCOUNT" /* Common.SettingRegistration.SettingCategory.ACCOUNT */), this.syncSection);
            this.containerElement.appendChild(syncCard);
        }
        else if (settings.length > 0) {
            this.createStandardSectionElement(category, settings);
        }
    }
    createStandardSectionElement(category, settings, content) {
        const uiSectionName = Common.Settings.getLocalizedSettingsCategory(category);
        const sectionElement = document.createElement('div');
        for (const settingRegistration of settings) {
            const setting = Common.Settings.Settings.instance().moduleSetting(settingRegistration.settingName);
            const settingControl = SettingsUI.SettingsUI.createControlForSetting(setting);
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
    highlightObject(setting) {
        if (setting instanceof Common.Settings.Setting) {
            const element = this.settingToControl.get(setting);
            if (element) {
                PanelUtils.highlightElement(element);
            }
            else if (setting.name === 'receive-gdp-badges') {
                void this.#syncSectionUpdatePromise?.then(() => {
                    void this.syncSection.highlightReceiveBadgesSetting();
                });
            }
        }
    }
}
export class ExperimentsSettingsTab extends UI.Widget.VBox {
    #experimentsSection;
    #unstableExperimentsSection;
    experimentToControl = new Map();
    containerElement;
    constructor() {
        super({ jslog: `${VisualLogging.pane('experiments')}` });
        this.element.classList.add('settings-tab-container');
        this.element.id = 'experiments-tab-content';
        this.containerElement =
            this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
        this.containerElement.classList.add('settings-card-container');
        const filterSection = this.containerElement.createChild('div');
        filterSection.classList.add('experiments-filter');
        render(html `
        <devtools-toolbar>
          <devtools-toolbar-input autofocus type="filter" placeholder=${i18nString(UIStrings.searchExperiments)} style="flex-grow:1" @change=${this.#onFilterChanged.bind(this)}></devtools-toolbar-input>
        </devtools-toolbar>
    `, filterSection);
        this.renderExperiments('');
    }
    #onFilterChanged(e) {
        this.renderExperiments(e.detail.toLowerCase());
    }
    renderExperiments(filterText) {
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
            this.#unstableExperimentsSection = createSettingsCard(i18nString(UIStrings.unstableExperiments), this.createExperimentsWarningSubsection(warningMessage), experimentsBlock);
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
    createExperimentsWarningSubsection(warningMessage) {
        const subsection = document.createElement('div');
        subsection.classList.add('experiments-warning-subsection');
        const warningIcon = IconButton.Icon.create('warning');
        subsection.appendChild(warningIcon);
        const warning = subsection.createChild('span');
        warning.textContent = warningMessage;
        return subsection;
    }
    createExperimentCheckbox(experiment) {
        const checkbox = UI.UIUtils.CheckboxLabel.createWithStringLiteral(experiment.title, experiment.isEnabled(), experiment.name);
        checkbox.classList.add('experiment-label');
        checkbox.name = experiment.name;
        function listener() {
            experiment.setEnabled(checkbox.checked);
            Host.userMetrics.experimentChanged(experiment.name, experiment.isEnabled());
            UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.oneOrMoreSettingsHaveChanged));
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
                variant: "icon" /* Buttons.Button.Variant.ICON */,
                size: "SMALL" /* Buttons.Button.Size.SMALL */,
                jslogContext: `${experiment.name}-documentation`,
                title: i18nString(UIStrings.learnMore),
            };
            linkButton.addEventListener('click', () => UI.UIUtils.openInNewTab(experimentLink));
            linkButton.classList.add('link-icon');
            p.appendChild(linkButton);
        }
        if (experiment.feedbackLink) {
            const link = UI.XLink.XLink.create(experiment.feedbackLink, undefined, undefined, undefined, `${experiment.name}-feedback`);
            link.textContent = i18nString(UIStrings.sendFeedback);
            link.classList.add('feedback-link');
            p.appendChild(link);
        }
        return p;
    }
    highlightObject(experiment) {
        if (experiment instanceof Root.Runtime.Experiment) {
            const element = this.experimentToControl.get(experiment);
            if (element) {
                PanelUtils.highlightElement(element);
            }
        }
    }
    wasShown() {
        UI.Context.Context.instance().setFlavor(ExperimentsSettingsTab, this);
        super.wasShown();
    }
    willHide() {
        super.willHide();
        UI.Context.Context.instance().setFlavor(ExperimentsSettingsTab, null);
    }
}
export class ActionDelegate {
    handleAction(_context, actionId) {
        switch (actionId) {
            case 'settings.show':
                void SettingsScreen.showSettingsScreen({ focusTabHeader: true });
                return true;
            case 'settings.documentation':
                UI.UIUtils.openInNewTab('https://developer.chrome.com/docs/devtools/');
                return true;
            case 'settings.shortcuts':
                void SettingsScreen.showSettingsScreen({ name: 'keybinds', focusTabHeader: true });
                return true;
        }
        return false;
    }
}
export class Revealer {
    async reveal(object) {
        const context = UI.Context.Context.instance();
        if (object instanceof Root.Runtime.Experiment) {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
            await SettingsScreen.showSettingsScreen({ name: 'experiments' });
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
            if (location !== "settings-view" /* UI.ViewManager.ViewLocationValues.SETTINGS_VIEW */) {
                continue;
            }
            const settings = view.settings();
            if (settings && settings.indexOf(object.name) !== -1) {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
                await SettingsScreen.showSettingsScreen({ name: id });
                const widget = await view.widget();
                if ('highlightObject' in widget && typeof widget.highlightObject === 'function') {
                    widget.highlightObject(object);
                }
                return;
            }
        }
    }
}
//# sourceMappingURL=SettingsScreen.js.map