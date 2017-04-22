// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Audits2.Audits2Panel = class extends UI.Panel {
  constructor() {
    super('audits2');
    this.setHideOnDetach();
    this.registerRequiredCSS('audits2/audits2Panel.css');
    this.registerRequiredCSS('audits2/lighthouse/report-styles.css');

    this._protocolService = new Audits2.ProtocolService();
    this._protocolService.registerStatusCallback(msg => this._updateStatus(Common.UIString(msg)));

    this._settings = Audits2.Audits2Panel.Presets.map(preset => {
      const setting = Common.settings.createSetting(preset.id, true);
      setting.setTitle(Common.UIString(preset.description));
      return setting;
    });

    var auditsViewElement = this.contentElement.createChild('div', 'hbox audits2-view');
    this._resultsView = this.contentElement.createChild('div', 'vbox results-view');
    this._createLauncherUI(auditsViewElement);
  }

  _reset() {
    this.contentElement.classList.remove('show-results');
    this._resultsView.removeChildren();
  }

  /**
   * @param {!Element} auditsViewElement
   */
  _createLauncherUI(auditsViewElement) {
    auditsViewElement.createChild('div', 'audits2-logo');
    var uiElement = auditsViewElement.createChild('div');
    var headerElement = uiElement.createChild('header');
    headerElement.createChild('p').textContent = Common.UIString(
        'Audits will analyze the page against modern development best practices and collect useful performance metrics and diagnostics. Select audits to collect:');
    uiElement.appendChild(headerElement);

    var auditSelectorForm = uiElement.createChild('form', 'audits2-form');

    this._settings
      .map(setting => new UI.ToolbarSettingCheckbox(setting))
      .forEach(checkbox => auditSelectorForm.appendChild(checkbox.element));

    this._startButton = UI.createTextButton(
        Common.UIString('Audit this page'), this._startButtonClicked.bind(this), 'run-audit audit-btn');
    auditSelectorForm.appendChild(this._startButton);

    this._statusView = this._createStatusView(uiElement);
  }

  /**
   * @param {!Element} launcherUIElement
   * @return {!Element}
   */
  _createStatusView(launcherUIElement) {
    var statusView = launcherUIElement.createChild('div', 'audits2-status hbox hidden');
    statusView.createChild('span', 'icon');
    this._statusElement = createElement('p');
    statusView.appendChild(this._statusElement);
    this._updateStatus(Common.UIString('Loading...'));
    return statusView;
  }

  _start() {
    this._inspectedURL = SDK.targetManager.mainTarget().inspectedURL();

    const categoryIDs = this._settings.map(setting => {
      const preset = Audits2.Audits2Panel.Presets.find(preset => preset.id === setting.name);
      return {configID: preset.configID, value: setting.get()};
    }).filter(agg => !!agg.value).map(agg => agg.configID);

    return Promise.resolve()
        .then(_ => this._protocolService.attach())
        .then(_ => {
          this._auditRunning = true;
          this._updateButton();
          this._updateStatus(Common.UIString('Loading...'));
        })
        .then(_ => this._protocolService.startLighthouse(this._inspectedURL, categoryIDs))
        .then(lighthouseResult => {
          this._finish(lighthouseResult);
          return this._stop();
        });
  }

  /**
   * @param {!Event} event
   */
  _startButtonClicked(event) {
    if (this._auditRunning) {
      this._updateStatus(Common.UIString('Cancelling...'));
      this._stop();
      return;
    }
    this._start();
  }

  _updateButton() {
    this._startButton.textContent =
        this._auditRunning ? Common.UIString('Cancel audit') : Common.UIString('Audit this page');
    this._startButton.classList.toggle('started', this._auditRunning);
    this._statusView.classList.toggle('hidden', !this._auditRunning);
  }

  /**
   * @param {string} statusMessage
   */
  _updateStatus(statusMessage) {
    this._statusElement.textContent = statusMessage;
  }

  /**
   * @return {!Promise<undefined>}
   */
  _stop() {
    return this._protocolService.detach().then(_ => {
      this._auditRunning = false;
      this._updateButton();
      var resourceTreeModel = SDK.targetManager.mainTarget().model(SDK.ResourceTreeModel);
      if (resourceTreeModel && this._inspectedURL !== SDK.targetManager.mainTarget().inspectedURL())
        resourceTreeModel.navigate(this._inspectedURL);

    });
  }

  /**
   * @param {!ReportRenderer.ReportJSON} lighthouseResult
   */
  _finish(lighthouseResult) {
    if (lighthouseResult === null) {
      this._updateStatus(Common.UIString('Auditing failed.'));
      return;
    }
    this._resultsView.removeChildren();

    var url = lighthouseResult.url;
    var timestamp = lighthouseResult.generatedTime;
    this._createResultsBar(this._resultsView, url, timestamp);
    this._renderReport(this._resultsView, lighthouseResult);
    this.contentElement.classList.add('show-results');
  }

  /**
   * @param {!Element} resultsView
   * @param {!ReportRenderer.ReportJSON} lighthouseResult
   * @suppressGlobalPropertiesCheck
   */
  _renderReport(resultsView, lighthouseResult) {
    var reportContainer = resultsView.createChild('div', 'report-container');

    var dom = new DOM(document);
    var detailsRenderer = new DetailsRenderer(dom);
    var renderer = new ReportRenderer(dom, detailsRenderer);

    var templatesHTML = Runtime.cachedResources['audits2/lighthouse/templates.html'];
    var templatesDOM = new DOMParser().parseFromString(templatesHTML, 'text/html');
    if (!templatesDOM)
      return;

    renderer.setTemplateContext(templatesDOM);
    reportContainer.appendChild(renderer.renderReport(lighthouseResult));
  }

  /**
   * @param {!Element} resultsView
   * @param {string} url
   * @param {string} timestamp
   */
  _createResultsBar(resultsView, url, timestamp) {
    var elem = resultsView.createChild('div', 'results-bar hbox');
    elem.createChild('div', 'audits2-logo audits2-logo-small');

    var summaryElem = elem.createChild('div', 'audits2-summary');
    var reportFor = summaryElem.createChild('span');
    reportFor.createTextChild('Report for ');
    var urlElem = reportFor.createChild('b');
    urlElem.textContent = url;
    var timeElem = summaryElem.createChild('span');
    timeElem.textContent =
        `Generated at ${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString()}`;

    var newAuditButton =
        UI.createTextButton(Common.UIString('New Audit'), this._reset.bind(this), 'new-audit audit-btn');
    elem.appendChild(newAuditButton);
  }
};

