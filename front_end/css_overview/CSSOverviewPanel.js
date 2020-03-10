// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {CSSOverviewCompletedView} from './CSSOverviewCompletedView.js';
import {Events, OverviewController} from './CSSOverviewController.js';
import {CSSOverviewModel} from './CSSOverviewModel.js';
import {CSSOverviewProcessingView} from './CSSOverviewProcessingView.js';
import {CSSOverviewStartView} from './CSSOverviewStartView.js';

/**
 * @unrestricted
 */
export class CSSOverviewPanel extends UI.Panel.Panel {
  constructor() {
    super('css_overview');
    this.registerRequiredCSS('css_overview/cssOverview.css');
    this.element.classList.add('css-overview-panel');

    const [model] = SDK.SDKModel.TargetManager.instance().models(CSSOverviewModel);
    this._model = model;

    this._controller = new OverviewController();
    this._startView = new CSSOverviewStartView(this._controller);
    this._processingView = new CSSOverviewProcessingView(this._controller);
    this._completedView = new CSSOverviewCompletedView(this._controller, model.target());

    this._controller.addEventListener(Events.RequestOverviewStart, event => {
      this._startOverview();
    }, this);
    this._controller.addEventListener(Events.RequestOverviewCancel, this._cancelOverview, this);
    this._controller.addEventListener(Events.OverviewCompleted, this._overviewCompleted, this);
    this._controller.addEventListener(Events.Reset, this._reset, this);
    this._controller.addEventListener(Events.RequestNodeHighlight, this._requestNodeHighlight, this);

    this._reset();
  }

  _reset() {
    this._backgroundColors = new Map();
    this._textColors = new Map();
    this._fillColors = new Map();
    this._borderColors = new Map();
    this._fontInfo = new Map();
    this._mediaQueries = [];
    this._unusedDeclarations = new Map();
    this._elementCount = 0;
    this._cancelled = false;
    this._globalStyleStats = {
      styleRules: 0,
      inlineStyles: 0,
      externalSheets: 0,
      stats: {
        // Simple.
        type: 0,
        class: 0,
        id: 0,
        universal: 0,
        attribute: 0,

        // Non-simple.
        nonSimple: 0
      }
    };
    this._renderInitialView();
  }

  _requestNodeHighlight(evt) {
    this._model.highlightNode(evt.data);
  }

  _renderInitialView() {
    this._processingView.hideWidget();
    this._completedView.hideWidget();

    this._startView.show(this.contentElement);
  }

  _renderOverviewStartedView() {
    this._startView.hideWidget();
    this._completedView.hideWidget();

    this._processingView.show(this.contentElement);
  }

  _renderOverviewCompletedView() {
    this._startView.hideWidget();
    this._processingView.hideWidget();

    this._completedView.show(this.contentElement);
    this._completedView.setOverviewData({
      backgroundColors: this._backgroundColors,
      textColors: this._textColors,
      fillColors: this._fillColors,
      borderColors: this._borderColors,
      globalStyleStats: this._globalStyleStats,
      fontInfo: this._fontInfo,
      elementCount: this._elementCount,
      mediaQueries: this._mediaQueries,
      unusedDeclarations: this._unusedDeclarations,
    });
  }

  async _startOverview() {
    this._renderOverviewStartedView();

    const [globalStyleStats, {elementCount, backgroundColors, textColors, fillColors, borderColors, fontInfo, unusedDeclarations}, mediaQueries] =
        await Promise.all([
          this._model.getGlobalStylesheetStats(), this._model.getNodeStyleStats(),
          this._model.getMediaQueries()
        ]);

    if (elementCount) {
      this._elementCount = elementCount;
    }

    if (globalStyleStats) {
      this._globalStyleStats = globalStyleStats;
    }

    if (mediaQueries) {
      this._mediaQueries = mediaQueries;
    }

    if (backgroundColors) {
      this._backgroundColors = backgroundColors;
    }

    if (textColors) {
      this._textColors = textColors;
    }

    if (fillColors) {
      this._fillColors = fillColors;
    }

    if (borderColors) {
      this._borderColors = borderColors;
    }

    if (fontInfo) {
      this._fontInfo = fontInfo;
    }

    if (unusedDeclarations) {
      this._unusedDeclarations = unusedDeclarations;
    }

    this._controller.dispatchEventToListeners(Events.OverviewCompleted);
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
}
