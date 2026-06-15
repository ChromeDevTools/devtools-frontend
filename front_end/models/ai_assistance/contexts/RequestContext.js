// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import { ConversationContext, } from '../agents/AiAgent.js';
import { extractContextOrigin } from '../AiOrigins.js';
import { NetworkRequestFormatter } from '../data_formatters/NetworkRequestFormatter.js';
const UIStringsNotTranslate = {
    request: 'Request',
    response: 'Response',
    requestUrl: 'Request URL',
    timing: 'Timing',
    requestInitiatorChain: 'Request initiator chain',
};
const lockedString = i18n.i18n.lockedString;
/**
 * Returns the origin for a network request in the AI context.
 *
 * To prevent cross-origin prompt injection attacks, HAR-imported requests
 * are isolated from live pages. We assign them a virtual origin
 * (`imported-har://${domain}`) so they do not share the origin of live pages
 * (e.g., `https://${domain}`). This forces a conversation reset when transitioning
 * between imported HAR data and live pages.
 */
export function getRequestContextOrigin(request) {
    const origin = extractContextOrigin(request.documentURL);
    if (request.isImportedHar()) {
        const parsed = Common.ParsedURL.ParsedURL.fromString(origin);
        return `imported-har://${parsed ? parsed.domain() : origin}`;
    }
    return origin;
}
export class RequestContext extends ConversationContext {
    #request;
    #calculator;
    constructor(request, calculator) {
        super();
        this.#request = request;
        this.#calculator = calculator;
    }
    /**
     * Note: this is not the literal origin of the network request. This URL
     * is used to determine when we should force the user to start a new AI
     * conversation when the context changes. We allow a single AI conversation to
     * inspect all network requests that were made for that given target URL.
     */
    getURL() {
        return this.#request.documentURL;
    }
    getOrigin() {
        return getRequestContextOrigin(this.#request);
    }
    getItem() {
        return this.#request;
    }
    getTitle() {
        return this.#request.name();
    }
    async getPromptDetails() {
        const formatter = new NetworkRequestFormatter(this.#request, this.#calculator);
        return `# Selected network request\n${await formatter.formatNetworkRequest()}`;
    }
    async getUserFacingDetails() {
        const formatter = new NetworkRequestFormatter(this.#request, this.#calculator);
        const requestContextDetail = {
            title: lockedString(UIStringsNotTranslate.request),
            text: lockedString(UIStringsNotTranslate.requestUrl) + ': ' + this.#request.url() + '\n\n' +
                formatter.formatRequestHeaders(),
        };
        const responseBody = await formatter.formatResponseBody();
        const responseBodyString = responseBody ? `\n\n${responseBody}` : '';
        const responseContextDetail = {
            title: lockedString(UIStringsNotTranslate.response),
            text: formatter.formatResponseHeaders() + responseBodyString +
                `\n\n${formatter.formatStatus()}${formatter.formatFailureReasons()}`,
        };
        const timingContextDetail = {
            title: lockedString(UIStringsNotTranslate.timing),
            text: formatter.formatNetworkRequestTiming(),
        };
        const initiatorChainContextDetail = {
            title: lockedString(UIStringsNotTranslate.requestInitiatorChain),
            text: formatter.formatRequestInitiatorChain(),
        };
        return [
            requestContextDetail,
            responseContextDetail,
            timingContextDetail,
            initiatorChainContextDetail,
        ];
    }
}
//# sourceMappingURL=RequestContext.js.map