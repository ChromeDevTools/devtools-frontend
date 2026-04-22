// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
let instance = null;
const DEFAULT_MAX_STORAGE_SIZE = 50 * 1024 * 1024;
export const MAX_RECENT_PROMPTS_COUNT = 20;
export const RECENT_PROMPTS_SIZE_LIMIT = 100 * 1024;
export class AiHistoryStorage extends Common.ObjectWrapper.ObjectWrapper {
    #historySetting;
    #imageHistorySettings;
    #recentPromptsSetting;
    #mutex = new Common.Mutex.Mutex();
    #maxStorageSize;
    constructor(maxStorageSize = DEFAULT_MAX_STORAGE_SIZE) {
        super();
        this.#historySetting = Common.Settings.Settings.instance().createSetting('ai-assistance-history-entries', []);
        this.#imageHistorySettings = Common.Settings.Settings.instance().createSetting('ai-assistance-history-images', []);
        this.#recentPromptsSetting = Common.Settings.Settings.instance().createSetting('ai-assistance-recent-prompts', []);
        this.#maxStorageSize = maxStorageSize;
    }
    clearForTest() {
        this.#historySetting.set([]);
        this.#imageHistorySettings.set([]);
        this.#recentPromptsSetting.set([]);
    }
    async addRecentPrompt(prompt) {
        if (!prompt.trim()) {
            return;
        }
        const release = await this.#mutex.acquire();
        try {
            const recentPrompts = await this.#recentPromptsSetting.forceGet();
            const updatedPrompts = [prompt, ...recentPrompts.filter(p => p !== prompt)];
            const promptsToBeStored = [];
            let currentStorageSize = 0;
            for (const p of updatedPrompts) {
                if (promptsToBeStored.length >= MAX_RECENT_PROMPTS_COUNT) {
                    break;
                }
                if (currentStorageSize + p.length > RECENT_PROMPTS_SIZE_LIMIT) {
                    break;
                }
                currentStorageSize += p.length;
                promptsToBeStored.push(p);
            }
            this.#recentPromptsSetting.set(promptsToBeStored);
        }
        finally {
            release();
        }
    }
    getRecentPrompts() {
        return structuredClone(this.#recentPromptsSetting.get());
    }
    async upsertHistoryEntry(agentEntry) {
        const release = await this.#mutex.acquire();
        try {
            const history = structuredClone(await this.#historySetting.forceGet());
            const historyEntryIndex = history.findIndex(entry => entry.id === agentEntry.id);
            if (historyEntryIndex !== -1) {
                history[historyEntryIndex] = agentEntry;
            }
            else {
                history.push(agentEntry);
            }
            this.#historySetting.set(history);
        }
        finally {
            release();
        }
    }
    async upsertImage(image) {
        const release = await this.#mutex.acquire();
        try {
            const imageHistory = structuredClone(await this.#imageHistorySettings.forceGet());
            const imageHistoryEntryIndex = imageHistory.findIndex(entry => entry.id === image.id);
            if (imageHistoryEntryIndex !== -1) {
                imageHistory[imageHistoryEntryIndex] = image;
            }
            else {
                imageHistory.push(image);
            }
            const imagesToBeStored = [];
            let currentStorageSize = 0;
            for (const [, serializedImage] of Array
                .from(imageHistory.entries())
                .reverse()) {
                if (currentStorageSize >= this.#maxStorageSize) {
                    break;
                }
                currentStorageSize += serializedImage.data.length;
                imagesToBeStored.push(serializedImage);
            }
            this.#imageHistorySettings.set(imagesToBeStored.reverse());
        }
        finally {
            release();
        }
    }
    async deleteHistoryEntry(id) {
        const release = await this.#mutex.acquire();
        try {
            const history = structuredClone(await this.#historySetting.forceGet());
            const imageIdsForDeletion = history.find(entry => entry.id === id)
                ?.history
                .map(item => {
                if (item.type === "user-query" /* ResponseType.USER_QUERY */ && item.imageId) {
                    return item.imageId;
                }
                return undefined;
            })
                .filter(item => !!item);
            this.#historySetting.set(history.filter(entry => entry.id !== id));
            const images = structuredClone(await this.#imageHistorySettings.forceGet());
            this.#imageHistorySettings.set(
            // Filter images for which ids are not present in deletion list
            images.filter(entry => !Boolean(imageIdsForDeletion?.find(id => id === entry.id))));
        }
        finally {
            release();
        }
    }
    async deleteAll() {
        const release = await this.#mutex.acquire();
        try {
            this.#historySetting.set([]);
            this.#imageHistorySettings.set([]);
            this.#recentPromptsSetting.set([]);
        }
        finally {
            release();
            this.dispatchEventToListeners("AiHistoryDeleted" /* Events.HISTORY_DELETED */);
        }
    }
    getHistory() {
        return structuredClone(this.#historySetting.get());
    }
    getImageHistory() {
        return structuredClone(this.#imageHistorySettings.get());
    }
    static instance(opts = { forceNew: false, maxStorageSize: DEFAULT_MAX_STORAGE_SIZE }) {
        const { forceNew, maxStorageSize } = opts;
        if (!instance || forceNew) {
            instance = new AiHistoryStorage(maxStorageSize);
        }
        return instance;
    }
}
//# sourceMappingURL=AiHistoryStorage.js.map