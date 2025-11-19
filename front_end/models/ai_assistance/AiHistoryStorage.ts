
// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {ResponseType, type SerializedResponseData} from './agents/AiAgent.js';

export const enum ConversationType {
  STYLING = 'freestyler',
  FILE = 'drjones-file',
  NETWORK = 'drjones-network-request',
  PERFORMANCE = 'drjones-performance-full',
}

export interface SerializedConversation {
  id: string;
  type: ConversationType;
  history: SerializedResponseData[];
  isExternal: boolean;
}

export interface SerializedImage {
  id: string;
  // The IANA standard MIME type of the source data.
  // Currently supported types are: image/png, image/jpeg.
  // Format: base64-encoded
  // For reference: google3/google/x/pitchfork/aida/v1/content.proto
  mimeType: string;
  data: string;
}

let instance: AiHistoryStorage|null = null;

const DEFAULT_MAX_STORAGE_SIZE = 50 * 1024 * 1024;

export const enum Events {
  HISTORY_DELETED = 'AiHistoryDeleted',
}

export interface EventTypes {
  [Events.HISTORY_DELETED]: void;
}

export class AiHistoryStorage extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #historySetting: Common.Settings.Setting<SerializedConversation[]>;
  #imageHistorySettings: Common.Settings.Setting<SerializedImage[]>;
  #mutex = new Common.Mutex.Mutex();
  #maxStorageSize: number;

  constructor(maxStorageSize = DEFAULT_MAX_STORAGE_SIZE) {
    super();
    this.#historySetting = Common.Settings.Settings.instance().createSetting('ai-assistance-history-entries', []);
    this.#imageHistorySettings = Common.Settings.Settings.instance().createSetting(
        'ai-assistance-history-images',
        [],
    );
    this.#maxStorageSize = maxStorageSize;
  }

  clearForTest(): void {
    this.#historySetting.set([]);
    this.#imageHistorySettings.set([]);
  }

  async upsertHistoryEntry(agentEntry: SerializedConversation): Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      const history = structuredClone(await this.#historySetting.forceGet());
      const historyEntryIndex = history.findIndex(entry => entry.id === agentEntry.id);
      if (historyEntryIndex !== -1) {
        history[historyEntryIndex] = agentEntry;
      } else {
        history.push(agentEntry);
      }
      this.#historySetting.set(history);
    } finally {
      release();
    }
  }

  async upsertImage(image: SerializedImage): Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      const imageHistory = structuredClone(await this.#imageHistorySettings.forceGet());
      const imageHistoryEntryIndex = imageHistory.findIndex(entry => entry.id === image.id);
      if (imageHistoryEntryIndex !== -1) {
        imageHistory[imageHistoryEntryIndex] = image;
      } else {
        imageHistory.push(image);
      }

      const imagesToBeStored: SerializedImage[] = [];
      let currentStorageSize = 0;

      for (const [, serializedImage] of Array
               .from(
                   imageHistory.entries(),
                   )
               .reverse()) {
        if (currentStorageSize >= this.#maxStorageSize) {
          break;
        }
        currentStorageSize += serializedImage.data.length;
        imagesToBeStored.push(serializedImage);
      }

      this.#imageHistorySettings.set(imagesToBeStored.reverse());
    } finally {
      release();
    }
  }

  async deleteHistoryEntry(id: string): Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      const history = structuredClone(await this.#historySetting.forceGet());
      const imageIdsForDeletion = history.find(entry => entry.id === id)
                                      ?.history
                                      .map(item => {
                                        if (item.type === ResponseType.USER_QUERY && item.imageId) {
                                          return item.imageId;
                                        }
                                        return undefined;
                                      })
                                      .filter(item => !!item);
      this.#historySetting.set(
          history.filter(entry => entry.id !== id),
      );
      const images = structuredClone(await this.#imageHistorySettings.forceGet());
      this.#imageHistorySettings.set(
          // Filter images for which ids are not present in deletion list
          images.filter(entry => !Boolean(imageIdsForDeletion?.find(id => id === entry.id))));
    } finally {
      release();
    }
  }

  async deleteAll(): Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      this.#historySetting.set([]);
      this.#imageHistorySettings.set([]);
    } finally {
      release();
      this.dispatchEventToListeners(Events.HISTORY_DELETED);
    }
  }

  getHistory(): SerializedConversation[] {
    return structuredClone(this.#historySetting.get());
  }

  getImageHistory(): SerializedImage[] {
    return structuredClone(this.#imageHistorySettings.get());
  }

  static instance(
      opts: {
        forceNew: boolean,
        maxStorageSize?: number,
      } = {forceNew: false, maxStorageSize: DEFAULT_MAX_STORAGE_SIZE},
      ): AiHistoryStorage {
    const {forceNew, maxStorageSize} = opts;
    if (!instance || forceNew) {
      instance = new AiHistoryStorage(maxStorageSize);
    }
    return instance;
  }
}
