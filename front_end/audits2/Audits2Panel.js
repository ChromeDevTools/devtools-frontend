// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Audits2.Audits2Panel = class extends UI.PanelWithSidebar {
  constructor() {
    super('audits2');
    this.setHideOnDetach();
    this.registerRequiredCSS('audits2/audits2Panel.css');
    this.registerRequiredCSS('audits2/lighthouse/report-styles.css');

    this._protocolService = new Audits2.ProtocolService();
    this._protocolService.registerStatusCallback(msg => this._updateStatus(Common.UIString(msg)));

    var toolbar = new UI.Toolbar('', this.panelSidebarElement());

    var newButton = new UI.ToolbarButton(Common.UIString('New audit\u2026'), 'largeicon-add');
    toolbar.appendToolbarItem(newButton);
    newButton.addEventListener(UI.ToolbarButton.Events.Click, this._showLauncherUI.bind(this));

    var deleteButton = new UI.ToolbarButton(Common.UIString('Delete audit'), 'largeicon-delete');
    toolbar.appendToolbarItem(deleteButton);
    deleteButton.addEventListener(UI.ToolbarButton.Events.Click, this._deleteSelected.bind(this));

    toolbar.appendSeparator();

    var clearButton = new UI.ToolbarButton(Common.UIString('Clear all'), 'largeicon-clear');
    toolbar.appendToolbarItem(clearButton);
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._clearAll.bind(this));

    this._treeOutline = new UI.TreeOutlineInShadow();
    this._treeOutline.registerRequiredCSS('audits2/lighthouse/report-styles.css');
    this._treeOutline.registerRequiredCSS('audits2/audits2Tree.css');
    this.panelSidebarElement().appendChild(this._treeOutline.element);

    this._dropTarget = new UI.DropTarget(
        this.contentElement, [UI.DropTarget.Types.Files], Common.UIString('Drop audit file here'),
        this._handleDrop.bind(this));

    this._showLandingPage();
  }

  _clearAll() {
    this._treeOutline.removeChildren();
    this._showLandingPage();
  }

  _deleteSelected() {
    var selection = this._treeOutline.selectedTreeElement;
    if (selection)
      selection._deleteItem();
  }

  _showLandingPage() {
    if (this._treeOutline.rootElement().childCount())
      return;

    this.mainElement().removeChildren();
    var landingPage = this.mainElement().createChild('div', 'vbox audits2-landing-page');
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
        Common.UIString('Perform an audit\u2026'), this._showLauncherUI.bind(this), 'material-button default');
    landingCenter.appendChild(newButton);
  }

  _showLauncherUI() {
    this._dialog = new UI.Dialog();
    this._dialog.setOutsideClickCallback(event => event.consume(true));
    var root = UI.createShadowRootWithCoreStyles(this._dialog.contentElement, 'audits2/audits2Dialog.css');
    var auditsViewElement = root.createChild('div', 'audits2-view');
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

    var buttonsRow = uiElement.createChild('div', 'audits2-dialog-buttons hbox');
    this._startButton =
        UI.createTextButton(Common.UIString('Run audit'), this._start.bind(this), 'material-button default');
    buttonsRow.appendChild(this._startButton);
    this._cancelButton = UI.createTextButton(Common.UIString('Cancel'), this._cancel.bind(this), 'material-button');
    buttonsRow.appendChild(this._cancelButton);

    this._dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SetExactWidthMaxHeight);
    this._dialog.setMaxContentSize(new UI.Size(500, 400));
    this._dialog.show(this.mainElement());
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
    this._inspectedURL = SDK.targetManager.mainTarget().inspectedURL();

    var categoryIDs = [];
    for (var preset of Audits2.Audits2Panel.Presets) {
      if (preset.setting.get())
        categoryIDs.push(preset.configID);
    }

    return Promise.resolve()
        .then(_ => this._protocolService.attach())
        .then(_ => {
          this._auditRunning = true;
          this._updateButton();
          this._updateStatus(Common.UIString('Loading\u2026'));
        })
        .then(_ => this._protocolService.startLighthouse(this._inspectedURL, categoryIDs))
        .then(lighthouseResult =>
          this._stopAndReattach().then(() => this._buildReportUI(lighthouseResult))
        ).catch(err => {
          if (err instanceof Error)
            this._renderBugReport(err);
         });
  }

  _hideDialog() {
    if (!this._dialog)
      return;
    this._dialog.hide();

    var emulationModel = self.singleton(Emulation.DeviceModeModel);
    emulationModel.enabledSetting().set(this._emulationEnabledBefore);
    emulationModel.deviceOutlineSetting().set(this._emulationOutlineEnabledBefore);
    emulationModel.toolbarControlsEnabledSetting().set(true);

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
  _stopAndReattach() {
    return this._protocolService.detach().then(_ => {
      Emulation.InspectedPagePlaceholder.instance().update(true);
      this._auditRunning = false;
      this._updateButton();
      var resourceTreeModel = SDK.targetManager.mainTarget().model(SDK.ResourceTreeModel);
      // reload to reset the page state
      resourceTreeModel.navigate(this._inspectedURL).then(() => this._hideDialog());
    });
  }

  /**
   * @param {!ReportRenderer.ReportJSON} lighthouseResult
   */
  _buildReportUI(lighthouseResult) {
    if (lighthouseResult === null) {
      this._updateStatus(Common.UIString('Auditing failed.'));
      return;
    }
    var treeElement =
        new Audits2.Audits2Panel.TreeElement(lighthouseResult, this.mainElement(), this._showLandingPage.bind(this));
    this._treeOutline.appendChild(treeElement);
    treeElement._populate();
    treeElement.select();
    this._hideDialog();
  }

  /**
   * @param {!Error} err
   */
  _renderBugReport(err) {
    console.error(err);
    this._statusElement.textContent = '';
    this._statusIcon.classList.add('error');
    this._statusElement.createTextChild(Common.UIString('We ran into an error. '));
    this._createBugReportLink(err, this._statusElement);
  }

  /**
   * @param {!Error} err
   * @param {!Element} parentElem
   */
  _createBugReportLink(err, parentElem) {
    var baseURI = 'https://github.com/GoogleChrome/lighthouse/issues/new?';
    var title = encodeURI('title=DevTools Error: ' + err.message.substring(0, 60));

    var qsBody = '';
    qsBody += '**Error Message**: ' + err.message + '\n';
    qsBody += '**Stack Trace**:\n ```' + err.stack + '```';
    var body = '&body=' + encodeURI(qsBody);

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
        Services.serviceManager.createAppService('audits2_worker', 'Audits2Service', false).then(backend => {
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

Audits2.Audits2Panel.TreeElement = class extends UI.TreeElement {
  /**
   * @param {!ReportRenderer.ReportJSON} lighthouseResult
   * @param {!Element} resultsView
   * @param {function()} showLandingCallback
   */
  constructor(lighthouseResult, resultsView, showLandingCallback) {
    super('', false);
    this._lighthouseResult = lighthouseResult;
    this._resultsView = resultsView;
    this._showLandingCallback = showLandingCallback;
    /** @type {?Element} */
    this._reportContainer = null;

    var url = new Common.ParsedURL(lighthouseResult.url);
    var timestamp = lighthouseResult.generatedTime;
    var titleElement = this.titleElement();
    titleElement.classList.add('audits2-report-tree-item');
    titleElement.createChild('div').textContent = url.domain();
    titleElement.createChild('span', 'dimmed').textContent = new Date(timestamp).toLocaleString();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);
  }

  _populate() {
    for (var category of this._lighthouseResult.reportCategories) {
      var treeElement = new Audits2.Audits2Panel.TreeSubElement(category.id, category.name, category.score);
      this.appendChild(treeElement);
    }
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    this._renderReport();
    return true;
  }

  /**
   * @override
   */
  ondelete() {
    this._deleteItem();
    return true;
  }

  _deleteItem() {
    this.treeOutline.removeChild(this);
    this._showLandingCallback();
  }

  /**
   * @param {!Event} event
   */
  _handleContextMenuEvent(event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString('Save as\u2026'), () => {
      var url = new Common.ParsedURL(this._lighthouseResult.url).domain();
      var timestamp = this._lighthouseResult.generatedTime;
      var fileName = `${url}-${new Date(timestamp).toISO8601Compact()}.json`;
      Workspace.fileManager.save(fileName, JSON.stringify(this._lighthouseResult), true);
    });
    contextMenu.appendItem(Common.UIString('Delete'), () => this._deleteItem());
    contextMenu.show();
  }

  /**
   * @override
   */
  onunbind() {
    if (this._reportContainer && this._reportContainer.parentElement)
      this._reportContainer.remove();
  }

  _renderReport() {
    this._resultsView.removeChildren();
    if (this._reportContainer) {
      this._resultsView.appendChild(this._reportContainer);
      return;
    }

    this._reportContainer = this._resultsView.createChild('div', 'report-container lh-vars lh-root');

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

    var performanceScoreElement = this._reportContainer.querySelector('.lh-category[id=performance] .lh-score');
    var artifacts = this._lighthouseResult['artifacts'];
    if (!performanceScoreElement || !artifacts)
      return;
    var tracePass = artifacts['traces'] ? artifacts['traces']['defaultPass'] : null;
    if (!tracePass)
      return;

    var fmp = this._lighthouseResult['audits']['first-meaningful-paint'];
    if (!fmp || !fmp['extendedInfo'])
      return;

    var tti = this._lighthouseResult['audits']['time-to-interactive'];
    if (!tti || !tti['extendedInfo'])
      return;

    var navStart = fmp['extendedInfo']['value']['timestamps']['navStart'];
    var markers = [
      {
        title: Common.UIString('First contentful paint'),
        value: (fmp['extendedInfo']['value']['timestamps']['fCP'] - navStart) / 1000
      },
      {
        title: Common.UIString('First meaningful paint'),
        value: (fmp['extendedInfo']['value']['timestamps']['fMP'] - navStart) / 1000
      },
      {
        title: Common.UIString('Time to interactive'),
        value: (tti['extendedInfo']['value']['timestamps']['timeToInteractive'] - navStart) / 1000
      },
      {
        title: Common.UIString('Visually ready'),
        value: (tti['extendedInfo']['value']['timestamps']['visuallyReady'] - navStart) / 1000
      }
    ];

    var timeSpan = Math.max(...markers.map(marker => marker.value));
    var screenshots = tracePass.traceEvents.filter(e => e.cat === 'disabled-by-default-devtools.screenshot');
    var timelineElement = createElementWithClass('div', 'audits2-timeline');
    var filmStripElement = timelineElement.createChild('div', 'audits2-filmstrip');

    var numberOfFrames = 8;
    var roundToMs = 100;
    var timeStep = (Math.ceil(timeSpan / numberOfFrames / roundToMs)) * roundToMs;

    for (var time = 0; time < timeSpan; time += timeStep) {
      var frameForTime = null;
      for (var e of screenshots) {
        if ((e.ts - navStart) / 1000 < time + timeStep)
          frameForTime = e.args.snapshot;
      }
      var frame = filmStripElement.createChild('div', 'frame');
      frame.createChild('div', 'time').textContent = Number.millisToString(time + timeStep);

      var thumbnail = frame.createChild('div', 'thumbnail');
      if (frameForTime) {
        var img = thumbnail.createChild('img');
        img.src = 'data:image/jpg;base64,' + frameForTime;
      }
    }

    for (var marker of markers) {
      var markerElement = timelineElement.createChild('div', 'audits2-timeline-marker');
      markerElement.createChild('div', 'audits2-timeline-bar').style.width =
          (100 * (marker.value / timeSpan) | 0) + '%';
      markerElement.createChild('span').textContent = Common.UIString('%s: ', marker.title);
      markerElement.createChild('span', 'audits2-timeline-subtitle').textContent = Number.millisToString(marker.value);
    }

    performanceScoreElement.parentElement.insertBefore(timelineElement, performanceScoreElement.nextSibling);
  }
};

Audits2.Audits2Panel.TreeSubElement = class extends UI.TreeElement {
  /**
   * @param {string} id
   * @param {string} name
   * @param {number} score
   */
  constructor(id, name, score) {
    super('');
    this._id = id;
    this.listItemElement.textContent = name;
    var label = Util.calculateRating(score);
    var subtitleElement = this.listItemElement.createChild('span', 'lh-vars audits2-tree-subtitle-' + label);
    subtitleElement.textContent = String(Math.round(score));
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect() {
    this.parent._renderReport();
    var node = this.parent._resultsView.querySelector('.lh-category[id=' + this._id + ']');
    if (node) {
      node.scrollIntoView(true);
      return true;
    }
    return false;
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
  _replaceWithDeferredNodeBlock(origElement, detailsItem) {
    var mainTarget = SDK.targetManager.mainTarget();
    if (!this._onMainFrameNavigatedPromise) {
      var resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel);
      this._onMainFrameNavigatedPromise = new Promise(resolve => {
        resourceTreeModel.once(SDK.ResourceTreeModel.Events.MainFrameNavigated, resolve);
      });
    }

    this._onMainFrameNavigatedPromise.then(_ => {
      var domModel = mainTarget.model(SDK.DOMModel);
      if (!detailsItem.path)
        return;

      domModel.pushNodeByPathToFrontend(detailsItem.path, nodeId => {
        if (!nodeId)
          return;
        var node = domModel.nodeForId(nodeId);
        if (!node)
          return;

        var element = Components.DOMPresentationUtils.linkifyNodeReference(node, undefined, detailsItem.snippet);
        origElement.parentNode.replaceChild(element, origElement);
      });
    });
  }
};
