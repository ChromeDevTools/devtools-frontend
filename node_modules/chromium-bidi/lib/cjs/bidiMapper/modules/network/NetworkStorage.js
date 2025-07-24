"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkStorage = void 0;
const protocol_js_1 = require("../../../protocol/protocol.js");
const log_js_1 = require("../../../utils/log.js");
const uuid_js_1 = require("../../../utils/uuid.js");
const NetworkRequest_js_1 = require("./NetworkRequest.js");
const NetworkUtils_js_1 = require("./NetworkUtils.js");
/** Stores network and intercept maps. */
class NetworkStorage {
    #browsingContextStorage;
    #eventManager;
    #logger;
    /**
     * A map from network request ID to Network Request objects.
     * Needed as long as information about requests comes from different events.
     */
    #requests = new Map();
    /** A map from intercept ID to track active network intercepts. */
    #intercepts = new Map();
    #collectors = new Map();
    #requestCollectors = new Map();
    #defaultCacheBehavior = 'default';
    constructor(eventManager, browsingContextStorage, browserClient, logger) {
        this.#browsingContextStorage = browsingContextStorage;
        this.#eventManager = eventManager;
        browserClient.on('Target.detachedFromTarget', ({ sessionId }) => {
            this.disposeRequestMap(sessionId);
        });
        this.#logger = logger;
    }
    /**
     * Gets the network request with the given ID, if any.
     * Otherwise, creates a new network request with the given ID and cdp target.
     */
    #getOrCreateNetworkRequest(id, cdpTarget, redirectCount) {
        let request = this.getRequestById(id);
        if (request) {
            return request;
        }
        request = new NetworkRequest_js_1.NetworkRequest(id, this.#eventManager, this, cdpTarget, redirectCount, this.#logger);
        this.addRequest(request);
        return request;
    }
    onCdpTargetCreated(cdpTarget) {
        const cdpClient = cdpTarget.cdpClient;
        // TODO: Wrap into object
        const listeners = [
            [
                'Network.requestWillBeSent',
                (params) => {
                    const request = this.getRequestById(params.requestId);
                    if (request && request.isRedirecting()) {
                        request.handleRedirect(params);
                        this.disposeRequest(params.requestId);
                        this.#getOrCreateNetworkRequest(params.requestId, cdpTarget, request.redirectCount + 1).onRequestWillBeSentEvent(params);
                    }
                    else {
                        this.#getOrCreateNetworkRequest(params.requestId, cdpTarget).onRequestWillBeSentEvent(params);
                    }
                },
            ],
            [
                'Network.requestWillBeSentExtraInfo',
                (params) => {
                    this.#getOrCreateNetworkRequest(params.requestId, cdpTarget).onRequestWillBeSentExtraInfoEvent(params);
                },
            ],
            [
                'Network.responseReceived',
                (params) => {
                    this.#getOrCreateNetworkRequest(params.requestId, cdpTarget).onResponseReceivedEvent(params);
                },
            ],
            [
                'Network.responseReceivedExtraInfo',
                (params) => {
                    this.#getOrCreateNetworkRequest(params.requestId, cdpTarget).onResponseReceivedExtraInfoEvent(params);
                },
            ],
            [
                'Network.requestServedFromCache',
                (params) => {
                    this.#getOrCreateNetworkRequest(params.requestId, cdpTarget).onServedFromCache();
                },
            ],
            [
                'Network.loadingFailed',
                (params) => {
                    this.#getOrCreateNetworkRequest(params.requestId, cdpTarget).onLoadingFailedEvent(params);
                },
            ],
            [
                'Fetch.requestPaused',
                (event) => {
                    this.#getOrCreateNetworkRequest(
                    // CDP quirk if the Network domain is not present this is undefined
                    event.networkId ?? event.requestId, cdpTarget).onRequestPaused(event);
                },
            ],
            [
                'Fetch.authRequired',
                (event) => {
                    let request = this.getRequestByFetchId(event.requestId);
                    if (!request) {
                        request = this.#getOrCreateNetworkRequest(event.requestId, cdpTarget);
                    }
                    request.onAuthRequired(event);
                },
            ],
        ];
        for (const [event, listener] of listeners) {
            cdpClient.on(event, listener);
        }
    }
    getCollectorsForBrowsingContext(browsingContextId) {
        if (!this.#browsingContextStorage.hasContext(browsingContextId)) {
            this.#logger?.(log_js_1.LogType.debugError, 'trying to get collector for unknown browsing context');
            return [];
        }
        const userContext = this.#browsingContextStorage.getContext(browsingContextId).userContext;
        const collectors = new Set();
        for (const collector of this.#collectors.values()) {
            if (collector.contexts?.includes(browsingContextId)) {
                // Collector is targeted to the browsing context.
                collectors.add(collector);
            }
            if (collector.userContexts?.includes(userContext)) {
                // Collector is targeted to the user context.
                collectors.add(collector);
            }
            if (collector.userContexts === undefined &&
                collector.contexts === undefined) {
                // Collector is global.
                collectors.add(collector);
            }
        }
        return [...collectors.values()];
    }
    async getCollectedData(params) {
        if (params.collector !== undefined &&
            !this.#collectors.has(params.collector)) {
            throw new protocol_js_1.NoSuchNetworkCollectorException(`Unknown collector ${params.collector}`);
        }
        const requestCollectors = this.#requestCollectors.get(params.request);
        if (requestCollectors === undefined) {
            throw new protocol_js_1.NoSuchNetworkDataException(`No collected data for request ${params.request}`);
        }
        if (params.collector !== undefined &&
            !requestCollectors.has(params.collector)) {
            throw new protocol_js_1.NoSuchNetworkDataException(`Collector ${params.collector} didn't collect data for request ${params.request}`);
        }
        if (params.disown && params.collector === undefined) {
            throw new protocol_js_1.InvalidArgumentException('Cannot disown collected data without collector ID');
        }
        const request = this.getRequestById(params.request);
        if (request === undefined) {
            throw new protocol_js_1.NoSuchNetworkDataException(`No collected data for request ${params.request}`);
        }
        // TODO: handle CDP error in case of the renderer is gone.
        const responseBody = await request.cdpClient.sendCommand('Network.getResponseBody', { requestId: request.id });
        if (params.disown && params.collector !== undefined) {
            this.#requestCollectors.delete(params.request);
            this.disposeRequest(request.id);
        }
        return {
            bytes: {
                type: responseBody.base64Encoded ? 'base64' : 'string',
                value: responseBody.body,
            },
        };
    }
    #getCollectorIdsForRequest(request) {
        const collectors = new Set();
        for (const collectorId of this.#collectors.keys()) {
            const collector = this.#collectors.get(collectorId);
            if (!collector.userContexts && !collector.contexts) {
                // A global collector.
                collectors.add(collectorId);
            }
            if (collector.contexts?.includes(request.cdpTarget.topLevelId)) {
                collectors.add(collectorId);
            }
            if (collector.userContexts?.includes(this.#browsingContextStorage.getContext(request.cdpTarget.topLevelId)
                .userContext)) {
                collectors.add(collectorId);
            }
        }
        this.#logger?.(log_js_1.LogType.debug, `Request ${request.id} has ${collectors.size} collectors`);
        return [...collectors.values()];
    }
    markRequestCollectedIfNeeded(request) {
        const collectorIds = this.#getCollectorIdsForRequest(request);
        if (collectorIds.length > 0) {
            this.#requestCollectors.set(request.id, new Set(collectorIds));
        }
    }
    getInterceptionStages(browsingContextId) {
        const stages = {
            request: false,
            response: false,
            auth: false,
        };
        for (const intercept of this.#intercepts.values()) {
            if (intercept.contexts &&
                !intercept.contexts.includes(browsingContextId)) {
                continue;
            }
            stages.request ||= intercept.phases.includes("beforeRequestSent" /* Network.InterceptPhase.BeforeRequestSent */);
            stages.response ||= intercept.phases.includes("responseStarted" /* Network.InterceptPhase.ResponseStarted */);
            stages.auth ||= intercept.phases.includes("authRequired" /* Network.InterceptPhase.AuthRequired */);
        }
        return stages;
    }
    getInterceptsForPhase(request, phase) {
        if (request.url === NetworkRequest_js_1.NetworkRequest.unknownParameter) {
            return new Set();
        }
        const intercepts = new Set();
        for (const [interceptId, intercept] of this.#intercepts.entries()) {
            if (!intercept.phases.includes(phase) ||
                (intercept.contexts &&
                    !intercept.contexts.includes(request.cdpTarget.topLevelId))) {
                continue;
            }
            if (intercept.urlPatterns.length === 0) {
                intercepts.add(interceptId);
                continue;
            }
            for (const pattern of intercept.urlPatterns) {
                if ((0, NetworkUtils_js_1.matchUrlPattern)(pattern, request.url)) {
                    intercepts.add(interceptId);
                    break;
                }
            }
        }
        return intercepts;
    }
    disposeRequestMap(sessionId) {
        for (const request of this.#requests.values()) {
            if (request.cdpClient.sessionId === sessionId) {
                this.#requests.delete(request.id);
                request.dispose();
            }
        }
    }
    /**
     * Adds the given entry to the intercept map.
     * URL patterns are assumed to be parsed.
     *
     * @return The intercept ID.
     */
    addIntercept(value) {
        const interceptId = (0, uuid_js_1.uuidv4)();
        this.#intercepts.set(interceptId, value);
        return interceptId;
    }
    /**
     * Removes the given intercept from the intercept map.
     * Throws NoSuchInterceptException if the intercept does not exist.
     */
    removeIntercept(intercept) {
        if (!this.#intercepts.has(intercept)) {
            throw new protocol_js_1.NoSuchInterceptException(`Intercept '${intercept}' does not exist.`);
        }
        this.#intercepts.delete(intercept);
    }
    getRequestsByTarget(target) {
        const requests = [];
        for (const request of this.#requests.values()) {
            if (request.cdpTarget === target) {
                requests.push(request);
            }
        }
        return requests;
    }
    getRequestById(id) {
        return this.#requests.get(id);
    }
    getRequestByFetchId(fetchId) {
        for (const request of this.#requests.values()) {
            if (request.fetchId === fetchId) {
                return request;
            }
        }
        return;
    }
    addRequest(request) {
        this.#requests.set(request.id, request);
    }
    disposeRequest(id) {
        if (this.#requestCollectors.get(id)?.size ?? 0 > 0) {
            // Keep request, as it's data can be accessed later.
            return;
        }
        // TODO: dispose Network data from Chromium once there is a CDP command for that.
        this.#requests.delete(id);
    }
    /**
     * Gets the virtual navigation ID for the given navigable ID.
     */
    getNavigationId(contextId) {
        if (contextId === undefined) {
            return null;
        }
        return (this.#browsingContextStorage.findContext(contextId)?.navigationId ?? null);
    }
    set defaultCacheBehavior(behavior) {
        this.#defaultCacheBehavior = behavior;
    }
    get defaultCacheBehavior() {
        return this.#defaultCacheBehavior;
    }
    addDataCollector(params) {
        const collectorId = (0, uuid_js_1.uuidv4)();
        this.#collectors.set(collectorId, params);
        return collectorId;
    }
    removeDataCollector(params) {
        const collectorId = params.collector;
        if (!this.#collectors.has(collectorId)) {
            throw new protocol_js_1.NoSuchNetworkCollectorException(`Collector ${params.collector} does not exist`);
        }
        this.#collectors.delete(params.collector);
        // Clean up collected responses.
        for (const [requestId, collectorIds] of this.#requestCollectors) {
            if (collectorIds.has(collectorId)) {
                collectorIds.delete(collectorId);
                if (collectorIds.size === 0) {
                    this.#requestCollectors.delete(requestId);
                    this.disposeRequest(requestId);
                }
            }
        }
    }
    disownData(params) {
        const collectorId = params.collector;
        const requestId = params.request;
        if (!this.#collectors.has(collectorId)) {
            throw new protocol_js_1.NoSuchNetworkCollectorException(`Collector ${collectorId} does not exist`);
        }
        if (!this.#requestCollectors.has(requestId)) {
            throw new protocol_js_1.NoSuchNetworkDataException(`No collected data for request ${requestId}`);
        }
        const collectorIds = this.#requestCollectors.get(requestId);
        if (!collectorIds.has(collectorId)) {
            throw new protocol_js_1.NoSuchNetworkDataException(`No collected data for request ${requestId} and collector ${collectorId}`);
        }
        collectorIds.delete(collectorId);
        if (collectorIds.size === 0) {
            this.#requestCollectors.delete(requestId);
            this.disposeRequest(requestId);
        }
    }
}
exports.NetworkStorage = NetworkStorage;
//# sourceMappingURL=NetworkStorage.js.map