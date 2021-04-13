// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

export class Trie {
  _size!: number;
  _root: number;
  _edges!: {
    [x: string]: number,
  }[];
  _isWord!: boolean[];
  _wordsInSubtree!: number[];
  _freeNodes!: number[];
  constructor() {
    this._root = 0;

    this.clear();
  }

  add(word: string): void {
    let node: number = this._root;
    ++this._wordsInSubtree[this._root];
    for (let i = 0; i < word.length; ++i) {
      const edge = word[i];
      let next: number = this._edges[node][edge];
      if (!next) {
        if (this._freeNodes.length) {
          next = (this._freeNodes.pop() as number);
        } else {
          next = this._size++;
          this._isWord.push(false);
          this._wordsInSubtree.push(0);
          // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this._edges.push(({__proto__: null} as any));
        }
        this._edges[node][edge] = next;
      }
      ++this._wordsInSubtree[next];
      node = next;
    }
    this._isWord[node] = true;
  }

  remove(word: string): boolean {
    if (!this.has(word)) {
      return false;
    }
    let node: number = this._root;
    --this._wordsInSubtree[this._root];
    for (let i = 0; i < word.length; ++i) {
      const edge = word[i];
      const next = this._edges[node][edge];
      if (!--this._wordsInSubtree[next]) {
        delete this._edges[node][edge];
        this._freeNodes.push(next);
      }
      node = next;
    }
    this._isWord[node] = false;
    return true;
  }

  has(word: string): boolean {
    let node: number = this._root;
    for (let i = 0; i < word.length; ++i) {
      node = this._edges[node][word[i]];
      if (!node) {
        return false;
      }
    }
    return this._isWord[node];
  }

  words(prefix?: string): string[] {
    prefix = prefix || '';
    let node: number = this._root;
    for (let i = 0; i < prefix.length; ++i) {
      node = this._edges[node][prefix[i]];
      if (!node) {
        return [];
      }
    }
    const results: string[] = [];
    this._dfs(node, prefix, results);
    return results;
  }

  _dfs(node: number, prefix: string, results: string[]): void {
    if (this._isWord[node]) {
      results.push(prefix);
    }
    const edges = this._edges[node];
    for (const edge in edges) {
      this._dfs(edges[edge], prefix + edge, results);
    }
  }

  longestPrefix(word: string, fullWordOnly: boolean): string {
    let node: number = this._root;
    let wordIndex = 0;
    for (let i = 0; i < word.length; ++i) {
      node = this._edges[node][word[i]];
      if (!node) {
        break;
      }
      if (!fullWordOnly || this._isWord[node]) {
        wordIndex = i + 1;
      }
    }
    return word.substring(0, wordIndex);
  }

  clear(): void {
    this._size = 1;
    this._root = 0;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._edges = [({__proto__: null} as any)];
    this._isWord = [false];
    this._wordsInSubtree = [0];
    this._freeNodes = [];
  }
}
