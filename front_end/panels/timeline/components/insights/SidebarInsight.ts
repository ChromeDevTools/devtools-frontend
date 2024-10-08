// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import type * as Overlays from '../../overlays/overlays.js';

import {md} from './Helpers.js';
import sidebarInsightStyles from './sidebarInsight.css.js';

const UIStrings = {
  /**
   * @description Text to tell the user the estimated time or size savings for this insight.
   * @example {401 ms} PH1
   * @example {112 kB} PH1
   */
  estimatedSavings: 'Est savings: {PH1}',
  /**
   * @description Text to tell the user the estimated time and size savings for this insight.
   * @example {401 ms} PH1
   * @example {112 kB} PH2
   */
  estimatedSavingsTimingAndBytes: 'Est savings: {PH1} && {PH2}',
  /**
   * @description Used for screen-readers as a label on the button to expand an insight to view details
   * @example {LCP by phase} PH1
   */
  viewDetails: 'View details for {PH1}',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/SidebarInsight.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface InsightDetails {
  title: string;
  description: string;
  internalName: string;
  expanded: boolean;
  estimatedSavingsTime?: Trace.Types.Timing.MilliSeconds;
  estimatedSavingsBytes?: number;
}

export class InsightActivated extends Event {
  static readonly eventName = 'insightactivated';

  constructor(public name: string, public insightSetKey: string, public overlays: Overlays.Overlays.TimelineOverlay[]) {
    super(InsightActivated.eventName, {bubbles: true, composed: true});
  }
}

export class InsightDeactivated extends Event {
  static readonly eventName = 'insightdeactivated';
  constructor() {
    super(InsightDeactivated.eventName, {bubbles: true, composed: true});
  }
}

export class InsightSetHovered extends Event {
  static readonly eventName = 'insightsethovered';
  constructor(public bounds?: Trace.Types.Timing.TraceWindowMicroSeconds) {
    super(InsightSetHovered.eventName, {bubbles: true, composed: true});
  }
}

export class InsightProvideOverlays extends Event {
  static readonly eventName = 'insightprovideoverlays';

  constructor(
      public overlays: Array<Overlays.Overlays.TimelineOverlay>,
      public options: Overlays.Overlays.TimelineOverlaySetOptions) {
    super(InsightProvideOverlays.eventName, {bubbles: true, composed: true});
  }
}

export class InsightProvideRelatedEvents extends Event {
  static readonly eventName = 'insightproviderelatedevents';

  constructor(
      public label: string, public events: Array<Trace.Types.Events.Event>, public activateInsight: () => void) {
    super(InsightProvideRelatedEvents.eventName, {bubbles: true, composed: true});
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    [InsightActivated.eventName]: InsightActivated;
    [InsightDeactivated.eventName]: InsightDeactivated;
    [InsightSetHovered.eventName]: InsightSetHovered;
    [InsightProvideOverlays.eventName]: InsightProvideOverlays;
    [InsightProvideRelatedEvents.eventName]: InsightProvideRelatedEvents;
  }
}

export class SidebarInsight extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-sidebar-insight`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);

  #insightTitle: string = '';
  #insightDescription: string = '';
  #insightInternalName: string = '';
  #expanded: boolean = false;
  #estimatedSavingsTime: Trace.Types.Timing.MilliSeconds|undefined = undefined;
  #estimatedSavingsBytes: number|undefined = undefined;

  set data(data: InsightDetails) {
    this.#insightTitle = data.title;
    this.#insightDescription = data.description;
    this.#insightInternalName = data.internalName;
    this.#expanded = data.expanded;
    this.#estimatedSavingsTime = data.estimatedSavingsTime;
    this.#estimatedSavingsBytes = data.estimatedSavingsBytes;

    // Used for testing.
    this.dataset.insightTitle = data.title;
    if (data.expanded) {
      this.dataset.insightExpanded = '';
    } else {
      delete this.dataset.insightExpanded;
    }

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
      <div class=${containerClasses} inert>
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

  /**
   * Ensure that if the user presses enter or space on a header, we treat it
   * like a click and toggle the insight.
   */
  #handleHeaderKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.#dispatchInsightToggle();
    }
  }

  #getEstimatedSavingsString(): string|null {
    let timeString, bytesString;
    if (this.#estimatedSavingsTime !== undefined && this.#estimatedSavingsTime > 0) {
      timeString = i18n.TimeUtilities.millisToString(this.#estimatedSavingsTime);
    }
    if (this.#estimatedSavingsBytes !== undefined && this.#estimatedSavingsBytes > 0) {
      bytesString = Platform.NumberUtilities.bytesToString(this.#estimatedSavingsBytes);
    }

    if (timeString && bytesString) {
      return i18nString(UIStrings.estimatedSavingsTimingAndBytes, {
        PH1: timeString,
        PH2: bytesString,
      });
    }
    if (timeString) {
      return i18nString(UIStrings.estimatedSavings, {
        PH1: timeString,
      });
    }
    if (bytesString) {
      return i18nString(UIStrings.estimatedSavings, {
        PH1: bytesString,
      });
    }

    return null;
  }

  #render(): void {
    const containerClasses = LitHtml.Directives.classMap({
      insight: true,
      closed: !this.#expanded,
    });
    const estimatedSavingsString = this.#getEstimatedSavingsString();

    // clang-format off
    const output = LitHtml.html`
      <div class=${containerClasses}>
        <header @click=${this.#dispatchInsightToggle}
          @keydown=${this.#handleHeaderKeyDown}
          jslog=${VisualLogging.action(`timeline.toggle-insight.${this.#insightInternalName}`).track({click: true})}
          tabIndex="0"
          role="button"
          aria-expanded=${this.#expanded}
          aria-label=${i18nString(UIStrings.viewDetails, {PH1: this.#insightTitle})}
        >
          ${this.#renderHoverIcon(this.#expanded)}
          <h3 class="insight-title">${this.#insightTitle}</h3>
          ${estimatedSavingsString ?
            LitHtml.html`
            <slot name="insight-savings" class="insight-savings">
              ${estimatedSavingsString}
            </slot>
          </div>`
          : LitHtml.nothing}
        </header>
        ${this.#expanded ? LitHtml.html`
          <div class="insight-body">
            <div class="insight-description">${this.#insightDescription ? md(this.#insightDescription) : LitHtml.nothing}</div>
            <div class="insight-content">
              <slot name="insight-content"></slot>
            </div>
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
