// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as Marked from '../../../../third_party/marked/marked.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as MarkdownView from '../../../../ui/components/markdown_view/markdown_view.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import type * as Overlays from '../../overlays/overlays.js';

import sidebarInsightStyles from './sidebarInsight.css.js';
import * as SidebarInsight from './SidebarInsight.js';
import {type TableState} from './Table.js';
import {type ActiveInsight, Category} from './types.js';

export function shouldRenderForCategory(options: {
  activeCategory: Category,
  insightCategory: Category,
}): boolean {
  return options.activeCategory === Category.ALL || options.activeCategory === options.insightCategory;
}

export function insightIsActive(options: {
  activeInsight: ActiveInsight|null,
  insightName: string,
  insightSetKey: string|null,
}): boolean {
  const active = options.activeInsight && options.activeInsight.name === options.insightName &&
      options.activeInsight.insightSetKey === options.insightSetKey;
  return Boolean(active);
}

export interface BaseInsightData {
  insights: Trace.Insights.Types.TraceInsightSets|null;
  parsedTrace: Trace.Handlers.Types.ParsedTrace|null;
  /** The key into `insights` that contains this particular insight. */
  insightSetKey: string|null;
  activeInsight: ActiveInsight|null;
  activeCategory: Category;
}

// TODO(crbug.com/371615739): BaseInsight, SidebarInsight should be combined.
// This is an abstract base class so the component naming rules do not apply.
export abstract class BaseInsight extends HTMLElement {
  abstract internalName: string;
  abstract insightCategory: Category;
  abstract userVisibleTitle: string;
  abstract description: string;
  // So we can use the TypeScript BaseInsight class without getting warnings
  // about litTagName. Every child should overrwrite this.
  static readonly litTagName = LitHtml.literal``;

  protected readonly shadow = this.attachShadow({mode: 'open'});

  protected data: BaseInsightData = {
    insights: null,
    parsedTrace: null,
    insightSetKey: null,
    activeInsight: null,
    activeCategory: Category.ALL,
  };

  readonly #boundRender = this.render.bind(this);
  readonly sharedTableState: TableState = {
    selectedRowEl: null,
    selectionIsSticky: false,
  };
  #initialOverlays: Overlays.Overlays.TimelineOverlay[]|null = null;

  protected scheduleRender(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets.push(sidebarInsightStyles);
    this.setAttribute('jslog', `${VisualLogging.section(`timeline.insights.${this.internalName}`)}`);
    // Used for unit test purposes when querying the DOM.
    this.dataset.insightName = this.internalName;

    // TODO(crbug.com/371615739): this should be moved to model/trace/insights
    const events = this.getRelatedEvents();
    if (events.length) {
      this.dispatchEvent(new SidebarInsight.InsightProvideRelatedEvents(
          this.userVisibleTitle, events, this.#dispatchInsightActivatedEvent.bind(this)));
    }
  }

  set insights(insights: Trace.Insights.Types.TraceInsightSets|null) {
    this.data.insights = insights;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set parsedTrace(parsedTrace: Trace.Handlers.Types.ParsedTrace|null) {
    this.data.parsedTrace = parsedTrace;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set insightSetKey(insightSetKey: string|null) {
    this.data.insightSetKey = insightSetKey;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set activeInsight(activeInsight: ActiveInsight|null) {
    this.data.activeInsight = activeInsight;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set activeCategory(activeCategory: Category) {
    this.data.activeCategory = activeCategory;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  protected onSidebarClick(): void {
    if (this.isActive()) {
      this.dispatchEvent(new SidebarInsight.InsightDeactivated());
      return;
    }

    this.#dispatchInsightActivatedEvent();
  }

  #dispatchInsightActivatedEvent(): void {
    if (!this.data.insightSetKey) {
      // Shouldn't happen, but needed to satisfy TS.
      return;
    }

    this.sharedTableState.selectedRowEl?.classList.remove('selected');
    this.sharedTableState.selectedRowEl = null;
    this.sharedTableState.selectionIsSticky = false;

    this.dispatchEvent(new SidebarInsight.InsightActivated(
        this.internalName,
        this.data.insightSetKey,
        this.getInitialOverlays(),
        ));
  }

  /**
   * Replaces the initial insight overlays with the ones provided.
   *
   * If `overlays` is null, reverts back to the initial overlays.
   *
   * This allows insights to provide an initial set of overlays,
   * and later temporarily replace all of those insights with a different set.
   * This enables the hover/click table interactions.
   */
  toggleTemporaryOverlays(
      overlays: Overlays.Overlays.TimelineOverlay[]|null, options: Overlays.Overlays.TimelineOverlaySetOptions): void {
    if (!this.isActive()) {
      return;
    }

    this.dispatchEvent(new SidebarInsight.InsightProvideOverlays(overlays ?? this.getInitialOverlays(), options));
  }

  getInitialOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (this.#initialOverlays) {
      return this.#initialOverlays;
    }

    this.#initialOverlays = this.createOverlays();
    return this.#initialOverlays;
  }

  // Should be overrided by subclasses.
  protected getRelatedEvents(): Trace.Types.Events.Event[] {
    return [];
  }

  protected abstract createOverlays(): Overlays.Overlays.TimelineOverlay[];

  abstract render(): void;

  protected isActive(): boolean {
    return insightIsActive({
      activeInsight: this.data.activeInsight,
      insightName: this.internalName,
      insightSetKey: this.data.insightSetKey,
    });
  }

  getInsightSetUrl(): URL {
    const url = this.data.insights?.get(this.data.insightSetKey ?? '')?.url;
    Platform.TypeScriptUtilities.assertNotNullOrUndefined(url, 'Expected url for insight set');
    return new URL(url);
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
