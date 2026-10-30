// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UIHelpers from '../../ui/helpers/helpers.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as SettingUIRegistration from '../../ui/settings/settings.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import {PanelUtils} from '../utils/utils.js';

import * as PanelComponents from './components/components.js';
import type {KeybindsSettingsTab} from './KeybindsSettingsTab.js';
import settingsScreenStyles from './settingsScreen.css.js';

const {html, nothing, render, Directives: {ref, repeat}} = Lit;
const {widget, widgetRef} = UI.Widget;

const UIStrings = {
  /**
   * @description Name of the Settings view.
   */
  settings: 'Settings',
  /**
   * @description Text for keyboard shortcuts.
   */
  shortcuts: 'Shortcuts',
  /**
   * @description Text of button in Settings screen of the Settings.
   */
  restoreDefaultsAndReload: 'Restore defaults and reload',
  /**
   * @description Card header in Experiments settings tab that lists all available stable experiments that can be turned on or off.
   */
  experiments: 'Experiments',
  /**
   * @description Number of experiments from the filtered list of experiments.
   */
  experimentsFound: '{n, plural, =1 {# experiment found} other {# experiments found}}',
  /**
   * @description Message shown in the experiments tab to warn users about any possible unstable features.
   */
  theseExperimentsCouldBeUnstable: 'Warning: These experiments could be unstable or unreliable',
  /**
   * @description Message to display if a setting change requires a reload of DevTools.
   */
  settingsChangedReloadDevTools: 'Settings changed. To apply, reload DevTools.',
  /**
   * @description Message to display if a setting change requires a restart of Chrome.
   */
  settingsChangedRestartChrome: 'Settings changed. To apply, restart Chrome.',
  /**
   * @description Warning text shown when the user has entered text to filter the
   * list of experiments, but no experiments match the filter.
   */
  noResults: 'No experiments match the filter',
  /**
   * @description Text that is usually a hyperlink to more documentation.
   */
  learnMore: 'Learn more',
  /**
   * @description Text that is usually a hyperlink to a feedback form.
   */
  sendFeedback: 'Send feedback',
  /**
   * @description Placeholder text in search bar.
   */
  searchExperiments: 'Search experiments',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/SettingsScreen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let settingsScreenInstance: SettingsScreen|undefined;

export interface SettingsScreenViewInput {
  views: UI.View.View[];
  selectedTabId: string;
  focusTabHeader: boolean;
  onTabInvoked: (eventData: {tabId: string, prevTabId?: string, isUserGesture?: boolean}) => void;
}

export type SettingsScreenView = (input: SettingsScreenViewInput, output: undefined, target: HTMLElement) => void;

export const SETTINGS_SCREEN_DEFAULT_VIEW: SettingsScreenView = (
    input: SettingsScreenViewInput,
    _output: undefined,
    target: HTMLElement,
    ): void => {
  // clang-format off
  render(
      html`
        <devtools-tabbed-pane
          vertical
          ?focus-header=${input.focusTabHeader}
          selected-tab=${input.selectedTabId}
          @tabinvoked=${(event: CustomEvent<{tabId: string, prevTabId?: string, isUserGesture?: boolean}>) =>
              input.onTabInvoked(event.detail)}>
          <div slot="left" class="settings-window-label-element">
            <div class="settings-window-title" role="heading" aria-level="1">
              ${i18nString(UIStrings.settings)}
            </div>
          </div>
          ${repeat(input.views, view => view.viewId(), view => {
            const iconName = view.iconName();
            return html`
              <devtools-widget
                id=${view.viewId()}
                label=${view.title()}
                ${widget(UI.ViewManager.ContainerWidget, {view})}>
              </devtools-widget>
              ${iconName
                  ? html`<devtools-icon slot="icon-${view.viewId()}" name=${iconName}></devtools-icon>`
                  : nothing}
            `;
          })}
        </devtools-tabbed-pane>
      `,
      target,
      {container: {classes: ['settings-window-main', 'vbox']}});
  // clang-format on
};

export class SettingsScreen extends UI.Widget.VBox implements UI.View.ViewLocationResolver, UI.View.ViewLocation {
  private keybindsTab?: KeybindsSettingsTab;
  private reportTabOnReveal: boolean;
  readonly #view: SettingsScreenView;
  readonly #views: UI.View.View[] = [];
  readonly #onTabInvokedBound = this.tabInvoked.bind(this);
  #selectedTabId = 'preferences';
  #focusTabHeader = false;

  constructor(view: SettingsScreenView = SETTINGS_SCREEN_DEFAULT_VIEW) {
    super({useShadowDom: true});
    this.#view = view;
    this.registerRequiredCSS(settingsScreenStyles);

    this.appendApplicableItems(UI.ViewManager.ViewLocationValues.SETTINGS_VIEW);
    const keyBindsView = this.#views.find(v => v.viewId() === 'keybinds');
    if (keyBindsView) {
      void keyBindsView.widget().then(widget => {
        this.keybindsTab = widget as KeybindsSettingsTab;
      });
    }
    this.reportTabOnReveal = false;
  }

  override wasShown(): void {
    super.wasShown();
    this.performUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          views: this.#views,
          selectedTabId: this.#selectedTabId,
          focusTabHeader: this.#focusTabHeader,
          onTabInvoked: this.#onTabInvokedBound,
        },
        undefined,
        this.contentElement,
    );
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): SettingsScreen {
    const {forceNew} = opts;
    if (!settingsScreenInstance || forceNew) {
      settingsScreenInstance = new SettingsScreen();
    }

    return settingsScreenInstance;
  }

  static removeInstanceForTesting(): void {
    settingsScreenInstance = undefined;
  }

  private static revealSettingsScreen(): SettingsScreen {
    const settingsScreen = SettingsScreen.instance();
    if (settingsScreen.isShowing()) {
      return settingsScreen;
    }

    settingsScreen.reportTabOnReveal = true;
    const dialog = new UI.Dialog.Dialog('settings');
    dialog.setAriaLabel(i18nString(UIStrings.settings));
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

  static async showSettingsScreen(options: ShowSettingsScreenOptions = {}): Promise<void> {
    const {name, focusTabHeader} = options;
    const settingsScreen = SettingsScreen.revealSettingsScreen();

    await settingsScreen.selectTab(name || 'preferences', Boolean(focusTabHeader));
  }

  resolveLocation(_locationName: string): UI.View.ViewLocation|null {
    return this;
  }

  appendApplicableItems(locationName: string): void {
    for (const view of UI.ViewManager.ViewManager.instance().viewsForLocation(locationName)) {
      if (!view.isTransient()) {
        this.appendView(view);
      }
    }
  }

  appendView(view: UI.View.View, insertBefore?: UI.View.View|null): void {
    if (this.#views.includes(view)) {
      return;
    }
    const index = insertBefore ? this.#views.indexOf(insertBefore) : -1;
    if (index !== -1) {
      this.#views.splice(index, 0, view);
    } else {
      this.#views.push(view);
    }
    this.requestUpdate();
  }

  async showView(view: UI.View.View, insertBefore?: UI.View.View|null, userGesture?: boolean, omitFocus?: boolean,
                 shouldSelectTab = true): Promise<void> {
    this.appendView(view, insertBefore);
    if (shouldSelectTab) {
      const prevTabId = this.#selectedTabId;
      this.#selectedTabId = view.viewId();
      this.#focusTabHeader = false;
      if (userGesture && (this.reportTabOnReveal || prevTabId !== view.viewId())) {
        this.reportTabOnReveal = false;
        this.reportSettingsPanelShown(view.viewId());
      }
    }
    this.performUpdate();
    await view.widget();
    if (!omitFocus) {
      this.focus();
    }
  }

  removeView(view: UI.View.View): void {
    const index = this.#views.indexOf(view);
    if (index !== -1) {
      this.#views.splice(index, 1);
      if (this.#selectedTabId === view.viewId()) {
        this.#selectedTabId = this.#views[0]?.viewId() ?? 'preferences';
      }
      this.requestUpdate();
    }
  }

  isViewVisible(view: UI.View.View): boolean {
    return this.isShowing() && this.#selectedTabId === view.viewId();
  }

  widget(): UI.Widget.AnyWidget {
    return this;
  }

  reveal(): void {
    SettingsScreen.revealSettingsScreen();
  }

  private async selectTab(name: string, focusTabHeader = false): Promise<void> {
    const prevTabId = this.#selectedTabId;
    this.#selectedTabId = name;
    this.#focusTabHeader = focusTabHeader;
    if (this.reportTabOnReveal || prevTabId !== name) {
      this.reportTabOnReveal = false;
      this.reportSettingsPanelShown(name);
    }
    this.performUpdate();
    const view = this.#views.find(v => v.viewId() === name);
    if (view) {
      await view.widget();
    }
    this.focus();
    if (this.#focusTabHeader) {
      this.#focusTabHeader = false;
      this.requestUpdate();
    }
  }

  private tabInvoked(eventData: {tabId: string, prevTabId?: string, isUserGesture?: boolean}): void {
    if (this.#selectedTabId !== eventData.tabId) {
      this.#selectedTabId = eventData.tabId;
      this.requestUpdate();
    }
    if (!eventData.isUserGesture) {
      return;
    }

    if (this.#focusTabHeader) {
      this.#focusTabHeader = false;
      this.requestUpdate();
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
      UI.UIUserMetrics.UIUserMetrics.instance().settingsPanelShown('shortcuts');
      return;
    }

    UI.UIUserMetrics.UIUserMetrics.instance().settingsPanelShown(tabId);
  }

  private onEscapeKeyPressed(event: KeyboardEvent): void {
    if (this.#selectedTabId === 'keybinds' && this.keybindsTab) {
      this.keybindsTab.onEscapeKeyPressed(event);
    }
  }
}

