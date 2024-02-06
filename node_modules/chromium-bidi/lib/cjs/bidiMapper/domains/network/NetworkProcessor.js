"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkProcessor = void 0;
const protocol_js_1 = require("../../../protocol/protocol.js");
const assert_js_1 = require("../../../utils/assert.js");
const NetworkStorage_js_1 = require("./NetworkStorage.js");
const NetworkUtils_js_1 = require("./NetworkUtils.js");
/** Dispatches Network domain commands. */
class NetworkProcessor {
    #browsingContextStorage;
    #networkStorage;
    constructor(browsingContextStorage, networkStorage) {
        this.#browsingContextStorage = browsingContextStorage;
        this.#networkStorage = networkStorage;
    }
    async addIntercept(params) {
        // If AuthRequired is specified, BeforeRequestSent must also be specified.
        // This is a CDP quirk.
        if (params.phases.includes("authRequired" /* Network.InterceptPhase.AuthRequired */) &&
            !params.phases.includes("beforeRequestSent" /* Network.InterceptPhase.BeforeRequestSent */)) {
            params.phases.unshift("beforeRequestSent" /* Network.InterceptPhase.BeforeRequestSent */);
        }
        const urlPatterns = params.urlPatterns ?? [];
        const parsedUrlPatterns = NetworkProcessor.parseUrlPatterns(urlPatterns);
        const intercept = this.#networkStorage.addIntercept({
            urlPatterns: parsedUrlPatterns,
            phases: params.phases,
        });
        await this.#fetchApply();
        return {
            intercept,
        };
    }
    async continueRequest(params) {
        const networkId = params.request;
        const { request: fetchId, phase } = this.#getBlockedRequest(networkId);
        if (phase !== "beforeRequestSent" /* Network.InterceptPhase.BeforeRequestSent */) {
            throw new protocol_js_1.InvalidArgumentException(`Blocked request for network id '${networkId}' is not in 'BeforeRequestSent' phase`);
        }
        if (params.url !== undefined) {
            NetworkProcessor.parseUrlString(params.url);
        }
        const { url, method, headers } = params;
        // TODO: Set / expand.
        // ; Step 9. cookies
        // ; Step 10. body
        const requestHeaders = (0, NetworkUtils_js_1.cdpFetchHeadersFromBidiNetworkHeaders)(headers);
        const request = this.#getRequestOrFail(networkId);
        await request.continueRequest(fetchId, url, method, requestHeaders);
        this.#networkStorage.removeBlockedRequest(networkId);
        return {};
    }
    async continueResponse(params) {
        const networkId = params.request;
        const { request: fetchId, phase } = this.#getBlockedRequest(networkId);
        if (phase === "beforeRequestSent" /* Network.InterceptPhase.BeforeRequestSent */) {
            throw new protocol_js_1.InvalidArgumentException(`Blocked request for network id '${networkId}' is in 'BeforeRequestSent' phase`);
        }
        const { statusCode, reasonPhrase, headers } = params;
        const responseHeaders = (0, NetworkUtils_js_1.cdpFetchHeadersFromBidiNetworkHeaders)(headers);
        // TODO: Set / expand.
        // ; Step 10. cookies
        // ; Step 11. credentials
        const request = this.#getRequestOrFail(networkId);
        await request.continueResponse(fetchId, statusCode, reasonPhrase, responseHeaders);
        this.#networkStorage.removeBlockedRequest(networkId);
        return {};
    }
    async continueWithAuth(params) {
        const networkId = params.request;
        const { request: fetchId, phase } = this.#getBlockedRequest(networkId);
        if (phase !== "authRequired" /* Network.InterceptPhase.AuthRequired */) {
            throw new protocol_js_1.InvalidArgumentException(`Blocked request for network id '${networkId}' is not in 'AuthRequired' phase`);
        }
        const request = this.#getRequestOrFail(networkId);
        let username;
        let password;
        if (params.action === 'provideCredentials') {
            const { credentials } = params;
            username = credentials.username;
            password = credentials.password;
            // TODO: This should be invalid argument exception.
            // Spec may need to be updated.
            (0, assert_js_1.assert)(credentials.type === 'password', `Credentials type ${credentials.type} must be 'password'`);
        }
        const response = (0, NetworkUtils_js_1.cdpAuthChallengeResponseFromBidiAuthContinueWithAuthAction)(params.action);
        await request.continueWithAuth(fetchId, response, username, password);
        return {};
    }
    async failRequest({ request: networkId, }) {
        const { request: fetchId, phase } = this.#getBlockedRequest(networkId);
        if (phase === "authRequired" /* Network.InterceptPhase.AuthRequired */) {
            throw new protocol_js_1.InvalidArgumentException(`Blocked request for network id '${networkId}' is in 'AuthRequired' phase`);
        }
        const request = this.#getRequestOrFail(networkId);
        await request.failRequest(fetchId, 'Failed');
        this.#networkStorage.removeBlockedRequest(networkId);
        return {};
    }
    async provideResponse(params) {
        const { statusCode, reasonPhrase, headers, body, request: networkId, } = params;
        const { request: fetchId } = this.#getBlockedRequest(networkId);
        // TODO: Step 6
        // https://w3c.github.io/webdriver-bidi/#command-network-continueResponse
        const responseHeaders = (0, NetworkUtils_js_1.cdpFetchHeadersFromBidiNetworkHeaders)(headers);
        // TODO: Set / expand.
        // ; Step 10. cookies
        // ; Step 11. credentials
        const request = this.#getRequestOrFail(networkId);
        await request.provideResponse(fetchId, statusCode ?? request.statusCode, reasonPhrase, responseHeaders, body?.value // TODO: Differ base64 / string
        );
        this.#networkStorage.removeBlockedRequest(networkId);
        return {};
    }
    async removeIntercept(params) {
        this.#networkStorage.removeIntercept(params.intercept);
        await this.#fetchApply();
        return {};
    }
    /** Applies all existing network intercepts to all CDP targets concurrently. */
    async #fetchEnable() {
        await Promise.all(this.#browsingContextStorage.getAllContexts().map(async (context) => {
            await context.cdpTarget.fetchEnable();
        }));
    }
    /** Removes all existing network intercepts from all CDP targets concurrently. */
    async #fetchDisable() {
        await Promise.all(this.#browsingContextStorage.getAllContexts().map(async (context) => {
            await context.cdpTarget.fetchDisable();
        }));
    }
    /**
     * Either enables or disables the Fetch domain.
     *
     * If enabling, applies all existing network intercepts to all CDP targets.
     * If disabling, removes all existing network intercepts from all CDP targets.
     *
     * Disabling is only performed when there are no remaining intercepts or
     * // blocked requests.
     */
    async #fetchApply() {
        if (this.#networkStorage.hasIntercepts() ||
            this.#networkStorage.hasBlockedRequests() ||
            this.#networkStorage.hasNetworkRequests()) {
            // TODO: Add try/catch. Remove the intercept if CDP Fetch commands fail.
            await this.#fetchEnable();
        }
        else {
            // The last intercept has been removed, and there are no pending
            // blocked requests.
            // Disable the Fetch domain.
            await this.#fetchDisable();
        }
    }
    /**
     * Returns the blocked request associated with the given network ID.
     * If none, throws a NoSuchRequestException.
     */
    #getBlockedRequest(networkId) {
        const blockedRequest = this.#networkStorage.getBlockedRequest(networkId);
        if (!blockedRequest) {
            throw new protocol_js_1.NoSuchRequestException(`No blocked request found for network id '${networkId}'`);
        }
        return blockedRequest;
    }
    #getRequestOrFail(id) {
        const request = this.#networkStorage.getRequest(id);
        if (!request) {
            throw new protocol_js_1.NoSuchRequestException(`Network request with ID ${id} doesn't exist`);
        }
        return request;
    }
    /**
     * Attempts to parse the given url.
     * Throws an InvalidArgumentException if the url is invalid.
     */
    static parseUrlString(url) {
        try {
            return new URL(url);
        }
        catch (error) {
            throw new protocol_js_1.InvalidArgumentException(`Invalid URL '${url}': ${error}`);
        }
    }
    static parseUrlPatterns(urlPatterns) {
        return urlPatterns.map((urlPattern) => {
            switch (urlPattern.type) {
                case 'string': {
                    NetworkProcessor.parseUrlString(urlPattern.pattern);
                    return urlPattern;
                }
                case 'pattern':
                    // No params signifies intercept all
                    if (urlPattern.protocol === undefined &&
                        urlPattern.hostname === undefined &&
                        urlPattern.port === undefined &&
                        urlPattern.pathname === undefined &&
                        urlPattern.search === undefined) {
                        return urlPattern;
                    }
                    if (urlPattern.protocol === '') {
                        throw new protocol_js_1.InvalidArgumentException(`URL pattern must specify a protocol`);
                    }
                    if (urlPattern.hostname === '') {
                        throw new protocol_js_1.InvalidArgumentException(`URL pattern must specify a hostname`);
                    }
                    if ((urlPattern.hostname?.length ?? 0) > 0) {
                        if (urlPattern.protocol?.match(/^file/i)) {
                            throw new protocol_js_1.InvalidArgumentException(`URL pattern protocol cannot be 'file'`);
                        }
                        if (urlPattern.hostname?.includes(':')) {
                            throw new protocol_js_1.InvalidArgumentException(`URL pattern hostname must not contain a colon`);
                        }
                    }
                    if (urlPattern.port === '') {
                        throw new protocol_js_1.InvalidArgumentException(`URL pattern must specify a port`);
                    }
                    try {
                        new URL(NetworkStorage_js_1.NetworkStorage.buildUrlPatternString(urlPattern));
                    }
                    catch (error) {
                        throw new protocol_js_1.InvalidArgumentException(`${error}`);
                    }
                    return urlPattern;
            }
        });
    }
}
exports.NetworkProcessor = NetworkProcessor;
//# sourceMappingURL=NetworkProcessor.js.map