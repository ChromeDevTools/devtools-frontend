// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver<!SDK.ServiceWorkerManager>}
 * @unrestricted
 */
Audits.AuditController = class extends Common.Object {
  constructor(protocolService) {
    super();

    protocolService.registerStatusCallback(
        message => this.dispatchEventToListeners(Audits.Events.AuditProgressChanged, {message}));

    for (const preset of Audits.Presets)
      preset.setting.addChangeListener(this.recomputePageAuditability.bind(this));

    SDK.targetManager.observeModels(SDK.ServiceWorkerManager, this);
    SDK.targetManager.addEventListener(
        SDK.TargetManager.Events.InspectedURLChanged, this.recomputePageAuditability, this);
  }

  /**
   * @override
   * @param {!SDK.ServiceWorkerManager} serviceWorkerManager
   */
  modelAdded(serviceWorkerManager) {
    if (this._manager)
      return;

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
   * @param {!SDK.ServiceWorkerManager} serviceWorkerManager
   */
  modelRemoved(serviceWorkerManager) {
    if (this._manager !== serviceWorkerManager)
      return;

    Common.EventTarget.removeEventListeners(this._serviceWorkerListeners);
    this._manager = null;
    this.recomputePageAuditability();
  }

  /**
   * @return {boolean}
   */
  _hasActiveServiceWorker() {
    if (!this._manager)
      return false;

    const mainTarget = this._manager.target();
    if (!mainTarget)
      return false;

    const inspectedURL = mainTarget.inspectedURL().asParsedURL();
    const inspectedOrigin = inspectedURL && inspectedURL.securityOrigin();
    for (const registration of this._manager.registrations().values()) {
      if (registration.securityOrigin !== inspectedOrigin)
        continue;

      for (const version of registration.versions.values()) {
        if (version.controlledClients.length > 1)
          return true;
      }
    }

    return false;
  }

  /**
   * @return {boolean}
   */
  _hasAtLeastOneCategory() {
    return Audits.Presets.some(preset => preset.setting.get());
  }

  /**
   * @return {?string}
   */
  _unauditablePageMessage() {
    if (!this._manager)
      return null;

    const mainTarget = this._manager.target();
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (inspectedURL && !/^(http|chrome-extension)/.test(inspectedURL)) {
      return Common.UIString(
          'Can only audit HTTP/HTTPS pages and Chrome extensions. Navigate to a different page to start an audit.');
    }

    return null;
  }

  /**
   * @return {!Promise<string>}
   */
  async _evaluateInspectedURL() {
    const mainTarget = this._manager.target();
    const runtimeModel = mainTarget.model(SDK.RuntimeModel);
    const executionContext = runtimeModel && runtimeModel.defaultExecutionContext();
    let inspectedURL = mainTarget.inspectedURL();
    if (!executionContext)
      return inspectedURL;

    // Evaluate location.href for a more specific URL than inspectedURL provides so that SPA hash navigation routes
    // will be respected and audited.
    try {
      const result = await executionContext.evaluate(
          {
            expression: 'window.location.href',
            objectGroup: 'audits',
            includeCommandLineAPI: false,
            silent: false,
            returnByValue: true,
            generatePreview: false
          },
          /* userGesture */ false, /* awaitPromise */ false);
      if (!result.exceptionDetails && result.object) {
        inspectedURL = result.object.value;
        result.object.release();
      }
    } catch (err) {
      console.error(err);
    }

    return inspectedURL;
  }

  /**
   * @return {!Object}
   */
  getFlags() {
    const flags = {
      // DevTools handles all the emulation. This tells Lighthouse to not bother with emulation.
      deviceScreenEmulationMethod: 'provided'
    };
    for (const runtimeSetting of Audits.RuntimeSettings)
      runtimeSetting.setFlags(flags, runtimeSetting.setting.get());
    return flags;
  }

  /**
   * @return {!Array<string>}
   */
  getCategoryIDs() {
    const categoryIDs = [];
    for (const preset of Audits.Presets) {
      if (preset.setting.get())
        categoryIDs.push(preset.configID);
    }
    return categoryIDs;
  }

  /**
   * @param {{force: boolean}=} options
   * @return {!Promise<string>}
   */
  async getInspectedURL(options) {
    if (options && options.force || !this._inspectedURL)
      this._inspectedURL = await this._evaluateInspectedURL();
    return this._inspectedURL;
  }

  recomputePageAuditability() {
    const hasActiveServiceWorker = this._hasActiveServiceWorker();
    const hasAtLeastOneCategory = this._hasAtLeastOneCategory();
    const unauditablePageMessage = this._unauditablePageMessage();

    let helpText = '';
    if (hasActiveServiceWorker) {
      helpText = Common.UIString(
          'Multiple tabs are being controlled by the same service worker. Close your other tabs on the same origin to audit this page.');
    } else if (!hasAtLeastOneCategory) {
      helpText = Common.UIString('At least one category must be selected.');
    } else if (unauditablePageMessage) {
      helpText = unauditablePageMessage;
    }

    this.dispatchEventToListeners(Audits.Events.PageAuditabilityChanged, {helpText});
  }
};


/** @typedef {{setting: !Common.Setting, configID: string, title: string, description: string}} */
Audits.Preset;

/** @type {!Array.<!Audits.Preset>} */
Audits.Presets = [
  // configID maps to Lighthouse's Object.keys(config.categories)[0] value
  {
    setting: Common.settings.createSetting('audits.cat_perf', true),
    configID: 'performance',
    title: ls`Performance`,
    description: ls`How long does this app take to show content and become usable`
  },
  {
    setting: Common.settings.createSetting('audits.cat_pwa', true),
    configID: 'pwa',
    title: ls`Progressive Web App`,
    description: ls`Does this page meet the standard of a Progressive Web App`
  },
  {
    setting: Common.settings.createSetting('audits.cat_best_practices', true),
    configID: 'best-practices',
    title: ls`Best practices`,
    description: ls`Does this page follow best practices for modern web development`
  },
  {
    setting: Common.settings.createSetting('audits.cat_a11y', true),
    configID: 'accessibility',
    title: ls`Accessibility`,
    description: ls`Is this page usable by people with disabilities or impairments`
  },
  {
    setting: Common.settings.createSetting('audits.cat_seo', true),
    configID: 'seo',
    title: ls`SEO`,
    description: ls`Is this page optimized for search engine results ranking`
  },
];

/** @typedef {{setting: !Common.Setting, description: string, setFlags: function(!Object, string), options: (!Array|undefined), title: (string|undefined)}} */
Audits.RuntimeSetting;

/** @type {!Array.<!Audits.RuntimeSetting>} */
Audits.RuntimeSettings = [
  {
    setting: Common.settings.createSetting('audits.device_type', 'mobile'),
    description: ls`Apply mobile emulation during auditing`,
    setFlags: (flags, value) => {
      // See Audits.AuditsPanel._setupEmulationAndProtocolConnection()
      flags.emulatedFormFactor = value;
    },
    options: [
      {label: ls`Mobile`, value: 'mobile'},
      {label: ls`Desktop`, value: 'desktop'},
    ],
  },
  {
    setting: Common.settings.createSetting('audits.throttling', 'default'),
    setFlags: (flags, value) => {
      switch (value) {
        case 'devtools':
          flags.throttlingMethod = 'devtools';
          break;
        case 'off':
          flags.throttlingMethod = 'provided';
          break;
        default:
          flags.throttlingMethod = 'simulate';
      }
    },
    options: [
      {
        label: ls`Simulated Slow 4G, 4x CPU Slowdown`,
        value: 'default',
        title: ls`Throttling is simulated, resulting in faster audit runs with similar measurement accuracy`
      },
      {
        label: ls`Applied Slow 4G, 4x CPU Slowdown`,
        value: 'devtools',
        title: ls`Typical DevTools throttling, with actual traffic shaping and CPU slowdown applied`
      },
      {
        label: ls`No throttling`,
        value: 'off',
        title: ls`No network or CPU throttling used. (Useful when not evaluating performance)`
      },
    ],
  },
  {
    setting: Common.settings.createSetting('audits.clear_storage', true),
    title: ls`Clear storage`,
    description: ls`Reset storage (localStorage, IndexedDB, etc) before auditing. (Good for performance & PWA testing)`,
    setFlags: (flags, value) => {
      flags.disableStorageReset = !value;
    },
  },
];

Audits.Events = {
  PageAuditabilityChanged: Symbol('PageAuditabilityChanged'),
  AuditProgressChanged: Symbol('AuditProgressChanged'),
  RequestAuditStart: Symbol('RequestAuditStart'),
  RequestAuditCancel: Symbol('RequestAuditCancel'),
};
