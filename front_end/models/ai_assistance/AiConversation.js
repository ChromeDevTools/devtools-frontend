// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import { FileAgent } from './agents/FileAgent.js';
import { NetworkAgent } from './agents/NetworkAgent.js';
import { PerformanceAgent } from './agents/PerformanceAgent.js';
import { StylingAgent } from './agents/StylingAgent.js';
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
        return new AiConversation(serializedConversation.type, history, serializedConversation.id, true, undefined, undefined, serializedConversation.isExternal);
    }
    id;
    type;
    #isReadOnly;
    history;
    #isExternal;
    #aidaClient;
    #changeManager;
    #agent;
    constructor(type, data = [], id = crypto.randomUUID(), isReadOnly = true, aidaClient = new Host.AidaClient.AidaClient(), changeManager, isExternal = false) {
        this.#changeManager = changeManager;
        this.#aidaClient = aidaClient;
        this.#agent = this.#createAgent(type);
        this.type = type;
        this.id = id;
        this.#isReadOnly = isReadOnly;
        this.#isExternal = isExternal;
        this.history = this.#reconstructHistory(data);
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
            history: this.history.map(item => {
                if (item.type === "user-query" /* ResponseType.USER_QUERY */) {
                    return { ...item, imageInput: undefined };
                }
                // Remove the `confirm()`-function because `structuredClone()` throws on functions
                if (item.type === "side-effect" /* ResponseType.SIDE_EFFECT */) {
                    return { ...item, confirm: undefined };
                }
                return item;
            }),
            type: this.type,
            isExternal: this.#isExternal,
        };
    }
    #createAgent(conversationType) {
        const options = {
            aidaClient: this.#aidaClient,
            serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
            changeManager: this.#changeManager,
        };
        let agent;
        switch (conversationType) {
            case "freestyler" /* ConversationType.STYLING */: {
                agent = new StylingAgent(options);
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
    async *run(initialQuery, options, multimodalInput) {
        for await (const data of this.#agent.run(initialQuery, options, multimodalInput)) {
            // We don't want to save partial responses to the conversation history.
            // TODO(crbug.com/463325400): We should save interleaved answers to the history as well.
            if (data.type !== "answer" /* ResponseType.ANSWER */ || data.complete) {
                void this.addHistoryItem(data);
            }
            yield data;
        }
    }
    get origin() {
        return this.#agent.origin;
    }
}
function isAiAssistanceServerSideLoggingEnabled() {
    return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
//# sourceMappingURL=AiConversation.js.map