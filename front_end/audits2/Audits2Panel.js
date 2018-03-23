// Copyright 2016 The Chromium Authors. All rights reserved.
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

    this._renderToolbar();

    this._auditResultsElement = this.contentElement.createChild('div', 'audits2-results-container');
    this._dropTarget = new UI.DropTarget(
        this.contentElement, [UI.DropTarget.Type.File], Common.UIString('Drop audit file here'),
        this._handleDrop.bind(this));

    for (const preset of Audits2.Audits2Panel.Presets)
      preset.setting.addChangeListener(this._refreshDialogUI.bind(this));

    this._showLandingPage();
    SDK.targetManager.observeModels(SDK.ServiceWorkerManager, this);
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged, this._refreshDialogUI, this);
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
      this._manager.addEventListener(SDK.ServiceWorkerManager.Events.RegistrationUpdated, this._refreshDialogUI, this),
      this._manager.addEventListener(SDK.ServiceWorkerManager.Events.RegistrationDeleted, this._refreshDialogUI, this),
    ];

    this._refreshDialogUI();
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
    this._refreshDialogUI();
  }

  /**
   * @return {boolean}
   */
  _hasActiveServiceWorker() {
    if (!this._manager)
      return false;

    const mainTarget = SDK.targetManager.mainTarget();
    if (!mainTarget)
      return false;

    const inspectedURL = mainTarget.inspectedURL().asParsedURL();
    const inspectedOrigin = inspectedURL && inspectedURL.securityOrigin();
    for (const registration of this._manager.registrations().values()) {
      if (registration.securityOrigin !== inspectedOrigin)
        continue;

      for (const version of registration.versions.values()) {
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

    const mainTarget = SDK.targetManager.mainTarget();
    const inspectedURL = mainTarget && mainTarget.inspectedURL();
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

  _refreshDialogUI() {
    if (!this._dialog)
      return;

    const hasActiveServiceWorker = this._hasActiveServiceWorker();
    const hasAtLeastOneCategory = this._hasAtLeastOneCategory();
    const unauditablePageMessage = this._unauditablePageMessage();
    const isDisabled = hasActiveServiceWorker || !hasAtLeastOneCategory || !!unauditablePageMessage;

    let helpText = '';
    if (hasActiveServiceWorker) {
      helpText = Common.UIString(
          'Multiple tabs are being controlled by the same service worker. ' +
          'Close your other tabs on the same origin to audit this page.');
    } else if (!hasAtLeastOneCategory) {
      helpText = Common.UIString('At least one category must be selected.');
    } else if (unauditablePageMessage) {
      helpText = unauditablePageMessage;
    }

    this._dialog.setHelpText(helpText);
    this._dialog.setStartEnabled(!isDisabled);
  }

  _refreshToolbarUI() {
    this._downloadButton.setEnabled(this._reportSelector.hasCurrentSelection());
    this._clearButton.setEnabled(this._reportSelector.hasItems());
  }

  _clearAll() {
    this._reportSelector.clearAll();
    this._showLandingPage();
    this._refreshToolbarUI();
  }

  _downloadSelected() {
    this._reportSelector.downloadSelected();
  }

  _renderToolbar() {
    const toolbar = new UI.Toolbar('', this.element);

    this._newButton = new UI.ToolbarButton(Common.UIString('Perform an audit\u2026'), 'largeicon-add');
    toolbar.appendToolbarItem(this._newButton);
    this._newButton.addEventListener(UI.ToolbarButton.Events.Click, this._showDialog.bind(this));

    this._downloadButton = new UI.ToolbarButton(Common.UIString('Download report'), 'largeicon-download');
    toolbar.appendToolbarItem(this._downloadButton);
    this._downloadButton.addEventListener(UI.ToolbarButton.Events.Click, this._downloadSelected.bind(this));

    toolbar.appendSeparator();

    this._reportSelector = new Audits2.ReportSelector();
    toolbar.appendToolbarItem(this._reportSelector.comboBox());

    this._clearButton = new UI.ToolbarButton(Common.UIString('Clear all'), 'largeicon-clear');
    toolbar.appendToolbarItem(this._clearButton);
    this._clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._clearAll.bind(this));

    toolbar.appendSeparator();

    toolbar.appendText(ls`Emulation: `);
    for (const runtimeSetting of Audits2.Audits2Panel.RuntimeSettings) {
      const control = new UI.ToolbarSettingComboBox(runtimeSetting.options, runtimeSetting.setting);
      control.element.title = runtimeSetting.description;
      toolbar.appendToolbarItem(control);
    }

    this._refreshToolbarUI();
  }

  _showLandingPage() {
    if (this._reportSelector.hasCurrentSelection())
      return;

    this._auditResultsElement.removeChildren();
    const landingPage = this._auditResultsElement.createChild('div', 'vbox audits2-landing-page');
    const landingCenter = landingPage.createChild('div', 'vbox audits2-landing-center');
    landingCenter.createChild('div', 'audits2-logo');
    const text = landingCenter.createChild('div', 'audits2-landing-text');
    text.createChild('span', 'audits2-landing-bold-text').textContent = Common.UIString('Audits');
    text.createChild('span').textContent = Common.UIString(
        ' help you identify and fix common problems that affect' +
        ' your site\'s performance, accessibility, and user experience. ');
    const link = text.createChild('span', 'link');
    link.textContent = Common.UIString('Learn more');
    link.addEventListener(
        'click', () => InspectorFrontendHost.openInNewTab('https://developers.google.com/web/tools/lighthouse/'));

    const newButton = UI.createTextButton(
        Common.UIString('Perform an audit\u2026'), this._showDialog.bind(this), '', true /* primary */);
    landingCenter.appendChild(newButton);
    this.setDefaultFocusedElement(newButton);
    this._refreshToolbarUI();
  }

  _showDialog() {
    this._dialog = new Audits2.Audits2Dialog(result => this._buildReportUI(result), this._protocolService);
    this._dialog.render(this._auditResultsElement);
    this._refreshDialogUI();
  }

  _hideDialog() {
    if (!this._dialog)
      return;

    this._dialog.hide();
    delete this._dialog;
  }

  /**
   * @param {!ReportRenderer.ReportJSON} lighthouseResult
   */
  _buildReportUI(lighthouseResult) {
    if (lighthouseResult === null)
      return;

    const optionElement =
        new Audits2.ReportSelector.Item(lighthouseResult, this._auditResultsElement, this._showLandingPage.bind(this));
    this._reportSelector.prepend(optionElement);
    this._hideDialog();
    this._refreshToolbarUI();
  }

  /**
   * @param {!DataTransfer} dataTransfer
   */
  _handleDrop(dataTransfer) {
    const items = dataTransfer.items;
    if (!items.length)
      return;
    const item = items[0];
    if (item.kind === 'file') {
      const entry = items[0].webkitGetAsEntry();
      if (!entry.isFile)
        return;
      entry.file(file => {
        const reader = new FileReader();
        reader.onload = () => this._loadedFromFile(/** @type {string} */ (reader.result));
        reader.readAsText(file);
      });
    }
  }

  /**
   * @param {string} profile
   */
  _loadedFromFile(profile) {
    const data = JSON.parse(profile);
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

/** @typedef {{type: string, setting: !Common.Setting, configID: string, title: string, description: string}} */
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

/** @typedef {{setting: !Common.Setting, description: string, setFlags: function(!Object, string), options: !Array}} */
Audits2.Audits2Panel.RuntimeSetting;

/** @type {!Array.<!Audits2.Audits2Panel.RuntimeSetting>} */
Audits2.Audits2Panel.RuntimeSettings = [
  {
    setting: Common.settings.createSetting('audits2.device_type', 'mobile'),
    description: Common.UIString('Apply mobile emulation during auditing'),
    setFlags: (flags, value) => {
      flags.disableDeviceEmulation = value === 'desktop';
    },
    options: [
      {label: Common.UIString('Mobile'), value: 'mobile'},
      {label: Common.UIString('Desktop'), value: 'desktop'},
    ],
  },
  {
    setting: Common.settings.createSetting('audits2.throttling', 'default'),
    description: Common.UIString('Apply network and CPU throttling during performance auditing'),
    setFlags: (flags, value) => {
      flags.disableNetworkThrottling = value === 'off';
      flags.disableCpuThrottling = value === 'off';
    },
    options: [
      {label: Common.UIString('3G w/ CPU slowdown'), value: 'default'},
      {label: Common.UIString('No throttling'), value: 'off'},
    ],
  },
  {
    setting: Common.settings.createSetting('audits2.storage_reset', 'on'),
    description: Common.UIString('Reset storage (localStorage, IndexedDB, etc) to a clean baseline before auditing'),
    setFlags: (flags, value) => {
      flags.disableStorageReset = value === 'off';
    },
    options: [
      {label: Common.UIString('Clear storage'), value: 'on'},
      {label: Common.UIString('Preserve storage'), value: 'off'},
    ],
  },
];

Audits2.ReportSelector = class {
  constructor() {
    this._emptyItem = null;
    this._comboBox = new UI.ToolbarComboBox(this._handleChange.bind(this), 'audits2-report');
    this._comboBox.setMaxWidth(180);
    this._comboBox.setMinWidth(140);
    this._itemByOptionElement = new Map();
    this._setPlaceholderState();
  }

  _setPlaceholderState() {
    this._comboBox.setEnabled(false);
    this._emptyItem = createElement('option');
    this._emptyItem.label = Common.UIString('(no reports)');
    this._comboBox.selectElement().appendChild(this._emptyItem);
    this._comboBox.select(this._emptyItem);
  }

  /**
   * @param {!Event} event
   */
  _handleChange(event) {
    const item = this._selectedItem();
    if (item)
      item.select();
  }

  /**
   * @return {!Audits2.ReportSelector.Item}
   */
  _selectedItem() {
    const option = this._comboBox.selectedOption();
    return this._itemByOptionElement.get(option);
  }

  /**
   * @return {boolean}
   */
  hasCurrentSelection() {
    return !!this._selectedItem();
  }

  /**
   * @return {boolean}
   */
  hasItems() {
    return this._itemByOptionElement.size > 0;
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
    if (this._emptyItem) {
      this._emptyItem.remove();
      delete this._emptyItem;
    }

    const optionEl = item.optionElement();
    const selectEl = this._comboBox.selectElement();

    this._itemByOptionElement.set(optionEl, item);
    selectEl.insertBefore(optionEl, selectEl.firstElementChild);
    this._comboBox.setEnabled(true);
    this._comboBox.select(optionEl);
    item.select();
  }

  clearAll() {
    for (const elem of this._comboBox.options()) {
      this._itemByOptionElement.get(elem).delete();
      this._itemByOptionElement.delete(elem);
    }

    this._setPlaceholderState();
  }

  downloadSelected() {
    const item = this._selectedItem();
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


    const url = new Common.ParsedURL(lighthouseResult.url);
    const timestamp = lighthouseResult.generatedTime;
    this._element = createElement('option');
    this._element.label = `${new Date(timestamp).toLocaleTimeString()} - ${url.domain()}`;
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
    const url = new Common.ParsedURL(this._lighthouseResult.url).domain();
    const timestamp = this._lighthouseResult.generatedTime;
    const fileName = `${url}-${new Date(timestamp).toISO8601Compact()}.json`;
    Workspace.fileManager.save(fileName, JSON.stringify(this._lighthouseResult), true);
  }

  _renderReport() {
    this._resultsView.removeChildren();
    if (this._reportContainer) {
      this._resultsView.appendChild(this._reportContainer);
      return;
    }

    this._reportContainer = this._resultsView.createChild('div', 'lh-vars lh-root lh-devtools');

    const dom = new DOM(/** @type {!Document} */ (this._resultsView.ownerDocument));
    const detailsRenderer = new Audits2.DetailsRenderer(dom);
    const categoryRenderer = new Audits2.CategoryRenderer(dom, detailsRenderer);
    categoryRenderer.setTraceArtifact(this._lighthouseResult);
    const renderer = new Audits2.Audits2Panel.ReportRenderer(dom, categoryRenderer);

    const templatesHTML = Runtime.cachedResources['audits2/lighthouse/templates.html'];
    const templatesDOM = new DOMParser().parseFromString(templatesHTML, 'text/html');
    if (!templatesDOM)
      return;

    renderer.setTemplateContext(templatesDOM);
    renderer.renderReport(this._lighthouseResult, this._reportContainer);
  }
};

Audits2.CategoryRenderer = class extends CategoryRenderer {
  /**
   * @override
   * @param {!DOM} dom
   * @param {!DetailsRenderer} detailsRenderer
   */
  constructor(dom, detailsRenderer) {
    super(dom, detailsRenderer);
    this._defaultPassTrace = null;
  }

  /**
   * @param {!ReportRenderer.ReportJSON} lhr
   */
  setTraceArtifact(lhr) {
    if (!lhr.artifacts || !lhr.artifacts.traces || !lhr.artifacts.traces.defaultPass)
      return;
    this._defaultPassTrace = lhr.artifacts.traces.defaultPass;
  }

  /**
   * @override
   * @param {!ReportRenderer.CategoryJSON} category
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groups
   * @return {!Element}
   */
  renderPerformanceCategory(category, groups) {
    const defaultPassTrace = this._defaultPassTrace;
    const element = super.renderPerformanceCategory(category, groups);
    if (!defaultPassTrace)
      return element;

    const timelineButton = UI.createTextButton(Common.UIString('View Trace'), onViewTraceClick, 'view-trace');
    element.querySelector('.lh-audit-group').prepend(timelineButton);
    return element;

    async function onViewTraceClick() {
      await UI.inspectorView.showPanel('timeline');
      Timeline.TimelinePanel.instance().loadFromEvents(defaultPassTrace.traceEvents);
    }
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
    const element = super.renderNode(item);
    this._replaceWithDeferredNodeBlock(element, item);
    return element;
  }

  /**
   * @param {!Element} origElement
   * @param {!DetailsRenderer.NodeDetailsJSON} detailsItem
   */
  async _replaceWithDeferredNodeBlock(origElement, detailsItem) {
    const mainTarget = SDK.targetManager.mainTarget();
    if (!this._onMainFrameNavigatedPromise) {
      const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel);
      this._onMainFrameNavigatedPromise = resourceTreeModel.once(SDK.ResourceTreeModel.Events.MainFrameNavigated);
    }

    await this._onMainFrameNavigatedPromise;

    const domModel = mainTarget.model(SDK.DOMModel);
    if (!detailsItem.path)
      return;

    const nodeId = await domModel.pushNodeByPathToFrontend(detailsItem.path);

    if (!nodeId)
      return;
    const node = domModel.nodeForId(nodeId);
    if (!node)
      return;

    const element =
        await Common.Linkifier.linkify(node, /** @type {!Common.Linkifier.Options} */ ({title: detailsItem.snippet}));
    origElement.title = '';
    origElement.textContent = '';
    origElement.appendChild(element);
  }
};
