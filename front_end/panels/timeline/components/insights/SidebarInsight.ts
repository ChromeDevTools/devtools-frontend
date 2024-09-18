// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as TraceEngine from '../../../../models/trace/trace.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import type * as Overlays from '../../overlays/overlays.js';

import sidebarInsightStyles from './sidebarInsight.css.js';

const UIStrings = {
  /**
   * @description Text to tell the user the estimated savings for this insight.
   * @example {401ms} PH1
   */
  estimatedSavings: 'Est savings: {PH1}',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/SidebarInsight.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface InsightDetails {
  title: string;
  expanded: boolean;
  estimatedSavings?: number|undefined;
}

export class InsightActivated extends Event {
  static readonly eventName = 'insightactivated';

  constructor(
      public name: string, public navigationId: string,
      public createOverlayFn: () => Array<Overlays.Overlays.TimelineOverlay>) {
    super(InsightActivated.eventName, {bubbles: true, composed: true});
  }
}

export class InsightDeactivated extends Event {
  static readonly eventName = 'insightdeactivated';
  constructor() {
    super(InsightDeactivated.eventName, {bubbles: true, composed: true});
  }
}

export class InsightOverlayOverride extends Event {
  static readonly eventName = 'insightoverlayoverride';

  constructor(public overlays: Array<Overlays.Overlays.TimelineOverlay>|null) {
    super(InsightOverlayOverride.eventName, {bubbles: true, composed: true});
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    [InsightActivated.eventName]: InsightActivated;
    [InsightDeactivated.eventName]: InsightDeactivated;
    [InsightOverlayOverride.eventName]: InsightOverlayOverride;
  }
}

export class SidebarInsight extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-sidebar-insight`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #insightTitle: string = '';
  #expanded: boolean = false;
  #estimatedSavings: number|undefined = undefined;

  set data(data: InsightDetails) {
    this.#insightTitle = data.title;
    this.#expanded = data.expanded;
    this.#estimatedSavings = data.estimatedSavings;

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sidebarInsightStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #dispatchInsightToggle(): void {
    this.dispatchEvent(new CustomEvent('insighttoggleclick'));
  }

  #renderHoverIcon(insightIsActive: boolean): LitHtml.TemplateResult {
    // clang-format off
    const containerClasses = LitHtml.Directives.classMap({
      'insight-hover-icon': true,
      active: insightIsActive,
    });
    return LitHtml.html`
      <div class=${containerClasses} aria-hidden="true">
        <${Buttons.Button.Button.litTagName} .data=${{
          variant: Buttons.Button.Variant.ICON,
          iconName: 'chevron-down',
          size: Buttons.Button.Size.SMALL,
        } as Buttons.Button.ButtonData}
      ></${Buttons.Button.Button.litTagName}>
      </div>

    `;
    // clang-format on
  }

  #render(): void {
    const containerClasses = LitHtml.Directives.classMap({
      insight: true,
      closed: !this.#expanded,
    });

    // clang-format off
    const output = LitHtml.html`
      <div class=${containerClasses}>
        <header @click=${this.#dispatchInsightToggle} jslog=${VisualLogging.action('timeline.toggle-insight').track({click: true})}>
          ${this.#renderHoverIcon(this.#expanded)}
          <h3 class="insight-title">${this.#insightTitle}</h3>
          ${this.#estimatedSavings && this.#estimatedSavings > 0 ?
            LitHtml.html`
            <slot name="insight-savings" class="insight-savings">
              ${i18nString(UIStrings.estimatedSavings, {PH1: i18n.TimeUtilities.millisToString(this.#estimatedSavings as TraceEngine.Types.Timing.MilliSeconds)})}
            </slot>
          </div>`
          : LitHtml.nothing}
        </header>
        ${this.#expanded ? LitHtml.html`
          <div class="insight-body">
            <slot name="insight-description"></slot>
            <slot name="insight-content"></slot>
          </div>`
          : LitHtml.nothing
        }
      </div>
    `;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-sidebar-insight': SidebarInsight;
  }
}

customElements.define('devtools-performance-sidebar-insight', SidebarInsight);