interface SettingsTab {
  highlightObject(object: Object): void;
}

export interface GenericSettingsSection {
  category: Common.Settings.SettingCategory;
  heading: Common.UIString.LocalizedString;
  settings: Array<Common.Settings.Setting<unknown>>;
}

export interface GenericSettingsTabViewInput {
  sections: GenericSettingsSection[];
  syncInfo: Host.InspectorFrontendHostAPI.SyncInformation;
  onRestoreDefaults: () => void;
}

export interface GenericSettingsTabViewOutput {
  highlightSetting?: (setting: Common.Settings.Setting<unknown>) => void;
}

export type GenericSettingsTabView =
    (input: GenericSettingsTabViewInput, output: GenericSettingsTabViewOutput, target: HTMLElement) => void;

export const GENERIC_SETTINGS_TAB_DEFAULT_VIEW: GenericSettingsTabView = (
    input: GenericSettingsTabViewInput,
    output: GenericSettingsTabViewOutput,
    target: HTMLElement,
    ): void => {
  const settingToControl = new Map<Common.Settings.Setting<unknown>, HTMLElement>();
  let syncSection: PanelComponents.SyncSection.SyncSection|undefined;
  output.highlightSetting = (setting: Common.Settings.Setting<unknown>): void => {
    const element = settingToControl.get(setting);
    if (element) {
      PanelUtils.highlightElement(element);
    } else if (setting.name === 'receive-gdp-badges') {
      void syncSection?.highlightReceiveBadgesSetting();
    }
  };
  // clang-format off
  render(
      html`
        <div class="settings-card-container-wrapper">
          <div class="settings-multicolumn-card-container">
            ${input.sections.map(section => html`
              <devtools-card heading=${section.heading}>
                ${section.category === Common.Settings.SettingCategory.ACCOUNT
                    ? html`<devtools-widget
                        ${widget(PanelComponents.SyncSection.SyncSection, {syncInfo: input.syncInfo})}
                        ${widgetRef(PanelComponents.SyncSection.SyncSection, w => { syncSection = w; })}>
                      </devtools-widget>`
                    : html`
                      <div ${ref(el => {
                        if (!el) {
                          return;
                        }
                        let childIndex = 0;
                        for (const setting of section.settings) {
                          if (setting.type() !== Common.Settings.SettingType.BOOLEAN &&
                              setting.type() !== Common.Settings.SettingType.ENUM) {
                            continue;
                          }
                          const child = el.children[childIndex++];
                          if (child instanceof HTMLElement) {
                            settingToControl.set(setting, child);
                          }
                        }
                      })}>
                        ${section.settings.map(setting => SettingsUI.SettingsUI.renderControlForSetting(setting))}
                        ${section.category === Common.Settings.SettingCategory.EXTENSIONS
                            ? Components.Linkifier.LinkHandlerSettingUI.instance().settingElement()
                            : nothing}
                      </div>
                    `}
              </devtools-card>
            `)}
            <devtools-button
              .variant=${Buttons.Button.Variant.OUTLINED}
              .jslogContext=${'settings.restore-defaults-and-reload'}
              @click=${input.onRestoreDefaults}>
              ${i18nString(UIStrings.restoreDefaultsAndReload)}
            </devtools-button>
          </div>
        </div>
      `,
      target,
      {
        container: {
          classes: ['settings-tab-container'],
          attributes: {
            id: 'preferences-tab-content',
            jslog: `${VisualLogging.pane('preferences')}`,
          },
        },
      });
  // clang-format on
};

