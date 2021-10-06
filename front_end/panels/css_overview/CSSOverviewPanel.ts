// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CSSOverviewComponents from './components/components.js';
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
import type {UnusedDeclaration} from './CSSOverviewUnusedDeclarations.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
let CSSOverviewPanelInstance: CSSOverviewPanel;

export class CSSOverviewPanel extends UI.Panel.Panel {
  private readonly model: CSSOverviewModel;
  private readonly controller: OverviewController;
  private readonly startView: CSSOverviewComponents.CSSOverviewStartView.CSSOverviewStartView;
  private readonly processingView: CSSOverviewProcessingView;
  private readonly completedView: CSSOverviewCompletedView;
  private backgroundColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  private textColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  private fillColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  private borderColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  private fontInfo!: Map<string, Map<string, Map<string, Protocol.DOM.BackendNodeId[]>>>;
  private mediaQueries!: Map<string, Protocol.CSS.CSSMedia[]>;
  private unusedDeclarations!: Map<string, UnusedDeclaration[]>;
  private elementCount!: number;
  private cancelled?: boolean;
  private globalStyleStats!: GlobalStyleStats;
  private textColorContrastIssues!: Map<string, ContrastIssue[]>;

  private constructor() {
    super('css_overview');

    this.element.classList.add('css-overview-panel');

    const [model] = SDK.TargetManager.TargetManager.instance().models(CSSOverviewModel);
    this.model = (model as CSSOverviewModel);

    this.controller = new OverviewController();
    this.startView = new CSSOverviewComponents.CSSOverviewStartView.CSSOverviewStartView();
    this.startView.addEventListener(
        'overviewstartrequested', () => this.controller.dispatchEventToListeners(Events.RequestOverviewStart));
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
    this.textColorContrastIssues = new Map();
    this.renderInitialView();
  }

  private requestNodeHighlight(evt: Common.EventTarget.EventTargetEvent<number>): void {
    this.model.highlightNode((evt.data as Protocol.DOM.BackendNodeId));
  }

  private renderInitialView(): void {
    this.processingView.hideWidget();
    this.completedView.hideWidget();

    this.contentElement.append(this.startView);
    this.startView.show();
  }

  private renderOverviewStartedView(): void {
    this.startView.hide();
    this.completedView.hideWidget();

    this.processingView.show(this.contentElement);
  }

  private renderOverviewCompletedView(): void {
    this.startView.hide();
    this.processingView.hideWidget();

    this.completedView.show(this.contentElement);
    this.completedView.setOverviewData({
      backgroundColors: this.backgroundColors,
      textColors: this.textColors,
      textColorContrastIssues: this.textColorContrastIssues,
      fillColors: this.fillColors,
      borderColors: this.borderColors,
      globalStyleStats: this.globalStyleStats,
      fontInfo: this.fontInfo,
      elementCount: this.elementCount,
      mediaQueries: this.mediaQueries,
      unusedDeclarations: this.unusedDeclarations,
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
