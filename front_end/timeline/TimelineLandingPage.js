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

    var tab = new Timeline.TimelineLandingPage.PerspectiveTabWidget();
    tab.appendDescription(Common.UIString(
        'The Performance panel lets you record what the browser does during page load and user interaction. ' +
        'The timeline it generates can help you determine why certain parts of your page are slow.\u2002'));
    tab.appendDescription(learnMore());
    tab.appendDescription(createElement('p'));
    tab.appendDescription(Common.UIString(
        'The basic profile collects network, JavaScript and browser activity as you interact with the page.'));
    tab.appendOption(config.screenshots, true);
    this._tabbedPane.appendTab('basic', Common.UIString('Basic'), tab);

    tab = new Timeline.TimelineLandingPage.PerspectiveTabWidget();
    tab.appendDescription(Common.UIString(
        'Select what additional details you’d like to record. ' +
        'By default, the advanced profile will collect all data of the basic profile.\u2002'));
    tab.appendDescription(learnMore());
    tab.appendOption(config.screenshots, true);
    tab.appendOption(config.javascript, true);
    tab.appendOption(config.paints, false);
    this._tabbedPane.appendTab('advanced', Common.UIString('Advanced'), tab);

    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);
    this._tabbedPane.show(this.contentElement);

    /**
     * @return {!Element}
     */
    function learnMore() {
      return UI.createExternalLink(
          'https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/',
          Common.UIString('Learn more'));
    }
  }

  _tabSelected() {
    const tabWidget = /** @type {!Timeline.TimelineLandingPage.PerspectiveTabWidget} */ (this._tabbedPane.visibleView);
    tabWidget.activate();
  }
};

/** @typedef {!{id: string, title: string, description: string, setting: string}} */
Timeline.TimelineLandingPage.RecordingOption;

/** @type {!Object<string, !Timeline.TimelineLandingPage.RecordingOption>} */
Timeline.TimelineLandingPage.RecordingConfig = {
  javascript: {
    id: 'javascript',
    title: Common.UIString('JavaScript'),
    description: Common.UIString('Use sampling CPU profiler to collect JavaScript stacks.'),
    setting: 'timelineEnableJSSampling'
  },
  screenshots: {
    id: 'screenshots',
    title: Common.UIString('Screenshots'),
    description: Common.UIString(
        'Collect page screenshots, so you can observe how the page was evolving during recording (moderate performance overhead).'),
    setting: 'timelineCaptureFilmStrip'
  },
  paints: {
    id: 'paints',
    title: Common.UIString('Paints'),
    description: Common.UIString(
        'Capture graphics layer positions and rasterization draw calls (significant performance overhead).'),
    setting: 'timelineCaptureLayersAndPictures'
  }
};

Timeline.TimelineLandingPage.PerspectiveTabWidget = class extends UI.VBox {
  constructor() {
    super(false);
    this.contentElement.classList.add('timeline-perspective-body');
    this._enabledOptions = new Set([Timeline.TimelineLandingPage.RecordingConfig.javascript.id]);
    this._descriptionDiv = this.contentElement.createChild('div', 'timeline-perspective-description');
    this._actionButtonDiv = this.contentElement.createChild('div');
    this._actionButtonDiv.appendChild(createTextButton(Common.UIString('Start profiling'), this._record.bind(this)));
    this._actionButtonDiv.appendChild(
        createTextButton(Common.UIString('Profile page load'), this._recordPageLoad.bind(this)));
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
   * @param {boolean} enabled
   */
  appendOption(option, enabled) {
    if (enabled)
      this._enabledOptions.add(option.id);
    const div = createElementWithClass('div', 'recording-setting');
    const value = this._enabledOptions.has(option.id);
    const setting = Common.settings.createSetting(option.setting, value);
    div.appendChild(UI.SettingsUI.createSettingCheckbox(option.title, setting, true));
    if (option.description)
      div.createChild('div', 'recording-setting-description').textContent = option.description;
    this.contentElement.insertBefore(div, this._actionButtonDiv);
  }

  activate() {
    for (const id in Timeline.TimelineLandingPage.RecordingConfig) {
      const config = Timeline.TimelineLandingPage.RecordingConfig[id];
      const setting = Common.settings.createSetting(config.setting, false);
      setting.set(this._enabledOptions.has(id));
    }
  }

  _record() {
    UI.actionRegistry.action('timeline.toggle-recording').execute();
  }

  _recordPageLoad() {
    SDK.targetManager.reloadPage();
  }
};
