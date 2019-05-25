// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.TargetManager.Observer}
 */
Resources.ClearStorageView = class extends UI.ThrottledWidget {
  constructor() {
    super(true, 1000);
    const types = Protocol.Storage.StorageType;
    this._pieColors = new Map([
      [types.Appcache, 'rgb(110, 161, 226)'],        // blue
      [types.Cache_storage, 'rgb(229, 113, 113)'],   // red
      [types.Cookies, 'rgb(239, 196, 87)'],          // yellow
      [types.Indexeddb, 'rgb(155, 127, 230)'],       // purple
      [types.Local_storage, 'rgb(116, 178, 102)'],   // green
      [types.Service_workers, 'rgb(255, 167, 36)'],  // orange
      [types.Websql, 'rgb(203, 220, 56)'],           // lime
    ]);

    this._reportView = new UI.ReportView(Common.UIString('Clear storage'));
    this._reportView.registerRequiredCSS('resources/clearStorageView.css');
    this._reportView.element.classList.add('clear-storage-header');
    this._reportView.show(this.contentElement);
    /** @type {?SDK.Target} */
    this._target = null;
    /** @type {?string} */
    this._securityOrigin = null;

    this._settings = new Map();
    for (const type of Resources.ClearStorageView.AllStorageTypes)
      this._settings.set(type, Common.settings.createSetting('clear-storage-' + type, true));

    const quota = this._reportView.appendSection(Common.UIString('Usage'));
    this._quotaRow = quota.appendSelectableRow();
    const learnMoreRow = quota.appendRow();
    const learnMore = UI.XLink.create(
        'https://developers.google.com/web/tools/chrome-devtools/progressive-web-apps#opaque-responses',
        ls`Learn more`);
    learnMoreRow.appendChild(learnMore);
    this._quotaUsage = null;
    this._pieChart = new PerfUI.PieChart(
        {chartName: ls`Storage Usage`, size: 110, formatter: Number.bytesToString, showLegend: true});
    const usageBreakdownRow = quota.appendRow();
    usageBreakdownRow.classList.add('usage-breakdown-row');
    usageBreakdownRow.appendChild(this._pieChart.element);

    const clearButtonSection = this._reportView.appendSection('', 'clear-storage-button').appendRow();
    this._clearButton = UI.createTextButton(ls`Clear site data`, this._clear.bind(this));
    clearButtonSection.appendChild(this._clearButton);

    const application = this._reportView.appendSection(Common.UIString('Application'));
    this._appendItem(application, Common.UIString('Unregister service workers'), 'service_workers');
    application.markFieldListAsGroup();

    const storage = this._reportView.appendSection(Common.UIString('Storage'));
    this._appendItem(storage, Common.UIString('Local and session storage'), 'local_storage');
    this._appendItem(storage, Common.UIString('IndexedDB'), 'indexeddb');
    this._appendItem(storage, Common.UIString('Web SQL'), 'websql');
    this._appendItem(storage, Common.UIString('Cookies'), 'cookies');
    storage.markFieldListAsGroup();

    const caches = this._reportView.appendSection(Common.UIString('Cache'));
    this._appendItem(caches, Common.UIString('Cache storage'), 'cache_storage');
    this._appendItem(caches, Common.UIString('Application cache'), 'appcache');
    caches.markFieldListAsGroup();

    SDK.targetManager.observeTargets(this);
  }

  /**
   * @param {!UI.ReportView.Section} section
   * @param {string} title
   * @param {string} settingName
   */
  _appendItem(section, title, settingName) {
    const row = section.appendRow();
    row.appendChild(UI.SettingsUI.createSettingCheckbox(title, this._settings.get(settingName), true));
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    if (this._target)
      return;
    this._target = target;
    const securityOriginManager = target.model(SDK.SecurityOriginManager);
    this._updateOrigin(
        securityOriginManager.mainSecurityOrigin(), securityOriginManager.unreachableMainSecurityOrigin());
    securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this._originChanged, this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    if (this._target !== target)
      return;
    const securityOriginManager = target.model(SDK.SecurityOriginManager);
    securityOriginManager.removeEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this._originChanged, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _originChanged(event) {
    const mainOrigin = /** *@type {string} */ (event.data.mainSecurityOrigin);
    const unreachableMainOrigin = /** @type {string} */ (event.data.unreachableMainSecurityOrigin);
    this._updateOrigin(mainOrigin, unreachableMainOrigin);
  }

  /**
   * @param {string} mainOrigin
   * @param {string} unreachableMainOrigin
   */
  _updateOrigin(mainOrigin, unreachableMainOrigin) {
    if (unreachableMainOrigin) {
      this._securityOrigin = unreachableMainOrigin;
      this._reportView.setSubtitle(ls`${unreachableMainOrigin} (failed to load)`);
    } else {
      this._securityOrigin = mainOrigin;
      this._reportView.setSubtitle(mainOrigin);
    }

    this.doUpdate();
  }

  _clear() {
    if (!this._securityOrigin)
      return;
    const selectedStorageTypes = [];
    for (const type of this._settings.keys()) {
      if (this._settings.get(type).get())
        selectedStorageTypes.push(type);
    }

    if (this._target)
      Resources.ClearStorageView.clear(this._target, this._securityOrigin, selectedStorageTypes);

    this._clearButton.disabled = true;
    const label = this._clearButton.textContent;
    this._clearButton.textContent = Common.UIString('Clearing...');
    setTimeout(() => {
      this._clearButton.disabled = false;
      this._clearButton.textContent = label;
    }, 500);
  }

  /**
   * @param {!SDK.Target} target
   * @param {string} securityOrigin
   * @param {!Array<string>} selectedStorageTypes
   */
  static clear(target, securityOrigin, selectedStorageTypes) {
    target.storageAgent().clearDataForOrigin(securityOrigin, selectedStorageTypes.join(','));

    const set = new Set(selectedStorageTypes);
    const hasAll = set.has(Protocol.Storage.StorageType.All);
    if (set.has(Protocol.Storage.StorageType.Cookies) || hasAll) {
      const cookieModel = target.model(SDK.CookieModel);
      if (cookieModel)
        cookieModel.clear();
    }

    if (set.has(Protocol.Storage.StorageType.Indexeddb) || hasAll) {
      for (const target of SDK.targetManager.targets()) {
        const indexedDBModel = target.model(Resources.IndexedDBModel);
        if (indexedDBModel)
          indexedDBModel.clearForOrigin(securityOrigin);
      }
    }

    if (set.has(Protocol.Storage.StorageType.Local_storage) || hasAll) {
      const storageModel = target.model(Resources.DOMStorageModel);
      if (storageModel)
        storageModel.clearForOrigin(securityOrigin);
    }

    if (set.has(Protocol.Storage.StorageType.Websql) || hasAll) {
      const databaseModel = target.model(Resources.DatabaseModel);
      if (databaseModel) {
        databaseModel.disable();
        databaseModel.enable();
      }
    }

    if (set.has(Protocol.Storage.StorageType.Cache_storage) || hasAll) {
      const target = SDK.targetManager.mainTarget();
      const model = target && target.model(SDK.ServiceWorkerCacheModel);
      if (model)
        model.clearForOrigin(securityOrigin);
    }

    if (set.has(Protocol.Storage.StorageType.Appcache) || hasAll) {
      const appcacheModel = target.model(Resources.ApplicationCacheModel);
      if (appcacheModel)
        appcacheModel.reset();
    }
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  async doUpdate() {
    if (!this._securityOrigin)
      return;

    const securityOrigin = /** @type {string} */ (this._securityOrigin);
    const response = await this._target.storageAgent().invoke_getUsageAndQuota({origin: securityOrigin});
    if (response[Protocol.Error]) {
      this._quotaRow.textContent = '';
      this._resetPieChart(0);
      return;
    }
    this._quotaRow.textContent = Common.UIString(
        '%s used out of %s storage quota.\u00a0', Number.bytesToString(response.usage),
        Number.bytesToString(response.quota));
    if (response.quota < 125829120) {  // 120 MB
      this._quotaRow.title = ls`Storage quota is limited in Incognito mode`;
      this._quotaRow.appendChild(UI.Icon.create('smallicon-info'));
    }

    if (!this._quotaUsage || this._quotaUsage !== response.usage) {
      this._quotaUsage = response.usage;
      this._resetPieChart(response.usage);
      for (const usageForType of response.usageBreakdown.sort((a, b) => b.usage - a.usage)) {
        const value = usageForType.usage;
        if (!value)
          continue;
        const title = this._getStorageTypeName(usageForType.storageType);
        const color = this._pieColors.get(usageForType.storageType) || '#ccc';
        this._pieChart.addSlice(value, color, title);
      }
    }

    this._usageUpdatedForTest(response.usage, response.quota, response.usageBreakdown);
    this.update();
  }

  /**
   * @param {number} total
   */
  _resetPieChart(total) {
    this._pieChart.setTotal(total);
  }

  /**
   * @param {string} type
   * @return {string}
   */
  _getStorageTypeName(type) {
    switch (type) {
      case Protocol.Storage.StorageType.File_systems:
        return Common.UIString('File System');
      case Protocol.Storage.StorageType.Websql:
        return Common.UIString('Web SQL');
      case Protocol.Storage.StorageType.Appcache:
        return Common.UIString('Application Cache');
      case Protocol.Storage.StorageType.Indexeddb:
        return Common.UIString('IndexedDB');
      case Protocol.Storage.StorageType.Cache_storage:
        return Common.UIString('Cache Storage');
      case Protocol.Storage.StorageType.Service_workers:
        return Common.UIString('Service Workers');
      default:
        return Common.UIString('Other');
    }
  }

  /**
   * @param {number} usage
   * @param {number} quota
   * @param {!Array<!Protocol.Storage.UsageForType>} usageBreakdown
   */
  _usageUpdatedForTest(usage, quota, usageBreakdown) {
  }
};

Resources.ClearStorageView.AllStorageTypes = [
  Protocol.Storage.StorageType.Appcache, Protocol.Storage.StorageType.Cache_storage,
  Protocol.Storage.StorageType.Cookies, Protocol.Storage.StorageType.Indexeddb,
  Protocol.Storage.StorageType.Local_storage, Protocol.Storage.StorageType.Service_workers,
  Protocol.Storage.StorageType.Websql
];

/**
 * @implements {UI.ActionDelegate}
 */
Resources.ClearStorageView.ActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'resources.clear':
        return this._handleClear();
    }
    return false;
  }

  /**
   * @return {boolean}
   */
  _handleClear() {
    const target = SDK.targetManager.mainTarget();
    if (!target)
      return false;
    const resourceTreeModel = target.model(SDK.ResourceTreeModel);
    if (!resourceTreeModel)
      return false;
    const securityOrigin = resourceTreeModel.getMainSecurityOrigin();
    if (!securityOrigin)
      return false;

    Resources.ClearStorageView.clear(target, securityOrigin, Resources.ClearStorageView.AllStorageTypes);
    return true;
  }
};
