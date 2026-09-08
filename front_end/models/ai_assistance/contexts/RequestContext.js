// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import { ConversationContext, } from '../agents/AiAgent.js';
import { NetworkRequestFormatter, } from '../data_formatters/NetworkRequestFormatter.js';
const UIStringsNotTranslate = {
    request: 'Request',
    response: 'Response',
    requestUrl: 'Request URL',
    timing: 'Timing',
    requestInitiatorChain: 'Request initiator chain',
};
const lockedString = i18n.i18n.lockedString;
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
        return this.#request.initiatorSecurityOrigin().siteId();
    }
    getItem() {
        return this.#request;
    }
    getTitle() {
        return this.#request.name();
    }
    #createFormatter() {
        return new NetworkRequestFormatter(this.#request, this.#calculator, {
            initiatorSecurityOrigin: this.#request.initiatorSecurityOrigin(),
        });
    }
    async getPromptDetails() {
        const formatter = this.#createFormatter();
        return `# Selected network request\n${await formatter.formatNetworkRequest()}`;
    }
    async getUserFacingDetails() {
        const formatter = this.#createFormatter();
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