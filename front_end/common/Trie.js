// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Common.Trie = class {
  constructor() {
    this.clear();
  }

  /**
   * @param {string} word
   */
  add(word) {
    var node = this._root;
    ++this._wordsInSubtree[this._root];
    for (var i = 0; i < word.length; ++i) {
      var edge = word[i];
      var next = this._edges[node][edge];
      if (!next) {
        if (this._freeNodes.length) {
          // No need to reset any fields since they were properly cleaned up in remove().
          next = this._freeNodes.pop();
        } else {
          next = this._size++;
          this._isWord.push(false);
          this._wordsInSubtree.push(0);
          this._edges.push({__proto__: null});
        }
        this._edges[node][edge] = next;
      }
      ++this._wordsInSubtree[next];
      node = next;
    }
    this._isWord[node] = true;
  }

  /**
   * @param {string} word
   * @return {boolean}
   */
  remove(word) {
    if (!this.has(word))
      return false;
    var node = this._root;
    --this._wordsInSubtree[this._root];
    for (var i = 0; i < word.length; ++i) {
      var edge = word[i];
      var next = this._edges[node][edge];
      if (!--this._wordsInSubtree[next]) {
        delete this._edges[node][edge];
        this._freeNodes.push(next);
      }
      node = next;
    }
    this._isWord[node] = false;
    return true;
  }

  /**
   * @param {string} word
   * @return {boolean}
   */
  has(word) {
    var node = this._root;
    for (var i = 0; i < word.length; ++i) {
      node = this._edges[node][word[i]];
      if (!node)
        return false;
    }
    return this._isWord[node];
  }

  /**
   * @param {string=} prefix
   * @return {!Array<string>}
   */
  words(prefix) {
    prefix = prefix || '';
    var node = this._root;
    for (var i = 0; i < prefix.length; ++i) {
      node = this._edges[node][prefix[i]];
      if (!node)
        return [];
    }
    var results = [];
    this._dfs(node, prefix, results);
    return results;
  }

  /**
   * @param {number} node
   * @param {string} prefix
   * @param {!Array<string>} results
   */
  _dfs(node, prefix, results) {
    if (this._isWord[node])
      results.push(prefix);
    var edges = this._edges[node];
    for (var edge in edges)
      this._dfs(edges[edge], prefix + edge, results);
  }

  /**
   * @param {string} word
   * @param {boolean} fullWordOnly
   * @return {string}
   */
  longestPrefix(word, fullWordOnly) {
    var node = this._root;
    var wordIndex = 0;
    for (var i = 0; i < word.length; ++i) {
      node = this._edges[node][word[i]];
      if (!node)
        break;
      if (!fullWordOnly || this._isWord[node])
        wordIndex = i + 1;
    }
    return word.substring(0, wordIndex);
  }

  clear() {
    this._size = 1;
    this._root = 0;
    /** @type {!Array<!Object<string, number>>} */
    this._edges = [{__proto__: null}];
    /** @type {!Array<boolean>} */
    this._isWord = [false];
    /** @type {!Array<number>} */
    this._wordsInSubtree = [0];
    /** @type {!Array<number>} */
    this._freeNodes = [];
  }
};
