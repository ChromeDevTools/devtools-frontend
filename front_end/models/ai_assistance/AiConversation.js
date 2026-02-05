// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import * as NetworkTimeCalculator from '../network_time_calculator/network_time_calculator.js';
import { ContextSelectionAgent } from './agents/ContextSelectionAgent.js';
import { FileAgent, FileContext } from './agents/FileAgent.js';
import { NetworkAgent, RequestContext } from './agents/NetworkAgent.js';
import { PerformanceAgent, PerformanceTraceContext } from './agents/PerformanceAgent.js';
import { NodeContext, StylingAgent } from './agents/StylingAgent.js';
import { AiHistoryStorage } from './AiHistoryStorage.js';
import { NetworkRequestFormatter } from './data_formatters/NetworkRequestFormatter.js';
import { PerformanceInsightFormatter } from './data_formatters/PerformanceInsightFormatter.js';
import { micros } from './data_formatters/UnitFormatters.js';
import { AgentFocus } from './performance/AIContext.js';
export const NOT_FOUND_IMAGE_DATA = '';
const MAX_TITLE_LENGTH = 80;
export function generateContextDetailsMarkdown(details) {
    const detailsMarkdown = [];
    for (const detail of details) {
        const text = `\`\`\`\`${detail.codeLang || ''}\n${detail.text.trim()}\n\`\`\`\``;
        detailsMarkdown.push(`**${detail.title}:**\n${text}`);
    }
    return detailsMarkdown.join('\n\n');
}
export class AiConversation {
    static fromSerializedConversation(serializedConversation) {
        const history = serializedConversation.history.map(entry => {
            if (entry.type === "side-effect" /* ResponseType.SIDE_EFFECT */) {
                return { ...entry, confirm: () => { } };
            }
            return entry;
        });
        return new AiConversation(serializedConversation.type, history, serializedConversation.id, true, undefined, undefined, serializedConversation.isExternal);
    }
    id;
    // Handled in #updateAgent
    #type;
    // Handled in #updateAgent
    #agent;
    #isReadOnly;
    history;
    #isExternal;
    #aidaClient;
    #changeManager;
    #origin;
    #contexts = [];
    constructor(type, data = [], id = crypto.randomUUID(), isReadOnly = true, aidaClient = new Host.AidaClient.AidaClient(), changeManager, isExternal = false) {
        this.#changeManager = changeManager;
        this.#aidaClient = aidaClient;
        this.id = id;
        this.#isReadOnly = isReadOnly;
        this.#isExternal = isExternal;
        this.history = this.#reconstructHistory(data);
        // Needs to be last
        this.#updateAgent(type);
    }
    get isReadOnly() {
        return this.#isReadOnly;
    }
    get title() {
        const query = this.history.find(response => response.type === "user-query" /* ResponseType.USER_QUERY */)?.query;
        if (!query) {
            return;
        }
        if (this.#isExternal) {
            return `[External] ${query.substring(0, MAX_TITLE_LENGTH - 11)}${query.length > MAX_TITLE_LENGTH - 11 ? '…' : ''}`;
        }
        return `${query.substring(0, MAX_TITLE_LENGTH)}${query.length > MAX_TITLE_LENGTH ? '…' : ''}`;
    }
    get isEmpty() {
        return this.history.length === 0;
    }
    #setOriginIfEmpty(newOrigin) {
        if (!this.#origin) {
            this.#origin = newOrigin;
        }
    }
    setContext(updateContext) {
        if (!updateContext) {
            this.#contexts = [];
            if (isAiAssistanceContextSelectionAgentEnabled()) {
                this.#updateAgent("none" /* ConversationType.NONE */);
            }
            return;
        }
        this.#contexts = [updateContext];
        if (isAiAssistanceContextSelectionAgentEnabled()) {
            if (updateContext instanceof FileContext) {
                this.#updateAgent("drjones-file" /* ConversationType.FILE */);
            }
            else if (updateContext instanceof NodeContext) {
                this.#updateAgent("freestyler" /* ConversationType.STYLING */);
            }
            else if (updateContext instanceof RequestContext) {
                this.#updateAgent("drjones-network-request" /* ConversationType.NETWORK */);
            }
            else if (updateContext instanceof PerformanceTraceContext) {
                this.#updateAgent("drjones-performance-full" /* ConversationType.PERFORMANCE */);
            }
        }
    }
    get selectedContext() {
        return this.#contexts.at(0);
    }
    #reconstructHistory(historyWithoutImages) {
        const imageHistory = AiHistoryStorage.instance().getImageHistory();
        if (imageHistory && imageHistory.length > 0) {
            const history = [];
            for (const data of historyWithoutImages) {
                if (data.type === "user-query" /* ResponseType.USER_QUERY */ && data.imageId) {
                    const image = imageHistory.find(item => item.id === data.imageId);
                    const inlineData = image ? { data: image.data, mimeType: image.mimeType } :
                        { data: NOT_FOUND_IMAGE_DATA, mimeType: 'image/jpeg' };
                    history.push({ ...data, imageInput: { inlineData } });
                }
                else {
                    history.push(data);
                }
            }
            return history;
        }
        return historyWithoutImages;
    }
    getConversationMarkdown() {
        const contentParts = [];
        contentParts.push('# Exported Chat from Chrome DevTools AI Assistance\n\n' +
            `**Export Timestamp (UTC):** ${new Date().toISOString()}\n\n` +
            '---');
        for (const item of this.history) {
            switch (item.type) {
                case "user-query" /* ResponseType.USER_QUERY */: {
                    contentParts.push(`## User\n\n${item.query}`);
                    if (item.imageInput) {
                        contentParts.push('User attached an image');
                    }
                    contentParts.push('## AI');
                    break;
                }
                case "context" /* ResponseType.CONTEXT */: {
                    contentParts.push(`### ${item.title}`);
                    if (item.details && item.details.length > 0) {
                        contentParts.push(generateContextDetailsMarkdown(item.details));
                    }
                    break;
                }
                case "title" /* ResponseType.TITLE */: {
                    contentParts.push(`### ${item.title}`);
                    break;
                }
                case "thought" /* ResponseType.THOUGHT */: {
                    contentParts.push(`${item.thought}`);
                    break;
                }
                case "action" /* ResponseType.ACTION */: {
                    // We want to export only actions with output field
                    if (!item.output) {
                        break;
                    }
                    if (item.code) {
                        contentParts.push(`**Code executed:**\n\`\`\`\n${item.code.trim()}\n\`\`\``);
                    }
                    contentParts.push(`**Data returned:**\n\`\`\`\n${item.output}\n\`\`\``);
                    break;
                }
                case "answer" /* ResponseType.ANSWER */: {
                    if (item.complete) {
                        contentParts.push(`### Answer\n\n${item.text.trim()}`);
                    }
                    break;
                }
            }
        }
        return contentParts.join('\n\n');
    }
    archiveConversation() {
        this.#isReadOnly = true;
    }
    async addHistoryItem(item) {
        this.history.push(item);
        await AiHistoryStorage.instance().upsertHistoryEntry(this.serialize());
        if (item.type === "user-query" /* ResponseType.USER_QUERY */) {
            if (item.imageId && item.imageInput && 'inlineData' in item.imageInput) {
                const inlineData = item.imageInput.inlineData;
                await AiHistoryStorage.instance().upsertImage({
                    id: item.imageId,
                    data: inlineData.data,
                    mimeType: inlineData.mimeType,
                });
            }
        }
    }
    serialize() {
        return {
            id: this.id,
            history: this.history
                .map(item => {
                if (item.type === "context-change" /* ResponseType.CONTEXT_CHANGE */) {
                    return null;
                }
                if (item.type === "user-query" /* ResponseType.USER_QUERY */) {
                    return { ...item, imageInput: undefined };
                }
                // Remove the `confirm()`-function because `structuredClone()` throws on functions
                if (item.type === "side-effect" /* ResponseType.SIDE_EFFECT */) {
                    return { ...item, confirm: undefined };
                }
                return item;
            })
                .filter(history => !!history),
            type: this.#type,
            isExternal: this.#isExternal,
        };
    }
    #updateAgent(type) {
        if (this.#type === type) {
            return;
        }
        this.#type = type;
        const options = {
            aidaClient: this.#aidaClient,
            serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
            sessionId: this.id,
            changeManager: this.#changeManager,
        };
        switch (type) {
            case "freestyler" /* ConversationType.STYLING */: {
                this.#agent = new StylingAgent(options);
                break;
            }
            case "drjones-network-request" /* ConversationType.NETWORK */: {
                this.#agent = new NetworkAgent(options);
                break;
            }
            case "drjones-file" /* ConversationType.FILE */: {
                this.#agent = new FileAgent(options);
                break;
            }
            case "drjones-performance-full" /* ConversationType.PERFORMANCE */: {
                this.#agent = new PerformanceAgent(options);
                break;
            }
            case "none" /* ConversationType.NONE */: {
                this.#agent = new ContextSelectionAgent(options);
                break;
            }
        }
    }
    #factsCache = new Map();
    async #createFactsForExtraContext(contexts) {
        for (const context of contexts) {
            const cached = this.#factsCache.get(context);
            if (cached) {
                this.#agent.addFact(cached);
                continue;
            }
            if (context instanceof SDK.DOMModel.DOMNode) {
                const desc = await StylingAgent.describeElement(context);
                const fact = {
                    text: `Relevant HTML element:\n${desc}`,
                    metadata: {
                        source: 'devtools-floaty',
                        score: 1,
                    }
                };
                this.#factsCache.set(context, fact);
                this.#agent.addFact(fact);
            }
            else if (context instanceof SDK.NetworkRequest.NetworkRequest) {
                const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
                calculator.updateBoundaries(context);
                const formatter = new NetworkRequestFormatter(context, calculator);
                const desc = await formatter.formatNetworkRequest();
                const fact = {
                    text: `Relevant network request:\n${desc}`,
                    metadata: {
                        source: 'devtools-floaty',
                        score: 1,
                    }
                };
                this.#factsCache.set(context, fact);
                this.#agent.addFact(fact);
            }
            else if ('insight' in context) {
                const focus = AgentFocus.fromInsight(context.trace, context.insight);
                const formatter = new PerformanceInsightFormatter(focus, context.insight);
                const text = `Relevant Performance Insight:\n${formatter.formatInsight()}`;
                const fact = {
                    text,
                    metadata: {
                        source: 'devtools-floaty',
                        score: 1,
                    }
                };
                this.#factsCache.set(context, fact);
                this.#agent.addFact(fact);
            }
            else {
                // Must be a trace event
                const time = Trace.Types.Timing.Micro(context.event.ts - context.traceStartTime);
                const desc = `Trace event: ${context.event.name}
Time: ${micros(time)}`;
                const fact = {
                    text: `Relevant trace event:\n${desc}`,
                    metadata: {
                        source: 'devtools-floaty',
                        score: 1,
                    }
                };
                this.#factsCache.set(context, fact);
                this.#agent.addFact(fact);
            }
        }
    }
    async *run(initialQuery, options = {}) {
        if (options.extraContext) {
            await this.#createFactsForExtraContext(options.extraContext);
        }
        this.#setOriginIfEmpty(this.selectedContext?.getOrigin());
        if (this.isBlockedByOrigin) {
            throw new Error('Cross-origin context data should not be included');
        }
        function shouldAddToHistory(data) {
            if (data.type === "context-change" /* ResponseType.CONTEXT_CHANGE */) {
                return false;
            }
            // We don't want to save partial responses to the conversation history.
            // TODO(crbug.com/463325400): We should save interleaved answers to the history as well.
            if (data.type === "answer" /* ResponseType.ANSWER */ && !data.complete) {
                return false;
            }
            return true;
        }
        for await (const data of this.#agent.run(initialQuery, {
            signal: options.signal,
            selected: this.selectedContext ?? null,
        }, options.multimodalInput)) {
            if (shouldAddToHistory(data)) {
                void this.addHistoryItem(data);
            }
            yield data;
        }
    }
    /**
     * Indicates whether the new conversation context is blocked due to cross-origin restrictions.
     * This happens when the conversation's context has a different
     * origin than the selected context.
     */
    get isBlockedByOrigin() {
        return !this.#contexts.every(context => context.isOriginAllowed(this.#origin));
    }
    get origin() {
        return this.#origin;
    }
    get type() {
        return this.#type;
    }
}
function isAiAssistanceServerSideLoggingEnabled() {
    return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
function isAiAssistanceContextSelectionAgentEnabled() {
    return Boolean(Root.Runtime.hostConfig.devToolsAiAssistanceContextSelectionAgent?.enabled);
}
//# sourceMappingURL=AiConversation.js.map