// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../../models/trace/trace.js';
import * as Marked from '../../../../third_party/marked/marked.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as MarkdownView from '../../../../ui/components/markdown_view/markdown_view.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import type * as Overlays from '../../overlays/overlays.js';

import sidebarInsightStyles from './sidebarInsight.css.js';
import * as SidebarInsight from './SidebarInsight.js';
import {type ActiveInsight, InsightsCategories} from './types.js';

export function shouldRenderForCategory(options: {
  activeCategory: InsightsCategories,
  insightCategory: InsightsCategories,
}): boolean {
  return options.activeCategory === InsightsCategories.ALL || options.activeCategory === options.insightCategory;
}

export function insightIsActive(options: {
  activeInsight: ActiveInsight|null,
  insightName: string,
  insightNavigationId: string|null,
}): boolean {
  const active = options.activeInsight && options.activeInsight.name === options.insightName &&
      options.activeInsight.navigationId === options.insightNavigationId;
  return Boolean(active);
}

export interface BaseInsightData {
  insights: Trace.Insights.Types.TraceInsightSets|null;
  navigationId: string|null;
  activeInsight: ActiveInsight|null;
  activeCategory: InsightsCategories;
}

// This is an abstract base class so the component naming rules do not apply.
// eslint-disable-next-line rulesdir/check_component_naming
export abstract class BaseInsight extends HTMLElement {
  abstract internalName: string;
  abstract insightCategory: InsightsCategories;
  abstract userVisibleTitle: string;

  protected readonly shadow = this.attachShadow({mode: 'open'});

  protected data: BaseInsightData = {
    insights: null,
    navigationId: null,
    activeInsight: null,
    activeCategory: InsightsCategories.ALL,
  };

  readonly #boundRender = this.render.bind(this);

  protected scheduleRender(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets.push(sidebarInsightStyles);
    this.setAttribute('jslog', `${VisualLogging.section(`timeline.insights.${this.internalName}`)}`);
  }

  set insights(insights: Trace.Insights.Types.TraceInsightSets|null) {
    this.data.insights = insights;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set navigationId(navigationId: string|null) {
    this.data.navigationId = navigationId;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set activeInsight(activeInsight: ActiveInsight|null) {
    this.data.activeInsight = activeInsight;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set activeCategory(activeCategory: InsightsCategories) {
    this.data.activeCategory = activeCategory;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  protected onSidebarClick(): void {
    if (this.isActive()) {
      this.dispatchEvent(new SidebarInsight.InsightDeactivated());
      return;
    }
    if (!this.data.navigationId) {
      // Shouldn't happen, but needed to satisfy TS.
      return;
    }

    this.dispatchEvent(new SidebarInsight.InsightActivated(
        this.internalName,
        this.data.navigationId,
        this.createOverlays.bind(this),
        ));
  }

  protected onOverlayOverride(overlays: Overlays.Overlays.TimelineOverlay[]|null): void {
    if (!this.isActive()) {
      return;
    }

    this.dispatchEvent(new SidebarInsight.InsightOverlayOverride(overlays));
  }

  abstract createOverlays(): Overlays.Overlays.TimelineOverlay[];

  abstract render(): void;

  protected isActive(): boolean {
    return insightIsActive({
      activeInsight: this.data.activeInsight,
      insightName: this.internalName,
      insightNavigationId: this.data.navigationId,
    });
  }
}

/**
 * Returns a rendered MarkdownView component.
 *
 * This should not be used for markdown that is not guaranteed to be valid.
 */
export function md(markdown: string): LitHtml.TemplateResult {
  const tokens = Marked.Marked.lexer(markdown);
  return LitHtml.html`<${MarkdownView.MarkdownView.MarkdownView.litTagName}
    .data=${{tokens} as MarkdownView.MarkdownView.MarkdownViewData}>
  </${MarkdownView.MarkdownView.MarkdownView.litTagName}>`;
}
