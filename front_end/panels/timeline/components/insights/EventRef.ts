// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as Utils from '../../utils/utils.js';

import sidebarInsightStyles from './sidebarInsight.css.js';

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

  #text: string|null = null;
  #event: Trace.Types.Events.Event|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sidebarInsightStyles];
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
    LitHtml.render(LitHtml.html`
      <button type="button" class="devtools-link" @click=${(e: Event) => {
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

export function eventRef(event: EventRefSupportedEvents): LitHtml.TemplateResult {
  let title, text;
  if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
    text = Utils.Helpers.shortenUrl(new URL(event.args.data.url));
    title = event.args.data.url;
  } else {
    Platform.TypeScriptUtilities.assertNever(
        event, `unsupported event in eventRef: ${(event as Trace.Types.Events.Event).name}`);
  }

  return LitHtml.html`<${EventRef.litTagName}
    .event=${event}
    .text=${text}
    title=${title}
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
