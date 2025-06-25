// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as Utils from '../../utils/utils.js';

import baseInsightComponentStyles from './baseInsightComponent.css.js';

const {html, Directives: {ifDefined}} = Lit;

export class EventReferenceClick extends Event {
  static readonly eventName = 'eventreferenceclick';

  constructor(public event: Trace.Types.Events.Event) {
    super(EventReferenceClick.eventName, {bubbles: true, composed: true});
  }
}

class EventRef extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #text: string|null = null;
  #event: Trace.Types.Events.Event|null = null;

  set text(text: string) {
    this.#text = text;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  set event(event: Trace.Types.Events.Event) {
    this.#event = event;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #render(): void {
    if (!this.#text || !this.#event) {
      return;
    }

    // clang-format off
    Lit.render(html`
      <style>${baseInsightComponentStyles}</style>
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

export function eventRef(
    event: Trace.Types.Events.Event, options?: {text?: string, title?: string}): Lit.TemplateResult {
  let title = options?.title;
  let text = options?.text;
  if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
    text = text ?? Utils.Helpers.shortenUrl(new URL(event.args.data.url));
    title = title ?? event.args.data.url;
  } else if (!text) {
    console.warn('No text given for eventRef');
    text = event.name;
  }

  return html`<devtools-performance-event-ref
    .event=${event as Trace.Types.Events.Event}
    .text=${text}
    title=${ifDefined(title)}
  ></devtools-performance-event-ref>`;
}

class ImageRef extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #request?: Trace.Types.Events.SyntheticNetworkRequest;
  #imageDataUrl?: string|null;

  set request(request: Trace.Types.Events.SyntheticNetworkRequest) {
    this.#request = request;
    this.#imageDataUrl = undefined;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  /**
   * This only returns a data url if the resource is currently present from the active
   * inspected page.
   */
  async #getOrCreateImageDataUrl(): Promise<string|null> {
    if (!this.#request) {
      return null;
    }

    if (this.#imageDataUrl !== undefined) {
      return this.#imageDataUrl;
    }

    const originalUrl = this.#request.args.data.url as Platform.DevToolsPath.UrlString;
    const resource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(originalUrl);
    if (!resource) {
      this.#imageDataUrl = null;
      return this.#imageDataUrl;
    }

    const content = await resource.requestContentData();
    if ('error' in content) {
      this.#imageDataUrl = null;
      return this.#imageDataUrl;
    }

    this.#imageDataUrl = content.asDataUrl();
    return this.#imageDataUrl;
  }

  async #render(): Promise<void> {
    if (!this.#request) {
      return;
    }

    const url = this.#request.args.data.mimeType.includes('image') ? await this.#getOrCreateImageDataUrl() : null;
    const img = url ? html`<img src=${url} class="element-img"/>` : Lit.nothing;

    // clang-format off
    Lit.render(html`
      <style>${baseInsightComponentStyles}</style>
      <div class="image-ref">
        ${img}
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
