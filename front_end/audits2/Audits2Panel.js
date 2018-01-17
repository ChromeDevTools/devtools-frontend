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
        this.contentElement, [UI.DropTarget.Type.File], Common.UIString('Drop audit file here'),
        this._handleDrop.bind(this));

    for (var preset of Audits2.Audits2Panel.Presets)
      preset.setting.addChangeListener(this._updateStartButtonEnabled.bind(this));
    this._showLandingPage();
    SDK.targetManager.observeModels(SDK.ServiceWorkerManager, this);
    SDK.targetManager.addEventListener(
        SDK.TargetManager.Events.InspectedURLChanged, this._updateStartButtonEnabled, this);
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

    var mainTarget = SDK.targetManager.mainTarget();
    if (!mainTarget)
      return false;

    var inspectedURL = mainTarget.inspectedURL().asParsedURL();
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

    var mainTarget = SDK.targetManager.mainTarget();
    var inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (inspectedURL && !/^(http|chrome-extension)/.test(inspectedURL)) {
      return Common.UIString(
          'Can only audit HTTP/HTTPS pages and Chrome extensions. ' +
          'Navigate to a different page to start an audit.');
    }

    // Audits don't work on most undockable targets (extension popup pages, remote debugging, etc).
    // However, the tests run in a content shell which is not dockable yet audits just fine,
    // so disable this check when under test.
    if (!Host.isUnderTest() && !Runtime.queryParam('can_dock'))
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

    this._statusView = new Audits2.Audits2Panel.StatusView();
    this._statusView.render(uiElement);
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
            this._statusView.renderBugReport(err, this._inspectedURL);
        });
  }

  _hideDialog() {
    if (!this._dialog)
      return;
    this._dialog.hide();

    delete this._dialog;
    delete this._statusView;
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

  async _cancel() {
    if (this._auditRunning) {
      this._updateStatus(Common.UIString('Cancelling\u2026'));
      await this._stopAndReattach();

      if (this._statusView)
        this._statusView.reset();
    } else {
      this._hideDialog();
    }
  }

  _updateButton() {
    if (!this._dialog)
      return;
    this._startButton.classList.toggle('hidden', this._auditRunning);
    this._startButton.disabled = this._auditRunning;
    this._statusView.setVisible(this._auditRunning);
    this._auditSelectorForm.classList.toggle('hidden', this._auditRunning);
    if (this._auditRunning) {
      var parsedURL = (this._inspectedURL || '').asParsedURL();
      var pageHost = parsedURL && parsedURL.host;
      this._headerTitleElement.textContent =
          pageHost ? ls`Auditing ${pageHost}\u2026` : ls`Auditing your web page\u2026`;
    } else {
      this._headerTitleElement.textContent = Common.UIString('Audits to perform');
    }
  }

  /**
   * @param {string} statusMessage
   */
  _updateStatus(statusMessage) {
    if (!this._dialog || !this._statusView)
      return;
    this._statusView.updateStatus(statusMessage);
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

Audits2.Audits2Panel.StatusView = class {
  constructor() {
    this._statusView = null;
    this._progressWrapper = null;
    this._progressBar = null;
    this._statusText = null;

    this._textChangedAt = 0;
    this._fastFactsQueued = Audits2.Audits2Panel.StatusView.FastFacts.slice();
    this._currentPhase = null;
    this._scheduledTextChangeTimeout = null;
    this._scheduledFastFactTimeout = null;
  }

  /**
   * @param {!Element} parentElement
   */
  render(parentElement) {
    this.reset();

    this._statusView = parentElement.createChild('div', 'audits2-status vbox hidden');
    this._progressWrapper = this._statusView.createChild('div', 'audits2-progress-wrapper');
    this._progressBar = this._progressWrapper.createChild('div', 'audits2-progress-bar');
    this._statusText = this._statusView.createChild('div', 'audits2-status-text');

    this.updateStatus(Common.UIString('Loading...'));
  }

  reset() {
    this._resetProgressBarClasses();
    clearTimeout(this._scheduledFastFactTimeout);

    this._textChangedAt = 0;
    this._fastFactsQueued = Audits2.Audits2Panel.StatusView.FastFacts.slice();
    this._currentPhase = null;
    this._scheduledTextChangeTimeout = null;
    this._scheduledFastFactTimeout = null;
  }

  /**
   * @param {boolean} isVisible
   */
  setVisible(isVisible) {
    this._statusView.classList.toggle('hidden', !isVisible);

    if (!isVisible)
      clearTimeout(this._scheduledFastFactTimeout);
  }

  /**
   * @param {?string} message
   */
  updateStatus(message) {
    if (!message || !this._statusText)
      return;

    if (message.startsWith('Cancel')) {
      this._commitTextChange(Common.UIString('Cancelling\u2026'));
      clearTimeout(this._scheduledFastFactTimeout);
      return;
    }

    var nextPhase = this._getPhaseForMessage(message);
    if (!nextPhase && !this._currentPhase) {
      this._commitTextChange(Common.UIString('Lighthouse is warming up\u2026'));
      clearTimeout(this._scheduledFastFactTimeout);
    } else if (nextPhase && (!this._currentPhase || this._currentPhase.order < nextPhase.order)) {
      this._currentPhase = nextPhase;
      this._scheduleTextChange(Common.UIString(nextPhase.message));
      this._scheduleFastFactCheck();
      this._resetProgressBarClasses();
      this._progressBar.classList.add(nextPhase.progressBarClass);
    }
  }

  /**
   * @param {string} message
   * @return {?Audits2.Audits2Panel.StatusView.StatusPhases}
   */
  _getPhaseForMessage(message) {
    return Audits2.Audits2Panel.StatusView.StatusPhases.find(phase => message.startsWith(phase.statusMessagePrefix));
  }

  _resetProgressBarClasses() {
    if (!this._progressBar)
      return;

    this._progressBar.className = 'audits2-progress-bar';
  }

  _scheduleFastFactCheck() {
    if (!this._currentPhase || this._scheduledFastFactTimeout)
      return;

    this._scheduledFastFactTimeout = setTimeout(() => {
      this._updateFastFactIfNecessary();
      this._scheduledFastFactTimeout = null;

      this._scheduleFastFactCheck();
    }, 100);
  }

  _updateFastFactIfNecessary() {
    var now = performance.now();
    if (now - this._textChangedAt < Audits2.Audits2Panel.StatusView.fastFactRotationInterval)
      return;
    if (!this._fastFactsQueued.length)
      return;

    var fastFactIndex = Math.floor(Math.random() * this._fastFactsQueued.length);
    this._scheduleTextChange(ls`\ud83d\udca1 ${this._fastFactsQueued[fastFactIndex]}`);
    this._fastFactsQueued.splice(fastFactIndex, 1);
  }

  /**
   * @param {string} text
   */
  _commitTextChange(text) {
    if (!this._statusText)
      return;
    this._textChangedAt = performance.now();
    this._statusText.textContent = text;
  }

  /**
   * @param {string} text
   */
  _scheduleTextChange(text) {
    if (this._scheduledTextChangeTimeout)
      clearTimeout(this._scheduledTextChangeTimeout);

    var msSinceLastChange = performance.now() - this._textChangedAt;
    var msToTextChange = Audits2.Audits2Panel.StatusView.minimumTextVisibilityDuration - msSinceLastChange;

    this._scheduledTextChangeTimeout = setTimeout(() => {
      this._commitTextChange(text);
    }, Math.max(msToTextChange, 0));
  }

  /**
   * @param {!Error} err
   * @param {string} inspectedURL
   */
  renderBugReport(err, inspectedURL) {
    console.error(err);
    clearTimeout(this._scheduledFastFactTimeout);
    clearTimeout(this._scheduledTextChangeTimeout);
    this._resetProgressBarClasses();
    this._progressBar.classList.add('errored');

    this._commitTextChange('');
    this._statusText.createTextChild(Common.UIString('Ah, sorry! We ran into an error: '));
    this._statusText.createChild('em').createTextChild(err.message);
    if (Audits2.Audits2Panel.KnownBugPatterns.some(pattern => pattern.test(err.message))) {
      var message = Common.UIString(
          'Try to navigate to the URL in a fresh Chrome profile without any other tabs or ' +
          'extensions open and try again.');
      this._statusText.createChild('p').createTextChild(message);
    } else {
      this._renderBugReportLink(err, inspectedURL);
    }
  }

  /**
   * @param {!Error} err
   * @param {string} inspectedURL
   */
  _renderBugReportLink(err, inspectedURL) {
    var baseURI = 'https://github.com/GoogleChrome/lighthouse/issues/new?';
    var title = encodeURI('title=DevTools Error: ' + err.message.substring(0, 60));

    var issueBody = `
**Initial URL**: ${inspectedURL}
**Chrome Version**: ${navigator.userAgent.match(/Chrome\/(\S+)/)[1]}
**Error Message**: ${err.message}
**Stack Trace**:
\`\`\`
${err.stack}
\`\`\`
    `;
    var body = '&body=' + encodeURIComponent(issueBody.trim());
    var reportErrorEl = UI.XLink.create(
        baseURI + title + body, Common.UIString('Report this bug'), 'audits2-link audits2-report-error');
    this._statusText.appendChild(reportErrorEl);
  }
};

/** @typedef {{message: string, progressBarClass: string, order: number}} */
Audits2.Audits2Panel.StatusView.StatusPhases = [
  {
    progressBarClass: 'loading',
    message: 'Lighthouse is loading your page with throttling to measure performance on a mobile device on 3G.',
    statusMessagePrefix: 'Loading page',
    order: 10,
  },
  {
    progressBarClass: 'gathering',
    message: 'Lighthouse is gathering information about the page to compute your score.',
    statusMessagePrefix: 'Retrieving',
    order: 20,
  },
  {
    progressBarClass: 'auditing',
    message: 'Almost there! Lighthouse is now generating your own special pretty report!',
    statusMessagePrefix: 'Evaluating',
    order: 30,
  }
];

Audits2.Audits2Panel.StatusView.FastFacts = [
  '1MB takes a minimum of 5 seconds to download on a typical 3G connection [Source: WebPageTest and DevTools 3G definition].',
  'Rebuilding Pinterest pages for performance increased conversion rates by 15% [Source: WPO Stats]',
  'BBC has seen a loss of 10% of their users for every extra second of page load [Source: WPO Stats]',
  'By reducing the response size of JSON needed for displaying comments, Instagram saw increased impressions [Source: WPO Stats]',
  'Walmart saw a 1% increase in revenue for every 100ms improvement in page load [Source: WPO Stats]',
  'If a site takes >1 second to become interactive, users lose attention, and their perception of completing the page task is broken [Source: Google Developers Blog]',
  '75% of global mobile users in 2016 were on 2G or 3G [Source: GSMA Mobile]',
  'The average user device costs less than 200 USD. [Source: International Data Corporation]',
  '53% of all site visits are abandoned if page load takes more than 3 seconds [Source: Google DoubleClick blog]',
  '19 seconds is the average time a mobile web page takes to load on a 3G connection [Source: Google DoubleClick blog]',
  '14 seconds is the average time a mobile web page takes to load on a 4G connection [Source: Google DoubleClick blog]',
  '70% of mobile pages take nearly 7 seconds for the visual content above the fold to display on the screen. [Source: Think with Google]',
  'As page load time increases from one second to seven seconds, the probability of a mobile site visitor bouncing increases 113%. [Source: Think with Google]',
  'As the number of elements on a page increases from 400 to 6,000, the probability of conversion drops 95%. [Source: Think with Google]',
  '70% of mobile pages weigh over 1MB, 36% over 2MB, and 12% over 4MB. [Source: Think with Google]',
  'Lighthouse only simulates mobile performance; to measure performance on a real device, try WebPageTest.org [Source: Lighthouse team]',
];

/** @const */
Audits2.Audits2Panel.StatusView.fastFactRotationInterval = 6000;
/** @const */
Audits2.Audits2Panel.StatusView.minimumTextVisibilityDuration = 3000;

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

/** @type {!Array.<!RegExp>} */
Audits2.Audits2Panel.KnownBugPatterns = [
  /Parsing problem/,
  /Read failed/,
  /Tracing.*already started/,
  /^Unable to load.*page/,
  /^You must provide a url to the runner/,
  /^You probably have multiple tabs open/,
];

/** @typedef {{setting: !Common.Setting, configID: string, title: string, description: string}} */
Audits2.Audits2Panel.Preset;

/** @type {!Array.<!Audits2.Audits2Panel.Preset>} */
Audits2.Audits2Panel.Presets = [
  // configID maps to Lighthouse's Object.keys(config.categories)[0] value
  {
    setting: Common.settings.createSetting('audits2.cat_perf', true),
    configID: 'performance',
    title: 'Performance',
    description: 'How long does this app take to show content and become usable'
  },
  {
    setting: Common.settings.createSetting('audits2.cat_pwa', true),
    configID: 'pwa',
    title: 'Progressive Web App',
    description: 'Does this page meet the standard of a Progressive Web App'
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
  {
    setting: Common.settings.createSetting('audits2.cat_seo', true),
    configID: 'seo',
    title: 'SEO',
    description: 'Is this page optimized for search engine results ranking'
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
