// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import cssOverviewStyles from './cssOverview.css.js';
import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';

import type {ContrastIssue} from './CSSOverviewCompletedView.js';
import {CSSOverviewCompletedView} from './CSSOverviewCompletedView.js';
import {Events, OverviewController} from './CSSOverviewController.js';
import type {GlobalStyleStats} from './CSSOverviewModel.js';
import {CSSOverviewModel} from './CSSOverviewModel.js';
import {CSSOverviewProcessingView} from './CSSOverviewProcessingView.js';
import {CSSOverviewStartView} from './CSSOverviewStartView.js';
import type {UnusedDeclaration} from './CSSOverviewUnusedDeclarations.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
let CSSOverviewPanelInstance: CSSOverviewPanel;

export class CSSOverviewPanel extends UI.Panel.Panel {
  private readonly model: CSSOverviewModel;
  private readonly controller: OverviewController;
  private readonly startView: CSSOverviewStartView;
  private readonly processingView: CSSOverviewProcessingView;
  private readonly completedView: CSSOverviewCompletedView;
  private backgroundColors?: Map<string, Set<number>>;
  private textColors?: Map<string, Set<number>>;
  private fillColors?: Map<string, Set<number>>;
  private borderColors?: Map<string, Set<number>>;
  private fontInfo?: Map<string, Map<string, Map<string, number[]>>>;
  private mediaQueries?: Map<string, Protocol.CSS.CSSMedia[]>;
  private unusedDeclarations?: Map<string, UnusedDeclaration[]>;
  private elementCount?: number;
  private cancelled?: boolean;
  private globalStyleStats?: GlobalStyleStats;
  private textColorContrastIssues?: Map<string, ContrastIssue[]>;

  private constructor() {
    super('css_overview');

    this.element.classList.add('css-overview-panel');

    const [model] = SDK.TargetManager.TargetManager.instance().models(CSSOverviewModel);
    this.model = (model as CSSOverviewModel);

    this.controller = new OverviewController();
    this.startView = new CSSOverviewStartView(this.controller);
    this.processingView = new CSSOverviewProcessingView(this.controller);
    this.completedView = new CSSOverviewCompletedView(this.controller, model.target());

    this.controller.addEventListener(Events.RequestOverviewStart, _event => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CaptureCssOverviewClicked);
      this.startOverview();
    }, this);
    this.controller.addEventListener(Events.RequestOverviewCancel, this.cancelOverview, this);
    this.controller.addEventListener(Events.OverviewCompleted, this.overviewCompleted, this);
    this.controller.addEventListener(Events.Reset, this.reset, this);
    this.controller.addEventListener(Events.RequestNodeHighlight, this.requestNodeHighlight, this);

    this.reset();
  }

  static instance(): CSSOverviewPanel {
    if (!CSSOverviewPanelInstance) {
      CSSOverviewPanelInstance = new CSSOverviewPanel();
    }
    return CSSOverviewPanelInstance;
  }

  private reset(): void {
    this.backgroundColors = new Map();
    this.textColors = new Map();
    this.fillColors = new Map();
    this.borderColors = new Map();
    this.fontInfo = new Map();
    this.mediaQueries = new Map();
    this.unusedDeclarations = new Map();
    this.elementCount = 0;
    this.cancelled = false;
    this.globalStyleStats = {
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
    this.renderInitialView();
  }

  private requestNodeHighlight(evt: Common.EventTarget.EventTargetEvent<number>): void {
    this.model.highlightNode((evt.data as Protocol.DOM.BackendNodeId));
  }

  private renderInitialView(): void {
    this.processingView.hideWidget();
    this.completedView.hideWidget();

    this.startView.show(this.contentElement);
  }

  private renderOverviewStartedView(): void {
    this.startView.hideWidget();
    this.completedView.hideWidget();

    this.processingView.show(this.contentElement);
  }

  private renderOverviewCompletedView(): void {
    this.startView.hideWidget();
    this.processingView.hideWidget();

    this.completedView.show(this.contentElement);
    this.completedView.setOverviewData({
      backgroundColors: (this.backgroundColors as Map<string, Set<number>>),
      textColors: (this.textColors as Map<string, Set<number>>),
      textColorContrastIssues: (this.textColorContrastIssues as Map<string, ContrastIssue[]>),
      fillColors: (this.fillColors as Map<string, Set<number>>),
      borderColors: (this.borderColors as Map<string, Set<number>>),
      globalStyleStats: this.globalStyleStats as GlobalStyleStats,
      fontInfo: (this.fontInfo as Map<string, Map<string, Map<string, number[]>>>),
      elementCount: (this.elementCount as number),
      mediaQueries: (this.mediaQueries as Map<string, Protocol.CSS.CSSMedia[]>),
      unusedDeclarations: (this.unusedDeclarations as Map<string, UnusedDeclaration[]>),
    });
  }

  private async startOverview(): Promise<void> {
    this.renderOverviewStartedView();

    const [globalStyleStats, { elementCount, backgroundColors, textColors, textColorContrastIssues, fillColors, borderColors, fontInfo, unusedDeclarations }, mediaQueries] = await Promise.all([
      this.model.getGlobalStylesheetStats(),
      this.model.getNodeStyleStats(),
      this.model.getMediaQueries(),
    ]);

    if (elementCount) {
      this.elementCount = elementCount;
    }

    if (globalStyleStats) {
      this.globalStyleStats = globalStyleStats;
    }

    if (mediaQueries) {
      this.mediaQueries = mediaQueries;
    }

    if (backgroundColors) {
      this.backgroundColors = backgroundColors;
    }

    if (textColors) {
      this.textColors = textColors;
    }

    if (textColorContrastIssues) {
      this.textColorContrastIssues = textColorContrastIssues;
    }

    if (fillColors) {
      this.fillColors = fillColors;
    }

    if (borderColors) {
      this.borderColors = borderColors;
    }

    if (fontInfo) {
      this.fontInfo = fontInfo;
    }

    if (unusedDeclarations) {
      this.unusedDeclarations = unusedDeclarations;
    }

    this.controller.dispatchEventToListeners(Events.OverviewCompleted);
  }

  private getStyleValue(styles: Protocol.CSS.CSSComputedStyleProperty[], name: string): string|undefined {
    const item = styles.filter(style => style.name === name);
    if (!item.length) {
      return;
    }

    return item[0].value;
  }

  private cancelOverview(): void {
    this.cancelled = true;
  }

  private overviewCompleted(): void {
    this.renderOverviewCompletedView();
  }
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([cssOverviewStyles]);
  }
}
