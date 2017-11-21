// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.SDKModelObserver<!SDK.ServiceWorkerManager>}
 */
Resources.ServiceWorkersView = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('resources/serviceWorkersView.css');

    this._currentWorkersView = new UI.ReportView(Common.UIString('Service Workers'));
    this.contentElement.classList.add('service-worker-list');
    this._currentWorkersView.show(this.contentElement);
    this._currentWorkersView.element.classList.add('service-workers-this-origin');

    this._toolbar = this._currentWorkersView.createToolbar();
    this._toolbar.makeWrappable(false, true);

    /** @type {!Map<!SDK.ServiceWorkerRegistration, !Resources.ServiceWorkersView.Section>} */
    this._sections = new Map();

    /** @type {?SDK.ServiceWorkerManager} */
    this._manager = null;
    /** @type {?SDK.SecurityOriginManager} */
    this._securityOriginManager = null;

    this._filterThrottler = new Common.Throttler(300);

    this._otherWorkers = this.contentElement.createChild('div', 'service-workers-other-origin');
    var filterElement = this._otherWorkers.createChild('div', 'service-worker-filter');
    this._checkboxElement = filterElement.createChild('input', 'service-worker-filter-show-all-checkbox');
    this._checkboxElement.type = 'checkbox';
    this._checkboxElement.setAttribute('id', 'expand-all');
    this._textElement = filterElement.createChild('label', 'service-worker-filter-label');
    this._textElement.textContent = Common.UIString('Service workers from other domains');
    this._textElement.setAttribute('for', 'expand-all');
    this._checkboxElement.addEventListener('change', () => this._filterChanged());

    var toolbar = new UI.Toolbar('service-worker-filter-toolbar', filterElement);
    this._filter = new UI.ToolbarInput('Filter', 1);
    this._filter.addEventListener(UI.ToolbarInput.Event.TextChanged, () => this._filterChanged());
    toolbar.appendToolbarItem(this._filter);

    this._otherWorkersView = new UI.ReportView();
    this._otherWorkersView.show(this._otherWorkers);
    this._otherWorkersView.element.classList.add('service-workers-for-other-origins');

    this._updateCollapsedStyle();

    this._toolbar.appendToolbarItem(MobileThrottling.throttlingManager().createOfflineToolbarCheckbox());
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

    /** @type {!Map<!SDK.ServiceWorkerManager, !Array<!Common.EventTarget.EventDescriptor>>}*/
    this._eventListeners = new Map();
    SDK.targetManager.observeModels(SDK.ServiceWorkerManager, this);
    this._updateListVisibility();
  }

  /**
   * @override
   * @param {!SDK.ServiceWorkerManager} serviceWorkerManager
   */
  modelAdded(serviceWorkerManager) {
    if (this._manager)
      return;
    this._manager = serviceWorkerManager;
    this._securityOriginManager = serviceWorkerManager.target().model(SDK.SecurityOriginManager);

    for (var registration of this._manager.registrations().values())
      this._updateRegistration(registration);

    this._eventListeners.set(serviceWorkerManager, [
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationUpdated, this._registrationUpdated, this),
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationDeleted, this._registrationDeleted, this),
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
    var hasOthers = false;
    var hasThis = false;
    var movedSections = [];
    for (var section of this._sections.values()) {
      var expectedView = this._getReportViewForOrigin(section._registration.securityOrigin);
      hasOthers |= expectedView === this._otherWorkersView;
      hasThis |= expectedView === this._currentWorkersView;
      if (section._section.parentWidget() !== expectedView)
        movedSections.push(section);
    }

    for (var section of movedSections) {
      var registration = section._registration;
      this._removeRegistrationFromList(registration);
      this._updateRegistration(registration, true);
    }

    var scorer = new Sources.FilePathScoreFunction(this._filter.value());
    this._otherWorkersView.sortSections((a, b) => {
      var cmp = scorer.score(b.title(), null) - scorer.score(a.title(), null);
      return cmp === 0 ? a.title().localeCompare(b.title()) : cmp;
    });
    for (var section of this._sections.values()) {
      if (section._section.parentWidget() === this._currentWorkersView ||
          this._isRegistrationVisible(section._registration))
        section._section.showWidget();
      else
        section._section.hideWidget();
    }
    this.contentElement.classList.toggle('service-worker-has-current', hasThis);
    this._otherWorkers.classList.toggle('hidden', !hasOthers);
    this._updateListVisibility();
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
      if (!securityOrigins.has(registration.securityOrigin) && !this._isRegistrationVisible(registration))
        continue;
      if (!registration.canBeRemoved()) {
        hasNonDeletedRegistrations = true;
        break;
      }
    }

    if (!hasNonDeletedRegistrations)
      return;

    for (var registration of this._manager.registrations().values()) {
      var visible = securityOrigins.has(registration.securityOrigin) || this._isRegistrationVisible(registration);
      if (!visible && registration.canBeRemoved())
        this._removeRegistrationFromList(registration);
    }
  }

  /**
   * @param {string} origin
   * @return {!UI.ReportView}
   */
  _getReportViewForOrigin(origin) {
    if (this._securityOriginManager.securityOrigins().includes(origin))
      return this._currentWorkersView;
    else
      return this._otherWorkersView;
  }

  /**
   * @param {!SDK.ServiceWorkerRegistration} registration
   * @param {boolean=} skipUpdate
   */
  _updateRegistration(registration, skipUpdate) {
    var section = this._sections.get(registration);
    if (!section) {
      var title = Resources.ServiceWorkersView._displayScopeURL(registration.scopeURL);
      section = new Resources.ServiceWorkersView.Section(
          /** @type {!SDK.ServiceWorkerManager} */ (this._manager),
          this._getReportViewForOrigin(registration.securityOrigin).appendSection(title), registration);
      this._sections.set(registration, section);
    }
    if (skipUpdate)
      return;
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
      section._section.detach();
    this._sections.delete(registration);
    this._updateSectionVisibility();
  }

  /**
   * @param {!SDK.ServiceWorkerRegistration} registration
   * @return {boolean}
   */
  _isRegistrationVisible(registration) {
    var filterString = this._filter.value();
    if (!filterString || !registration.scopeURL)
      return true;

    var regex = String.filterRegex(filterString);
    return registration.scopeURL.match(regex);
  }

  _filterChanged() {
    this._updateCollapsedStyle();
    this._filterThrottler.schedule(() => Promise.resolve(this._updateSectionVisibility()));
  }

  _updateCollapsedStyle() {
    var collapsed = !this._checkboxElement.checked;
    this._otherWorkers.classList.toggle('service-worker-filter-collapsed', collapsed);
    if (collapsed)
      this._otherWorkersView.hideWidget();
    else
      this._otherWorkersView.showWidget();
    this._otherWorkersView.setHeaderVisible(false);
  }

  /**
   * @param {string} scopeURL
   * @return {string}
   */
  static _displayScopeURL(scopeURL) {
    var parsedURL = scopeURL.asParsedURL();
    var path = parsedURL.path;
    if (path.endsWith('/'))
      path = path.substring(0, path.length - 1);
    return parsedURL.host + path;
  }

  _updateListVisibility() {
    this.contentElement.classList.toggle('service-worker-list-empty', this._sections.size === 0);
  }
};

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
    /** @type {?symbol} */
    this._fingerprint = null;
    this._pushNotificationDataSetting =
        Common.settings.createLocalSetting('pushData', Common.UIString('Test push message from DevTools.'));
    this._syncTagNameSetting = Common.settings.createLocalSetting('syncTagName', 'test-tag-from-devtools');

    this._toolbar = section.createToolbar();
    this._toolbar.renderAsLinks();
    this._updateButton = new UI.ToolbarButton(Common.UIString('Update'), undefined, Common.UIString('Update'));
    this._updateButton.addEventListener(UI.ToolbarButton.Events.Click, this._updateButtonClicked, this);
    this._toolbar.appendToolbarItem(this._updateButton);
    this._deleteButton =
        new UI.ToolbarButton(Common.UIString('Unregister service worker'), undefined, Common.UIString('Unregister'));
    this._deleteButton.addEventListener(UI.ToolbarButton.Events.Click, this._unregisterButtonClicked, this);
    this._toolbar.appendToolbarItem(this._deleteButton);

    // Preserve the order.
    this._sourceField = this._wrapWidget(this._section.appendField(Common.UIString('Source')));
    this._statusField = this._wrapWidget(this._section.appendField(Common.UIString('Status')));
    this._clientsField = this._wrapWidget(this._section.appendField(Common.UIString('Clients')));
    this._createPushNotificationField();
    this._createSyncNotificationField();

    this._linkifier = new Components.Linkifier();
    /** @type {!Map<string, !Protocol.Target.TargetInfo>} */
    this._clientInfoCache = new Map();
    this._throttler = new Common.Throttler(500);
  }

  _createPushNotificationField() {
    var form = this._wrapWidget(this._section.appendField(Common.UIString('Push')))
                   .createChild('form', 'service-worker-editor-with-button');
    var editorContainer = form.createChild('div', 'service-worker-notification-editor');
    var button = UI.createTextButton(Common.UIString('Push'));
    button.type = 'submit';
    form.appendChild(button);

    var editorOptions =
        {lineNumbers: false, lineWrapping: true, autoHeight: true, padBottom: false, mimeType: 'application/json'};
    var editor = new TextEditor.CodeMirrorTextEditor(editorOptions);
    editor.setText(this._pushNotificationDataSetting.get());
    editor.element.addEventListener('keydown', e => {
      if (e.key === 'Tab')
        e.consume(false);
    }, true);
    editor.show(editorContainer);
    form.addEventListener('submit', e => {
      this._push(editor.text() || '');
      e.consume(true);
    });
  }

  _createSyncNotificationField() {
    var form = this._wrapWidget(this._section.appendField(Common.UIString('Sync')))
                   .createChild('form', 'service-worker-editor-with-button');
    var editor = form.createChild('input', 'source-code service-worker-notification-editor');
    var button = UI.createTextButton(Common.UIString('Sync'));
    button.type = 'submit';
    form.appendChild(button);

    editor.value = this._syncTagNameSetting.get();
    editor.placeholder = Common.UIString('Sync tag');

    form.addEventListener('submit', e => {
      this._sync(true, editor.value || '');
      e.consume(true);
    });
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
   * @param {!Element} versionsStack
   * @param {string} icon
   * @param {string} label
   * @return {!Element}
   */
  _addVersion(versionsStack, icon, label) {
    var installingEntry = versionsStack.createChild('div', 'service-worker-version');
    installingEntry.createChild('div', icon);
    installingEntry.createChild('span').textContent = label;
    return installingEntry;
  }

  /**
   * @param {!SDK.ServiceWorkerVersion} version
   */
  _updateClientsField(version) {
    this._clientsField.removeChildren();
    this._section.setFieldVisible(Common.UIString('Clients'), version.controlledClients.length);
    for (var client of version.controlledClients) {
      var clientLabelText = this._clientsField.createChild('div', 'service-worker-client');
      if (this._clientInfoCache.has(client)) {
        this._updateClientInfo(
            clientLabelText, /** @type {!Protocol.Target.TargetInfo} */ (this._clientInfoCache.get(client)));
      }
      this._manager.target().targetAgent().getTargetInfo(client).then(this._onClientInfo.bind(this, clientLabelText));
    }
  }

  /**
   * @param {!SDK.ServiceWorkerVersion} version
   */
  _updateSourceField(version) {
    this._sourceField.removeChildren();
    var fileName = Common.ParsedURL.extractName(version.scriptURL);
    var name = this._sourceField.createChild('div', 'report-field-value-filename');
    name.appendChild(Components.Linkifier.linkifyURL(version.scriptURL, {text: fileName}));
    if (this._registration.errors.length) {
      var errorsLabel = UI.createLabel(String(this._registration.errors.length), 'smallicon-error');
      errorsLabel.classList.add('link');
      errorsLabel.addEventListener('click', () => Common.console.show());
      name.appendChild(errorsLabel);
    }
    this._sourceField.createChild('div', 'report-field-value-subtitle').textContent =
        Common.UIString('Received %s', new Date(version.scriptResponseTime * 1000).toLocaleString());
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
    var scopeURL = Resources.ServiceWorkersView._displayScopeURL(this._registration.scopeURL);
    var title = this._registration.isDeleted ? Common.UIString('%s - deleted', scopeURL) : scopeURL;
    this._section.setTitle(title);

    var active = versions.get(SDK.ServiceWorkerVersion.Modes.Active);
    var waiting = versions.get(SDK.ServiceWorkerVersion.Modes.Waiting);
    var installing = versions.get(SDK.ServiceWorkerVersion.Modes.Installing);
    var redundant = versions.get(SDK.ServiceWorkerVersion.Modes.Redundant);

    this._statusField.removeChildren();
    var versionsStack = this._statusField.createChild('div', 'service-worker-version-stack');
    versionsStack.createChild('div', 'service-worker-version-stack-bar');

    if (active) {
      this._updateSourceField(active);
      var activeEntry = this._addVersion(
          versionsStack, 'service-worker-active-circle',
          Common.UIString('#%s activated and is %s', active.id, active.runningStatus));

      if (active.isRunning() || active.isStarting()) {
        createLink(activeEntry, Common.UIString('stop'), this._stopButtonClicked.bind(this, active.id));
        if (!this._targetForVersionId(active.id))
          createLink(activeEntry, Common.UIString('inspect'), this._inspectButtonClicked.bind(this, active.id));
      } else if (active.isStartable()) {
        createLink(activeEntry, Common.UIString('start'), this._startButtonClicked.bind(this));
      }
      this._updateClientsField(active);
    } else if (redundant) {
      this._updateSourceField(redundant);
      var activeEntry = this._addVersion(
          versionsStack, 'service-worker-redundant-circle', Common.UIString('#%s is redundant', redundant.id));
      this._updateClientsField(redundant);
    }

    if (waiting) {
      var waitingEntry = this._addVersion(
          versionsStack, 'service-worker-waiting-circle', Common.UIString('#%s waiting to activate', waiting.id));
      createLink(waitingEntry, Common.UIString('skipWaiting'), this._skipButtonClicked.bind(this));
      waitingEntry.createChild('div', 'service-worker-subtitle').textContent =
          Common.UIString('Received %s', new Date(waiting.scriptResponseTime * 1000).toLocaleString());
      if (!this._targetForVersionId(waiting.id) && (waiting.isRunning() || waiting.isStarting()))
        createLink(waitingEntry, Common.UIString('inspect'), this._inspectButtonClicked.bind(this, waiting.id));
    }
    if (installing) {
      var installingEntry = this._addVersion(
          versionsStack, 'service-worker-installing-circle', Common.UIString('#%s installing', installing.id));
      installingEntry.createChild('div', 'service-worker-subtitle').textContent =
          Common.UIString('Received %s', new Date(installing.scriptResponseTime * 1000).toLocaleString());
      if (!this._targetForVersionId(installing.id) && (installing.isRunning() || installing.isStarting()))
        createLink(installingEntry, Common.UIString('inspect'), this._inspectButtonClicked.bind(this, installing.id));
    }

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
   * @param {string} data
   */
  _push(data) {
    this._pushNotificationDataSetting.set(data);
    this._manager.deliverPushMessage(this._registration.id, data);
  }

  /**
   * @param {boolean} lastChance
   * @param {string} tag
   */
  _sync(lastChance, tag) {
    this._syncTagNameSetting.set(tag);
    this._manager.dispatchSyncEvent(this._registration.id, tag, lastChance);
  }

  /**
   * @param {!Element} element
   * @param {?Protocol.Target.TargetInfo} targetInfo
   */
  _onClientInfo(element, targetInfo) {
    if (!targetInfo)
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
