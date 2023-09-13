// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as Emulation from '../emulation/emulation.js';

import {type LighthouseRun, type ProtocolService} from './LighthouseProtocolService.js';
import {type RunnerResult} from './LighthouseReporterTypes.js';

const UIStrings = {
  /**
   *@description Explanation for user that Ligthhouse can only audit HTTP/HTTPS pages
   */
  canOnlyAuditHttphttpsPages: 'Can only audit pages on HTTP or HTTPS. Navigate to a different page.',
  /**
   *@description Text when stored data in one location may affect Lighthouse run
   *@example {IndexedDB} PH1
   */
  thereMayBeStoredDataAffectingSingular:
      'There may be stored data affecting loading performance in this location: {PH1}. Audit this page in an incognito window to prevent those resources from affecting your scores.',
  /**
   *@description Text when stored data in multiple locations may affect Lighthouse run
   *@example {IndexedDB, WebSQL} PH1
   */
  thereMayBeStoredDataAffectingLoadingPlural:
      'There may be stored data affecting loading performance in these locations: {PH1}. Audit this page in an incognito window to prevent those resources from affecting your scores.',
  /**
   *@description Help text in Lighthouse Controller
   */
  multipleTabsAreBeingControlledBy:
      'Multiple tabs are being controlled by the same `service worker`. Close your other tabs on the same origin to audit this page.',
  /**
   *@description Help text in Lighthouse Controller
   */
  atLeastOneCategoryMustBeSelected: 'At least one category must be selected.',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  localStorage: 'Local storage',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  indexeddb: 'IndexedDB',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  webSql: 'Web SQL',
  /**
   *@description Text of checkbox to include running the performance audits in Lighthouse
   */
  performance: 'Performance',
  /**
   *@description Tooltip text of checkbox to include running the performance audits in Lighthouse
   */
  howLongDoesThisAppTakeToShow: 'How long does this app take to show content and become usable',
  /**
   *@description Text of checkbox to include running the Progressive Web App audits in Lighthouse
   */
  progressiveWebApp: 'Progressive Web App',
  /**
   *@description Tooltip text of checkbox to include running the Progressive Web App audits in Lighthouse
   */
  doesThisPageMeetTheStandardOfA: 'Does this page meet the standard of a Progressive Web App',
  /**
   *@description Text of checkbox to include running the Best Practices audits in Lighthouse
   */
  bestPractices: 'Best practices',
  /**
   *@description Tooltip text of checkbox to include running the Best Practices audits in Lighthouse
   */
  doesThisPageFollowBestPractices: 'Does this page follow best practices for modern web development',
  /**
   *@description Text of checkbox to include running the Accessibility audits in Lighthouse
   */
  accessibility: 'Accessibility',
  /**
   *@description Tooltip text of checkbox to include running the Accessibility audits in Lighthouse
   */
  isThisPageUsableByPeopleWith: 'Is this page usable by people with disabilities or impairments',
  /**
   *@description Text of checkbox to include running the Search Engine Optimization audits in Lighthouse
   */
  seo: 'SEO',
  /**
   *@description Tooltip text of checkbox to include running the Search Engine Optimization audits in Lighthouse
   */
  isThisPageOptimizedForSearch: 'Is this page optimized for search engine results ranking',
  /**
   *@description Text of checkbox to include running the Ad speed and quality audits in Lighthouse
   */
  publisherAds: 'Publisher Ads',
  /**
   *@description Tooltip text of checkbox to include running the Ad speed and quality audits in Lighthouse
   */
  isThisPageOptimizedForAdSpeedAnd: 'Is this page optimized for ad speed and quality',
  /**
   *@description ARIA label for a radio button input to emulate mobile device behavior when running audits in Lighthouse.
   */
  applyMobileEmulation: 'Apply mobile emulation',
  /**
   *@description Tooltip text of checkbox to emulate mobile device behavior when running audits in Lighthouse
   */
  applyMobileEmulationDuring: 'Apply mobile emulation during auditing',
  /**
   * @description ARIA label for a radio button input to select the Lighthouse mode.
   */
  lighthouseMode: 'Lighthouse mode',
  /**
   * @description Tooltip text of a radio button to select the Lighthouse mode. "Navigation" is a Lighthouse mode that audits a page navigation. "Timespan" is a Lighthouse mode that audits user interactions over a period of time. "Snapshot" is a Lighthouse mode that audits the current page state.
   */
  runLighthouseInMode: 'Run Lighthouse in navigation, timespan, or snapshot mode',
  /**
   * @description Label of a radio option for a Lighthouse mode that audits a page navigation. This should be marked as the default radio option.
   */
  navigation: 'Navigation (Default)',
  /**
   * @description Tooltip description of a radio option for a Lighthouse mode that audits a page navigation.
   */
  navigationTooltip: 'Navigation mode analyzes a page load, exactly like the original Lighthouse reports.',
  /**
   * @description Label of a radio option for a Lighthouse mode that audits user interactions over a period of time.
   */
  timespan: 'Timespan',
  /**
   * @description Tooltip description of a radio option for a Lighthouse mode that audits user interactions over a period of time.
   */
  timespanTooltip: 'Timespan mode analyzes an arbitrary period of time, typically containing user interactions.',
  /**
   * @description Label of a radio option for a Lighthouse mode that audits the current page state.
   */
  snapshot: 'Snapshot',
  /**
   * @description Tooltip description of a radio option for a Lighthouse mode that audits the current page state.
   */
  snapshotTooltip: 'Snapshot mode analyzes the page in a particular state, typically after user interactions.',
  /**
   *@description Text for the mobile platform, as opposed to desktop
   */
  mobile: 'Mobile',
  /**
   *@description Text for the desktop platform, as opposed to mobile
   */
  desktop: 'Desktop',
  /**
   * @description Text for an option to select a throttling method.
   */
  throttlingMethod: 'Throttling method',
  /**
   * @description Text for an option in a dropdown to use simulated throttling. This is the default setting.
   */
  simulatedThrottling: 'Simulated throttling (default)',
  /**
   * @description Text for an option in a dropdown to use DevTools throttling. This option should only be used by advanced users.
   */
  devtoolsThrottling: 'DevTools throttling (advanced)',
  /**
   * @description Tooltip text that appears when hovering over the 'Simulated Throttling' checkbox in the settings pane opened by clicking the setting cog in the start view of the audits panel
   */
  simulateASlowerPageLoadBasedOn:
      'Simulated throttling simulates a slower page load based on data from an initial unthrottled load. DevTools throttling actually slows down the page.',
  /**
   *@description Text of checkbox to reset storage features prior to running audits in Lighthouse
   */
  clearStorage: 'Clear storage',
  /**
   * @description Tooltip text of checkbox to reset storage features prior to running audits in
   * Lighthouse. Resetting the storage clears/empties it to a neutral state.
   */
  resetStorageLocalstorage:
      'Reset storage (`cache`, `service workers`, etc) before auditing. (Good for performance & `PWA` testing)',
  /**
   *@description Explanation for user that Ligthhouse can only audit when JavaScript is enabled
   */
  javaScriptDisabled:
      'JavaScript is disabled. You need to enable JavaScript to audit this page. Open the Command Menu and run the Enable JavaScript command to enable JavaScript.',
};
const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthouseController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class LighthouseController extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDK.TargetManager.SDKModelObserver<SDK.ServiceWorkerManager.ServiceWorkerManager> {
  private readonly protocolService: ProtocolService;
  private manager?: SDK.ServiceWorkerManager.ServiceWorkerManager|null;
  private serviceWorkerListeners?: Common.EventTarget.EventDescriptor[];
  private inspectedURL?: Platform.DevToolsPath.UrlString;
  private currentLighthouseRun?: LighthouseRun;
  private emulationStateBefore?: {
    emulation: {
      type: EmulationModel.DeviceModeModel.Type,
      enabled: boolean,
      outlineEnabled: boolean,
      toolbarControlsEnabled: boolean,
      scale: number,
      device: EmulationModel.EmulatedDevices.EmulatedDevice|null,
      mode: EmulationModel.EmulatedDevices.Mode|null,
    },
    network: {conditions: SDK.NetworkManager.Conditions},
  };

  constructor(protocolService: ProtocolService) {
    super();

    this.protocolService = protocolService;
    protocolService.registerStatusCallback(
        message => this.dispatchEventToListeners(Events.AuditProgressChanged, {message}));

    for (const preset of Presets) {
      preset.setting.addChangeListener(this.recomputePageAuditability.bind(this));
    }

    for (const runtimeSetting of RuntimeSettings) {
      runtimeSetting.setting.addChangeListener(this.recomputePageAuditability.bind(this));
    }

    const javaScriptDisabledSetting = Common.Settings.Settings.instance().moduleSetting('javaScriptDisabled');
    javaScriptDisabledSetting.addChangeListener(this.recomputePageAuditability.bind(this));

    SDK.TargetManager.TargetManager.instance().observeModels(SDK.ServiceWorkerManager.ServiceWorkerManager, this);
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.InspectedURLChanged, this.recomputePageAuditability, this);
  }

  modelAdded(serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager): void {
    if (serviceWorkerManager.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }

    this.manager = serviceWorkerManager;
    this.serviceWorkerListeners = [
      this.manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationUpdated, this.recomputePageAuditability, this),
      this.manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationDeleted, this.recomputePageAuditability, this),
    ];

    this.recomputePageAuditability();
  }

  modelRemoved(serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager): void {
    if (this.manager !== serviceWorkerManager) {
      return;
    }
    if (this.serviceWorkerListeners) {
      Common.EventTarget.removeEventListeners(this.serviceWorkerListeners);
    }
    this.manager = null;
    this.recomputePageAuditability();
  }

  private hasActiveServiceWorker(): boolean {
    if (!this.manager) {
      return false;
    }

    const mainTarget = this.manager.target();
    if (!mainTarget) {
      return false;
    }

    const inspectedURL = Common.ParsedURL.ParsedURL.fromString(mainTarget.inspectedURL());
    const inspectedOrigin = inspectedURL && inspectedURL.securityOrigin();
    for (const registration of this.manager.registrations().values()) {
      if (registration.securityOrigin !== inspectedOrigin) {
        continue;
      }

      for (const version of registration.versions.values()) {
        if (version.controlledClients.length > 1) {
          return true;
        }
      }
    }

    return false;
  }

  private hasAtLeastOneCategory(): boolean {
    return Presets.some(preset => preset.setting.get());
  }

  private unauditablePageMessage(): string|null {
    if (!this.manager) {
      return null;
    }

    const mainTarget = this.manager.target();
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
    /*
     * The full history of Lighthouse panel + extensions et al:
     *
     * Running Lighthouse against extensions caused crashes (crbug.com/734532), so we disabled it in Aug 2017
     * Unfortunately, the CAN_DOCK heuristic used also disabled auditing any page while remote-debugging.
     * FYI: The CAN_DOCK signal is what determines if the device-mode functionality (viewport emulation) should be shown in the UI.
     *
     * In Sept 2017 we allow-listed http* and chrome-extension URLs formally: crrev.com/c/639032
     * This added support for chrome-extension:// pages (not overlays/popups) as they satisfy CAN_DOCK.
     *
     * We wanted remote-debugging support restored, and the crashes were fixed,
     * so we renabled auditing in all CAN_DOCK cases in Feb 2019 (crbug.com/931849). This included all chrome extensions views.
     *
     * Auditing overlay windows/popups cause problems with viewport emulation (eg crbug.com/1116347)
     * And even full-page extension tabs (like OneTab) have NO_NAVSTART problems and others (crbug.com/1065323)
     * So in in April 2023 we blocked all chrome-extension cases.
     */
    // Only http*, thus disallow: chrome-extension://*, about:*, chrome://dino, file://*, devtools://*, etc.
    if (!inspectedURL?.startsWith('http')) {
      return i18nString(UIStrings.canOnlyAuditHttphttpsPages);
    }

    // Catch .pdf. TODO: handle other MimeHandler extensions. crbug.com/1168245
    try {
      const isPdf = new URL(inspectedURL).pathname.endsWith('.pdf');
      if (isPdf) {
        return i18nString(UIStrings.canOnlyAuditHttphttpsPages);
      }
    } catch (e) {
      return i18nString(UIStrings.canOnlyAuditHttphttpsPages);
    }

    return null;
  }

  private javaScriptDisabled(): boolean {
    return Common.Settings.Settings.instance().moduleSetting('javaScriptDisabled').get();
  }

  private async hasImportantResourcesNotCleared(): Promise<string> {
    const clearStorageSetting =
        RuntimeSettings.find(runtimeSetting => runtimeSetting.setting.name === 'lighthouse.clear_storage');
    if (clearStorageSetting && !clearStorageSetting.setting.get()) {
      return '';
    }
    if (!this.manager) {
      return '';
    }
    const mainTarget = this.manager.target();
    const origin = mainTarget.inspectedURL();
    if (!origin) {
      return '';
    }
    const usageData = await mainTarget.storageAgent().invoke_getUsageAndQuota({origin});
    if (usageData.getError()) {
      return '';
    }
    const locations = usageData.usageBreakdown.filter(usage => usage.usage)
                          .map(usage => STORAGE_TYPE_NAMES.get(usage.storageType))
                          .map(i18nStringFn => i18nStringFn ? i18nStringFn() : undefined)
                          .filter(Boolean);
    if (locations.length === 1) {
      return i18nString(UIStrings.thereMayBeStoredDataAffectingSingular, {PH1: String(locations[0])});
    }
    if (locations.length > 1) {
      return i18nString(UIStrings.thereMayBeStoredDataAffectingLoadingPlural, {PH1: locations.join(', ')});
    }
    return '';
  }

  private async evaluateInspectedURL(): Promise<Platform.DevToolsPath.UrlString> {
    if (!this.manager) {
      return Platform.DevToolsPath.EmptyUrlString;
    }
    const mainTarget = this.manager.target();
    // target.inspectedURL is reliably populated, however it lacks any url #hash
    const inspectedURL = mainTarget.inspectedURL();

    // We'll use the navigationHistory to acquire the current URL including hash
    const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const navHistory = resourceTreeModel && await resourceTreeModel.navigationHistory();
    if (!resourceTreeModel || !navHistory) {
      return inspectedURL;
    }

    const {currentIndex, entries} = navHistory;
    const navigationEntry = entries[currentIndex];
    return navigationEntry.url as Platform.DevToolsPath.UrlString;
  }

  getCurrentRun(): LighthouseRun|undefined {
    return this.currentLighthouseRun;
  }

  getFlags(): {
    formFactor: (string|undefined),
    mode: string,
  } {
    const flags = {};
    for (const runtimeSetting of RuntimeSettings) {
      runtimeSetting.setFlags(flags, runtimeSetting.setting.get());
    }
    return flags as {
      formFactor: (string | undefined),
      mode: string,
    };
  }

  getCategoryIDs(): string[] {
    const categoryIDs = [];
    for (const preset of Presets) {
      if (preset.setting.get()) {
        categoryIDs.push(preset.configID);
      }
    }
    return categoryIDs;
  }

  async getInspectedURL(options?: {force: boolean}): Promise<Platform.DevToolsPath.UrlString> {
    if (options && options.force || !this.inspectedURL) {
      this.inspectedURL = await this.evaluateInspectedURL();
    }
    return this.inspectedURL;
  }

  recomputePageAuditability(): void {
    const hasActiveServiceWorker = this.hasActiveServiceWorker();
    const hasAtLeastOneCategory = this.hasAtLeastOneCategory();
    const unauditablePageMessage = this.unauditablePageMessage();
    const javaScriptDisabled = this.javaScriptDisabled();

    let helpText = '';
    if (hasActiveServiceWorker) {
      helpText = i18nString(UIStrings.multipleTabsAreBeingControlledBy);
    } else if (!hasAtLeastOneCategory) {
      helpText = i18nString(UIStrings.atLeastOneCategoryMustBeSelected);
    } else if (unauditablePageMessage) {
      helpText = unauditablePageMessage;
    } else if (javaScriptDisabled) {
      helpText = i18nString(UIStrings.javaScriptDisabled);
    }

    this.dispatchEventToListeners(Events.PageAuditabilityChanged, {helpText});

    void this.hasImportantResourcesNotCleared().then(warning => {
      if (this.getFlags().mode !== 'navigation') {
        warning = '';
      }
      this.dispatchEventToListeners(Events.PageWarningsChanged, {warning});
    });
  }

  private recordMetrics(flags: {mode: string}, categoryIds: string[]): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.LighthouseStarted);

    for (const preset of Presets) {
      if (!categoryIds.includes(preset.configID)) {
        continue;
      }
      Host.userMetrics.lighthouseCategoryUsed(preset.userMetric);
    }

    switch (flags.mode) {
      case 'navigation':
        Host.userMetrics.lighthouseModeRun(Host.UserMetrics.LighthouseModeRun.Navigation);
        break;
      case 'timespan':
        Host.userMetrics.lighthouseModeRun(Host.UserMetrics.LighthouseModeRun.Timespan);
        break;
      case 'snapshot':
        Host.userMetrics.lighthouseModeRun(Host.UserMetrics.LighthouseModeRun.Snapshot);
        break;
    }
  }

  async startLighthouse(): Promise<void> {
    try {
      const inspectedURL = await this.getInspectedURL({force: true});
      const categoryIDs = this.getCategoryIDs();
      const flags = this.getFlags();

      this.recordMetrics(flags, categoryIDs);

      this.currentLighthouseRun = {inspectedURL, categoryIDs, flags};

      await this.setupEmulationAndProtocolConnection();

      if (flags.mode === 'timespan') {
        await this.protocolService.startTimespan(this.currentLighthouseRun);
      }
    } catch (err) {
      await this.restoreEmulationAndProtocolConnection();
      throw err;
    }
  }

  async collectLighthouseResults(): Promise<RunnerResult> {
    try {
      if (!this.currentLighthouseRun) {
        throw new Error('Lighthouse is not started');
      }

      const lighthouseResponse = await this.protocolService.collectLighthouseResults(this.currentLighthouseRun);
      if (!lighthouseResponse) {
        throw new Error('Auditing failed to produce a result');
      }

      if (lighthouseResponse.fatal) {
        const error = new Error(lighthouseResponse.message);
        error.stack = lighthouseResponse.stack;
        throw error;
      }

      Host.userMetrics.actionTaken(Host.UserMetrics.Action.LighthouseFinished);

      await this.restoreEmulationAndProtocolConnection();
      return lighthouseResponse;
    } catch (err) {
      await this.restoreEmulationAndProtocolConnection();
      throw err;
    } finally {
      this.currentLighthouseRun = undefined;
    }
  }

  async cancelLighthouse(): Promise<void> {
    await this.restoreEmulationAndProtocolConnection();
    this.currentLighthouseRun = undefined;
  }

  /**
   * We set the device emulation on the DevTools-side for two reasons:
   * 1. To workaround some odd device metrics emulation bugs like occuluding viewports
   * 2. To get the attractive device outline
   */
  private async setupEmulationAndProtocolConnection(): Promise<void> {
    const flags = this.getFlags();

    const emulationModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    this.emulationStateBefore = {
      emulation: {
        type: emulationModel.type(),
        enabled: emulationModel.enabledSetting().get(),
        outlineEnabled: emulationModel.deviceOutlineSetting().get(),
        toolbarControlsEnabled: emulationModel.toolbarControlsEnabledSetting().get(),
        scale: emulationModel.scaleSetting().get(),
        device: emulationModel.device(),
        mode: emulationModel.mode(),
      },
      network: {conditions: SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions()},
    };

    emulationModel.toolbarControlsEnabledSetting().set(false);
    if ('formFactor' in flags && flags.formFactor === 'desktop') {
      emulationModel.enabledSetting().set(false);
      emulationModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
    } else if (flags.formFactor === 'mobile') {
      emulationModel.enabledSetting().set(true);
      emulationModel.deviceOutlineSetting().set(true);

      for (const device of EmulationModel.EmulatedDevices.EmulatedDevicesList.instance().standard()) {
        if (device.title === 'Moto G Power') {
          emulationModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0], 1);
        }
      }
    }

    await this.protocolService.attach();
  }

  private async restoreEmulationAndProtocolConnection(): Promise<void> {
    if (!this.currentLighthouseRun) {
      return;
    }

    await this.protocolService.detach();

    if (this.emulationStateBefore) {
      const emulationModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance();

      // Detaching a session after overriding device metrics will prevent other sessions from overriding device metrics in the future.
      // A workaround is to call "Emulation.clearDeviceMetricOverride" which is the result of the next line.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=1337089
      emulationModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);

      const {type, enabled, outlineEnabled, toolbarControlsEnabled, scale, device, mode} =
          this.emulationStateBefore.emulation;
      emulationModel.enabledSetting().set(enabled);
      emulationModel.deviceOutlineSetting().set(outlineEnabled);
      emulationModel.toolbarControlsEnabledSetting().set(toolbarControlsEnabled);

      // `emulate` will ignore the `scale` parameter for responsive emulation.
      // In this case we can just set it here.
      if (type === EmulationModel.DeviceModeModel.Type.Responsive) {
        emulationModel.scaleSetting().set(scale);
      }

      emulationModel.emulate(type, device, mode, scale);

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(
          this.emulationStateBefore.network.conditions);
      delete this.emulationStateBefore;
    }

    Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance().update(true);

    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return;
    }

    // Reload to reset page state after a navigation.
    // We want to retain page state for timespan and snapshot modes.
    const mode = this.currentLighthouseRun.flags.mode;
    if (mode === 'navigation') {
      const inspectedURL = await this.getInspectedURL();
      await resourceTreeModel.navigate(inspectedURL);
    }
  }
}