export class GenericSettingsTab extends UI.Widget.VBox implements SettingsTab {
  readonly #sections: GenericSettingsSection[] = [];
  readonly #view: GenericSettingsTabView;
  readonly #viewOutput: GenericSettingsTabViewOutput = {};
  #syncInfo: Host.InspectorFrontendHostAPI.SyncInformation = {isSyncActive: false};
  #updateSyncSectionTimerId = -1;
  #syncSectionUpdatePromise: Promise<void>|null = null;

  constructor(element?: HTMLElement, view: GenericSettingsTabView = GENERIC_SETTINGS_TAB_DEFAULT_VIEW) {
    super(element);
    this.#view = view;

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
    const preRegisteredSettings = Array.from(SettingUIRegistration.SettingUIRegistration.getRegisteredSettings())
                                      .sort(
                                          (firstSetting, secondSetting) => {
                                            const firstOrder = firstSetting.uiDescriptor.order;
                                            const secondOrder = secondSetting.uiDescriptor.order;
                                            if (firstOrder !== undefined && secondOrder !== undefined) {
                                              return (firstOrder - secondOrder);
                                            }
                                            if (firstOrder) {
                                              return -1;
                                            }
                                            if (secondOrder) {
                                              return 1;
                                            }
                                            return 0;
                                          },
                                      );

    for (const sectionCategory of explicitSectionOrder) {
      const settingsForSection = preRegisteredSettings.filter(
          setting => setting.uiDescriptor.category === sectionCategory && GenericSettingsTab.isSettingVisible(setting));
      this.createSectionElement(sectionCategory, settingsForSection);
    }

    this.requestUpdate();
  }

