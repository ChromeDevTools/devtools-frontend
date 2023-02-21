// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class AutocompleteHistory {
  #data: string[] = [];
  /** 1-based entry in the history stack. */
  #historyOffset: number = 1;
  #uncommittedIsTop: boolean = false;

  historyData(): string[] {
    return this.#data;
  }

  setHistoryData(data: string[]): void {
    this.#data = data.slice();
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
    if (text === this.#currentHistoryItem()) {
      return;
    }
    this.#data.push(text);
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

  #currentHistoryItem(): string|undefined {
    return this.#data[this.#data.length - this.#historyOffset];
  }
}
