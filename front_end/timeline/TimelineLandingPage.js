// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Timeline.TimelineLandingPage = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('timeline/timelineLandingPage.css');
    this.contentElement.classList.add('timeline-landing-page', 'fill');
    const config = Timeline.TimelineLandingPage.RecordingConfig;
    this._tabbedPane = new UI.TabbedPane();
    this._tabbedPane.setTabSlider(true);
    this._tabbedPane.renderWithNoHeaderBackground();
    this._currentTabSetting =
        Common.settings.createSetting('performanceLandingPageTab', Timeline.TimelineLandingPage.PageId.Basic);

    var tab = new Timeline.TimelineLandingPage.PerspectiveTabWidget();
    appendCommonPart(tab);
    tab.appendDescription(Common.UIString(
        'The basic profile collects network, JavaScript and browser activity as you interact with the page.'));
    tab.appendOption(config.screenshots);
    tab.appendOption(config.javascript, true);
    tab.appendOption(config.paints, false);
    this._tabbedPane.appendTab(Timeline.TimelineLandingPage.PageId.Basic, Common.UIString('Basic'), tab);

    tab = new Timeline.TimelineLandingPage.PerspectiveTabWidget();
    appendCommonPart(tab);
    tab.appendDescription(Common.UIString(
        'Select what additional details you’d like to record. ' +
        'By default, the advanced profile will collect all data of the basic profile.'));
    tab.appendOption(config.screenshots);
    tab.appendOption(config.javascript);
    tab.appendOption(config.paints);
    this._tabbedPane.appendTab(Timeline.TimelineLandingPage.PageId.Advanced, Common.UIString('Advanced'), tab);

    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);
    this._tabbedPane.selectTab(this._currentTabSetting.get());
    this._tabbedPane.show(this.contentElement);

    /**
     * @param {!Timeline.TimelineLandingPage.PerspectiveTabWidget} tab
     */
    function appendCommonPart(tab) {
      tab.appendDescription(Common.UIString(
          'The Performance panel lets you record what the browser does during page load and user interaction. ' +
          'The timeline it generates can help you determine why certain parts of your page are slow.\u2002'));
      tab.appendDescription(UI.createExternalLink(
          'https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/',
          Common.UIString('Learn more')));
      tab.appendDescription(createElement('p'));
    }
  }

  /**
   * @return {!Timeline.TimelineController.RecordingOptions}
   */
  recordingOptions() {
    const tabWidget = /** @type {!Timeline.TimelineLandingPage.PerspectiveTabWidget} */ (this._tabbedPane.visibleView);
    return tabWidget.recordingOptions();
  }

  _tabSelected() {
    this._currentTabSetting.set(this._tabbedPane.selectedTabId);
  }
};

/**
 * @typedef {!{
 *   id: string,
 *   title: string,
 *   description: string,
 *   settingName: string,
 *   captureOptionName: string,
 *   value: boolean
 * }}
 */
Timeline.TimelineLandingPage.RecordingOption;

/** @type {!Object<string, !Timeline.TimelineLandingPage.RecordingOption>} */
Timeline.TimelineLandingPage.RecordingConfig = {
  javascript: {
    id: 'javascript',
    title: Common.UIString('JavaScript'),
    description: Common.UIString('Use sampling CPU profiler to collect JavaScript stacks.'),
    settingName: 'timelineEnableJSSampling',
    captureOptionName: 'enableJSSampling',
    value: true
  },
  screenshots: {
    id: 'screenshots',
    title: Common.UIString('Screenshots'),
    description: Common.UIString(
        'Collect page screenshots, so you can observe how the page was evolving during recording (moderate performance overhead).'),
    settingName: 'timelineCaptureFilmStrip',
    captureOptionName: 'captureFilmStrip',
    value: true
  },
  paints: {
    id: 'paints',
    title: Common.UIString('Paints'),
    description: Common.UIString(
        'Capture graphics layer positions and rasterization draw calls (significant performance overhead).'),
    settingName: 'timelineCaptureLayersAndPictures',
    captureOptionName: 'capturePictures',
    value: false
  }
};

/** @enum {string} */
Timeline.TimelineLandingPage.PageId = {
  Basic: 'Basic',
  Advanced: 'Advanced'
};

Timeline.TimelineLandingPage.PerspectiveTabWidget = class extends UI.VBox {
  constructor() {
    super(false);
    this.contentElement.classList.add('timeline-perspective-body');
    /** @type {!Map<string, boolean>} */
    this._forceEnable = new Map();
    this._descriptionDiv = this.contentElement.createChild('div', 'timeline-perspective-description');
    this._actionButtonDiv = this.contentElement.createChild('div');
    this._actionButtonDiv.appendChild(UI.createTextButton(Common.UIString('Start profiling'), this._record));
    this._actionButtonDiv.appendChild(UI.createTextButton(Common.UIString('Profile page load'), this._recordPageLoad));
  }

  /**
   * @param {!Element|string} value
   */
  appendDescription(value) {
    if (typeof value === 'string')
      this._descriptionDiv.createTextChild(value);
    else
      this._descriptionDiv.appendChild(value);
  }

  /**
   * @param {!Timeline.TimelineLandingPage.RecordingOption} option
   * @param {boolean=} forceEnable
   */
  appendOption(option, forceEnable) {
    if (typeof forceEnable === 'boolean') {
      this._forceEnable.set(option.id, forceEnable);
      return;
    }
    const div = createElementWithClass('div', 'recording-setting');
    const setting = Common.settings.createSetting(option.settingName, option.value);
    div.appendChild(UI.SettingsUI.createSettingCheckbox(option.title, setting, true));
    if (option.description)
      div.createChild('div', 'recording-setting-description').textContent = option.description;
    this.contentElement.insertBefore(div, this._actionButtonDiv);
  }

  /**
   * @return {!Timeline.TimelineController.RecordingOptions}
   */
  recordingOptions() {
    const options = {};
    for (const id in Timeline.TimelineLandingPage.RecordingConfig) {
      const config = Timeline.TimelineLandingPage.RecordingConfig[id];
      const setting = Common.settings.createSetting(config.settingName, config.value);
      options[config.captureOptionName] = this._forceEnable.has(id) ? this._forceEnable.get(id) : setting.get();
    }
    return options;
  }

  _record() {
    UI.actionRegistry.action('timeline.toggle-recording').execute();
  }

  _recordPageLoad() {
    SDK.targetManager.reloadPage();
  }
};
