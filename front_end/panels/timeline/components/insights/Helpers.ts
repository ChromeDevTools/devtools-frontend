// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/markdown_view/markdown_view.js';

import type {InsightModel} from '../../../../models/trace/insights/types.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as Marked from '../../../../third_party/marked/marked.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import type * as Overlays from '../../overlays/overlays.js';

import sidebarInsightStyles from './sidebarInsight.css.js';
import * as SidebarInsight from './SidebarInsight.js';
import type {TableState} from './Table.js';
import {Category} from './types.js';

const {html} = LitHtml;

export function shouldRenderForCategory(options: {
  activeCategory: Category,
  insightCategory: Category,
}): boolean {
  return options.activeCategory === Category.ALL || options.activeCategory === options.insightCategory;
}

export interface BaseInsightData {
  parsedTrace: Trace.Handlers.Types.ParsedTrace|null;
  /** The key into `insights` that contains this particular insight. */
  insightSetKey: string|null;
  activeCategory: Category;
}

// TODO(crbug.com/371615739): BaseInsight, SidebarInsight should be combined.
// This is an abstract base class so the component naming rules do not apply.
export abstract class BaseInsightComponent<T extends InsightModel<{}>> extends HTMLElement {
  abstract internalName: string;
  abstract insightCategory: Category;
  // So we can use the TypeScript BaseInsight class without getting warnings
  // about litTagName. Every child should overrwrite this.
  static readonly litTagName = LitHtml.literal``;

  protected readonly shadow = this.attachShadow({mode: 'open'});

  #selected = false;
  #model: T|null = null;

  get model(): T|null {
    return this.#model;
  }

  protected data: BaseInsightData = {
    parsedTrace: null,
    insightSetKey: null,
    activeCategory: Category.ALL,
  };

  // eslint-disable-next-line rulesdir/no_bound_component_methods
  readonly #boundRender = this.#baseRender.bind(this);
  readonly sharedTableState: TableState = {
    selectedRowEl: null,
    selectionIsSticky: false,
  };
  #initialOverlays: Overlays.Overlays.TimelineOverlay[]|null = null;
  #hasRegisteredRelatedEvents = false;

  protected scheduleRender(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets.push(sidebarInsightStyles);
    this.setAttribute('jslog', `${VisualLogging.section(`timeline.insights.${this.internalName}`)}`);
    // Used for unit test purposes when querying the DOM.
    this.dataset.insightName = this.internalName;

    if (!this.#hasRegisteredRelatedEvents && this.#model) {
      this.#hasRegisteredRelatedEvents = true;

      const events = this.#model.relatedEvents ?? [];
      if (events.length) {
        this.dispatchEvent(new SidebarInsight.InsightProvideRelatedEvents(
            this.#model.title, events, this.#dispatchInsightActivatedEvent.bind(this)));
      }
    }
  }

  set selected(selected: boolean) {
    this.#selected = selected;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set model(model: T) {
    this.#model = model;
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
        this.model,
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

  protected abstract createOverlays(): Overlays.Overlays.TimelineOverlay[];

  #baseRender(): void {
    this.render();
    if (this.isActive()) {
      requestAnimationFrame(() => requestAnimationFrame(() => this.scrollIntoViewIfNeeded()));
    }
  }

  abstract render(): void;

  protected isActive(): boolean {
    return this.#selected;
  }
}

/**
 * Returns a rendered MarkdownView component.
 *
 * This should not be used for markdown that is not guaranteed to be valid.
 */
export function md(markdown: string): LitHtml.TemplateResult {
  const tokens = Marked.Marked.lexer(markdown);
  const data = {tokens};
  return html`<devtools-markdown-view .data=${data}></devtools-markdown-view>`;
}
