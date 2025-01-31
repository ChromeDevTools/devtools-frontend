// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as Utils from '../../utils/utils.js';

import baseInsightComponentStylesRaw from './baseInsightComponent.css.legacy.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const baseInsightComponentStyles = new CSSStyleSheet();
baseInsightComponentStyles.replaceSync(baseInsightComponentStylesRaw.cssContent);

const {html} = Lit;

export class EventReferenceClick extends Event {
  static readonly eventName = 'eventreferenceclick';

  constructor(public event: Trace.Types.Events.Event) {
    super(EventReferenceClick.eventName, {bubbles: true, composed: true});
  }
}

class EventRef extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);

  #text: string|null = null;
  #event: Trace.Types.Events.Event|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [baseInsightComponentStyles];
  }

  set text(text: string) {
    this.#text = text;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set event(event: Trace.Types.Events.Event) {
    this.#event = event;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    if (!this.#text || !this.#event) {
      return;
    }

    // clang-format off
    Lit.render(html`
      <button type="button" class="timeline-link" @click=${(e: Event) => {
        e.stopPropagation();
        if (this.#event) {
          this.dispatchEvent(new EventReferenceClick(this.#event));
        }
      }}>${this.#text}</button>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

type EventRefSupportedEvents = Trace.Types.Events.SyntheticNetworkRequest;

export function eventRef(event: EventRefSupportedEvents): Lit.TemplateResult {
  let title, text;
  if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
    text = Utils.Helpers.shortenUrl(new URL(event.args.data.url));
    title = event.args.data.url;
  } else {
    Platform.TypeScriptUtilities.assertNever(
        event, `unsupported event in eventRef: ${(event as Trace.Types.Events.Event).name}`);
  }

  return html`<devtools-performance-event-ref
    .event=${event as Trace.Types.Events.Event}
    .text=${text}
    title=${title}
  ></devtools-performance-event-ref>`;
}

class ImageRef extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);

  #request?: Trace.Types.Events.SyntheticNetworkRequest;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [baseInsightComponentStyles];
  }

  set request(request: Trace.Types.Events.SyntheticNetworkRequest) {
    this.#request = request;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    if (!this.#request) {
      return;
    }

    // clang-format off
    Lit.render(html`
      <div class="image-ref">
        ${this.#request.args.data.mimeType.includes('image') ? html`
          <img
            class="element-img"
            src=${this.#request.args.data.url}
            @error=${handleBadImage}/>
        `: Lit.nothing}
        <span class="element-img-details">
          ${eventRef(this.#request)}
          <span class="element-img-details-size">${
            i18n.ByteUtilities.bytesToString(this.#request.args.data.decodedBodyLength ?? 0)
          }</span>
        </span>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

function handleBadImage(event: Event): void {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

export function imageRef(request: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult {
  return html`
    <devtools-performance-image-ref
      .request=${request}
    ></devtools-performance-image-ref>
  `;
}

declare global {
  interface GlobalEventHandlersEventMap {
    [EventReferenceClick.eventName]: EventReferenceClick;
  }

  interface HTMLElementTagNameMap {
    'devtools-performance-event-ref': EventRef;
    'devtools-performance-image-ref': ImageRef;
  }
}

customElements.define('devtools-performance-event-ref', EventRef);
customElements.define('devtools-performance-image-ref', ImageRef);
