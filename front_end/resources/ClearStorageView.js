// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 */
Resources.ClearStorageView = class extends UI.ThrottledWidget {
  constructor() {
    super(true, 1000);
    this._pieColors = [
      'rgba(110, 161, 226, 1)',  // blue
      'rgba(229, 113, 113, 1)',  // red
      'rgba(239, 196, 87, 1)',   // yellow
      'rgba(155, 127, 230, 1)',  // purple
      'rgba(116, 178, 102, 1)',  // green
      'rgba(255, 167, 36, 1)',   // orange
      'rgba(203, 220, 56, 1)',   // lime
    ];

    this._reportView = new UI.ReportView(Common.UIString('Clear storage'));
    this._reportView.registerRequiredCSS('resources/clearStorageView.css');
    this._reportView.element.classList.add('clear-storage-header');
    this._reportView.show(this.contentElement);
    /** @type {?SDK.Target} */
    this._target = null;
    /** @type {?string} */
    this._securityOrigin = null;

    this._settings = new Map();
    for (var type
             of [Protocol.Storage.StorageType.Appcache, Protocol.Storage.StorageType.Cache_storage,
                 Protocol.Storage.StorageType.Cookies, Protocol.Storage.StorageType.Indexeddb,
                 Protocol.Storage.StorageType.Local_storage, Protocol.Storage.StorageType.Service_workers,
                 Protocol.Storage.StorageType.Websql])
      this._settings.set(type, Common.settings.createSetting('clear-storage-' + type, true));

    var quota = this._reportView.appendSection(Common.UIString('Usage'));
    this._quotaRow = quota.appendRow();
    this._pieChart = new PerfUI.PieChart(110, Number.bytesToString, true);
    this._pieChartLegend = createElementWithClass('div', 'legend');
    var usageBreakdownRow = quota.appendRow();
    usageBreakdownRow.appendChild(this._pieChart.element);
    usageBreakdownRow.appendChild(this._pieChartLegend);

    var application = this._reportView.appendSection(Common.UIString('Application'));
    this._appendItem(application, Common.UIString('Unregister service workers'), 'service_workers');

    var storage = this._reportView.appendSection(Common.UIString('Storage'));
    this._appendItem(storage, Common.UIString('Local and session storage'), 'local_storage');
    this._appendItem(storage, Common.UIString('IndexedDB'), 'indexeddb');
    this._appendItem(storage, Common.UIString('Web SQL'), 'websql');
    this._appendItem(storage, Common.UIString('Cookies'), 'cookies');

    var caches = this._reportView.appendSection(Common.UIString('Cache'));
    this._appendItem(caches, Common.UIString('Cache storage'), 'cache_storage');
    this._appendItem(caches, Common.UIString('Application cache'), 'appcache');

    SDK.targetManager.observeTargets(this, SDK.Target.Capability.Browser);
    var footer = this._reportView.appendSection('', 'clear-storage-button').appendRow();
    this._clearButton = UI.createTextButton(
        Common.UIString('Clear site data'), this._clear.bind(this), Common.UIString('Clear site data'));
    footer.appendChild(this._clearButton);
  }

  /**
   * @param {!UI.ReportView.Section} section
   * @param {string} title
   * @param {string} settingName
   */
  _appendItem(section, title, settingName) {
    var row = section.appendRow();
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
    var securityOriginManager = target.model(SDK.SecurityOriginManager);
    this._updateOrigin(securityOriginManager.mainSecurityOrigin());
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
    var securityOriginManager = target.model(SDK.SecurityOriginManager);
    securityOriginManager.removeEventListener(
        SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this._originChanged, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _originChanged(event) {
    var origin = /** *@type {string} */ (event.data);
    this._updateOrigin(origin);
  }

  /**
   * @param {string} url
   */
  _updateOrigin(url) {
    this._securityOrigin = new Common.ParsedURL(url).securityOrigin();
    this._reportView.setSubtitle(this._securityOrigin);
    this.doUpdate();
  }

  _clear() {
    if (!this._securityOrigin)
      return;
    var storageTypes = [];
    for (var type of this._settings.keys()) {
      if (this._settings.get(type).get())
        storageTypes.push(type);
    }

    this._target.storageAgent().clearDataForOrigin(this._securityOrigin, storageTypes.join(','));

    var set = new Set(storageTypes);
    var hasAll = set.has(Protocol.Storage.StorageType.All);
    if (set.has(Protocol.Storage.StorageType.Cookies) || hasAll) {
      var cookieModel = this._target.model(SDK.CookieModel);
      if (cookieModel)
        cookieModel.clear();
    }

    if (set.has(Protocol.Storage.StorageType.Indexeddb) || hasAll) {
      for (var target of SDK.targetManager.targets()) {
        var indexedDBModel = target.model(Resources.IndexedDBModel);
        if (indexedDBModel)
          indexedDBModel.clearForOrigin(this._securityOrigin);
      }
    }

    if (set.has(Protocol.Storage.StorageType.Local_storage) || hasAll) {
      var storageModel = this._target.model(Resources.DOMStorageModel);
      if (storageModel)
        storageModel.clearForOrigin(this._securityOrigin);
    }

    if (set.has(Protocol.Storage.StorageType.Websql) || hasAll) {
      var databaseModel = this._target.model(Resources.DatabaseModel);
      if (databaseModel) {
        databaseModel.disable();
        databaseModel.enable();
      }
    }

    if (set.has(Protocol.Storage.StorageType.Cache_storage) || hasAll) {
      var target = SDK.targetManager.mainTarget();
      var model = target && target.model(SDK.ServiceWorkerCacheModel);
      if (model)
        model.clearForOrigin(this._securityOrigin);
    }

    if (set.has(Protocol.Storage.StorageType.Appcache) || hasAll) {
      var appcacheModel = this._target.model(Resources.ApplicationCacheModel);
      if (appcacheModel)
        appcacheModel.reset();
    }

    this._clearButton.disabled = true;
    var label = this._clearButton.textContent;
    this._clearButton.textContent = Common.UIString('Clearing...');
    setTimeout(() => {
      this._clearButton.disabled = false;
      this._clearButton.textContent = label;
    }, 500);
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  async doUpdate() {
    if (!this._securityOrigin)
      return;

    var securityOrigin = /** @type {string} */ (this._securityOrigin);
    var response = await this._target.storageAgent().invoke_getUsageAndQuota({origin: securityOrigin});
    if (response[Protocol.Error]) {
      this._quotaRow.textContent = '';
      this._resetPieChart(0);
      return;
    }
    this._quotaRow.textContent = Common.UIString(
        '%s used out of %s storage quota', Number.bytesToString(response.usage), Number.bytesToString(response.quota));

    this._resetPieChart(response.usage);
    var colorIndex = 0;
    for (var usageForType of response.usageBreakdown) {
      if (!usageForType.usage)
        continue;
      if (colorIndex === this._pieColors.length)
        colorIndex = 0;
      this._appendLegendRow(
          this._getStorageTypeName(usageForType.storageType), usageForType.usage, this._pieColors[colorIndex++]);
    }

    this._usageUpdatedForTest(response.usage, response.quota, response.usageBreakdown);
    this.update();
  }

  _formatPieChartBytes(value) {
    return Number.bytesToString(value);
  }

  /**
   * @param {number} total
   */
  _resetPieChart(total) {
    this._pieChart.setTotal(total);
    this._pieChartLegend.removeChildren();
  }

  /**
   * @param {string} title
   * @param {number} value
   * @param {string} color
   */
  _appendLegendRow(title, value, color) {
    if (!value)
      return;
    this._pieChart.addSlice(value, color);
    var rowElement = this._pieChartLegend.createChild('div');
    rowElement.createChild('span', 'usage-breakdown-legend-value').textContent = Number.bytesToString(value);
    rowElement.createChild('span', 'usage-breakdown-legend-swatch').style.backgroundColor = color;
    rowElement.createChild('span', 'usage-breakdown-legend-title').textContent = title;
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
