// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as CSSOverviewComponents from './components/components.js';
import cssOverviewStyles from './cssOverview.css.js';
import {type ContrastIssue, CSSOverviewCompletedView} from './CSSOverviewCompletedView.js';
import {Events, type OverviewController} from './CSSOverviewController.js';
import {CSSOverviewModel, type GlobalStyleStats} from './CSSOverviewModel.js';
import {CSSOverviewProcessingView} from './CSSOverviewProcessingView.js';
import type {UnusedDeclaration} from './CSSOverviewUnusedDeclarations.js';

export class CSSOverviewPanel extends UI.Panel.Panel implements SDK.TargetManager.Observer {
  readonly #controller: OverviewController;
  readonly #startView: CSSOverviewComponents.CSSOverviewStartView.CSSOverviewStartView;
  readonly #processingView: CSSOverviewProcessingView;
  readonly #completedView: CSSOverviewCompletedView;
  #model?: CSSOverviewModel;
  #backgroundColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  #textColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  #fillColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  #borderColors!: Map<string, Set<Protocol.DOM.BackendNodeId>>;
  #fontInfo!: Map<string, Map<string, Map<string, Protocol.DOM.BackendNodeId[]>>>;
  #mediaQueries!: Map<string, Protocol.CSS.CSSMedia[]>;
  #unusedDeclarations!: Map<string, UnusedDeclaration[]>;
  #elementCount!: number;
  #globalStyleStats!: GlobalStyleStats;
  #textColorContrastIssues!: Map<string, ContrastIssue[]>;

  constructor(controller: OverviewController) {
    super('css-overview');

    this.element.classList.add('css-overview-panel');

    this.#controller = controller;
    this.#startView = new CSSOverviewComponents.CSSOverviewStartView.CSSOverviewStartView();
    this.#startView.addEventListener(
        'overviewstartrequested', () => this.#controller.dispatchEventToListeners(Events.REQUEST_OVERVIEW_START));
    this.#processingView = new CSSOverviewProcessingView(this.#controller);
    this.#completedView = new CSSOverviewCompletedView(this.#controller);

    SDK.TargetManager.TargetManager.instance().observeTargets(this);

    this.#controller.addEventListener(Events.REQUEST_OVERVIEW_START, _event => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CaptureCssOverviewClicked);
      void this.#startOverview();
    }, this);
    this.#controller.addEventListener(Events.OVERVIEW_COMPLETED, this.#overviewCompleted, this);
    this.#controller.addEventListener(Events.RESET, this.#reset, this);
    this.#controller.addEventListener(Events.REQUEST_NODE_HIGHLIGHT, this.#requestNodeHighlight, this);

    this.#reset();
  }

  targetAdded(target: SDK.Target.Target): void {
    if (target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.#completedView.initializeModels(target);
    const model = target.model(CSSOverviewModel);
    this.#model = (model as CSSOverviewModel);
  }

  targetRemoved(): void {
  }

  #getModel(): CSSOverviewModel {
    if (!this.#model) {
      throw new Error('Did not retrieve model information yet.');
    }
    return this.#model;
  }

  #reset(): void {
    this.#backgroundColors = new Map();
    this.#textColors = new Map();
    this.#fillColors = new Map();
    this.#borderColors = new Map();
    this.#fontInfo = new Map();
    this.#mediaQueries = new Map();
    this.#unusedDeclarations = new Map();
    this.#elementCount = 0;
    this.#globalStyleStats = {
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
    this.#textColorContrastIssues = new Map();
    this.#renderInitialView();
  }

  #requestNodeHighlight(evt: Common.EventTarget.EventTargetEvent<number>): void {
    this.#getModel().highlightNode((evt.data as Protocol.DOM.BackendNodeId));
  }

  #renderInitialView(): void {
    this.#processingView.hideWidget();
    this.#completedView.hideWidget();

    this.contentElement.append(this.#startView);
    this.#startView.show();
  }

  #renderOverviewStartedView(): void {
    this.#startView.hide();
    this.#completedView.hideWidget();

    this.#processingView.show(this.contentElement);
  }

  #renderOverviewCompletedView(): void {
    this.#startView.hide();
    this.#processingView.hideWidget();

    this.#completedView.show(this.contentElement);
    this.#completedView.setOverviewData({
      backgroundColors: this.#backgroundColors,
      textColors: this.#textColors,
      textColorContrastIssues: this.#textColorContrastIssues,
      fillColors: this.#fillColors,
      borderColors: this.#borderColors,
      globalStyleStats: this.#globalStyleStats,
      fontInfo: this.#fontInfo,
      elementCount: this.#elementCount,
      mediaQueries: this.#mediaQueries,
      unusedDeclarations: this.#unusedDeclarations,
    });
  }

  async #startOverview(): Promise<void> {
    this.#renderOverviewStartedView();

    const model = this.#getModel();
    const [globalStyleStats, { elementCount, backgroundColors, textColors, textColorContrastIssues, fillColors, borderColors, fontInfo, unusedDeclarations }, mediaQueries] = await Promise.all([
      model.getGlobalStylesheetStats(),
      model.getNodeStyleStats(),
      model.getMediaQueries(),
    ]);

    if (elementCount) {
      this.#elementCount = elementCount;
    }

    if (globalStyleStats) {
      this.#globalStyleStats = globalStyleStats;
    }

    if (mediaQueries) {
      this.#mediaQueries = mediaQueries;
    }

    if (backgroundColors) {
      this.#backgroundColors = backgroundColors;
    }

    if (textColors) {
      this.#textColors = textColors;
    }

    if (textColorContrastIssues) {
      this.#textColorContrastIssues = textColorContrastIssues;
    }

    if (fillColors) {
      this.#fillColors = fillColors;
    }

    if (borderColors) {
      this.#borderColors = borderColors;
    }

    if (fontInfo) {
      this.#fontInfo = fontInfo;
    }

    if (unusedDeclarations) {
      this.#unusedDeclarations = unusedDeclarations;
    }

    this.#controller.dispatchEventToListeners(Events.OVERVIEW_COMPLETED);
  }

  #overviewCompleted(): void {
    this.#renderOverviewCompletedView();
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([cssOverviewStyles]);
  }
}
