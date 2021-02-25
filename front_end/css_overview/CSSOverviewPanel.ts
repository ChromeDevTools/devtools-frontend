// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import type {ContrastIssue} from './CSSOverviewCompletedView.js';
import {CSSOverviewCompletedView} from './CSSOverviewCompletedView.js';
import {Events, OverviewController} from './CSSOverviewController.js';
import {CSSOverviewModel, GlobalStyleStats} from './CSSOverviewModel.js';
import {CSSOverviewProcessingView} from './CSSOverviewProcessingView.js';
import {CSSOverviewStartView} from './CSSOverviewStartView.js';
import type {UnusedDeclaration} from './CSSOverviewUnusedDeclarations.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
let CSSOverviewPanelInstance: CSSOverviewPanel;

export class CSSOverviewPanel extends UI.Panel.Panel {
  _model: CSSOverviewModel;
  _controller: OverviewController;
  _startView: CSSOverviewStartView;
  _processingView: CSSOverviewProcessingView;
  _completedView: CSSOverviewCompletedView;
  _backgroundColors?: Map<string, Set<number>>;
  _textColors?: Map<string, Set<number>>;
  _fillColors?: Map<string, Set<number>>;
  _borderColors?: Map<string, Set<number>>;
  _fontInfo?: Map<string, Map<string, Map<string, number[]>>>;
  _mediaQueries?: Map<string, Protocol.CSS.CSSMedia[]>;
  _unusedDeclarations?: Map<string, UnusedDeclaration[]>;
  _elementCount?: number;
  _cancelled?: boolean;
  _globalStyleStats?: GlobalStyleStats;
  _textColorContrastIssues?: Map<string, ContrastIssue[]>;

  private constructor() {
    super('css_overview');
    this.registerRequiredCSS('css_overview/cssOverview.css', {enableLegacyPatching: false});
    this.element.classList.add('css-overview-panel');

    const [model] = SDK.SDKModel.TargetManager.instance().models(CSSOverviewModel);
    this._model = (model as CSSOverviewModel);

    this._controller = new OverviewController();
    this._startView = new CSSOverviewStartView(this._controller);
    this._processingView = new CSSOverviewProcessingView(this._controller);
    this._completedView = new CSSOverviewCompletedView(this._controller, model.target());

    this._controller.addEventListener(Events.RequestOverviewStart, _event => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CaptureCssOverviewClicked);
      this._startOverview();
    }, this);
    this._controller.addEventListener(Events.RequestOverviewCancel, this._cancelOverview, this);
    this._controller.addEventListener(Events.OverviewCompleted, this._overviewCompleted, this);
    this._controller.addEventListener(Events.Reset, this._reset, this);
    this._controller.addEventListener(Events.RequestNodeHighlight, this._requestNodeHighlight, this);

    this._reset();
  }

  static instance(): CSSOverviewPanel {
    if (!CSSOverviewPanelInstance) {
      CSSOverviewPanelInstance = new CSSOverviewPanel();
    }
    return CSSOverviewPanelInstance;
  }

  _reset(): void {
    this._backgroundColors = new Map();
    this._textColors = new Map();
    this._fillColors = new Map();
    this._borderColors = new Map();
    this._fontInfo = new Map();
    this._mediaQueries = new Map();
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
        nonSimple: 0,
      },
    };
    this._renderInitialView();
  }

  _requestNodeHighlight(evt: Common.EventTarget.EventTargetEvent): void {
    this._model.highlightNode((evt.data as number));
  }

  _renderInitialView(): void {
    this._processingView.hideWidget();
    this._completedView.hideWidget();

    this._startView.show(this.contentElement);
  }

  _renderOverviewStartedView(): void {
    this._startView.hideWidget();
    this._completedView.hideWidget();

    this._processingView.show(this.contentElement);
  }

  _renderOverviewCompletedView(): void {
    this._startView.hideWidget();
    this._processingView.hideWidget();

    this._completedView.show(this.contentElement);
    this._completedView.setOverviewData({
      backgroundColors: (this._backgroundColors as Map<string, Set<number>>),
      textColors: (this._textColors as Map<string, Set<number>>),
      textColorContrastIssues: (this._textColorContrastIssues as Map<string, ContrastIssue[]>),
      fillColors: (this._fillColors as Map<string, Set<number>>),
      borderColors: (this._borderColors as Map<string, Set<number>>),
      globalStyleStats: this._globalStyleStats as GlobalStyleStats,
      fontInfo: (this._fontInfo as Map<string, Map<string, Map<string, number[]>>>),
      elementCount: (this._elementCount as number),
      mediaQueries: (this._mediaQueries as Map<string, Protocol.CSS.CSSMedia[]>),
      unusedDeclarations: (this._unusedDeclarations as Map<string, UnusedDeclaration[]>),
    });
  }

  async _startOverview(): Promise<void> {
    this._renderOverviewStartedView();

    const [globalStyleStats, { elementCount, backgroundColors, textColors, textColorContrastIssues, fillColors, borderColors, fontInfo, unusedDeclarations }, mediaQueries] = await Promise.all([
      this._model.getGlobalStylesheetStats(),
      this._model.getNodeStyleStats(),
      this._model.getMediaQueries(),
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

    if (textColorContrastIssues) {
      this._textColorContrastIssues = textColorContrastIssues;
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

  _getStyleValue(styles: Protocol.CSS.CSSComputedStyleProperty[], name: string): string|undefined {
    const item = styles.filter(style => style.name === name);
    if (!item.length) {
      return;
    }

    return item[0].value;
  }

  _cancelOverview(): void {
    this._cancelled = true;
  }

  _overviewCompleted(): void {
    this._renderOverviewCompletedView();
  }
}
