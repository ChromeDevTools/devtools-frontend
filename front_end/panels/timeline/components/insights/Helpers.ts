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

// This is an abstract base class so the component naming rules do not apply.
// eslint-disable-next-line rulesdir/check_component_naming
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

  protected abstract createOverlays(): Overlays.Overlays.TimelineOverlay[];

  abstract render(): void;

  protected isActive(): boolean {
    return insightIsActive({
      activeInsight: this.data.activeInsight,
      insightName: this.internalName,
      insightSetKey: this.data.insightSetKey,
    });
  }
}

// TODO(crbug.com/368170718): consider better treatments for shortening URLs.
export function shortenUrl(url: string): string {
  const maxLength = 20;

  // TODO(crbug.com/368170718): This is something that should only be done if the origin is the same
  // as the insight set's origin.
  const elideOrigin = false;
  if (elideOrigin) {
    try {
      url = new URL(url).pathname;
    } catch {
    }
  }

  if (url.length <= maxLength) {
    return url;
  }

  return Platform.StringUtilities.trimMiddle(url.split('/').at(-1) ?? '', maxLength);
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

export class EventReferenceClick extends Event {
  static readonly eventName = 'eventreferenceclick';

  constructor(public event: Trace.Types.Events.Event) {
    super(EventReferenceClick.eventName, {bubbles: true, composed: true});
  }
}

class EventRef extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-event-ref`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);

  #baseInsight: BaseInsight|null = null;
  #text: string|null = null;
  #event: Trace.Types.Events.Event|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sidebarInsightStyles];
  }

  set text(text: string) {
    this.#text = text;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set baseInsight(baseInsight: BaseInsight) {
    this.#baseInsight = baseInsight;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set event(event: Trace.Types.Events.Event) {
    this.#event = event;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    if (!this.#baseInsight || !this.#text || !this.#event) {
      return;
    }

    // clang-format off
    LitHtml.render(LitHtml.html`
      <span class=devtools-link @click=${(e: Event) => {
        e.stopPropagation();
        if (this.#baseInsight && this.#event) {
          this.#baseInsight.dispatchEvent(new EventReferenceClick(this.#event));
        }
      }}>${this.#text}</span>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export function eventRef(
    baseInsight: BaseInsight, event: Trace.Types.Events.Event, text: string): LitHtml.TemplateResult {
  return LitHtml.html`<${EventRef.litTagName}
    .baseInsight=${baseInsight}
    .event=${event}
    .text=${text}
  ></${EventRef.litTagName}>`;
}

declare global {
  interface GlobalEventHandlersEventMap {
    [EventReferenceClick.eventName]: EventReferenceClick;
  }

  interface HTMLElementTagNameMap {
    'devtools-performance-event-ref': EventRef;
  }
}

customElements.define('devtools-performance-event-ref', EventRef);
