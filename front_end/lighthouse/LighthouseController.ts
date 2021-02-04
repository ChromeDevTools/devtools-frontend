// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';

import {ProtocolService} from './LighthouseProtocolService.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Text in Lighthouse Controller
  */
  canOnlyAuditHttphttpsPagesAnd:
      'Can only audit HTTP/HTTPS pages and `Chrome` extensions. Navigate to a different page to start an audit.',
  /**
  *@description Text when stored data in one location may affect lighthouse run
  *@example {IndexedDB} PH1
  */
  thereMayBeStoredDataAffectingSingular:
      'There may be stored data affecting loading performance in this location: {PH1}. Audit this page in an incognito window to prevent those resources from affecting your scores.',
  /**
  *@description Text when stored data in multiple locations may affect lighthouse run
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
  localStorage: 'Local Storage',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  indexeddb: 'IndexedDB',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  webSql: 'Web SQL',
  /**
  *@description Text for the performance of something
  */
  performance: 'Performance',
  /**
  *@description Text in Lighthouse Controller
  */
  howLongDoesThisAppTakeToShow: 'How long does this app take to show content and become usable',
  /**
  *@description Text in Lighthouse Controller
  */
  progressiveWebApp: 'Progressive Web App',
  /**
  *@description Text in Lighthouse Controller
  */
  doesThisPageMeetTheStandardOfA: 'Does this page meet the standard of a Progressive Web App',
  /**
  *@description Text in Lighthouse Controller
  */
  bestPractices: 'Best practices',
  /**
  *@description Text in Lighthouse Controller
  */
  doesThisPageFollowBestPractices: 'Does this page follow best practices for modern web development',
  /**
  *@description Text for accessibility of the web page
  */
  accessibility: 'Accessibility',
  /**
  *@description Text in Lighthouse Controller
  */
  isThisPageUsableByPeopleWith: 'Is this page usable by people with disabilities or impairments',
  /**
  *@description Text in Lighthouse Controller
  */
  seo: 'SEO',
  /**
  *@description Text in Lighthouse Controller
  */
  isThisPageOptimizedForSearch: 'Is this page optimized for search engine results ranking',
  /**
  *@description Text in Lighthouse Controller
  */
  publisherAds: 'Publisher Ads',
  /**
  *@description Help text in Lighthouse Controller
  */
  isThisPageOptimizedForAdSpeedAnd: 'Is this page optimized for ad speed and quality',
  /**
  *@description Text in Lighthouse Controller
  */
  applyMobileEmulation: 'Apply mobile emulation',
  /**
  *@description Text in Lighthouse Controller
  */
  applyMobileEmulationDuring: 'Apply mobile emulation during auditing',
  /**
  *@description Text for the mobile platform, as opposed to desktop
  */
  mobile: 'Mobile',
  /**
  *@description Text for the desktop platform, as opposed to mobile
  */
  desktop: 'Desktop',
  /**
  *@description Text for option to enable simulated throttling in Lighthouse Panel
  */
  simulatedThrottling: 'Simulated throttling',
  /**
  *@description Tooltip text that appears when hovering over the 'Simulated Throttling' checkbox in the settings pane opened by clicking the setting cog in the start view of the audits panel
  */
  simulateASlowerPageLoadBasedOn:
      'Simulate a slower page load, based on data from an initial unthrottled load. If disabled, the page is actually slowed with applied throttling.',
  /**
  *@description Text to clear storage of the web page
  */
  clearStorage: 'Clear storage',
  /**
  *@description Text in Lighthouse Controller
  */
  resetStorageLocalstorage:
      'Reset storage (localStorage, IndexedDB, etc) before auditing. (Good for performance & PWA testing)',
};
const str_ = i18n.i18n.registerUIStrings('lighthouse/LighthouseController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class LighthouseController extends Common.ObjectWrapper.ObjectWrapper implements
    SDK.SDKModel.SDKModelObserver<SDK.ServiceWorkerManager.ServiceWorkerManager> {
  _manager?: SDK.ServiceWorkerManager.ServiceWorkerManager|null;
  _serviceWorkerListeners?: Common.EventTarget.EventDescriptor[];
  _inspectedURL?: string;

  constructor(protocolService: ProtocolService) {
    super();

    protocolService.registerStatusCallback(
        message => this.dispatchEventToListeners(Events.AuditProgressChanged, {message}));

    for (const preset of Presets) {
      preset.setting.addChangeListener(this.recomputePageAuditability.bind(this));
    }

    for (const runtimeSetting of RuntimeSettings) {
      runtimeSetting.setting.addChangeListener(this.recomputePageAuditability.bind(this));
    }

    SDK.SDKModel.TargetManager.instance().observeModels(SDK.ServiceWorkerManager.ServiceWorkerManager, this);
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.InspectedURLChanged, this.recomputePageAuditability, this);
  }

  modelAdded(serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager): void {
    if (this._manager) {
      return;
    }

    this._manager = serviceWorkerManager;
    this._serviceWorkerListeners = [
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationUpdated, this.recomputePageAuditability, this),
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationDeleted, this.recomputePageAuditability, this),
    ];

    this.recomputePageAuditability();
  }

  modelRemoved(serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager): void {
    if (this._manager !== serviceWorkerManager) {
      return;
    }
    if (this._serviceWorkerListeners) {
      Common.EventTarget.EventTarget.removeEventListeners(this._serviceWorkerListeners);
    }
    this._manager = null;
    this.recomputePageAuditability();
  }

  _hasActiveServiceWorker(): boolean {
    if (!this._manager) {
      return false;
    }

    const mainTarget = this._manager.target();
    if (!mainTarget) {
      return false;
    }

    const inspectedURL = Common.ParsedURL.ParsedURL.fromString(mainTarget.inspectedURL());
    const inspectedOrigin = inspectedURL && inspectedURL.securityOrigin();
    for (const registration of this._manager.registrations().values()) {
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

  _hasAtLeastOneCategory(): boolean {
    return Presets.some(preset => preset.setting.get());
  }

  _unauditablePageMessage(): string|null {
    if (!this._manager) {
      return null;
    }

    const mainTarget = this._manager.target();
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (inspectedURL && !/^(http|chrome-extension)/.test(inspectedURL)) {
      return i18nString(UIStrings.canOnlyAuditHttphttpsPagesAnd);
    }

    return null;
  }

  async _hasImportantResourcesNotCleared(): Promise<string> {
    const clearStorageSetting =
        RuntimeSettings.find(runtimeSetting => runtimeSetting.setting.name === 'lighthouse.clear_storage');
    if (clearStorageSetting && !clearStorageSetting.setting.get()) {
      return '';
    }
    if (!this._manager) {
      return '';
    }
    const mainTarget = this._manager.target();
    const usageData = await mainTarget.storageAgent().invoke_getUsageAndQuota({origin: mainTarget.inspectedURL()});
    const locations = usageData.usageBreakdown.filter(usage => usage.usage)
                          .map(usage => STORAGE_TYPE_NAMES.get(usage.storageType))
                          .filter(Boolean);
    if (locations.length === 1) {
      return i18nString(UIStrings.thereMayBeStoredDataAffectingSingular, {PH1: locations[0]});
    }
    if (locations.length > 1) {
      return i18nString(UIStrings.thereMayBeStoredDataAffectingLoadingPlural, {PH1: locations.join(', ')});
    }
    return '';
  }

  async _evaluateInspectedURL(): Promise<string> {
    if (!this._manager) {
      return '';
    }
    const mainTarget = this._manager.target();
    const runtimeModel = mainTarget.model(SDK.RuntimeModel.RuntimeModel);
    const executionContext = runtimeModel && runtimeModel.defaultExecutionContext();
    let inspectedURL = mainTarget.inspectedURL();
    if (!executionContext) {
      return inspectedURL;
    }

    // Evaluate location.href for a more specific URL than inspectedURL provides so that SPA hash navigation routes
    // will be respected and audited.
    try {
      const result = await executionContext.evaluate(
          {
            expression: 'window.location.href',
            objectGroup: 'lighthouse',
            includeCommandLineAPI: false,
            silent: false,
            returnByValue: true,
            generatePreview: false,
            allowUnsafeEvalBlockedByCSP: undefined,
            disableBreaks: undefined,
            replMode: undefined,
            throwOnSideEffect: undefined,
            timeout: undefined,
          },
          /* userGesture */ false, /* awaitPromise */ false);
      if ((!('exceptionDetails' in result) || !result.exceptionDetails) && 'object' in result && result.object) {
        inspectedURL = result.object.value;
        result.object.release();
      }
    } catch (err) {
      console.error(err);
    }

    return inspectedURL;
  }

  getFlags(): {internalDisableDeviceScreenEmulation: boolean, emulatedFormFactor: (string|undefined)} {
    const flags = {
      // DevTools handles all the emulation. This tells Lighthouse to not bother with emulation.
      internalDisableDeviceScreenEmulation: true,
    };
    for (const runtimeSetting of RuntimeSettings) {
      runtimeSetting.setFlags(flags, runtimeSetting.setting.get());
    }
    return /** @type {{internalDisableDeviceScreenEmulation: boolean, emulatedFormFactor: (string|undefined)}} */ flags as
        {
          internalDisableDeviceScreenEmulation: boolean,
          emulatedFormFactor: (string | undefined),
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

  async getInspectedURL(options?: {force: boolean}): Promise<string> {
    if (options && options.force || !this._inspectedURL) {
      this._inspectedURL = await this._evaluateInspectedURL();
    }
    return this._inspectedURL;
  }

  recomputePageAuditability(): void {
    const hasActiveServiceWorker = this._hasActiveServiceWorker();
    const hasAtLeastOneCategory = this._hasAtLeastOneCategory();
    const unauditablePageMessage = this._unauditablePageMessage();

    let helpText = '';
    if (hasActiveServiceWorker) {
      helpText = i18nString(UIStrings.multipleTabsAreBeingControlledBy);
    } else if (!hasAtLeastOneCategory) {
      helpText = i18nString(UIStrings.atLeastOneCategoryMustBeSelected);
    } else if (unauditablePageMessage) {
      helpText = unauditablePageMessage;
    }

    this.dispatchEventToListeners(Events.PageAuditabilityChanged, {helpText});

    this._hasImportantResourcesNotCleared().then(warning => {
      this.dispatchEventToListeners(Events.PageWarningsChanged, {warning});
    });
  }
}

const STORAGE_TYPE_NAMES = new Map([
  [Protocol.Storage.StorageType.Local_storage, i18nString(UIStrings.localStorage)],
  [Protocol.Storage.StorageType.Indexeddb, i18nString(UIStrings.indexeddb)],
  [Protocol.Storage.StorageType.Websql, i18nString(UIStrings.webSql)],
]);

export const Presets: Preset[] = [
  // configID maps to Lighthouse's Object.keys(config.categories)[0] value
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_perf', true),
    configID: 'performance',
    title: i18nString(UIStrings.performance),
    description: i18nString(UIStrings.howLongDoesThisAppTakeToShow),
    plugin: false,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_pwa', true),
    configID: 'pwa',
    title: i18nString(UIStrings.progressiveWebApp),
    description: i18nString(UIStrings.doesThisPageMeetTheStandardOfA),
    plugin: false,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_best_practices', true),
    configID: 'best-practices',
    title: i18nString(UIStrings.bestPractices),
    description: i18nString(UIStrings.doesThisPageFollowBestPractices),
    plugin: false,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_a11y', true),
    configID: 'accessibility',
    title: i18nString(UIStrings.accessibility),
    description: i18nString(UIStrings.isThisPageUsableByPeopleWith),
    plugin: false,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_seo', true),
    configID: 'seo',
    title: i18nString(UIStrings.seo),
    description: i18nString(UIStrings.isThisPageOptimizedForSearch),
    plugin: false,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_pubads', false),
    plugin: true,
    configID: 'lighthouse-plugin-publisher-ads',
    title: i18nString(UIStrings.publisherAds),
    description: i18nString(UIStrings.isThisPageOptimizedForAdSpeedAnd),
  },
];

export type Flags = {
  [flag: string]: string|boolean,
};

export const RuntimeSettings: RuntimeSetting[] = [
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.device_type', 'mobile'),
    title: i18nString(UIStrings.applyMobileEmulation),
    description: i18nString(UIStrings.applyMobileEmulationDuring),
    setFlags: (flags: Flags, value: string|boolean): void => {
      // See Audits.AuditsPanel._setupEmulationAndProtocolConnection()
      flags.emulatedFormFactor = value;
    },
    options: [
      {label: i18nString(UIStrings.mobile), value: 'mobile'},
      {label: i18nString(UIStrings.desktop), value: 'desktop'},
    ],
    learnMore: undefined,
  },
  {
    // This setting is disabled, but we keep it around to show in the UI.
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.throttling', true),
    title: i18nString(UIStrings.simulatedThrottling),
    // We will disable this when we have a Lantern trace viewer within DevTools.
    learnMore:
        'https://github.com/GoogleChrome/lighthouse/blob/master/docs/throttling.md#devtools-lighthouse-panel-throttling',
    description: i18nString(UIStrings.simulateASlowerPageLoadBasedOn),
    setFlags: (flags: Flags, value: string|boolean): void => {
      flags.throttlingMethod = value ? 'simulate' : 'devtools';
    },
    options: undefined,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.clear_storage', true),
    title: i18nString(UIStrings.clearStorage),
    description: i18nString(UIStrings.resetStorageLocalstorage),
    setFlags: (flags: Flags, value: string|boolean): void => {
      flags.disableStorageReset = !value;
    },
    options: undefined,
    learnMore: undefined,
  },
];

export const Events = {
  PageAuditabilityChanged: Symbol('PageAuditabilityChanged'),
  PageWarningsChanged: Symbol('PageWarningsChanged'),
  AuditProgressChanged: Symbol('AuditProgressChanged'),
  RequestLighthouseStart: Symbol('RequestLighthouseStart'),
  RequestLighthouseCancel: Symbol('RequestLighthouseCancel'),
};
export interface Preset {
  setting: Common.Settings.Setting<boolean>;
  configID: string;
  title: string;
  description: string;
  plugin: boolean;
}
export interface RuntimeSetting {
  setting: Common.Settings.Setting<string|boolean>;
  description: string;
  setFlags: (flags: Flags, value: string|boolean) => void;
  options?: {label: string, value: string}[];
  title?: string;
  learnMore?: string;
}
