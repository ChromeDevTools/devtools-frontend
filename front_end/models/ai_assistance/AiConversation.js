// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import { AccessibilityAgent } from './agents/AccessibilityAgent.js';
import { ContextSelectionAgent } from './agents/ContextSelectionAgent.js';
import { FileAgent } from './agents/FileAgent.js';
import { NetworkAgent } from './agents/NetworkAgent.js';
import { PerformanceAgent } from './agents/PerformanceAgent.js';
import { StorageAgent, StorageContext } from './agents/StorageAgent.js';
import { StylingAgent } from './agents/StylingAgent.js';
import { AiAgent2 } from './AiAgent2.js';
import { AiHistoryStorage } from './AiHistoryStorage.js';
import { AccessibilityContext } from './contexts/AccessibilityContext.js';
import { DOMNodeContext } from './contexts/DOMNodeContext.js';
import { FileContext } from './contexts/FileContext.js';
import { PerformanceTraceContext } from './contexts/PerformanceTraceContext.js';
import { RequestContext } from './contexts/RequestContext.js';
export const NOT_FOUND_IMAGE_DATA = '';
export const CONTEXT_TITLE = 'Analyzing data';
const MAX_TITLE_LENGTH = 80;
/**
 * List of page navigations that are allowed during an AI agent run.
 * These are page navigations triggered by agents themselves:
 * - `about://` : Navigated to before initiating a trace recording to ensure a clean state.
 * - `chrome://terms`: Navigated to by Lighthouse during its Back-Forward Cache
 *    audit.
 */
