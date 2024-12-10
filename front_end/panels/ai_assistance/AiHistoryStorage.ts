
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import type {SerializedAgent} from './agents/AiAgent.js';

let instance: AiHistoryStorage|null = null;
export class AiHistoryStorage {
  #historySetting: Common.Settings.Setting<SerializedAgent[]>;
  #mutex = new Common.Mutex.Mutex();

  constructor() {
    // This should not throw as we should be creating the setting in the `-meta.ts` file
    this.#historySetting = Common.Settings.Settings.instance().moduleSetting('ai-assistance-history-entries');
  }

  clearForTest(): void {
    this.#historySetting.set([]);
  }

  async upsertHistoryEntry(agentEntry: SerializedAgent): Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      const history = await this.#historySetting.forceGet();
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
      const history = await this.#historySetting.forceGet();
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

  getHistory(): SerializedAgent[] {
    return this.#historySetting.get();
  }

  static instance(): AiHistoryStorage {
    if (!instance) {
      instance = new AiHistoryStorage();
    }
    return instance;
  }
}
