// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Greendev from '../greendev/greendev.js';
import { BreakpointDebuggerAgent } from './agents/BreakpointDebuggerAgent.js';
import { ContextSelectionAgent } from './agents/ContextSelectionAgent.js';
import { FileAgent, FileContext } from './agents/FileAgent.js';
import { NetworkAgent, RequestContext } from './agents/NetworkAgent.js';
import { PerformanceAgent, PerformanceTraceContext } from './agents/PerformanceAgent.js';
import { NodeContext, StylingAgent } from './agents/StylingAgent.js';
import { AiHistoryStorage } from './AiHistoryStorage.js';
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
        return new AiConversation(serializedConversation.type, history, serializedConversation.id, true, undefined, undefined, serializedConversation.isExternal, undefined, undefined);
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
    #performanceRecordAndReload;
    #onInspectElement;
    #networkTimeCalculator;
    constructor(type, data = [], id = crypto.randomUUID(), isReadOnly = true, aidaClient = new Host.AidaClient.AidaClient(), changeManager, isExternal = false, performanceRecordAndReload, onInspectElement, networkTimeCalculator) {
        this.#changeManager = changeManager;
        this.#aidaClient = aidaClient;
        this.#performanceRecordAndReload = performanceRecordAndReload;
        this.#onInspectElement = onInspectElement;
        this.#networkTimeCalculator = networkTimeCalculator;
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
    getPendingMultimodalInput() {
        const greenDevEmulationEnabled = Greendev.Prototypes.instance().isEnabled('emulationCapabilities');
        return greenDevEmulationEnabled ? this.#agent.popPendingMultimodalInput() : undefined;
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
                if (item.type === "context" /* ResponseType.CONTEXT */ && item.widgets) {
                    return { ...item, widgets: undefined };
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
        // We need to filter out the function calls
        // as the LLM tries to call the existing ones.
        const history = this.#agent?.history
            .map(content => {
            return {
                ...content,
                parts: content.parts.filter(part => !('functionCall' in part) && !('functionResponse' in part)),
            };
        })
            .filter(content => content.parts.length > 0);
        const options = {
            aidaClient: this.#aidaClient,
            serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
            sessionId: this.id,
            changeManager: this.#changeManager,
            performanceRecordAndReload: this.#performanceRecordAndReload,
            onInspectElement: this.#onInspectElement,
            networkTimeCalculator: this.#networkTimeCalculator,
            allowedOrigin: this.allowedOrigin,
            history,
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
            case "breakpoint" /* ConversationType.BREAKPOINT */: {
                const breakpointAgentEnabled = Greendev.Prototypes.instance().isEnabled('breakpointDebuggerAgent');
                if (breakpointAgentEnabled) {
                    this.#agent = new BreakpointDebuggerAgent(options);
                }
                break;
            }
            case "none" /* ConversationType.NONE */: {
                this.#agent = new ContextSelectionAgent(options);
                break;
            }
        }
    }
    async *run(initialQuery, options = {}) {
        if (this.isBlockedByOrigin) {
            // This error should not be reached. If it happens, some
            // invariants do not hold anymore.
            throw new Error('cross-origin context data should not be included');
        }
        const userQuery = {
            type: "user-query" /* ResponseType.USER_QUERY */,
            query: initialQuery,
            imageInput: options.multimodalInput?.input,
            imageId: options.multimodalInput?.id,
        };
        void this.addHistoryItem(userQuery);
        yield userQuery;
        yield* this.#runAgent(initialQuery, options);
    }
    #getQueryAfterSelection(initialQuery, selection) {
        return `${selection}\nOriginal user query: ${initialQuery}`;
    }
    async *#runAgent(initialQuery, options = {}) {
        this.#setOriginIfEmpty(this.selectedContext?.getOrigin());
        if (this.isBlockedByOrigin) {
            yield {
                type: "error" /* ResponseType.ERROR */,
                error: "cross-origin" /* ErrorType.CROSS_ORIGIN */,
            };
            return;
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
            // Add to history if relevant
            if (shouldAddToHistory(data)) {
                void this.addHistoryItem(data);
            }
            // Always yield the data
            yield data;
            // If we change the context
            // requery with the specialized agent.
            if (data.type === "context-change" /* ResponseType.CONTEXT_CHANGE */) {
                this.setContext(data.context);
                yield* this.#runAgent(this.#getQueryAfterSelection(initialQuery, data.description), options);
                return;
            }
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
    allowedOrigin = () => {
        if (this.#origin) {
            return this.#origin;
        }
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const inspectedURL = target?.inspectedURL();
        this.#origin = inspectedURL ? new Common.ParsedURL.ParsedURL(inspectedURL).securityOrigin() : undefined;
        return this.#origin;
    };
}
function isAiAssistanceServerSideLoggingEnabled() {
    return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
function isAiAssistanceContextSelectionAgentEnabled() {
    return Boolean(Root.Runtime.hostConfig.devToolsAiAssistanceContextSelectionAgent?.enabled);
}
//# sourceMappingURL=AiConversation.js.map