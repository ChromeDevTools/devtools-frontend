// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import baseInsightComponentStyles from './baseInsightComponent.css.js';
import { eventRef } from './EventRef.js';
const { html } = Lit;
const { widgetConfig } = UI.Widget;
export const DEFAULT_VIEW = (input, output, target) => {
    const { request, imageDataUrl, } = input;
    const img = imageDataUrl ? html `<img src=${imageDataUrl} class="element-img"/>` : Lit.nothing;
    // clang-format off
    Lit.render(html `
    <style>${baseInsightComponentStyles}</style>
    <div class="image-ref">
      ${img}
      <span class="element-img-details">
        ${eventRef(request)}
        <span class="element-img-details-size">${i18n.ByteUtilities.bytesToString(request.args.data.decodedBodyLength ?? 0)}</span>
      </span>
    </div>
`, target);
    // clang-format on
};
class ImageRef extends UI.Widget.Widget {
    #view;
    #request;
    #imageDataUrl;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    set request(request) {
        this.#request = request;
        this.#imageDataUrl = undefined;
        this.requestUpdate();
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
    async performUpdate() {
        if (!this.#request) {
            return;
        }
        const input = {
            request: this.#request,
            imageDataUrl: await this.#getOrCreateImageDataUrl(),
        };
        this.#view(input, undefined, this.contentElement);
    }
}
export function imageRef(request) {
    return html `<devtools-widget .widgetConfig=${widgetConfig(ImageRef, {
        request,
    })}></devtools-widget>`;
}
//# sourceMappingURL=ImageRef.js.map