const STORAGE_TYPE_NAMES = new Map([
  [Protocol.Storage.StorageType.Local_storage, i18nLazyString(UIStrings.localStorage)],
  [Protocol.Storage.StorageType.Indexeddb, i18nLazyString(UIStrings.indexeddb)],
  [Protocol.Storage.StorageType.Websql, i18nLazyString(UIStrings.webSql)],
]);

export const Presets: Preset[] = [
  // configID maps to Lighthouse's Object.keys(config.categories)[0] value
  {
    setting: Common.Settings.Settings.instance().createSetting(
        'lighthouse.cat_perf', true, Common.Settings.SettingStorageType.Synced),
    configID: 'performance',
    title: i18nLazyString(UIStrings.performance),
    description: i18nLazyString(UIStrings.howLongDoesThisAppTakeToShow),
    plugin: false,
    supportedModes: ['navigation', 'timespan', 'snapshot'],
    userMetric: Host.UserMetrics.LighthouseCategoryUsed.Performance,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting(
        'lighthouse.cat_a11y', true, Common.Settings.SettingStorageType.Synced),
    configID: 'accessibility',
    title: i18nLazyString(UIStrings.accessibility),
    description: i18nLazyString(UIStrings.isThisPageUsableByPeopleWith),
    plugin: false,
    supportedModes: ['navigation', 'snapshot'],
    userMetric: Host.UserMetrics.LighthouseCategoryUsed.Accessibility,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting(
        'lighthouse.cat_best_practices', true, Common.Settings.SettingStorageType.Synced),
    configID: 'best-practices',
    title: i18nLazyString(UIStrings.bestPractices),
    description: i18nLazyString(UIStrings.doesThisPageFollowBestPractices),
    plugin: false,
    supportedModes: ['navigation', 'timespan', 'snapshot'],
    userMetric: Host.UserMetrics.LighthouseCategoryUsed.BestPractices,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting(
        'lighthouse.cat_seo', true, Common.Settings.SettingStorageType.Synced),
    configID: 'seo',
    title: i18nLazyString(UIStrings.seo),
    description: i18nLazyString(UIStrings.isThisPageOptimizedForSearch),
    plugin: false,
    supportedModes: ['navigation', 'snapshot'],
    userMetric: Host.UserMetrics.LighthouseCategoryUsed.SEO,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting(
        'lighthouse.cat_pwa', true, Common.Settings.SettingStorageType.Synced),
    configID: 'pwa',
    title: i18nLazyString(UIStrings.progressiveWebApp),
    description: i18nLazyString(UIStrings.doesThisPageMeetTheStandardOfA),
    plugin: false,
    supportedModes: ['navigation'],
    userMetric: Host.UserMetrics.LighthouseCategoryUsed.PWA,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting(
        'lighthouse.cat_pubads', false, Common.Settings.SettingStorageType.Synced),
    plugin: true,
    configID: 'lighthouse-plugin-publisher-ads',
    title: i18nLazyString(UIStrings.publisherAds),
    description: i18nLazyString(UIStrings.isThisPageOptimizedForAdSpeedAnd),
    supportedModes: ['navigation'],
    userMetric: Host.UserMetrics.LighthouseCategoryUsed.PubAds,
  },
];