  #restoreAndReload(): void {
    Common.Settings.Settings.instance().clearAll();
    Components.Reload.reload();
  }

  override performUpdate(): void {
    this.#view(
        {
          sections: this.#sections,
          syncInfo: this.#syncInfo,
          onRestoreDefaults: this.#restoreAndReload.bind(this),
        },
        this.#viewOutput,
        this.contentElement,
    );
  }

  static isSettingVisible(setting: SettingUIRegistration.SettingUIRegistration.RegisteredSettingUI): boolean {
    return Boolean(setting.uiDescriptor.title?.()) && Boolean(setting.uiDescriptor.category);
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(GenericSettingsTab, this);
    super.wasShown();
    this.performUpdate();
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

    this.#syncSectionUpdatePromise =
        new Promise<Host.InspectorFrontendHostAPI.SyncInformation>(
            resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve))
            .then(syncInfo => {
              this.#syncInfo = syncInfo;
              this.requestUpdate();
              if (!syncInfo.isSyncActive || !syncInfo.arePreferencesSynced) {
                this.#updateSyncSectionTimerId = window.setTimeout(this.updateSyncSection.bind(this), 500);
              }
            });
  }

  private createSectionElement(category: Common.Settings.SettingCategory,
                               settings: SettingUIRegistration.SettingUIRegistration.RegisteredSettingUI[]): void {
    // Always create the EXTENSIONS section and append the link handling control.
    if (category !== Common.Settings.SettingCategory.EXTENSIONS && settings.length === 0) {
      return;
    }
    this.#sections.push({
      category,
      heading: Common.Settings.getLocalizedSettingsCategory(category),
      settings: settings.map(settingRegistration =>
                                 Common.Settings.Settings.instance().resolve(settingRegistration.descriptor)),
    });
  }

  highlightObject(setting: Object): void {
    if (setting instanceof Common.Settings.Setting) {
      if (setting.name === 'receive-gdp-badges') {
        void this.#syncSectionUpdatePromise?.then(() => {
          this.#viewOutput.highlightSetting?.(setting);
        });
      } else {
        this.#viewOutput.highlightSetting?.(setting);
      }
    }
  }
}

