// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Extracts the element type of an array like, eg:
// ElementType<number[]> -> number
// ElementTYpe<string> -> string
type ElementType<T extends ArrayLike<unknown>> = T extends ArrayLike<infer E>? E : never;

// Abstracts some generic operations that have different implementions depending
// on whether we operate on strings or array of things.
interface TrieableTrait<T extends ArrayLike<ElementType<T>>> {
  empty(): T;
  append(base: T, appendage: ElementType<T>): T;
  slice(base: T, start: number, end: number): T;
}

export class Trie<T extends ArrayLike<ElementType<T>>> {
  #size!: number;
  #root: number;
  #edges!: Map<ElementType<T>, number>[];
  #isWord!: boolean[];
  #wordsInSubtree!: number[];
  #freeNodes!: number[];
  #traitImpl: TrieableTrait<T>;

  constructor(traitImpl: TrieableTrait<T>) {
    this.#root = 0;
    this.#traitImpl = traitImpl;
    this.clear();
  }

  static newStringTrie(): Trie<string> {
    return new Trie<string>({
      empty: () => '',
      append: (base, appendage) => base + appendage,
      slice: (base, start, end) => base.slice(start, end),
    });
  }

  static newArrayTrie<T extends ElementType<T>[]>(): Trie<ElementType<T>[]> {
    return new Trie<ElementType<T>[]>({
      empty: () => [],
      append: (base, appendage) => base.concat([appendage]),
      slice: (base, start, end) => base.slice(start, end),
    });
  }

  add(word: T): void {
    let node: number = this.#root;
    ++this.#wordsInSubtree[this.#root];
    for (let i = 0; i < word.length; ++i) {
      const edge = word[i];
      let next = this.#edges[node].get(edge);
      if (!next) {
        if (this.#freeNodes.length) {
          next = (this.#freeNodes.pop() as number);
        } else {
          next = this.#size++;
          this.#isWord.push(false);
          this.#wordsInSubtree.push(0);
          this.#edges.push(new Map());
        }
        this.#edges[node].set(edge, next);
      }
      ++this.#wordsInSubtree[next];
      node = next;
    }
    this.#isWord[node] = true;
  }

  remove(word: T): boolean {
    if (!this.has(word)) {
      return false;
    }
    let node: number = this.#root;
    --this.#wordsInSubtree[this.#root];
    for (let i = 0; i < word.length; ++i) {
      const edge = word[i];
      const next = this.#edges[node].get(edge) as number;
      if (!--this.#wordsInSubtree[next]) {
        this.#edges[node].delete(edge);
        this.#freeNodes.push(next);
      }
      node = next;
    }
    this.#isWord[node] = false;
    return true;
  }

  has(word: T): boolean {
    let node: number|undefined = this.#root;
    for (let i = 0; i < word.length; ++i) {
      node = this.#edges[node].get(word[i]);
      if (!node) {
        return false;
      }
    }
    return this.#isWord[node];
  }

  words(prefix?: T): T[] {
    prefix = prefix ?? this.#traitImpl.empty();
    let node: number|undefined = this.#root;
    for (let i = 0; i < prefix.length; ++i) {
      node = this.#edges[node].get(prefix[i]);
      if (!node) {
        return [];
      }
    }
    const results: T[] = [];
    this.dfs(node, prefix, results);
    return results;
  }

  private dfs(node: number, prefix: T, results: T[]): void {
    if (this.#isWord[node]) {
      results.push(prefix);
    }
    const edges = this.#edges[node];
    for (const [edge, node] of edges) {
      const newPrefix = this.#traitImpl.append(prefix, edge);
      this.dfs(node, newPrefix, results);
    }
  }

  longestPrefix(word: T, fullWordOnly: boolean): T {
    let node: number|undefined = this.#root;
    let wordIndex = 0;
    for (let i = 0; i < word.length; ++i) {
      node = this.#edges[node].get(word[i]);
      if (!node) {
        break;
      }
      if (!fullWordOnly || this.#isWord[node]) {
        wordIndex = i + 1;
      }
    }
    return this.#traitImpl.slice(word, 0, wordIndex);
  }

  clear(): void {
    this.#size = 1;
    this.#root = 0;
    this.#edges = [new Map()];
    this.#isWord = [false];
    this.#wordsInSubtree = [0];
    this.#freeNodes = [];
  }
}
