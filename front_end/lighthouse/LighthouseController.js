// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

import {ProtocolService} from './LighthouseProtocolService.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.ServiceWorkerManager.ServiceWorkerManager>}
 * @unrestricted
 */
export class LighthouseController extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!ProtocolService} protocolService
   */
  constructor(protocolService) {
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

  /**
   * @override
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerManager} serviceWorkerManager
   */
  modelAdded(serviceWorkerManager) {
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

  /**
   * @override
   * @param {!SDK.ServiceWorkerManager.ServiceWorkerManager} serviceWorkerManager
   */
  modelRemoved(serviceWorkerManager) {
    if (this._manager !== serviceWorkerManager) {
      return;
    }
    if (this._serviceWorkerListeners) {
      Common.EventTarget.EventTarget.removeEventListeners(this._serviceWorkerListeners);
    }
    this._manager = null;
    this.recomputePageAuditability();
  }

  /**
   * @return {boolean}
   */
  _hasActiveServiceWorker() {
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

  /**
   * @return {boolean}
   */
  _hasAtLeastOneCategory() {
    return Presets.some(preset => preset.setting.get());
  }

  /**
   * @return {?string}
   */
  _unauditablePageMessage() {
    if (!this._manager) {
      return null;
    }

    const mainTarget = this._manager.target();
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (inspectedURL && !/^(http|chrome-extension)/.test(inspectedURL)) {
      return Common.UIString.UIString(
          'Can only audit HTTP/HTTPS pages and Chrome extensions. Navigate to a different page to start an audit.');
    }

    return null;
  }

  /**
   * @return {!Promise<string>}
   */
  async _hasImportantResourcesNotCleared() {
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
      return Common.UIString.UIString(
          'There may be stored data affecting loading performance in this location: %s. Audit this page in an incognito window to prevent those resources from affecting your scores.',
          locations.join(', '));
    }
    if (locations.length > 1) {
      return Common.UIString.UIString(
          'There may be stored data affecting loading performance in these locations: %s. Audit this page in an incognito window to prevent those resources from affecting your scores.',
          locations.join(', '));
    }
    return '';
  }

  /**
   * @return {!Promise<string>}
   */
  async _evaluateInspectedURL() {
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

  /**
   * @return {{internalDisableDeviceScreenEmulation: boolean, emulatedFormFactor: (string|undefined)}}
   */
  getFlags() {
    const flags = {
      // DevTools handles all the emulation. This tells Lighthouse to not bother with emulation.
      internalDisableDeviceScreenEmulation: true
    };
    for (const runtimeSetting of RuntimeSettings) {
      runtimeSetting.setFlags(flags, runtimeSetting.setting.get());
    }
    return /** @type {{internalDisableDeviceScreenEmulation: boolean, emulatedFormFactor: (string|undefined)}} */ (
        flags);
  }

  /**
   * @return {!Array<string>}
   */
  getCategoryIDs() {
    const categoryIDs = [];
    for (const preset of Presets) {
      if (preset.setting.get()) {
        categoryIDs.push(preset.configID);
      }
    }
    return categoryIDs;
  }

  /**
   * @param {{force: boolean}=} options
   * @return {!Promise<string>}
   */
  async getInspectedURL(options) {
    if (options && options.force || !this._inspectedURL) {
      this._inspectedURL = await this._evaluateInspectedURL();
    }
    return this._inspectedURL;
  }

  recomputePageAuditability() {
    const hasActiveServiceWorker = this._hasActiveServiceWorker();
    const hasAtLeastOneCategory = this._hasAtLeastOneCategory();
    const unauditablePageMessage = this._unauditablePageMessage();

    let helpText = '';
    if (hasActiveServiceWorker) {
      helpText = Common.UIString.UIString(
          'Multiple tabs are being controlled by the same service worker. Close your other tabs on the same origin to audit this page.');
    } else if (!hasAtLeastOneCategory) {
      helpText = Common.UIString.UIString('At least one category must be selected.');
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
  [Protocol.Storage.StorageType.Local_storage, Common.UIString.UIString('Local Storage')],
  [Protocol.Storage.StorageType.Indexeddb, Common.UIString.UIString('IndexedDB')],
  [Protocol.Storage.StorageType.Websql, Common.UIString.UIString('Web SQL')],
]);

/** @type {!Array.<!Preset>} */
export const Presets = [
  // configID maps to Lighthouse's Object.keys(config.categories)[0] value
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_perf', true),
    configID: 'performance',
    title: ls`Performance`,
    description: ls`How long does this app take to show content and become usable`,
    plugin: false,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_pwa', true),
    configID: 'pwa',
    title: ls`Progressive Web App`,
    description: ls`Does this page meet the standard of a Progressive Web App`,
    plugin: false,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_best_practices', true),
    configID: 'best-practices',
    title: ls`Best practices`,
    description: ls`Does this page follow best practices for modern web development`,
    plugin: false,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_a11y', true),
    configID: 'accessibility',
    title: ls`Accessibility`,
    description: ls`Is this page usable by people with disabilities or impairments`,
    plugin: false,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_seo', true),
    configID: 'seo',
    title: ls`SEO`,
    description: ls`Is this page optimized for search engine results ranking`,
    plugin: false,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.cat_pubads', false),
    plugin: true,
    configID: 'lighthouse-plugin-publisher-ads',
    title: ls`Publisher Ads`,
    description: ls`Is this page optimized for ad speed and quality`
  },
];

/** @type {!Array.<!RuntimeSetting>} */
export const RuntimeSettings = [
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.device_type', 'mobile'),
    title: ls`Apply mobile emulation`,
    description: ls`Apply mobile emulation during auditing`,
    setFlags: (flags, value) => {
      // See Audits.AuditsPanel._setupEmulationAndProtocolConnection()
      flags.emulatedFormFactor = value;
    },
    options: [
      {label: ls`Mobile`, value: 'mobile'},
      {label: ls`Desktop`, value: 'desktop'},
    ],
    learnMore: undefined,
  },
  {
    // This setting is disabled, but we keep it around to show in the UI.
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.throttling', true),
    title: ls`Simulated throttling`,
    // We will disable this when we have a Lantern trace viewer within DevTools.
    learnMore:
        'https://github.com/GoogleChrome/lighthouse/blob/master/docs/throttling.md#devtools-lighthouse-panel-throttling',
    description: ls
    `Simulate a slower page load, based on data from an initial unthrottled load. If disabled, the page is actually slowed with applied throttling.`,
    setFlags: (flags, value) => {
      flags.throttlingMethod = value ? 'simulate' : 'devtools';
    },
    options: undefined,
  },
  {
    setting: Common.Settings.Settings.instance().createSetting('lighthouse.clear_storage', true),
    title: ls`Clear storage`,
    description: ls`Reset storage (localStorage, IndexedDB, etc) before auditing. (Good for performance & PWA testing)`,
    setFlags: (flags, value) => {
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

    /** @typedef {{setting: !Common.Settings.Setting<?>, configID: string, title: string, description: string, plugin: boolean}} */
    // @ts-ignore typedef
    export let Preset;

    /** @typedef {{setting: !Common.Settings.Setting<?>, description: string, setFlags: function(!Object<string, *>, string):void, options: (!Array<?>|undefined), title: (string|undefined), learnMore: (string|undefined)}} */
    // @ts-ignore typedef
    export let RuntimeSetting;
