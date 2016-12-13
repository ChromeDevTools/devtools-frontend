// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Timeline.TimelineLandingPage = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('timeline/timelineLandingPage.css');
    this.contentElement.classList.add('timeline-landing-page', 'fill');
    const perspectives = Timeline.TimelinePanel.Perspectives;
    const config = Timeline.TimelineLandingPage.RecordingConfig;
    this._tabbedPane = new UI.TabbedPane();
    this._tabbedPane.setTabSlider(true);
    this._tabbedPane.renderWithNoHeaderBackground();

    var tab = new Timeline.TimelineLandingPage.PerspectiveTabWidget();
    tab.setDescription(Common.UIString(
        'Page Load mode allows you to analyze how fast the page is loaded and becomes responsive.\n' +
        'In this mode the page is automatically reloaded right after the recording has started. ' +
        'During recording it collects information about network requests, screen state updates, ' +
        'and CPU threads acivity along with JavaScript stacks. ' +
        'Recording is stopped automatically shortly after the page processes load event.'));
    tab.setAction(recordAndReload);
    tab.appendOption(config.network, false, true);
    tab.appendOption(config.screenshots, true, true);
    this._tabbedPane.appendTab(perspectives.Load, Common.UIString('Page Load'), tab);

    tab = new Timeline.TimelineLandingPage.PerspectiveTabWidget();
    tab.setDescription(Common.UIString('Record page responsiveness.'));
    tab.setAction(record);
    tab.appendOption(config.network, false, true);
    tab.appendOption(config.screenshots, true, false);
    this._tabbedPane.appendTab(perspectives.Responsiveness, Common.UIString('Responsiveness'), tab);

    tab = new Timeline.TimelineLandingPage.PerspectiveTabWidget();
    tab.setDescription(Common.UIString(
        'This mode is useful when you want to focus on JavaScript performance. ' +
        'All the options besides sampling CPU profiler are turned off to minimize measurement errors.'));
    tab.setAction(record);
    this._tabbedPane.appendTab(perspectives.JavaScript, Common.UIString('JavaScript'), tab);

    tab = new Timeline.TimelineLandingPage.PerspectiveTabWidget();
    tab.setDescription(Common.UIString('Advanced mode that allows you to customize recording options.'));
    tab.setAction(record);
    tab.appendOption(config.network, true, true);
    tab.appendOption(config.javascript, true, true);
    tab.appendOption(config.screenshots, true, true);
    tab.appendOption(config.memory, true, false);
    tab.appendOption(config.paints, true, false);
    this._tabbedPane.appendTab(perspectives.Custom, Common.UIString('Custom'), tab);

    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);
    this._tabbedPane.show(this.contentElement);
    this._perspectiveSetting =
        Common.settings.createSetting('timelinePerspective', Timeline.TimelinePanel.Perspectives.Load);
    this._perspectiveSetting.addChangeListener(this._perspectiveChanged, this);

    function record() {
      UI.actionRegistry.action('timeline.toggle-recording').execute();
    }

    function recordAndReload() {
      SDK.targetManager.reloadPage();
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _tabSelected(event) {
    if (this._perspectiveSetting.get() !== event.data.tabId)
      this._perspectiveSetting.set(event.data.tabId);
  }

  _perspectiveChanged() {
    this._tabbedPane.selectTab(this._perspectiveSetting.get());
    const tabWidget = /** @type {!Timeline.TimelineLandingPage.PerspectiveTabWidget} */ (this._tabbedPane.visibleView);
    tabWidget.activate();
  }
};

/** @typedef {!{id: string, title: string, description: string, setting: string}} */
Timeline.TimelineLandingPage.RecordingOption;

/** @type {!Object<string, !Timeline.TimelineLandingPage.RecordingOption>} */
Timeline.TimelineLandingPage.RecordingConfig = {
  network: {
    id: 'network',
    title: Common.UIString('Network'),
    description: Common.UIString('Capture network requests information.'),
    setting: 'timelineCaptureNetwork'
  },
  javascript: {
    id: 'javascript',
    title: Common.UIString('JavaScript'),
    description: Common.UIString('Use sampling CPU profiler to collect JavaScript stacks.'),
    setting: 'timelineEnableJSSampling'
  },
  screenshots: {
    id: 'screenshots',
    title: Common.UIString('Screenshots'),
    description:
        Common.UIString('Collect page screenshots, so you can observe how the page was evolving during recording.'),
    setting: 'timelineCaptureFilmStrip'
  },
  paints: {
    id: 'paints',
    title: Common.UIString('Paints'),
    description: Common.UIString(
        'Capture graphics layer positions and rasterization draw calls (moderate performance overhead).'),
    setting: 'timelineCaptureLayersAndPictures'
  },
  memory: {
    id: 'memory',
    title: Common.UIString('Memory'),
    description: Common.UIString('Capture memory statistics on every timeline event.'),
    setting: 'timelineCaptureMemory'
  }
};

Timeline.TimelineLandingPage.PerspectiveTabWidget = class extends UI.VBox {
  constructor() {
    super(false);
    this.contentElement.classList.add('timeline-perspective-body');
    this._enabledOptions = new Set([Timeline.TimelineLandingPage.RecordingConfig.javascript.id]);
    this._descriptionDiv = this.contentElement.createChild('div', 'timeline-perspective-description');
    this._actionButton = createTextButton(Common.UIString('Start'));
    this._actionButtonDiv = this.contentElement.createChild('div');
    this._actionButtonDiv.appendChild(this._actionButton);
  }

  /**
   * @param {string} text
   */
  setDescription(text) {
    this._descriptionDiv.textContent = text;
  }

  /**
   * @param {function()} action
   */
  setAction(action) {
    this._actionButton.addEventListener('click', action);
  }

  /**
   * @param {!Timeline.TimelineLandingPage.RecordingOption} option
   * @param {boolean} visible
   * @param {boolean} enabled
   */
  appendOption(option, visible, enabled) {
    if (enabled)
      this._enabledOptions.add(option.id);
    if (!visible)
      return;
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
};
