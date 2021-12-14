/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

export interface HistoryEntry {
  valid(): boolean;

  reveal(): void;
}

export class SimpleHistoryManager {
  #entries: HistoryEntry[];
  #activeEntryIndex: number;
  #coalescingReadonly: number;
  readonly #historyDepth: number;
  constructor(historyDepth: number) {
    this.#entries = [];
    this.#activeEntryIndex = -1;

    // Lock is used to make sure that reveal() does not
    // make any changes to the history while we are
    // rolling back or rolling over.
    this.#coalescingReadonly = 0;
    this.#historyDepth = historyDepth;
  }

  private readOnlyLock(): void {
    ++this.#coalescingReadonly;
  }

  private releaseReadOnlyLock(): void {
    --this.#coalescingReadonly;
  }

  private getPreviousValidIndex(): number {
    if (this.empty()) {
      return -1;
    }

    let revealIndex = this.#activeEntryIndex - 1;
    while (revealIndex >= 0 && !this.#entries[revealIndex].valid()) {
      --revealIndex;
    }
    if (revealIndex < 0) {
      return -1;
    }

    return revealIndex;
  }

  private getNextValidIndex(): number {
    let revealIndex = this.#activeEntryIndex + 1;

    while (revealIndex < this.#entries.length && !this.#entries[revealIndex].valid()) {
      ++revealIndex;
    }
    if (revealIndex >= this.#entries.length) {
      return -1;
    }

    return revealIndex;
  }

  private readOnly(): boolean {
    return Boolean(this.#coalescingReadonly);
  }

  filterOut(filterOutCallback: (arg0: HistoryEntry) => boolean): void {
    if (this.readOnly()) {
      return;
    }
    const filteredEntries = [];
    let removedBeforeActiveEntry = 0;
    for (let i = 0; i < this.#entries.length; ++i) {
      if (!filterOutCallback(this.#entries[i])) {
        filteredEntries.push(this.#entries[i]);
      } else if (i <= this.#activeEntryIndex) {
        ++removedBeforeActiveEntry;
      }
    }
    this.#entries = filteredEntries;
    this.#activeEntryIndex = Math.max(0, this.#activeEntryIndex - removedBeforeActiveEntry);
  }

  empty(): boolean {
    return !this.#entries.length;
  }

  active(): HistoryEntry|null {
    return this.empty() ? null : this.#entries[this.#activeEntryIndex];
  }

  push(entry: HistoryEntry): void {
    if (this.readOnly()) {
      return;
    }
    if (!this.empty()) {
      this.#entries.splice(this.#activeEntryIndex + 1);
    }
    this.#entries.push(entry);
    if (this.#entries.length > this.#historyDepth) {
      this.#entries.shift();
    }
    this.#activeEntryIndex = this.#entries.length - 1;
  }

  canRollback(): boolean {
    return this.getPreviousValidIndex() >= 0;
  }

  canRollover(): boolean {
    return this.getNextValidIndex() >= 0;
  }

  rollback(): boolean {
    const revealIndex = this.getPreviousValidIndex();
    if (revealIndex === -1) {
      return false;
    }
    this.readOnlyLock();
    this.#activeEntryIndex = revealIndex;
    this.#entries[revealIndex].reveal();
    this.releaseReadOnlyLock();

    return true;
  }

  rollover(): boolean {
    const revealIndex = this.getNextValidIndex();
    if (revealIndex === -1) {
      return false;
    }

    this.readOnlyLock();
    this.#activeEntryIndex = revealIndex;
    this.#entries[revealIndex].reveal();
    this.releaseReadOnlyLock();

    return true;
  }
}
