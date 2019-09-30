// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
CssOverview.CSSOverviewPanel = class extends UI.Panel {
  constructor() {
    super('css_overview');
    this.registerRequiredCSS('css_overview/cssOverview.css');
    this.element.classList.add('css-overview-panel');

    this._controller = new CssOverview.OverviewController();
    this._startView = new CssOverview.CSSOverviewStartView(this._controller);
    this._processingView = new CssOverview.CSSOverviewProcessingView(this._controller);
    this._completedView = new CssOverview.CSSOverviewCompletedView(this._controller);

    const [model] = SDK.targetManager.models(CssOverview.CSSOverviewModel);
    this._model = model;
    this._controller.addEventListener(CssOverview.Events.RequestOverviewStart, this._startOverview, this);
    this._controller.addEventListener(CssOverview.Events.RequestOverviewCancel, this._cancelOverview, this);
    this._controller.addEventListener(CssOverview.Events.OverviewCompleted, this._overviewCompleted, this);
    this._controller.addEventListener(CssOverview.Events.Reset, this._reset, this);

    this._reset();
  }

  _reset() {
    this._backgroundColors = new Set();
    this._textColors = new Set();
    this._fontSizes = new Map();
    this._elementCount = 0;
    this._elementStyleStats = {
      // Simple.
      type: new Set(),
      class: new Set(),
      id: new Set(),
      universal: new Set(),
      attribute: new Set(),

      // Non-simple.
      nonSimple: new Set()
    };
    this._cancelled = false;
    this._globalStyleStats = {styleRules: 0, mediaRules: 0, inlineStyles: 0, externalSheets: 0};
    this._renderInitialView();
  }

  _renderInitialView() {
    this._processingView.hideWidget();
    this._completedView.hideWidget();

    this._startView.show(this.contentElement);
  }

  _renderOverviewStartedView(elementsHandled = 0, total = 0) {
    this._startView.hideWidget();
    this._completedView.hideWidget();

    this._processingView.show(this.contentElement);
    this._processingView.setElementsHandled(elementsHandled, total);
  }

  _renderOverviewCompletedView() {
    this._startView.hideWidget();
    this._processingView.hideWidget();

    this._completedView.show(this.contentElement);
    this._completedView.setOverviewData({
      backgroundColors: this._backgroundColors,
      textColors: this._textColors,
      globalStyleStats: this._globalStyleStats,
      elementStyleStats: this._elementStyleStats,
      fontSizes: this._fontSizes,
      elementCount: this._elementCount
    });
  }

  async _startOverview() {
    this._renderOverviewStartedView();

    const document = await this._model.getFlattenedDocument();
    if (this._cancelled) {
      this._reset();
      return;
    }

    // 1. Get the global style stats.
    const globalStyleStats = await this._model.getGlobalStylesheetStats();
    if (globalStyleStats) {
      this._globalStyleStats = globalStyleStats;
    }

    // 2. Get the total element count.
    this._elementCount = document.length;

    // 3. Process every element in the doc.
    for (let idx = 0; idx < document.length; idx++) {
      if (this._cancelled) {
        this._reset();
        return;
      }

      const node = document[idx];
      const [computedStyles, styleStats] = await Promise.all(
          [this._model.getComputedStyleForNode(node.nodeId), this._model.getStylesStatsForNode(node.nodeId)]);

      // 3a. Capture any colors from the computed styles.
      if (computedStyles) {
        const backgroundColor = this._getStyleValue(computedStyles, 'background-color');
        if (backgroundColor) {
          this._backgroundColors.add(backgroundColor);
        }

        if (node.nodeType === Node.TEXT_NODE) {
          const textColor = this._getStyleValue(computedStyles, 'color');
          this._textColors.add(textColor);

          const fontSize = this._getStyleValue(computedStyles, 'font-size');
          if (!this._fontSizes.has(fontSize)) {
            this._fontSizes.set(fontSize, 0);
          }

          this._fontSizes.set(fontSize, this._fontSizes.get(fontSize) + 1);
        }
      }

      // 3b. Tally the selector stats.
      if (styleStats) {
        for (const section of Object.keys(this._elementStyleStats)) {
          if (!styleStats[section]) {
            continue;
          }

          for (const value of styleStats[section]) {
            this._elementStyleStats[section].add(value);
          }
        }
      }

      this._renderOverviewStartedView(idx + 1, document.length);
    }

    // 4. Finish.
    this._controller.dispatchEventToListeners(CssOverview.Events.OverviewCompleted);
  }

  _getStyleValue(styles, name) {
    const item = styles.filter(style => style.name === name);
    if (!item.length) {
      return;
    }

    return item[0].value;
  }

  _cancelOverview() {
    this._cancelled = true;
  }

  _overviewCompleted() {
    this._renderOverviewCompletedView();
  }
};
