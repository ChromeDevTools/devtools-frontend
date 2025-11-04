// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as Utils from '../../utils/utils.js';
import baseInsightComponentStyles from './baseInsightComponent.css.js';
const { html, Directives: { ifDefined } } = Lit;
export class EventReferenceClick extends Event {
    event;
    static eventName = 'eventreferenceclick';
    constructor(event) {
        super(EventReferenceClick.eventName, { bubbles: true, composed: true });
        this.event = event;
    }
}
class EventRef extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #text = null;
    #event = null;
    set text(text) {
        this.#text = text;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    set event(event) {
        this.#event = event;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #render() {
        if (!this.#text || !this.#event) {
            return;
        }
        // clang-format off
        Lit.render(html `
      <style>${baseInsightComponentStyles}</style>
      <button type="button" class="timeline-link" @click=${(e) => {
            e.stopPropagation();
            if (this.#event) {
                this.dispatchEvent(new EventReferenceClick(this.#event));
            }
        }}>${this.#text}</button>
    `, this.#shadow, { host: this });
        // clang-format on
    }
}
export function eventRef(event, options) {
    let title = options?.title;
    let text = options?.text;
    if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
        text = text ?? Utils.Helpers.shortenUrl(new URL(event.args.data.url));
        title = title ?? event.args.data.url;
    }
    else if (!text) {
        console.warn('No text given for eventRef');
        text = event.name;
    }
    return html `<devtools-performance-event-ref
    .event=${event}
    .text=${text}
    title=${ifDefined(title)}
  ></devtools-performance-event-ref>`;
}
class ImageRef extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #request;
    #imageDataUrl;
    set request(request) {
        this.#request = request;
        this.#imageDataUrl = undefined;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    /**
     * This only returns a data url if the resource is currently present from the active
     * inspected page.
     */
    async #getOrCreateImageDataUrl() {
        if (!this.#request) {
            return null;
        }
        if (this.#imageDataUrl !== undefined) {
            return this.#imageDataUrl;
        }
        const originalUrl = this.#request.args.data.url;
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
    async #render() {
        if (!this.#request) {
            return;
        }
        const url = this.#request.args.data.mimeType.includes('image') ? await this.#getOrCreateImageDataUrl() : null;
        const img = url ? html `<img src=${url} class="element-img"/>` : Lit.nothing;
        // clang-format off
        Lit.render(html `
      <style>${baseInsightComponentStyles}</style>
      <div class="image-ref">
        ${img}
        <span class="element-img-details">
          ${eventRef(this.#request)}
          <span class="element-img-details-size">${i18n.ByteUtilities.bytesToString(this.#request.args.data.decodedBodyLength ?? 0)}</span>
        </span>
      </div>
    `, this.#shadow, { host: this });
        // clang-format on
    }
}
export function imageRef(request) {
    return html `
    <devtools-performance-image-ref
      .request=${request}
    ></devtools-performance-image-ref>
  `;
}
customElements.define('devtools-performance-event-ref', EventRef);
customElements.define('devtools-performance-image-ref', ImageRef);
//# sourceMappingURL=EventRef.js.map