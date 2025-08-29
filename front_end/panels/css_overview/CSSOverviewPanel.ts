// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';

import {type ContrastIssue, CSSOverviewCompletedView, type OverviewData} from './CSSOverviewCompletedView.js';
import {CSSOverviewModel, type GlobalStyleStats} from './CSSOverviewModel.js';
import {CSSOverviewProcessingView} from './CSSOverviewProcessingView.js';
import {CSSOverviewStartView} from './CSSOverviewStartView.js';
import type {UnusedDeclaration} from './CSSOverviewUnusedDeclarations.js';

const {widgetConfig} = UI.Widget;

interface ViewInput {
  state: 'start'|'processing'|'completed';
  onStartCapture: () => void;
  onCancel: () => void;
  onReset: () => void;
  overviewData: OverviewData;
  target?: SDK.Target.Target;
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(input.state === 'start' ?  html`
      <devtools-widget .widgetConfig=${widgetConfig(CSSOverviewStartView, {onStartCapture: input.onStartCapture})}></devtools-widget>`
    : input.state === 'processing' ?  html`
      <devtools-widget .widgetConfig=${widgetConfig(CSSOverviewProcessingView, {onCancel: input.onCancel})}></devtools-widget>`
    : html`
      <devtools-widget .widgetConfig=${widgetConfig(CSSOverviewCompletedView, {
      onReset: input.onReset,
      overviewData: input.overviewData,
      target: input.target,
    })}></devtools-widget>`,
    target);
  // clang-format on
};

export class CSSOverviewPanel extends UI.Panel.Panel implements SDK.TargetManager.Observer {
  #currentUrl: string;
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
  #state!: 'start'|'processing'|'completed';
  #view: View;

  constructor(view = DEFAULT_VIEW) {
    super('css-overview');
    this.#currentUrl = SDK.TargetManager.TargetManager.instance().inspectedURL();
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.INSPECTED_URL_CHANGED, this.#checkUrlAndResetIfChanged, this);

    this.#view = view;
    SDK.TargetManager.TargetManager.instance().observeTargets(this);
    this.#reset();
  }

  #onStartCapture(): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CaptureCssOverviewClicked);
    void this.#startOverview();
  }

  #checkUrlAndResetIfChanged(): void {
    if (this.#currentUrl === SDK.TargetManager.TargetManager.instance().inspectedURL()) {
      return;
    }

    this.#currentUrl = SDK.TargetManager.TargetManager.instance().inspectedURL();
    this.#reset();
  }

  targetAdded(target: SDK.Target.Target): void {
    if (target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.#model = target.model(CSSOverviewModel) ?? undefined;
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

  #renderInitialView(): void {
    this.#state = 'start';
    this.performUpdate();
  }

  #renderOverviewStartedView(): void {
    this.#state = 'processing';
    this.performUpdate();
  }

  #renderOverviewCompletedView(): void {
    this.#state = 'completed';
    this.performUpdate();
  }

  override performUpdate(): void {
    const viewInput = {
      state: this.#state,
      onStartCapture: this.#onStartCapture.bind(this),
      onCancel: this.#reset.bind(this),
      onReset: this.#reset.bind(this),
      target: this.#model?.target(),
      overviewData: {
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
      },
    };
    this.#view(viewInput, {}, this.contentElement);
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

    this.#renderOverviewCompletedView();
  }
}
