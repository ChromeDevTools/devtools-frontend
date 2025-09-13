// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TextUtils from '../../../models/text_utils/text_utils.js';

export class RangeWalker {
  #offset = 0;
  readonly #treeWalker: TreeWalker;
  #eof: boolean;

  constructor(readonly root: Node) {
    this.#treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    this.#eof = !this.#treeWalker.firstChild();
  }

  #next(): boolean {
    this.#offset += this.#treeWalker.currentNode.textContent?.length ?? 0;
    this.#eof = !this.#treeWalker.nextNode();
    return !this.#eof;
  }

  #goToPosition(offset: number): Node|null {
    if (offset < this.#offset || this.#eof) {
      return null;
    }
    // `>` here implies that, except for the first range, start offsets are left-leaning, i.e., when the offset falls
    // between two text nodes, the preceding one is returned. This doesn't matter for Range semantics, but isn't
    // intuitive wrt. the usual understanding of intervals. Making start offsets right-leaning but end offsets
    // left-leaning would incur an unwarranted amount of complexity.
    while (offset > this.#offset + (this.#treeWalker.currentNode.textContent?.length ?? 0)) {
      if (!this.#next()) {
        return null;
      }
    }
    return this.#treeWalker.currentNode;
  }

  nextRange(start: number, length: number): Range|null {
    if (length <= 0 || this.#eof) {
      return null;
    }

    const startNode = this.#goToPosition(start);
    if (!startNode) {
      return null;
    }
    const offsetInStartNode = start - this.#offset;
    const endNode = this.#goToPosition(start + length);
    if (!endNode) {
      return null;
    }
    const offsetInEndNode = start + length - this.#offset;

    const range = new Range();
    range.setStart(startNode, offsetInStartNode);
    range.setEnd(endNode, offsetInEndNode);
    return range;
  }
}

export const HIGHLIGHT_REGISTRY = 'highlighted-search-result';
export const CURRENT_HIGHLIGHT_REGISTRY = 'current-search-result';

let highlightManagerInstance: HighlightManager;
export class HighlightManager {
  #highlights = new Highlight();
  #currentHighlights = new Highlight();

  constructor() {
    CSS.highlights.set(HIGHLIGHT_REGISTRY, this.#highlights);
    CSS.highlights.set(CURRENT_HIGHLIGHT_REGISTRY, this.#currentHighlights);
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): HighlightManager {
    const {forceNew} = opts;
    if (!highlightManagerInstance || forceNew) {
      highlightManagerInstance = new HighlightManager();
    }

    return highlightManagerInstance;
  }

  addHighlights(ranges: Range[]): void {
    ranges.forEach(this.addHighlight.bind(this));
  }

  removeHighlights(ranges: Range[]): void {
    ranges.forEach(this.removeHighlight.bind(this));
  }

  addCurrentHighlight(range: Range): void {
    this.#currentHighlights.add(range);
  }

  addCurrentHighlights(ranges: Range[]): void {
    ranges.forEach(this.addCurrentHighlight.bind(this));
  }

  addHighlight(range: Range): void {
    this.#highlights.add(range);
  }

  removeHighlight(range: Range): void {
    this.#highlights.delete(range);
    this.#currentHighlights.delete(range);
  }

  highlightOrderedTextRanges(root: Node, sourceRanges: TextUtils.TextRange.SourceRange[], isCurrent = false): Range[] {
    const rangeWalker = new RangeWalker(root);
    const ranges = sourceRanges.map(range => rangeWalker.nextRange(range.offset, range.length))
                       .filter((r): r is Range => r !== null && !r.collapsed);
    if (isCurrent) {
      this.addCurrentHighlights(ranges);
    } else {
      this.addHighlights(ranges);
    }
    return ranges;
  }
}
