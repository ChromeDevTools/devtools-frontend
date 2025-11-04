// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import requestHTMLViewStyles from './requestHTMLView.css.js';
export const DEFAULT_VIEW = (input, _output, target) => {
    // Forbid to run JavaScript and set unique origin.
    // clang-format off
    render(html `
    <style>${requestHTMLViewStyles}</style>
    <div class="html request-view widget vbox">
      ${input.dataURL ? html `
        <!-- @ts-ignore -->
        <iframe class="html-preview-frame" sandbox
          csp="default-src 'none';img-src data:;style-src 'unsafe-inline'" src=${input.dataURL}
          tabindex="-1" role="presentation"></iframe>` : nothing}
    </div>`, target);
    // clang-format on
};
export class RequestHTMLView extends UI.Widget.VBox {
    #dataURL;
    #view;
    constructor(dataURL, view = DEFAULT_VIEW) {
        super({ useShadowDom: true });
        this.#dataURL = dataURL;
        this.#view = view;
    }
    static create(contentData) {
        const dataURL = contentData.asDataUrl();
        return dataURL ? new RequestHTMLView(dataURL) : null;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({ dataURL: this.#dataURL }, {}, this.contentElement);
    }
}
//# sourceMappingURL=RequestHTMLView.js.map