export interface ExperimentsSettingsTabViewInput {
  filterText: string;
  experiments: Root.Runtime.Experiment[];
  onFilterChanged: (filterText: string) => void;
  onExperimentToggled: (experiment: Root.Runtime.Experiment, enabled: boolean) => void;
  onOpenDocumentation: (url: Platform.DevToolsPath.UrlString) => void;
}

export interface ExperimentsSettingsTabViewOutput {
  setExperimentElement: (experiment: Root.Runtime.Experiment, element: HTMLElement) => void;
}

export type ExperimentsSettingsTabView =
    (input: ExperimentsSettingsTabViewInput, output: ExperimentsSettingsTabViewOutput, target: HTMLElement) => void;

export const EXPERIMENTS_SETTINGS_TAB_DEFAULT_VIEW: ExperimentsSettingsTabView = (
    input: ExperimentsSettingsTabViewInput,
    output: ExperimentsSettingsTabViewOutput,
    target: HTMLElement,
    ): void => {
  // clang-format off
  render(
      html`
        <div class="settings-card-container-wrapper">
          <div class="settings-card-container">
            <div class="experiments-filter">
              <devtools-toolbar>
                <devtools-toolbar-input
                  autofocus
                  type="filter"
                  placeholder=${i18nString(UIStrings.searchExperiments)}
                  style="flex-grow:1"
                  .value=${input.filterText}
                  @change=${(e: CustomEvent<string>) => input.onFilterChanged(e.detail)}>
                </devtools-toolbar-input>
              </devtools-toolbar>
            </div>
            <devtools-card heading=${i18nString(UIStrings.experiments)}>
              ${input.experiments.length ? html`
                <div class="experiments-warning-subsection">
                  <devtools-icon name="warning"></devtools-icon>
                  <span>${i18nString(UIStrings.theseExperimentsCouldBeUnstable)}</span>
                </div>
                <div class="settings-experiments-block">
                  ${repeat(input.experiments, experiment => experiment.name, experiment => html`
                    <p class="settings-experiment" ${ref(el => {
                      if (el) {
                        output.setExperimentElement(experiment, el as HTMLElement);
                      }
                    })}>
                      <devtools-checkbox
                        class="experiment-label"
                        name=${experiment.name}
                        title=${experiment.title}
                        .checked=${experiment.isEnabled()}
                        .jslogContext=${experiment.name}
                        @click=${(e: Event) => {
                          const checkbox = e.currentTarget as UI.UIUtils.CheckboxLabel;
                          input.onExperimentToggled(experiment, checkbox.checked);
                        }}>
                        ${experiment.title}
                      </devtools-checkbox>
                      ${experiment.docLink ? html`
                        <devtools-button
                          class="link-icon"
                          title=${i18nString(UIStrings.learnMore)}
                          .iconName=${'help'}
                          .variant=${Buttons.Button.Variant.ICON}
                          .size=${Buttons.Button.Size.SMALL}
                          .jslogContext=${`${experiment.name}-documentation`}
                          @click=${() => {
                            if (experiment.docLink) {
                              input.onOpenDocumentation(experiment.docLink);
                            }
                          }}>
                        </devtools-button>
                      ` : Lit.nothing}
                      ${experiment.feedbackLink ? html`
                        <devtools-link
                          class="feedback-link"
                          href=${experiment.feedbackLink}
                          jslogcontext=${`${experiment.name}-feedback`}>
                          ${i18nString(UIStrings.sendFeedback)}
                        </devtools-link>
                      ` : Lit.nothing}
                    </p>
                  `)}
                </div>
              ` : html`
                <span>${i18nString(UIStrings.noResults)}</span>
              `}
            </devtools-card>
          </div>
        </div>
      `,
      target, {
        container: {
          classes: ['settings-tab-container'],
          attributes: {
            id: 'experiments-tab-content',
            jslog: `${VisualLogging.pane('experiments')}`,
          },
        },
      });
  // clang-format on
};

