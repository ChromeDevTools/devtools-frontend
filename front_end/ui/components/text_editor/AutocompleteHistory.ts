// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';

export class AutocompleteHistory {
  static #historySize = 300;

  #setting: Common.Settings.Setting<string[]>;

  /**
   * The data mirrors the setting. We have the mirror for 2 reasons:
   *   1) The setting is size limited
   *   2) We track the user's current input, even though it's not committed yet.
   */
  #data: string[] = [];

  /** 1-based entry in the history stack. */
  #historyOffset: number = 1;
  #uncommittedIsTop: boolean = false;

  /**
   * Creates a new settings-backed history. The class assumes it has sole
   * ownership of the setting.
   */
  constructor(setting: Common.Settings.Setting<string[]>) {
    this.#setting = setting;
    this.#data = this.#setting.get();
  }

  clear(): void {
    this.#data = [];
    this.#setting.set([]);
    this.#historyOffset = 1;
  }

  /**
   * Pushes a committed text into the history.
   */
  pushHistoryItem(text: string): void {
    if (this.#uncommittedIsTop) {
      this.#data.pop();
      this.#uncommittedIsTop = false;
    }

    this.#historyOffset = 1;
    if (text !== this.#currentHistoryItem()) {
      this.#data.push(text);
    }
    this.#store();
  }

  /**
   * Pushes the current (uncommitted) text into the history.
   */
  #pushCurrentText(currentText: string): void {
    if (this.#uncommittedIsTop) {
      this.#data.pop();
    }  // Throw away obsolete uncommitted text.
    this.#uncommittedIsTop = true;
    this.#data.push(currentText);
  }

  previous(currentText: string): string|undefined {
    if (this.#historyOffset > this.#data.length) {
      return undefined;
    }
    if (this.#historyOffset === 1) {
      this.#pushCurrentText(currentText);
    }
    ++this.#historyOffset;
    return this.#currentHistoryItem();
  }

  next(): string|undefined {
    if (this.#historyOffset === 1) {
      return undefined;
    }
    --this.#historyOffset;
    return this.#currentHistoryItem();
  }

  /** Returns a de-duplicated list of history entries that start with the specified prefix */
  matchingEntries(prefix: string, limit = 50): Set<string> {
    const result = new Set<string>();
    for (let i = this.#data.length - 1; i >= 0 && result.size < limit; --i) {
      const entry = this.#data[i];
      if (entry.startsWith(prefix)) {
        result.add(entry);
      }
    }
    return result;
  }

  #currentHistoryItem(): string|undefined {
    return this.#data[this.#data.length - this.#historyOffset];
  }

  #store(): void {
    this.#setting.set(this.#data.slice(-AutocompleteHistory.#historySize));
  }
}