/** @typedef {{id: string, configID: string, description: string}} */
Audits2.Audits2Panel.Preset;

/** @type {!Array.<!Audits2.Audits2Panel.Preset>} */
Audits2.Audits2Panel.Presets = [
  // configID maps to Lighthouse's Object.keys(config.categories)[0] value
  {id: 'audits2_cat_pwa', configID: 'pwa', description: 'Progressive Web App'},
  {id: 'audits2_cat_perf', configID: 'performance', description: 'Performance metrics and diagnostics'},
  {id: 'audits2_cat_a11y', configID: 'accessibility', description: 'Accessibility'},
  {id: 'audits2_cat_best_practices', configID: 'best-practices', description: 'Modern best practices'},
];

Audits2.ProtocolService = class extends Common.Object {
  constructor() {
    super();
    /** @type {?Protocol.InspectorBackend.Connection} */
    this._rawConnection = null;
    /** @type {?Services.ServiceManager.Service} */
    this._backend = null;
    /** @type {?Promise} */
    this._backendPromise = null;
    /** @type {?function(string)} */
    this._status = null;
  }

  /**
   * @return {!Promise<undefined>}
   */
  attach() {
    return SDK.targetManager.interceptMainConnection(this._dispatchProtocolMessage.bind(this)).then(rawConnection => {
      this._rawConnection = rawConnection;
    });
  }

  /**
   * @param {string} inspectedURL
   * @param {!Array<string>} categoryIDs
   * @return {!Promise<!ReportRenderer.ReportJSON>}
   */
  startLighthouse(inspectedURL, categoryIDs) {
    return this._send('start', {url: inspectedURL, categoryIDs});
  }

  /**
   * @return {!Promise<!Object|undefined>}
   */
  detach() {
    return Promise.resolve().then(() => this._send('stop')).then(() => this._backend.dispose()).then(() => {
      delete this._backend;
      delete this._backendPromise;
      return this._rawConnection.disconnect();
    });
  }

  /**
   *  @param {function (string): undefined} callback
   */
  registerStatusCallback(callback) {
    this._status = callback;
  }

  /**
   * @param {string} message
   */
  _dispatchProtocolMessage(message) {
    this._send('dispatchProtocolMessage', {message: message});
  }

  _initWorker() {
    this._backendPromise =
        Services.serviceManager.createAppService('audits2_worker', 'Audits2Service', false).then(backend => {
          if (this._backend)
            return;
          this._backend = backend;
          this._backend.on('statusUpdate', result => this._status(result.message));
          this._backend.on('sendProtocolMessage', result => this._rawConnection.sendMessage(result.message));
        });
  }

  /**
   * @param {string} method
   * @param {!Object=} params
   * @return {!Promise<!ReportRenderer.ReportJSON>}
   */
  _send(method, params) {
    if (!this._backendPromise)
      this._initWorker();

    return this._backendPromise.then(_ => this._backend.send(method, params));
  }
};
