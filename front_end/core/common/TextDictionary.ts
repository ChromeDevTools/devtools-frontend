// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Trie} from './Trie.js';

export class TextDictionary {
  readonly words = new Map<string, number>();
  readonly index = Trie.newStringTrie();

  addWord(word: string): void {
    let count = this.words.get(word) || 0;
    ++count;
    this.words.set(word, count);
    this.index.add(word);
  }

  removeWord(word: string): void {
    let count = this.words.get(word) || 0;
    if (!count) {
      return;
    }
    if (count === 1) {
      this.words.delete(word);
      this.index.remove(word);
      return;
    }
    --count;
    this.words.set(word, count);
  }

  wordsWithPrefix(prefix: string): string[] {
    return this.index.words(prefix);
  }

  hasWord(word: string): boolean {
    return this.words.has(word);
  }

  wordCount(word: string): number {
    return this.words.get(word) || 0;
  }

  reset(): void {
    this.words.clear();
    this.index.clear();
  }
}
