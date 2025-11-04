// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as NetworkTimeCalculator from '../network_time_calculator/network_time_calculator.js';
import { FileAgent } from './agents/FileAgent.js';
import { NetworkAgent, RequestContext } from './agents/NetworkAgent.js';
import { PerformanceAgent } from './agents/PerformanceAgent.js';
import { NodeContext, StylingAgent } from './agents/StylingAgent.js';
import { Conversation, } from './AiHistoryStorage.js';
import { getDisabledReasons } from './AiUtils.js';
/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
    /**
     * @description Error message shown when AI assistance is not enabled in DevTools settings.
     */
    enableInSettings: 'For AI features to be available, you need to enable AI assistance in DevTools settings.',
};
const lockedString = i18n.i18n.lockedString;
function isAiAssistanceServerSideLoggingEnabled() {
    return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
async function inspectElementBySelector(selector) {
    const whitespaceTrimmedQuery = selector.trim();
    if (!whitespaceTrimmedQuery.length) {
        return null;
    }
    const showUAShadowDOM = Common.Settings.Settings.instance().moduleSetting('show-ua-shadow-dom').get();
    const domModels = SDK.TargetManager.TargetManager.instance().models(SDK.DOMModel.DOMModel, { scoped: true });
    const performSearchPromises = domModels.map(domModel => domModel.performSearch(whitespaceTrimmedQuery, showUAShadowDOM));
    const resultCounts = await Promise.all(performSearchPromises);
    // If the selector matches multiple times, this returns the first match.
    const index = resultCounts.findIndex(value => value > 0);
    if (index >= 0) {
        return await domModels[index].searchResult(0);
    }
    return null;
}
async function inspectNetworkRequestByUrl(selector) {
    const networkManagers = SDK.TargetManager.TargetManager.instance().models(SDK.NetworkManager.NetworkManager, { scoped: true });
    const results = networkManagers
        .map(networkManager => {
        let request = networkManager.requestForURL(Platform.DevToolsPath.urlString `${selector}`);
        if (!request && selector.at(-1) === '/') {
            request =
                networkManager.requestForURL(Platform.DevToolsPath.urlString `${selector.slice(0, -1)}`);
        }
        else if (!request && selector.at(-1) !== '/') {
            request = networkManager.requestForURL(Platform.DevToolsPath.urlString `${selector}/`);
        }
        return request;
    })
        .filter(req => !!req);
    const request = results.at(0);
    return request ?? null;
}
let conversationHandlerInstance;
export class ConversationHandler extends Common.ObjectWrapper.ObjectWrapper {
    #aiAssistanceEnabledSetting;
    #aidaClient;
    #aidaAvailability;
    constructor(aidaClient, aidaAvailability) {
        super();
        this.#aidaClient = aidaClient;
        if (aidaAvailability) {
            this.#aidaAvailability = aidaAvailability;
        }
        this.#aiAssistanceEnabledSetting = this.#getAiAssistanceEnabledSetting();
    }
    static instance(opts) {
        if (opts?.forceNew || conversationHandlerInstance === undefined) {
            const aidaClient = opts?.aidaClient ?? new Host.AidaClient.AidaClient();
            conversationHandlerInstance = new ConversationHandler(aidaClient, opts?.aidaAvailability ?? undefined);
        }
        return conversationHandlerInstance;
    }
    static removeInstance() {
        conversationHandlerInstance = undefined;
    }
    #getAiAssistanceEnabledSetting() {
        try {
            return Common.Settings.moduleSetting('ai-assistance-enabled');
        }
        catch {
            return;
        }
    }
    async #getDisabledReasons() {
        if (this.#aidaAvailability === undefined) {
            this.#aidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        }
        return getDisabledReasons(this.#aidaAvailability);
    }
    // eslint-disable-next-line require-yield
    async *#generateErrorResponse(message) {
        return {
            type: "error" /* ExternalRequestResponseType.ERROR */,
            message,
        };
    }
    /**
     * Handles an external request using the given prompt and uses the
     * conversation type to use the correct agent.
     */
    async handleExternalRequest(parameters) {
        try {
            this.dispatchEventToListeners("ExternalRequestReceived" /* ConversationHandlerEvents.EXTERNAL_REQUEST_RECEIVED */);
            const disabledReasons = await this.#getDisabledReasons();
            const aiAssistanceSetting = this.#aiAssistanceEnabledSetting?.getIfNotDisabled();
            if (!aiAssistanceSetting) {
                disabledReasons.push(lockedString(UIStringsNotTranslate.enableInSettings));
            }
            if (disabledReasons.length > 0) {
                return this.#generateErrorResponse(disabledReasons.join(' '));
            }
            this.dispatchEventToListeners("ExternalConversationStarted" /* ConversationHandlerEvents.EXTERNAL_CONVERSATION_STARTED */, parameters.conversationType);
            switch (parameters.conversationType) {
                case "freestyler" /* ConversationType.STYLING */: {
                    return await this.#handleExternalStylingConversation(parameters.prompt, parameters.selector);
                }
                case "drjones-performance-full" /* ConversationType.PERFORMANCE */:
                    return await this.#handleExternalPerformanceConversation(parameters.prompt, parameters.data);
                case "drjones-network-request" /* ConversationType.NETWORK */:
                    if (!parameters.requestUrl) {
                        return this.#generateErrorResponse('The url is required for debugging a network request.');
                    }
                    return await this.#handleExternalNetworkConversation(parameters.prompt, parameters.requestUrl);
            }
        }
        catch (error) {
            return this.#generateErrorResponse(error.message);
        }
    }
    async *handleConversationWithHistory(items, conversation) {
        for await (const data of items) {
            // We don't want to save partial responses to the conversation history.
            if (data.type !== "answer" /* ResponseType.ANSWER */ || data.complete) {
                void conversation?.addHistoryItem(data);
            }
            yield data;
        }
    }
    async *#createAndDoExternalConversation(opts) {
        const { conversationType, aiAgent, prompt, selected } = opts;
        const conversation = new Conversation(conversationType, [], aiAgent.id, 
        /* isReadOnly */ true, 
        /* isExternal */ true);
        return yield* this.#doExternalConversation({ conversation, aiAgent, prompt, selected });
    }
    async *#doExternalConversation(opts) {
        const { conversation, aiAgent, prompt, selected } = opts;
        const generator = aiAgent.run(prompt, { selected });
        const generatorWithHistory = this.handleConversationWithHistory(generator, conversation);
        const devToolsLogs = [];
        for await (const data of generatorWithHistory) {
            if (data.type !== "answer" /* ResponseType.ANSWER */ || data.complete) {
                devToolsLogs.push(data);
            }
            if (data.type === "context" /* ResponseType.CONTEXT */ || data.type === "title" /* ResponseType.TITLE */) {
                yield {
                    type: "notification" /* ExternalRequestResponseType.NOTIFICATION */,
                    message: data.title,
                };
            }
            if (data.type === "side-effect" /* ResponseType.SIDE_EFFECT */) {
                data.confirm(true);
            }
            if (data.type === "answer" /* ResponseType.ANSWER */ && data.complete) {
                return {
                    type: "answer" /* ExternalRequestResponseType.ANSWER */,
                    message: data.text,
                    devToolsLogs,
                };
            }
        }
        return {
            type: "error" /* ExternalRequestResponseType.ERROR */,
            message: 'Something went wrong. No answer was generated.',
        };
    }
    async #handleExternalStylingConversation(prompt, selector = 'body') {
        const stylingAgent = this.createAgent("freestyler" /* ConversationType.STYLING */);
        const node = await inspectElementBySelector(selector);
        if (node) {
            await node.setAsInspectedNode();
        }
        const selected = node ? new NodeContext(node) : null;
        return this.#createAndDoExternalConversation({
            conversationType: "freestyler" /* ConversationType.STYLING */,
            aiAgent: stylingAgent,
            prompt,
            selected,
        });
    }
    async #handleExternalPerformanceConversation(prompt, data) {
        return this.#doExternalConversation({
            conversation: data.conversation,
            aiAgent: data.agent,
            prompt,
            selected: data.selected,
        });
    }
    async #handleExternalNetworkConversation(prompt, requestUrl) {
        const networkAgent = this.createAgent("drjones-network-request" /* ConversationType.NETWORK */);
        const request = await inspectNetworkRequestByUrl(requestUrl);
        if (!request) {
            return this.#generateErrorResponse(`Can't find request with the given selector ${requestUrl}`);
        }
        const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
        calculator.updateBoundaries(request);
        return this.#createAndDoExternalConversation({
            conversationType: "drjones-network-request" /* ConversationType.NETWORK */,
            aiAgent: networkAgent,
            prompt,
            selected: new RequestContext(request, calculator),
        });
    }
    createAgent(conversationType, changeManager) {
        const options = {
            aidaClient: this.#aidaClient,
            serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
        };
        let agent;
        switch (conversationType) {
            case "freestyler" /* ConversationType.STYLING */: {
                agent = new StylingAgent({
                    ...options,
                    changeManager,
                });
                break;
            }
            case "drjones-network-request" /* ConversationType.NETWORK */: {
                agent = new NetworkAgent(options);
                break;
            }
            case "drjones-file" /* ConversationType.FILE */: {
                agent = new FileAgent(options);
                break;
            }
            case "drjones-performance-full" /* ConversationType.PERFORMANCE */: {
                agent = new PerformanceAgent(options);
                break;
            }
        }
        return agent;
    }
}
//# sourceMappingURL=ConversationHandler.js.map