export type Flags = {
  [flag: string]: string|boolean,
};

export const RuntimeSettings: RuntimeSetting[] = [
  {
    setting: Common.Settings.Settings.instance().createSetting(
        'lighthouse.device_type', 'mobile', Common.Settings.SettingStorageType.Synced),
    title: i18nLazyString(UIStrings.applyMobileEmulation),
    description: i18nLazyString(UIStrings.applyMobileEmulationDuring),
    setFlags: (flags: Flags, value: string|boolean): void => {
      // See Audits.AuditsPanel._setupEmulationAndProtocolConnection()
      flags.formFactor = value;
    },
    options: [
      {label: i18nLazyString(UIStrings.mobile), value: 'mobile'},
      {label: i18nLazyString(UIStrings.desktop), value: 'desktop'},
    ],
    learnMore: undefined,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting(
        'lighthouse.mode', 'navigation', Common.Settings.SettingStorageType.Synced),
    title: i18nLazyString(UIStrings.lighthouseMode),
    description: i18nLazyString(UIStrings.runLighthouseInMode),
    setFlags: (flags: Flags, value: string|boolean): void => {
      flags.mode = value;
    },
    options: [
      {
        label: i18nLazyString(UIStrings.navigation),
        tooltip: i18nLazyString(UIStrings.navigationTooltip),
        value: 'navigation',
      },
      {
        label: i18nLazyString(UIStrings.timespan),
        tooltip: i18nLazyString(UIStrings.timespanTooltip),
        value: 'timespan',
      },
      {
        label: i18nLazyString(UIStrings.snapshot),
        tooltip: i18nLazyString(UIStrings.snapshotTooltip),
        value: 'snapshot',
      },
    ],
    learnMore: 'https://github.com/GoogleChrome/lighthouse/blob/HEAD/docs/user-flows.md' as
        Platform.DevToolsPath.UrlString,
  },
  {
    // This setting is disabled, but we keep it around to show in the UI.
    setting: Common.Settings.Settings.instance().createSetting(
        'lighthouse.throttling', 'simulate', Common.Settings.SettingStorageType.Synced),
    title: i18nLazyString(UIStrings.throttlingMethod),
    // We will disable this when we have a Lantern trace viewer within DevTools.
    learnMore:
        'https://github.com/GoogleChrome/lighthouse/blob/master/docs/throttling.md#devtools-lighthouse-panel-throttling' as
        Platform.DevToolsPath.UrlString,
    description: i18nLazyString(UIStrings.simulateASlowerPageLoadBasedOn),
    setFlags: (flags: Flags, value: string|boolean): void => {
      if (typeof value === 'string') {
        flags.throttlingMethod = value;
      } else {
        flags.throttlingMethod = value ? 'simulate' : 'devtools';
      }
    },
    options: [
      {label: i18nLazyString(UIStrings.simulatedThrottling), value: 'simulate'},
      {label: i18nLazyString(UIStrings.devtoolsThrottling), value: 'devtools'},
    ],
  },
  {
    setting: Common.Settings.Settings.instance().createSetting(
        'lighthouse.clear_storage', true, Common.Settings.SettingStorageType.Synced),
    title: i18nLazyString(UIStrings.clearStorage),
    description: i18nLazyString(UIStrings.resetStorageLocalstorage),
    setFlags: (flags: Flags, value: string|boolean): void => {
      flags.disableStorageReset = !value;
    },
    options: undefined,
    learnMore: undefined,
  },
];

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  PageAuditabilityChanged = 'PageAuditabilityChanged',
  PageWarningsChanged = 'PageWarningsChanged',
  AuditProgressChanged = 'AuditProgressChanged',
}

export interface PageAuditabilityChangedEvent {
  helpText: string;
}

export interface PageWarningsChangedEvent {
  warning: string;
}

export interface AuditProgressChangedEvent {
  message: string;
}

export type EventTypes = {
  [Events.PageAuditabilityChanged]: PageAuditabilityChangedEvent,
  [Events.PageWarningsChanged]: PageWarningsChangedEvent,
  [Events.AuditProgressChanged]: AuditProgressChangedEvent,
};

export interface Preset {
  setting: Common.Settings.Setting<boolean>;
  configID: string;
  title: () => Common.UIString.LocalizedString;
  description: () => Common.UIString.LocalizedString;
  plugin: boolean;
  supportedModes: string[];
  userMetric: Host.UserMetrics.LighthouseCategoryUsed;
}
export interface RuntimeSetting {
  setting: Common.Settings.Setting<string|boolean>;
  description: () => Common.UIString.LocalizedString;
  setFlags: (flags: Flags, value: string|boolean) => void;
  options?: {
    label: () => Common.UIString.LocalizedString,
    value: string,
    tooltip?: () => Common.UIString.LocalizedString,
  }[];
  title?: () => Common.UIString.LocalizedString;
  learnMore?: Platform.DevToolsPath.UrlString;
}
