// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.SDKModelObserver<!SDK.ServiceWorkerManager>}
 * @unrestricted
 */
Resources.ServiceWorkersView = class extends UI.VBox {
  constructor() {
    super(true);

    this._reportView = new UI.ReportView(Common.UIString('Service Workers'));
    this._reportView.show(this.contentElement);

    this._toolbar = this._reportView.createToolbar();
    this._toolbar.makeWrappable(false, true);

    /** @type {!Map<!SDK.ServiceWorkerRegistration, !Resources.ServiceWorkersView.Section>} */
    this._sections = new Map();

    this._toolbar.appendToolbarItem(NetworkConditions.NetworkConditionsSelector.createOfflineToolbarCheckbox());
    var updateOnReloadSetting = Common.settings.createSetting('serviceWorkerUpdateOnReload', false);
    updateOnReloadSetting.setTitle(Common.UIString('Update on reload'));
    var forceUpdate = new UI.ToolbarSettingCheckbox(
        updateOnReloadSetting, Common.UIString('Force update Service Worker on page reload'));
    this._toolbar.appendToolbarItem(forceUpdate);
    var bypassServiceWorkerSetting = Common.settings.createSetting('bypassServiceWorker', false);
    bypassServiceWorkerSetting.setTitle(Common.UIString('Bypass for network'));
    var fallbackToNetwork = new UI.ToolbarSettingCheckbox(
        bypassServiceWorkerSetting, Common.UIString('Bypass Service Worker and load resources from the network'));
    this._toolbar.appendToolbarItem(fallbackToNetwork);
    this._showAllCheckbox = new UI.ToolbarCheckbox(
        Common.UIString('Show all'), Common.UIString('Show all Service Workers regardless of the origin'));
    this._showAllCheckbox.setRightAligned(true);
    this._showAllCheckbox.inputElement.addEventListener('change', this._updateSectionVisibility.bind(this), false);
    this._toolbar.appendToolbarItem(this._showAllCheckbox);

    /** @type {!Map<!SDK.ServiceWorkerManager, !Array<!Common.EventTarget.EventDescriptor>>}*/
    this._eventListeners = new Map();
    SDK.targetManager.observeModels(SDK.ServiceWorkerManager, this);
  }

  /**
   * @override
   * @param {!SDK.ServiceWorkerManager} serviceWorkerManager
   */
  modelAdded(serviceWorkerManager) {
    if (this._manager)
      return;
    this._manager = serviceWorkerManager;
    this._securityOriginManager = SDK.SecurityOriginManager.fromTarget(serviceWorkerManager.target());

    for (var registration of this._manager.registrations().values())
      this._updateRegistration(registration);

    this._eventListeners.set(serviceWorkerManager, [
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationUpdated, this._registrationUpdated, this),
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationDeleted, this._registrationDeleted, this),
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationErrorAdded, this._registrationErrorAdded, this),
      this._securityOriginManager.addEventListener(
          SDK.SecurityOriginManager.Events.SecurityOriginAdded, this._updateSectionVisibility, this),
      this._securityOriginManager.addEventListener(
          SDK.SecurityOriginManager.Events.SecurityOriginRemoved, this._updateSectionVisibility, this),
    ]);
  }

  /**
   * @override
   * @param {!SDK.ServiceWorkerManager} serviceWorkerManager
   */
  modelRemoved(serviceWorkerManager) {
    if (!this._manager || this._manager !== serviceWorkerManager)
      return;

    Common.EventTarget.removeEventListeners(this._eventListeners.get(serviceWorkerManager));
    this._eventListeners.delete(serviceWorkerManager);
    this._manager = null;
    this._securityOriginManager = null;
  }

  _updateSectionVisibility() {
    var securityOrigins = new Set(this._securityOriginManager.securityOrigins());
    for (var section of this._sections.values()) {
      var visible = this._showAllCheckbox.checked() || securityOrigins.has(section._registration.securityOrigin);
      section._section.element.classList.toggle('hidden', !visible);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _registrationUpdated(event) {
    var registration = /** @type {!SDK.ServiceWorkerRegistration} */ (event.data);
    this._updateRegistration(registration);
    this._gcRegistrations();
  }

  _gcRegistrations() {
    var hasNonDeletedRegistrations = false;
    var securityOrigins = new Set(this._securityOriginManager.securityOrigins());
    for (var registration of this._manager.registrations().values()) {
      var visible = this._showAllCheckbox.checked() || securityOrigins.has(registration.securityOrigin);
      if (!visible)
        continue;
      if (!registration.canBeRemoved()) {
        hasNonDeletedRegistrations = true;
        break;
      }
    }

    if (!hasNonDeletedRegistrations)
      return;

    for (var registration of this._manager.registrations().values()) {
      var visible = this._showAllCheckbox.checked() || securityOrigins.has(registration.securityOrigin);
      if (visible && registration.canBeRemoved())
        this._removeRegistrationFromList(registration);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _registrationErrorAdded(event) {
    var registration = /** @type {!SDK.ServiceWorkerRegistration} */ (event.data['registration']);
    var error = /** @type {!Protocol.ServiceWorker.ServiceWorkerErrorMessage} */ (event.data['error']);
    var section = this._sections.get(registration);
    if (!section)
      return;
    section._addError(error);
  }

  /**
   * @param {!SDK.ServiceWorkerRegistration} registration
   */
  _updateRegistration(registration) {
    var section = this._sections.get(registration);
    if (!section) {
      section =
          new Resources.ServiceWorkersView.Section(this._manager, this._reportView.appendSection(''), registration);
      this._sections.set(registration, section);
    }
    this._updateSectionVisibility();
    section._scheduleUpdate();
  }

  /**
   * @param {!Common.Event} event
   */
  _registrationDeleted(event) {
    var registration = /** @type {!SDK.ServiceWorkerRegistration} */ (event.data);
    this._removeRegistrationFromList(registration);
  }

  /**
   * @param {!SDK.ServiceWorkerRegistration} registration
   */
  _removeRegistrationFromList(registration) {
    var section = this._sections.get(registration);
    if (section)
      section._section.remove();
    this._sections.delete(registration);
  }
};

/**
 * @unrestricted
 */
Resources.ServiceWorkersView.Section = class {
  /**
   * @param {!SDK.ServiceWorkerManager} manager
   * @param {!UI.ReportView.Section} section
   * @param {!SDK.ServiceWorkerRegistration} registration
   */
  constructor(manager, section, registration) {
    this._manager = manager;
    this._section = section;
    this._registration = registration;

    this._toolbar = section.createToolbar();
    this._toolbar.renderAsLinks();
    this._updateButton = new UI.ToolbarButton(Common.UIString('Update'), undefined, Common.UIString('Update'));
    this._updateButton.addEventListener(UI.ToolbarButton.Events.Click, this._updateButtonClicked, this);
    this._toolbar.appendToolbarItem(this._updateButton);
    this._pushButton = new UI.ToolbarButton(Common.UIString('Emulate push event'), undefined, Common.UIString('Push'));
    this._pushButton.addEventListener(UI.ToolbarButton.Events.Click, this._pushButtonClicked, this);
    this._toolbar.appendToolbarItem(this._pushButton);
    this._syncButton =
        new UI.ToolbarButton(Common.UIString('Emulate background sync event'), undefined, Common.UIString('Sync'));
    this._syncButton.addEventListener(UI.ToolbarButton.Events.Click, this._syncButtonClicked, this);
    this._toolbar.appendToolbarItem(this._syncButton);
    this._deleteButton =
        new UI.ToolbarButton(Common.UIString('Unregister service worker'), undefined, Common.UIString('Unregister'));
    this._deleteButton.addEventListener(UI.ToolbarButton.Events.Click, this._unregisterButtonClicked, this);
    this._toolbar.appendToolbarItem(this._deleteButton);

    // Preserve the order.
    this._section.appendField(Common.UIString('Source'));
    this._section.appendField(Common.UIString('Status'));
    this._section.appendField(Common.UIString('Clients'));
    this._section.appendField(Common.UIString('Errors'));
    this._errorsList = this._wrapWidget(this._section.appendRow());
    this._errorsList.classList.add('service-worker-error-stack', 'monospace', 'hidden');

    this._linkifier = new Components.Linkifier();
    /** @type {!Map<string, !Protocol.Target.TargetInfo>} */
    this._clientInfoCache = new Map();
    for (var error of registration.errors)
      this._addError(error);
    this._throttler = new Common.Throttler(500);
  }

  _scheduleUpdate() {
    if (Resources.ServiceWorkersView._noThrottle) {
      this._update();
      return;
    }
    this._throttler.schedule(this._update.bind(this));
  }

  /**
   * @param {string} versionId
   * @return {?SDK.Target}
   */
  _targetForVersionId(versionId) {
    var version = this._manager.findVersion(versionId);
    if (!version || !version.targetId)
      return null;
    return SDK.targetManager.targetById(version.targetId);
  }

  /**
   * @return {!Promise}
   */
  _update() {
    var fingerprint = this._registration.fingerprint();
    if (fingerprint === this._fingerprint)
      return Promise.resolve();
    this._fingerprint = fingerprint;

    this._toolbar.setEnabled(!this._registration.isDeleted);

    var versions = this._registration.versionsByMode();
    var title = this._registration.isDeleted ? Common.UIString('%s - deleted', this._registration.scopeURL) :
                                               this._registration.scopeURL;
    this._section.setTitle(title);

    var active = versions.get(SDK.ServiceWorkerVersion.Modes.Active);
    var waiting = versions.get(SDK.ServiceWorkerVersion.Modes.Waiting);
    var installing = versions.get(SDK.ServiceWorkerVersion.Modes.Installing);

    var statusValue = this._wrapWidget(this._section.appendField(Common.UIString('Status')));
    statusValue.removeChildren();
    var versionsStack = statusValue.createChild('div', 'service-worker-version-stack');
    versionsStack.createChild('div', 'service-worker-version-stack-bar');

    if (active) {
      var scriptElement = this._section.appendField(Common.UIString('Source'));
      scriptElement.removeChildren();
      var fileName = Common.ParsedURL.extractName(active.scriptURL);
      scriptElement.appendChild(Components.Linkifier.linkifyURL(active.scriptURL, fileName));
      scriptElement.createChild('div', 'report-field-value-subtitle').textContent =
          Common.UIString('Received %s', new Date(active.scriptResponseTime * 1000).toLocaleString());

      var activeEntry = versionsStack.createChild('div', 'service-worker-version');
      activeEntry.createChild('div', 'service-worker-active-circle');
      activeEntry.createChild('span').textContent =
          Common.UIString('#%s activated and is %s', active.id, active.runningStatus);

      if (active.isRunning() || active.isStarting()) {
        createLink(activeEntry, Common.UIString('stop'), this._stopButtonClicked.bind(this, active.id));
        if (!this._targetForVersionId(active.id))
          createLink(activeEntry, Common.UIString('inspect'), this._inspectButtonClicked.bind(this, active.id));
      } else if (active.isStartable()) {
        createLink(activeEntry, Common.UIString('start'), this._startButtonClicked.bind(this));
      }

      var clientsList = this._wrapWidget(this._section.appendField(Common.UIString('Clients')));
      clientsList.removeChildren();
      this._section.setFieldVisible(Common.UIString('Clients'), active.controlledClients.length);
      for (var client of active.controlledClients) {
        var clientLabelText = clientsList.createChild('div', 'service-worker-client');
        if (this._clientInfoCache.has(client)) {
          this._updateClientInfo(
              clientLabelText, /** @type {!Protocol.Target.TargetInfo} */ (this._clientInfoCache.get(client)));
        }
        this._manager.target().targetAgent().getTargetInfo(client, this._onClientInfo.bind(this, clientLabelText));
      }
    }

    if (waiting) {
      var waitingEntry = versionsStack.createChild('div', 'service-worker-version');
      waitingEntry.createChild('div', 'service-worker-waiting-circle');
      waitingEntry.createChild('span').textContent = Common.UIString('#%s waiting to activate', waiting.id);
      createLink(waitingEntry, Common.UIString('skipWaiting'), this._skipButtonClicked.bind(this));
      waitingEntry.createChild('div', 'service-worker-subtitle').textContent =
          new Date(waiting.scriptResponseTime * 1000).toLocaleString();
      if (!this._targetForVersionId(waiting.id) && (waiting.isRunning() || waiting.isStarting()))
        createLink(waitingEntry, Common.UIString('inspect'), this._inspectButtonClicked.bind(this, waiting.id));
    }
    if (installing) {
      var installingEntry = versionsStack.createChild('div', 'service-worker-version');
      installingEntry.createChild('div', 'service-worker-installing-circle');
      installingEntry.createChild('span').textContent = Common.UIString('#%s installing', installing.id);
      installingEntry.createChild('div', 'service-worker-subtitle').textContent =
          new Date(installing.scriptResponseTime * 1000).toLocaleString();
      if (!this._targetForVersionId(installing.id) && (installing.isRunning() || installing.isStarting()))
        createLink(installingEntry, Common.UIString('inspect'), this._inspectButtonClicked.bind(this, installing.id));
    }

    this._section.setFieldVisible(Common.UIString('Errors'), !!this._registration.errors.length);
    var errorsValue = this._wrapWidget(this._section.appendField(Common.UIString('Errors')));
    var errorsLabel = UI.createLabel(String(this._registration.errors.length), 'smallicon-error');
    errorsLabel.classList.add('service-worker-errors-label');
    errorsValue.appendChild(errorsLabel);
    this._moreButton = createLink(
        errorsValue,
        this._errorsList.classList.contains('hidden') ? Common.UIString('details') : Common.UIString('hide'),
        this._moreErrorsButtonClicked.bind(this));
    createLink(errorsValue, Common.UIString('clear'), this._clearErrorsButtonClicked.bind(this));

    /**
     * @param {!Element} parent
     * @param {string} title
     * @param {function()} listener
     * @return {!Element}
     */
    function createLink(parent, title, listener) {
      var span = parent.createChild('span', 'link');
      span.textContent = title;
      span.addEventListener('click', listener, false);
      return span;
    }
    return Promise.resolve();
  }

  /**
   * @param {!Protocol.ServiceWorker.ServiceWorkerErrorMessage} error
   */
  _addError(error) {
    var target = this._targetForVersionId(error.versionId);
    var message = this._errorsList.createChild('div');
    if (this._errorsList.childElementCount > 100)
      this._errorsList.firstElementChild.remove();
    message.appendChild(this._linkifier.linkifyScriptLocation(target, null, error.sourceURL, error.lineNumber));
    message.appendChild(UI.createLabel('#' + error.versionId + ': ' + error.errorMessage, 'smallicon-error'));
  }

  /**
   * @param {!Common.Event} event
   */
  _unregisterButtonClicked(event) {
    this._manager.deleteRegistration(this._registration.id);
  }

  /**
   * @param {!Common.Event} event
   */
  _updateButtonClicked(event) {
    this._manager.updateRegistration(this._registration.id);
  }

  /**
   * @param {!Common.Event} event
   */
  _pushButtonClicked(event) {
    var data = 'Test push message from DevTools.';
    this._manager.deliverPushMessage(this._registration.id, data);
  }

  /**
   * @param {!Common.Event} event
   */
  _syncButtonClicked(event) {
    var tag = 'test-tag-from-devtools';
    var lastChance = true;
    this._manager.dispatchSyncEvent(this._registration.id, tag, lastChance);
  }

  /**
   * @param {!Element} element
   * @param {?Protocol.Error} error
   * @param {?Protocol.Target.TargetInfo} targetInfo
   */
  _onClientInfo(element, error, targetInfo) {
    if (error || !targetInfo)
      return;
    this._clientInfoCache.set(targetInfo.targetId, targetInfo);
    this._updateClientInfo(element, targetInfo);
  }

  /**
   * @param {!Element} element
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  _updateClientInfo(element, targetInfo) {
    if (targetInfo.type !== 'page' && targetInfo.type === 'iframe') {
      element.createTextChild(Common.UIString('Worker: %s', targetInfo.url));
      return;
    }
    element.removeChildren();
    element.createTextChild(targetInfo.url);
    var focusLabel = element.createChild('label', 'link');
    focusLabel.createTextChild('focus');
    focusLabel.addEventListener('click', this._activateTarget.bind(this, targetInfo.targetId), true);
  }

  /**
   * @param {string} targetId
   */
  _activateTarget(targetId) {
    this._manager.target().targetAgent().activateTarget(targetId);
  }

  _startButtonClicked() {
    this._manager.startWorker(this._registration.scopeURL);
  }

  _skipButtonClicked() {
    this._manager.skipWaiting(this._registration.scopeURL);
  }

  /**
   * @param {string} versionId
   */
  _stopButtonClicked(versionId) {
    this._manager.stopWorker(versionId);
  }

  _moreErrorsButtonClicked() {
    var newVisible = this._errorsList.classList.contains('hidden');
    this._moreButton.textContent = newVisible ? Common.UIString('hide') : Common.UIString('details');
    this._errorsList.classList.toggle('hidden', !newVisible);
  }

  _clearErrorsButtonClicked() {
    this._errorsList.removeChildren();
    this._registration.clearErrors();
    this._scheduleUpdate();
    if (!this._errorsList.classList.contains('hidden'))
      this._moreErrorsButtonClicked();
  }

  /**
   * @param {string} versionId
   */
  _inspectButtonClicked(versionId) {
    this._manager.inspectWorker(versionId);
  }

  /**
   * @param {!Element} container
   * @return {!Element}
   */
  _wrapWidget(container) {
    var shadowRoot = UI.createShadowRootWithCoreStyles(container);
    UI.appendStyle(shadowRoot, 'resources/serviceWorkersView.css');
    var contentElement = createElement('div');
    shadowRoot.appendChild(contentElement);
    return contentElement;
  }
};