export class ExperimentsSettingsTab extends UI.Widget.Widget implements SettingsTab {
  readonly #experimentToControl = new Map<Root.Runtime.Experiment, HTMLElement>();
  readonly #view: ExperimentsSettingsTabView;
  readonly #viewOutput: ExperimentsSettingsTabViewOutput = {
    setExperimentElement: (experiment, element) => {
      this.#experimentToControl.set(experiment, element);
    },
  };
  #filterText = '';

  constructor(element?: HTMLElement, view: ExperimentsSettingsTabView = EXPERIMENTS_SETTINGS_TAB_DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  #filterExperiments(filterText: string): Root.Runtime.Experiment[] {
    const experiments = Root.Runtime.experiments.allConfigurableExperiments().sort((a, b) => {
      return a.title.localeCompare(b.title);
    });
    return experiments.filter(e => e.title.toLowerCase().includes(filterText));
  }

  #onFilterChanged(filterText: string): void {
    this.#filterText = filterText.toLowerCase();
    if (this.#filterText) {
      const filteredExperiments = this.#filterExperiments(this.#filterText);
      if (filteredExperiments.length) {
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.experimentsFound, {n: filteredExperiments.length}));
      } else {
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.noResults));
      }
    }
    this.requestUpdate();
  }

  #onExperimentToggled(experiment: Root.Runtime.Experiment, enabled: boolean): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.setChromeFlag(experiment.aboutFlag, enabled);
    experiment.setEnabled(enabled);
    Host.userMetrics.experimentChanged(experiment.name, experiment.isEnabled());
    if (experiment.requiresChromeRestart) {
      UI.InspectorView.InspectorView.instance().displayChromeRestartRequiredWarning(
          i18nString(UIStrings.settingsChangedRestartChrome));
    } else {
      UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(
          i18nString(UIStrings.settingsChangedReloadDevTools));
    }
    this.requestUpdate();
  }

  override performUpdate(): void {
    const filteredExperiments = this.#filterExperiments(this.#filterText);
    this.#experimentToControl.clear();
    this.#view(
        {
          filterText: this.#filterText,
          experiments: filteredExperiments,
          onFilterChanged: this.#onFilterChanged.bind(this),
          onExperimentToggled: this.#onExperimentToggled.bind(this),
          onOpenDocumentation: (url: Platform.DevToolsPath.UrlString) => UIHelpers.openInNewTab(url),
        },
        this.#viewOutput,
        this.contentElement,
    );
  }

  highlightObject(experiment: Object): void {
    if (experiment instanceof Root.Runtime.Experiment) {
      const element = this.#experimentToControl.get(experiment);
      if (element) {
        PanelUtils.highlightElement(element);
      }
    }
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(ExperimentsSettingsTab, this);
    super.wasShown();
    this.requestUpdate();
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
        UIHelpers.openInNewTab('https://developer.chrome.com/docs/devtools/');
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

    for (const settingRegistration of SettingUIRegistration.SettingUIRegistration.getRegisteredSettings()) {
      if (!GenericSettingsTab.isSettingVisible(settingRegistration)) {
        continue;
      }
      if (settingRegistration.descriptor.name === object.name) {
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
    for (const view of UI.ViewManager.ViewManager.instance().getRegisteredViewExtensions()) {
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
