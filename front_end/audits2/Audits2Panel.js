// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {{
 *     lighthouseVersion: !string,
 *     generatedTime: !string,
 *     initialUrl: !string,
 *     url: !string,
 *     audits: ?Object,
 *     aggregations: !Array<*>
 * }}
 */
Audits2.LighthouseResult;

/**
 * @typedef {{
 *     blobUrl: !string,
 *     result: !Audits2.LighthouseResult
 * }}
 */
Audits2.WorkerResult;

/**
 * @unrestricted
 */
Audits2.Audits2Panel = class extends UI.Panel {
  constructor() {
    super('audits2');
    this.setHideOnDetach();
    this.registerRequiredCSS('audits2/audits2Panel.css');

    this._protocolService = new Audits2.ProtocolService();
    this._protocolService.registerStatusCallback(msg => this._updateStatus(Common.UIString(msg)));

    this._settings = Audits2.Audits2Panel.Presets.map(preset => {
      const setting = Common.settings.createSetting(preset.id, true);
      setting.setTitle(Common.UIString(preset.description));
      return setting;
    });

    var auditsViewElement = this.contentElement.createChild('div', 'hbox audits2-view');
    this._resultsView = this.contentElement.createChild('div', 'vbox results-view');
    auditsViewElement.createChild('div', 'audits2-logo');
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

    const aggregationIDs = this._settings.map(setting => {
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
        .then(_ => this._protocolService.startLighthouse(this._inspectedURL, aggregationIDs))
        .then(workerResult => {
          this._finish(workerResult);
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
      if (this._inspectedURL !== SDK.targetManager.mainTarget().inspectedURL())
        SDK.targetManager.mainTarget().pageAgent().navigate(this._inspectedURL);

    });
  }

  /**
   * @param {!Audits2.WorkerResult} workerResult
   */
  _finish(workerResult) {
    if (workerResult === null) {
      this._updateStatus(Common.UIString('Auditing failed.'));
      return;
    }
    this._resultsView.removeChildren();

    var url = workerResult.result.url;
    var timestamp = workerResult.result.generatedTime;
    this._createResultsBar(this._resultsView, url, timestamp);
    this._createIframe(this._resultsView, workerResult.blobUrl);
    this.contentElement.classList.add('show-results');
  }

  /**
   * @param {!Element} resultsView
   * @param {string} blobUrl
   */
  _createIframe(resultsView, blobUrl) {
    var iframeContainer = resultsView.createChild('div', 'iframe-container');
    var iframe = iframeContainer.createChild('iframe', 'fill');
    iframe.setAttribute('sandbox', 'allow-scripts allow-popups-to-escape-sandbox allow-popups');
    iframe.src = blobUrl;
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
  // configID maps to Lighthouse's config.aggregations[0].id value
  {id: 'audits2_cat_pwa', configID: 'pwa', description: 'Progressive web app audits'},
  {id: 'audits2_cat_perf', configID: 'perf', description: 'Performance metrics and diagnostics'},
  {id: 'audits2_cat_best_practices', configID: 'bp', description: 'Modern web development best practices'},
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
   * @param {!Array<string>} aggregationIDs
   * @return {!Promise<!Audits2.WorkerResult|undefined>}
   */
  startLighthouse(inspectedURL, aggregationIDs) {
    return this._send('start', {url: inspectedURL, aggregationIDs});
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
   * @return {!Promise<!Audits2.WorkerResult|undefined>}
   */
  _send(method, params) {
    if (!this._backendPromise)
      this._initWorker();

    return this._backendPromise.then(_ => this._backend.send(method, params));
  }
};
