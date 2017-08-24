// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver<!SDK.ServiceWorkerManager>}
 * @unrestricted
 */
Audits2.Audits2Panel = class extends UI.Panel {
  constructor() {
    super('audits2');
    this.registerRequiredCSS('audits2/lighthouse/report-styles.css');
    this.registerRequiredCSS('audits2/audits2Panel.css');

    this._protocolService = new Audits2.ProtocolService();
    this._protocolService.registerStatusCallback(msg => this._updateStatus(Common.UIString(msg)));

    var toolbar = new UI.Toolbar('', this.element);

    var newButton = new UI.ToolbarButton(Common.UIString('New audit\u2026'), 'largeicon-add');
    toolbar.appendToolbarItem(newButton);
    newButton.addEventListener(UI.ToolbarButton.Events.Click, this._showLauncherUI.bind(this));

    var downloadButton = new UI.ToolbarButton(Common.UIString('Download report'), 'largeicon-download');
    toolbar.appendToolbarItem(downloadButton);
    downloadButton.addEventListener(UI.ToolbarButton.Events.Click, this._downloadSelected.bind(this));

    toolbar.appendSeparator();

    this._reportSelector = new Audits2.ReportSelector();
    toolbar.appendToolbarItem(this._reportSelector.comboBox());

    var clearButton = new UI.ToolbarButton(Common.UIString('Clear all'), 'largeicon-clear');
    toolbar.appendToolbarItem(clearButton);
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._clearAll.bind(this));

    this._auditResultsElement = this.contentElement.createChild('div', 'audits2-results-container');
    this._dropTarget = new UI.DropTarget(
        this.contentElement, [UI.DropTarget.Types.Files], Common.UIString('Drop audit file here'),
        this._handleDrop.bind(this));

    for (var preset of Audits2.Audits2Panel.Presets)
      preset.setting.addChangeListener(this._updateStartButtonEnabled.bind(this));
    this._showLandingPage();
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
    this._serviceWorkerListeners = [
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationUpdated, this._updateStartButtonEnabled, this),
      this._manager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationDeleted, this._updateStartButtonEnabled, this),
    ];

    this._updateStartButtonEnabled();
  }

  /**
   * @override
   * @param {!SDK.ServiceWorkerManager} serviceWorkerManager
   */
  modelRemoved(serviceWorkerManager) {
    if (!this._manager || this._manager !== serviceWorkerManager)
      return;

    Common.EventTarget.removeEventListeners(this._serviceWorkerListeners);
    this._manager = null;
    this._serviceWorkerListeners = null;
    this._updateStartButtonEnabled();
  }

  /**
   * @return {boolean}
   */
  _hasActiveServiceWorker() {
    if (!this._manager)
      return false;

    var inspectedURL = SDK.targetManager.mainTarget().inspectedURL().asParsedURL();
    var inspectedOrigin = inspectedURL && inspectedURL.securityOrigin();
    for (var registration of this._manager.registrations().values()) {
      if (registration.securityOrigin !== inspectedOrigin)
        continue;

      for (var version of registration.versions.values()) {
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
    return Audits2.Audits2Panel.Presets.some(preset => preset.setting.get());
  }

  /**
   * @return {?string}
   */
  _unauditablePageMessage() {
    if (!this._manager)
      return null;

    var inspectedURL = SDK.targetManager.mainTarget().inspectedURL();
    if (/^about:/.test(inspectedURL))
      return Common.UIString('Cannot audit about:* pages. Navigate to a different page to start an audit.');

    if (!Runtime.queryParam('can_dock'))
      return Common.UIString('Can only audit tabs. Navigate to this page in a separate tab to start an audit.');

    return null;
  }

  _updateStartButtonEnabled() {
    var hasActiveServiceWorker = this._hasActiveServiceWorker();
    var hasAtLeastOneCategory = this._hasAtLeastOneCategory();
    var unauditablePageMessage = this._unauditablePageMessage();
    var isDisabled = hasActiveServiceWorker || !hasAtLeastOneCategory || !!unauditablePageMessage;

    if (this._dialogHelpText && hasActiveServiceWorker) {
      this._dialogHelpText.textContent = Common.UIString(
          'Multiple tabs are being controlled by the same service worker. ' +
          'Close your other tabs on the same origin to audit this page.');
    }

    if (this._dialogHelpText && !hasAtLeastOneCategory)
      this._dialogHelpText.textContent = Common.UIString('At least one category must be selected.');

    if (this._dialogHelpText && unauditablePageMessage)
      this._dialogHelpText.textContent = unauditablePageMessage;

    if (this._dialogHelpText)
      this._dialogHelpText.classList.toggle('hidden', !isDisabled);

    if (this._startButton)
      this._startButton.disabled = isDisabled;
  }

  _clearAll() {
    this._reportSelector.clearAll();
    this._showLandingPage();
  }

  _downloadSelected() {
    this._reportSelector.downloadSelected();
  }

  _showLandingPage() {
    if (this._reportSelector.comboBox().size())
      return;

    this._auditResultsElement.removeChildren();
    var landingPage = this._auditResultsElement.createChild('div', 'vbox audits2-landing-page');
    var landingCenter = landingPage.createChild('div', 'vbox audits2-landing-center');
    landingCenter.createChild('div', 'audits2-logo');
    var text = landingCenter.createChild('div', 'audits2-landing-text');
    text.createChild('span', 'audits2-landing-bold-text').textContent = Common.UIString('Audits');
    text.createChild('span').textContent = Common.UIString(
        ' help you identify and fix common problems that affect' +
        ' your site\'s performance, accessibility, and user experience. ');
    var link = text.createChild('span', 'link');
    link.textContent = Common.UIString('Learn more');
    link.addEventListener(
        'click', () => InspectorFrontendHost.openInNewTab('https://developers.google.com/web/tools/lighthouse/'));

    var newButton = UI.createTextButton(
        Common.UIString('Perform an audit\u2026'), this._showLauncherUI.bind(this), '', true /* primary */);
    landingCenter.appendChild(newButton);
    this.setDefaultFocusedElement(newButton);
  }

  _showLauncherUI() {
    this._dialog = new UI.Dialog();
    this._dialog.setOutsideClickCallback(event => event.consume(true));
    var root = UI.createShadowRootWithCoreStyles(this._dialog.contentElement, 'audits2/audits2Dialog.css');
    var auditsViewElement = root.createChild('div', 'audits2-view');

    var closeButton = auditsViewElement.createChild('div', 'dialog-close-button', 'dt-close-button');
    closeButton.addEventListener('click', () => this._cancelAndClose());

    var uiElement = auditsViewElement.createChild('div');
    var headerElement = uiElement.createChild('header');
    this._headerTitleElement = headerElement.createChild('p');
    this._headerTitleElement.textContent = Common.UIString('Audits to perform');
    uiElement.appendChild(headerElement);

    this._auditSelectorForm = uiElement.createChild('form', 'audits2-form');

    for (var preset of Audits2.Audits2Panel.Presets) {
      preset.setting.setTitle(preset.title);
      var checkbox = new UI.ToolbarSettingCheckbox(preset.setting);
      var row = this._auditSelectorForm.createChild('div', 'vbox audits2-launcher-row');
      row.appendChild(checkbox.element);
      row.createChild('span', 'audits2-launcher-description dimmed').textContent = preset.description;
    }

    this._statusView = this._createStatusView(uiElement);
    this._dialogHelpText = uiElement.createChild('div', 'audits2-dialog-help-text');

    var buttonsRow = uiElement.createChild('div', 'audits2-dialog-buttons hbox');
    this._startButton =
        UI.createTextButton(Common.UIString('Run audit'), this._start.bind(this), '', true /* primary */);
    this._startButton.autofocus = true;
    this._updateStartButtonEnabled();
    buttonsRow.appendChild(this._startButton);
    this._cancelButton = UI.createTextButton(Common.UIString('Cancel'), this._cancel.bind(this));
    buttonsRow.appendChild(this._cancelButton);

    this._dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SetExactWidthMaxHeight);
    this._dialog.setMaxContentSize(new UI.Size(500, 400));
    this._dialog.show(this._auditResultsElement);
    auditsViewElement.tabIndex = 0;
    auditsViewElement.focus();
  }

  /**
   * @param {!Element} launcherUIElement
   * @return {!Element}
   */
  _createStatusView(launcherUIElement) {
    var statusView = launcherUIElement.createChild('div', 'audits2-status vbox hidden');
    this._statusIcon = statusView.createChild('div', 'icon');
    this._statusElement = statusView.createChild('div');
    this._updateStatus(Common.UIString('Loading...'));
    return statusView;
  }

  /**
   * @return {!Promise<undefined>}
   */
  _updateInspectedURL() {
    var mainTarget = SDK.targetManager.mainTarget();
    var runtimeModel = mainTarget.model(SDK.RuntimeModel);
    var executionContext = runtimeModel && runtimeModel.defaultExecutionContext();
    this._inspectedURL = mainTarget.inspectedURL();
    if (!executionContext)
      return Promise.resolve();

    // Evaluate location.href for a more specific URL than inspectedURL provides so that SPA hash navigation routes
    // will be respected and audited.
    return executionContext
        .evaluate(
            {
              expression: 'window.location.href',
              objectGroup: 'audits',
              includeCommandLineAPI: false,
              silent: false,
              returnByValue: true,
              generatePreview: false
            },
            /* userGesture */ false, /* awaitPromise */ false)
        .then(result => {
          if (!result.exceptionDetails && result.object) {
            this._inspectedURL = result.object.value;
            result.object.release();
          }
        });
  }

  _start() {
    var emulationModel = self.singleton(Emulation.DeviceModeModel);
    this._emulationEnabledBefore = emulationModel.enabledSetting().get();
    this._emulationOutlineEnabledBefore = emulationModel.deviceOutlineSetting().get();
    emulationModel.enabledSetting().set(true);
    emulationModel.deviceOutlineSetting().set(true);
    emulationModel.toolbarControlsEnabledSetting().set(false);

    for (var device of Emulation.EmulatedDevicesList.instance().standard()) {
      if (device.title === 'Nexus 5X')
        emulationModel.emulate(Emulation.DeviceModeModel.Type.Device, device, device.modes[0], 1);
    }
    this._dialog.setCloseOnEscape(false);

    var categoryIDs = [];
    for (var preset of Audits2.Audits2Panel.Presets) {
      if (preset.setting.get())
        categoryIDs.push(preset.configID);
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.Audits2Started);

    return Promise.resolve()
        .then(_ => this._updateInspectedURL())
        .then(_ => this._protocolService.attach())
        .then(_ => {
          this._auditRunning = true;
          this._updateButton();
          this._updateStatus(Common.UIString('Loading\u2026'));
        })
        .then(_ => this._protocolService.startLighthouse(this._inspectedURL, categoryIDs))
        .then(lighthouseResult => {
          if (lighthouseResult && lighthouseResult.fatal) {
            const error = new Error(lighthouseResult.message);
            error.stack = lighthouseResult.stack;
            throw error;
          }

          return this._stopAndReattach().then(() => this._buildReportUI(lighthouseResult));
        })
        .catch(err => {
          if (err instanceof Error)
            this._renderBugReport(err);
        });
  }

  _hideDialog() {
    if (!this._dialog)
      return;
    this._dialog.hide();

    delete this._dialog;
    delete this._statusView;
    delete this._statusIcon;
    delete this._statusElement;
    delete this._startButton;
    delete this._cancelButton;
    delete this._auditSelectorForm;
    delete this._headerTitleElement;
    delete this._emulationEnabledBefore;
    delete this._emulationOutlineEnabledBefore;
  }

  _cancelAndClose() {
    this._cancel();
    this._hideDialog();
  }

  _cancel() {
    if (this._auditRunning) {
      this._updateStatus(Common.UIString('Cancelling\u2026'));
      this._stopAndReattach();
    } else {
      this._hideDialog();
    }
  }

  _updateButton() {
    if (!this._dialog)
      return;
    this._startButton.classList.toggle('hidden', this._auditRunning);
    this._startButton.disabled = this._auditRunning;
    this._statusView.classList.toggle('hidden', !this._auditRunning);
    this._auditSelectorForm.classList.toggle('hidden', this._auditRunning);
    if (this._auditRunning)
      this._headerTitleElement.textContent = Common.UIString('Auditing your web page \u2026');
    else
      this._headerTitleElement.textContent = Common.UIString('Audits to perform');
  }

  /**
   * @param {string} statusMessage
   */
  _updateStatus(statusMessage) {
    if (!this._dialog)
      return;
    this._statusElement.textContent = statusMessage;
  }

  /**
   * @return {!Promise<undefined>}
   */
  async _stopAndReattach() {
    await this._protocolService.detach();

    var emulationModel = self.singleton(Emulation.DeviceModeModel);
    emulationModel.enabledSetting().set(this._emulationEnabledBefore);
    emulationModel.deviceOutlineSetting().set(this._emulationOutlineEnabledBefore);
    emulationModel.toolbarControlsEnabledSetting().set(true);
    Emulation.InspectedPagePlaceholder.instance().update(true);

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.Audits2Finished);
    var resourceTreeModel = SDK.targetManager.mainTarget().model(SDK.ResourceTreeModel);
    // reload to reset the page state
    await resourceTreeModel.navigate(this._inspectedURL);
    this._auditRunning = false;
    this._updateButton();
  }

  /**
   * @param {!ReportRenderer.ReportJSON} lighthouseResult
   */
  _buildReportUI(lighthouseResult) {
    if (lighthouseResult === null) {
      this._updateStatus(Common.UIString('Auditing failed.'));
      return;
    }
    var optionElement =
        new Audits2.ReportSelector.Item(lighthouseResult, this._auditResultsElement, this._showLandingPage.bind(this));
    this._reportSelector.prepend(optionElement);
    this._hideDialog();
  }

  /**
   * @param {!Error} err
   */
  _renderBugReport(err) {
    console.error(err);
    this._statusElement.textContent = '';
    this._statusIcon.classList.add('error');
    this._statusElement.createTextChild(Common.UIString('Ah, sorry! We ran into an error: '));
    this._statusElement.createChild('em').createTextChild(err.message);
    this._createBugReportLink(err, this._statusElement);
  }

  /**
   * @param {!Error} err
   * @param {!Element} parentElem
   */
  _createBugReportLink(err, parentElem) {
    var baseURI = 'https://github.com/GoogleChrome/lighthouse/issues/new?';
    var title = encodeURI('title=DevTools Error: ' + err.message.substring(0, 60));

    var issueBody = `
**Initial URL**: ${this._inspectedURL}
**Chrome Version**: ${navigator.userAgent.match(/Chrome\/(\S+)/)[1]}
**Error Message**: ${err.message}
**Stack Trace**:
\`\`\`
${err.stack}
\`\`\`
    `;
    var body = '&body=' + encodeURI(issueBody.trim());
    var reportErrorEl = parentElem.createChild('a', 'audits2-link audits2-report-error');
    reportErrorEl.href = baseURI + title + body;
    reportErrorEl.textContent = Common.UIString('Report this bug');
    reportErrorEl.target = '_blank';
  }

  /**
   * @param {!DataTransfer} dataTransfer
   */
  _handleDrop(dataTransfer) {
    var items = dataTransfer.items;
    if (!items.length)
      return;
    var item = items[0];
    if (item.kind === 'file') {
      var entry = items[0].webkitGetAsEntry();
      if (!entry.isFile)
        return;
      entry.file(file => {
        var reader = new FileReader();
        reader.onload = () => this._loadedFromFile(/** @type {string} */ (reader.result));
        reader.readAsText(file);
      });
    }
  }

  /**
   * @param {string} profile
   */
  _loadedFromFile(profile) {
    var data = JSON.parse(profile);
    if (!data['lighthouseVersion'])
      return;
    this._buildReportUI(/** @type {!ReportRenderer.ReportJSON} */ (data));
  }
};

