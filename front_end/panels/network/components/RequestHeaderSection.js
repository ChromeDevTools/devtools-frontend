// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as NetworkForward from '../forward/forward.js';
import requestHeaderSectionStyles from './RequestHeaderSection.css.js';
const { render, html } = Lit;
const UIStrings = {
    /**
     * @description Text that is usually a hyperlink to more documentation
     */
    learnMore: 'Learn more',
    /**
     * @description Message to explain lack of raw headers for a particular network request
     */
    provisionalHeadersAreShownDisableCache: 'Provisional headers are shown. Disable cache to see full headers.',
    /**
     * @description Tooltip to explain lack of raw headers for a particular network request
     */
    onlyProvisionalHeadersAre: 'Only provisional headers are available because this request was not sent over the network and instead was served from a local cache, which doesn’t store the original request headers. Disable cache to see full request headers.',
    /**
     * @description Message to explain lack of raw headers for a particular network request
     */
    provisionalHeadersAreShown: 'Provisional headers are shown.',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/components/RequestHeaderSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, output, target) => {
    const headers = input.headers;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html `
    <style>${requestHeaderSectionStyles}</style>
    ${input.isProvisionalHeaders ? renderProvisionalHeadersWarning(input.isRequestCached) : Lit.nothing}
    ${headers.map(header => html `
      <devtools-header-section-row
        .data=${{ header }}
        jslog=${VisualLogging.item('request-header')}
      ></devtools-header-section-row>
    `)}
  `, target);
    // clang-format on
};
function renderProvisionalHeadersWarning(isRequestCached) {
    let cautionText;
    let cautionTitle = '';
    if (isRequestCached) {
        cautionText = i18nString(UIStrings.provisionalHeadersAreShownDisableCache);
        cautionTitle = i18nString(UIStrings.onlyProvisionalHeadersAre);
    }
    else {
        cautionText = i18nString(UIStrings.provisionalHeadersAreShown);
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
    <div class="call-to-action">
      <div class="call-to-action-body">
        <div class="explanation" title=${cautionTitle}>
          <devtools-icon class="inline-icon medium" name='warning-filled'>
          </devtools-icon>
          ${cautionText} <x-link href="https://developer.chrome.com/docs/devtools/network/reference/#provisional-headers" class="link">${i18nString(UIStrings.learnMore)}</x-link>
        </div>
      </div>
    </div>
  `;
    // clang-format on
}
export class RequestHeaderSection extends UI.Widget.Widget {
    #request = null;
    #headers = [];
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    set toReveal(toReveal) {
        if (!toReveal) {
            return;
        }
        if (toReveal.section === "Request" /* NetworkForward.UIRequestLocation.UIHeaderSection.REQUEST */) {
            this.#headers.filter(header => header.name === toReveal.header?.toLowerCase()).forEach(header => {
                header.highlight = true;
            });
        }
        this.requestUpdate();
    }
    set request(request) {
        this.#request = request;
        this.#headers = this.#request.requestHeaders().map(header => ({
            name: Platform.StringUtilities.toLowerCaseString(header.name),
            value: header.value,
            valueEditable: 2 /* EditingAllowedStatus.FORBIDDEN */,
        }));
        this.#headers.sort((a, b) => Platform.StringUtilities.compare(a.name, b.name));
        this.requestUpdate();
    }
    performUpdate() {
        if (!this.#request) {
            return;
        }
        this.#view({
            headers: this.#headers,
            isProvisionalHeaders: this.#request.requestHeadersText() === undefined,
            isRequestCached: this.#request.cached() || this.#request.cachedInMemory(),
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=RequestHeaderSection.js.map