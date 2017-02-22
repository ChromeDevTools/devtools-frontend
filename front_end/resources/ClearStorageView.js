// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Resources.ClearStorageView = class extends UI.VBox {
  /**
   * @param {!Resources.ResourcesPanel} resourcesPanel
   */
  constructor(resourcesPanel) {
    super(true);

    this._resourcesPanel = resourcesPanel;
    this._reportView = new UI.ReportView(Common.UIString('Clear storage'));
    this._reportView.registerRequiredCSS('resources/clearStorageView.css');
    this._reportView.element.classList.add('clear-storage-header');
    this._reportView.show(this.contentElement);

    this._settings = new Map();
    for (var type
             of [Protocol.Storage.StorageType.Appcache, Protocol.Storage.StorageType.Cache_storage,
                 Protocol.Storage.StorageType.Cookies, Protocol.Storage.StorageType.Indexeddb,
                 Protocol.Storage.StorageType.Local_storage, Protocol.Storage.StorageType.Service_workers,
                 Protocol.Storage.StorageType.Websql])
      this._settings.set(type, Common.settings.createSetting('clear-storage-' + type, true));


    var application = this._reportView.appendSection(Common.UIString('Application'));
    this._appendItem(application, Common.UIString('Unregister service workers'), 'service_workers');

    var storage = this._reportView.appendSection(Common.UIString('Storage'));
    this._appendItem(storage, Common.UIString('Local and session storage'), 'local_storage');
    this._appendItem(storage, Common.UIString('Indexed DB'), 'indexeddb');
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
    var securityOriginManager = SDK.SecurityOriginManager.fromTarget(target);
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
    var securityOriginManager = SDK.SecurityOriginManager.fromTarget(target);
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
  }

  _clear() {
    var storageTypes = [];
    for (var type of this._settings.keys()) {
      if (this._settings.get(type).get())
        storageTypes.push(type);
    }

    this._target.storageAgent().clearDataForOrigin(this._securityOrigin, storageTypes.join(','));

    var set = new Set(storageTypes);
    var hasAll = set.has(Protocol.Storage.StorageType.All);
    if (set.has(Protocol.Storage.StorageType.Cookies) || hasAll)
      SDK.CookieModel.fromTarget(this._target).clear();

    if (set.has(Protocol.Storage.StorageType.Indexeddb) || hasAll) {
      for (var target of SDK.targetManager.targets()) {
        var indexedDBModel = Resources.IndexedDBModel.fromTarget(target);
        if (indexedDBModel)
          indexedDBModel.clearForOrigin(this._securityOrigin);
      }
    }

    if (set.has(Protocol.Storage.StorageType.Local_storage) || hasAll) {
      var storageModel = Resources.DOMStorageModel.fromTarget(this._target);
      if (storageModel)
        storageModel.clearForOrigin(this._securityOrigin);
    }

    if (set.has(Protocol.Storage.StorageType.Websql) || hasAll) {
      var databaseModel = Resources.DatabaseModel.fromTarget(this._target);
      if (databaseModel) {
        databaseModel.disable();
        databaseModel.enable();
      }
    }

    if (set.has(Protocol.Storage.StorageType.Cache_storage) || hasAll) {
      var target = SDK.targetManager.mainTarget();
      var model = target && SDK.ServiceWorkerCacheModel.fromTarget(target);
      if (model)
        model.clearForOrigin(this._securityOrigin);
    }

    if (set.has(Protocol.Storage.StorageType.Appcache) || hasAll) {
      var appcacheModel = Resources.ApplicationCacheModel.fromTarget(this._target);
      if (appcacheModel)
        appcacheModel.reset();
    }

    this._clearButton.disabled = true;
    this._clearButton.textContent = Common.UIString('Clearing...');
    setTimeout(() => {
      this._clearButton.disabled = false;
      this._clearButton.textContent = Common.UIString('Clear selected');
    }, 500);
  }
};