export const ALLOWED_PAGE_NAVIGATIONS = [
    Platform.DevToolsPath.urlString `about://`,
    Platform.DevToolsPath.urlString `chrome://terms`,
];
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
        return new AiConversation({
            type: serializedConversation.type,
            data: history,
            id: serializedConversation.id,
            isReadOnly: true,
            isExternal: serializedConversation.isExternal,
        });
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
    #navigationOccurredDuringRun = false;
    #contexts = [];
    #performanceRecordAndReload;
    #lighthouseRecording;
    #onInspectElement;
    #networkTimeCalculator;
    constructor(options) {
        const { type, data = [], id = crypto.randomUUID(), isReadOnly = true, aidaClient = new Host.AidaClient.AidaClient(), changeManager, isExternal = false, performanceRecordAndReload, onInspectElement, networkTimeCalculator, lighthouseRecording, } = options;
        this.#changeManager = changeManager;
        this.#aidaClient = aidaClient;
        this.#performanceRecordAndReload = performanceRecordAndReload;
        this.#onInspectElement = onInspectElement;
        this.#networkTimeCalculator = networkTimeCalculator;
        this.#lighthouseRecording = lighthouseRecording;
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
            else if (updateContext instanceof DOMNodeContext) {
                this.#updateAgent("freestyler" /* ConversationType.STYLING */);
            }
            else if (updateContext instanceof RequestContext) {
                this.#updateAgent("drjones-network-request" /* ConversationType.NETWORK */);
            }
            else if (updateContext instanceof PerformanceTraceContext) {
                this.#updateAgent("drjones-performance-full" /* ConversationType.PERFORMANCE */);
            }
            else if (updateContext instanceof AccessibilityContext) {
                this.#updateAgent("accessibility" /* ConversationType.ACCESSIBILITY */);
            }
            else if (updateContext instanceof StorageContext) {
                this.#updateAgent("storage" /* ConversationType.STORAGE */);
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
                    contentParts.push(`### ${CONTEXT_TITLE}`);
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
            void AiHistoryStorage.instance().addRecentPrompt(item.query);
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
                switch (item.type) {
                    case "context-change" /* ResponseType.CONTEXT_CHANGE */: {
                        return null;
                    }
                    case "user-query" /* ResponseType.USER_QUERY */: {
                        return { ...item, imageInput: undefined };
                    }
                    case "side-effect" /* ResponseType.SIDE_EFFECT */: {
                        return { ...item, confirm: undefined };
                    }
                    case "context" /* ResponseType.CONTEXT */:
                    case "action" /* ResponseType.ACTION */: {
                        return { ...item, widgets: undefined };
                    }
                    default:
                        return item;
                }
            })
                .filter(history => !!history),
            type: this.#type,
            isExternal: this.#isExternal,
        };
    }
    #filterHistoryForNewAgent() {
        return this.#agent?.history
            .map(content => {
            return {
                ...content,
                parts: content.parts.filter(part => !('functionCall' in part) && !('functionResponse' in part)),
            };
        })
            .filter(content => content.parts.length > 0) ??
            [];
    }
    #updateAgent(type) {
        if (this.#type === type) {
            return;
        }
        const isTransitioningFromStorage = this.#type === "storage" /* ConversationType.STORAGE */ && type !== "storage" /* ConversationType.STORAGE */;
        const history = isTransitioningFromStorage ? [] : this.#filterHistoryForNewAgent();
        this.#type = type;
        const options = {
            aidaClient: this.#aidaClient,
            serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
            sessionId: this.id,
            changeManager: this.#changeManager,
            performanceRecordAndReload: this.#performanceRecordAndReload,
            onInspectElement: this.#onInspectElement,
            networkTimeCalculator: this.#networkTimeCalculator,
            lighthouseRecording: this.#lighthouseRecording,
            allowedOrigin: this.allowedOrigin,
            history,
        };
        this.#agent = Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled ? new AiAgent2(options) :
            this.#createV1Agent(type, options);
    }
    #createV1Agent(type, options) {
        switch (type) {
            case "freestyler" /* ConversationType.STYLING */:
                return new StylingAgent(options);
            case "drjones-network-request" /* ConversationType.NETWORK */:
                return new NetworkAgent(options);
            case "drjones-file" /* ConversationType.FILE */:
                return new FileAgent(options);
            case "drjones-performance-full" /* ConversationType.PERFORMANCE */:
                return new PerformanceAgent(options);
            case "accessibility" /* ConversationType.ACCESSIBILITY */:
                return new AccessibilityAgent(options);
            case "storage" /* ConversationType.STORAGE */:
                return new StorageAgent(options);
            case "none" /* ConversationType.NONE */:
                return new ContextSelectionAgent(options);
            default:
                Platform.assertNever(type, 'Unknown conversation type');
        }
    }
    async *run(initialQuery, options = {}) {
        this.#navigationOccurredDuringRun = false;
        const originAtRunStart = getPrimaryPageOrigin();
        const listener = () => {
            // If an unexpected navigation to a different origin occurred
            // during processing the user's request, we don't want to allow
            // the agent to run any function calls and retrieve data from the new origin.
            // Performance agent and accessibility agent navigate to 'about://' or 'chrome://terms'
            const newOrigin = getPrimaryPageOrigin();
            if (originAtRunStart !== newOrigin && newOrigin && !ALLOWED_PAGE_NAVIGATIONS.includes(newOrigin)) {
                this.#navigationOccurredDuringRun = true;
            }
        };
        const targetManager = SDK.TargetManager.TargetManager.instance();
        targetManager.addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, listener, this);
        try {
            if (this.isBlockedByOrigin) {
                // This error should not be reached. If it happens, some
                // invariants do not hold anymore.
                throw new Error('cross-origin context data should not be included');
            }
            yield* this.#runAgent(initialQuery, options, { isInitialCall: true });
        }
        finally {
            targetManager.removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, listener, this);
        }
    }
    #getQueryAfterSelection(initialQuery, selection) {
        return `${selection}\nOriginal user query: ${initialQuery}`;
    }
    async *#runAgent(initialQuery, options = {}, runOptions = {}) {
        this.#setOriginIfEmpty(this.selectedContext?.getOrigin());
        if (this.isBlockedByOrigin) {
            yield {
                type: "error" /* ResponseType.ERROR */,
                error: "cross-origin" /* ErrorType.CROSS_ORIGIN */,
            };
            return;
        }
        if (runOptions.isInitialCall) {
            const userQuery = {
                type: "user-query" /* ResponseType.USER_QUERY */,
                query: initialQuery,
                imageInput: options.multimodalInput?.input,
                imageId: options.multimodalInput?.id,
            };
            void this.addHistoryItem(userQuery);
            yield userQuery;
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
                yield* this.#runAgent(this.#getQueryAfterSelection(initialQuery, data.description), options, { isInitialCall: false });
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
        if (this.#navigationOccurredDuringRun) {
            return { blocked: true };
        }
        if (this.#origin) {
            return { origin: this.#origin };
        }
        this.#origin = getPrimaryPageOrigin();
        return { origin: this.#origin };
    };
}
function isAiAssistanceServerSideLoggingEnabled() {
    return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
function isAiAssistanceContextSelectionAgentEnabled() {
    return Boolean(Root.Runtime.hostConfig.devToolsAiAssistanceContextSelectionAgent?.enabled);
}
function getPrimaryPageOrigin() {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const inspectedURL = target?.inspectedURL();
    return inspectedURL ? new Common.ParsedURL.ParsedURL(inspectedURL).securityOrigin() : undefined;
}
//# sourceMappingURL=AiConversation.js.map