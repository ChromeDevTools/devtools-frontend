
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {type ResponseData, ResponseType} from './agents/AiAgent.js';

export const enum ConversationType {
  STYLING = 'freestyler',
  FILE = 'drjones-file',
  NETWORK = 'drjones-network-request',
  PERFORMANCE = 'drjones-performance',
  PERFORMANCE_INSIGHT = 'performance-insight',
}

export interface SerializedConversation {
  id: string;
  type: ConversationType;
  history: ResponseData[];
}

export class Conversation {
  static fromSerialized(serialized: SerializedConversation): Conversation {
    return new Conversation(serialized.type, serialized.history, serialized.id, true);
  }

  readonly id: string;
  readonly history: ResponseData[];
  readonly type: ConversationType;
  readonly isReadOnly: boolean;

  constructor(type: ConversationType, data: ResponseData[] = [], id: string = crypto.randomUUID(), isReadOnly = true) {
    this.type = type;
    this.history = data;
    this.id = id;
    this.isReadOnly = isReadOnly;
  }

  get title(): string|undefined {
    return this.history
        .filter(response => {
          return response.type === ResponseType.USER_QUERY;
        })
        .at(0)
        ?.query;
  }

  get isEmpty(): boolean {
    return this.history.length === 0;
  }

  addHistoryItem(item: ResponseData): void {
    if (item.type === ResponseType.USER_QUERY) {
      const historyItem = {...item, imageInput: undefined};
      this.history.push(historyItem);
    } else {
      this.history.push(item);
    }
    void AiHistoryStorage.instance().upsertHistoryEntry(this.serialize());
  }

  serialize(): SerializedConversation {
    return {
      id: this.id,
      history: this.history,
      type: this.type,
    };
  }
}

let instance: AiHistoryStorage|null = null;
export class AiHistoryStorage {
  #historySetting: Common.Settings.Setting<SerializedConversation[]>;
  #mutex = new Common.Mutex.Mutex();

  constructor() {
    // This should not throw as we should be creating the setting in the `-meta.ts` file
    this.#historySetting = Common.Settings.Settings.instance().createSetting('ai-assistance-history-entries', []);
  }

  clearForTest(): void {
    this.#historySetting.set([]);
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

  async deleteHistoryEntry(id: string): Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      const history = structuredClone(await this.#historySetting.forceGet());
      this.#historySetting.set(
          history.filter(entry => entry.id !== id),
      );
    } finally {
      release();
    }
  }

  async deleteAll(): Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      this.#historySetting.set([]);
    } finally {
      release();
    }
  }

  getHistory(): SerializedConversation[] {
    return structuredClone(this.#historySetting.get());
  }

  static instance(forceNew = false): AiHistoryStorage {
    if (!instance || forceNew) {
      instance = new AiHistoryStorage();
    }
    return instance;
  }
}