/**
 * @override
 */
Audits2.Audits2Panel.ReportRenderer = class extends ReportRenderer {
  /**
   * Provides empty element for left nav
   * @override
   * @returns {!DocumentFragment}
   */
  _renderReportNav() {
    return createDocumentFragment();
  }

  /**
   * @param {!ReportRenderer.ReportJSON} report
   * @override
   * @return {!DocumentFragment}
   */
  _renderReportHeader(report) {
    return createDocumentFragment();
  }
};

class ReportUIFeatures {
  /**
   * @param {!ReportRenderer.ReportJSON} report
   */
  initFeatures(report) {
  }
}

/** @typedef {{setting: !Common.Setting, configID: string, title: string, description: string}} */
Audits2.Audits2Panel.Preset;

/** @type {!Array.<!Audits2.Audits2Panel.Preset>} */
Audits2.Audits2Panel.Presets = [
  // configID maps to Lighthouse's Object.keys(config.categories)[0] value
  {
    setting: Common.settings.createSetting('audits2.cat_pwa', true),
    configID: 'pwa',
    title: 'Progressive Web App',
    description: 'Does this page meet the standard of a Progressive Web App'
  },
  {
    setting: Common.settings.createSetting('audits2.cat_perf', true),
    configID: 'performance',
    title: 'Performance',
    description: 'How long does this app take to show content and become usable'
  },
  {
    setting: Common.settings.createSetting('audits2.cat_best_practices', true),
    configID: 'best-practices',
    title: 'Best practices',
    description: 'Does this page follow best practices for modern web development'
  },
  {
    setting: Common.settings.createSetting('audits2.cat_a11y', true),
    configID: 'accessibility',
    title: 'Accessibility',
    description: 'Is this page usable by people with disabilities or impairments'
  },
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
        Services.serviceManager.createAppService('audits2_worker', 'Audits2Service').then(backend => {
          if (this._backend)
            return;
          this._backend = backend;
          this._backend.on('statusUpdate', result => this._status(result.message));
          this._backend.on('sendProtocolMessage', result => this._sendProtocolMessage(result.message));
        });
  }

  /**
   * @param {string} message
   */
  _sendProtocolMessage(message) {
    this._rawConnection.sendMessage(message);
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


Audits2.ReportSelector = class {
  constructor() {
    this._comboBox = new UI.ToolbarComboBox(this._handleChange.bind(this), 'audits2-report');
    this._comboBox.setMaxWidth(270);
    this._comboBox.setMinWidth(200);
    this._itemByOptionElement = new Map();
  }

  /**
   * @param {!Event} event
   */
  _handleChange(event) {
    var item = this._selectedItem();
    if (item)
      item.select();
  }

  /**
   * @return {!Audits2.ReportSelector.Item}
   */
  _selectedItem() {
    var option = this._comboBox.selectedOption();
    return this._itemByOptionElement.get(option);
  }

  /**
   * @return {!UI.ToolbarComboBox}
   */
  comboBox() {
    return this._comboBox;
  }

  /**
   * @param {!Audits2.ReportSelector.Item} item
   */
  prepend(item) {
    var optionEl = item.optionElement();
    var selectEl = this._comboBox.selectElement();

    this._itemByOptionElement.set(optionEl, item);
    selectEl.insertBefore(optionEl, selectEl.firstElementChild);
    this._comboBox.select(optionEl);
    item.select();
  }

  clearAll() {
    for (var elem of this._comboBox.options())
      this._itemByOptionElement.get(elem).delete();
  }

  downloadSelected() {
    var item = this._selectedItem();
    item.download();
  }
};

Audits2.ReportSelector.Item = class {
  /**
   * @param {!ReportRenderer.ReportJSON} lighthouseResult
   * @param {!Element} resultsView
   * @param {function()} showLandingCallback
   */
  constructor(lighthouseResult, resultsView, showLandingCallback) {
    this._lighthouseResult = lighthouseResult;
    this._resultsView = resultsView;
    this._showLandingCallback = showLandingCallback;
    /** @type {?Element} */
    this._reportContainer = null;


    var url = new Common.ParsedURL(lighthouseResult.url);
    var timestamp = lighthouseResult.generatedTime;
    this._element = createElement('option');
    this._element.label = `${url.domain()} ${new Date(timestamp).toLocaleString()}`;
  }

  select() {
    this._renderReport();
  }

  /**
   * @return {!Element}
   */
  optionElement() {
    return this._element;
  }

  delete() {
    if (this._element)
      this._element.remove();
    this._showLandingCallback();
  }

  download() {
    var url = new Common.ParsedURL(this._lighthouseResult.url).domain();
    var timestamp = this._lighthouseResult.generatedTime;
    var fileName = `${url}-${new Date(timestamp).toISO8601Compact()}.json`;
    Workspace.fileManager.save(fileName, JSON.stringify(this._lighthouseResult), true);
  }

  _renderReport() {
    this._resultsView.removeChildren();
    if (this._reportContainer) {
      this._resultsView.appendChild(this._reportContainer);
      return;
    }

    this._reportContainer = this._resultsView.createChild('div', 'lh-vars lh-root lh-devtools');

    var dom = new DOM(/** @type {!Document} */ (this._resultsView.ownerDocument));
    var detailsRenderer = new Audits2.DetailsRenderer(dom);
    var categoryRenderer = new CategoryRenderer(dom, detailsRenderer);
    var renderer = new Audits2.Audits2Panel.ReportRenderer(dom, categoryRenderer);

    var templatesHTML = Runtime.cachedResources['audits2/lighthouse/templates.html'];
    var templatesDOM = new DOMParser().parseFromString(templatesHTML, 'text/html');
    if (!templatesDOM)
      return;

    renderer.setTemplateContext(templatesDOM);
    renderer.renderReport(this._lighthouseResult, this._reportContainer);
  }
};

Audits2.DetailsRenderer = class extends DetailsRenderer {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
    super(dom);
    this._onMainFrameNavigatedPromise = null;
  }

  /**
   * @override
   * @param {!DetailsRenderer.NodeDetailsJSON} item
   * @return {!Element}
   */
  renderNode(item) {
    var element = super.renderNode(item);
    this._replaceWithDeferredNodeBlock(element, item);
    return element;
  }

  /**
   * @param {!Element} origElement
   * @param {!DetailsRenderer.NodeDetailsJSON} detailsItem
   */
  async _replaceWithDeferredNodeBlock(origElement, detailsItem) {
    var mainTarget = SDK.targetManager.mainTarget();
    if (!this._onMainFrameNavigatedPromise) {
      var resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel);
      this._onMainFrameNavigatedPromise = resourceTreeModel.once(SDK.ResourceTreeModel.Events.MainFrameNavigated);
    }

    await this._onMainFrameNavigatedPromise;

    var domModel = mainTarget.model(SDK.DOMModel);
    if (!detailsItem.path)
      return;

    var nodeId = await domModel.pushNodeByPathToFrontend(detailsItem.path);

    if (!nodeId)
      return;
    var node = domModel.nodeForId(nodeId);
    if (!node)
      return;

    var element = Components.DOMPresentationUtils.linkifyNodeReference(node, undefined, detailsItem.snippet);
    origElement.title = '';
    origElement.textContent = '';
    origElement.appendChild(element);
  }
};
