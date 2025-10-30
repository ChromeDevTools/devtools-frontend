var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/highlighting/HighlightElement.js
import * as TextUtils from "./../../../models/text_utils/text_utils.js";

// gen/front_end/ui/components/highlighting/HighlightManager.js
var HighlightManager_exports = {};
__export(HighlightManager_exports, {
  CURRENT_HIGHLIGHT_REGISTRY: () => CURRENT_HIGHLIGHT_REGISTRY,
  HIGHLIGHT_REGISTRY: () => HIGHLIGHT_REGISTRY,
  HighlightManager: () => HighlightManager,
  RangeWalker: () => RangeWalker
});
var RangeWalker = class {
  root;
  #offset = 0;
  #treeWalker;
  #eof;
  constructor(root) {
    this.root = root;
    const nodeFilter = {
      acceptNode(node) {
        if (["STYLE", "SCRIPT"].includes(node.parentNode?.nodeName ?? "")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    };
    this.#treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, nodeFilter);
    this.#eof = !this.#treeWalker.firstChild();
  }
  #next() {
    this.#offset += this.#treeWalker.currentNode.textContent?.length ?? 0;
    this.#eof = !this.#treeWalker.nextNode();
    return !this.#eof;
  }
  #goToPosition(offset) {
    if (offset < this.#offset || this.#eof) {
      return null;
    }
    while (offset > this.#offset + (this.#treeWalker.currentNode.textContent?.length ?? 0)) {
      if (!this.#next()) {
        return null;
      }
    }
    return this.#treeWalker.currentNode;
  }
  nextRange(start, length) {
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
  goToTextNode(node) {
    while (this.#treeWalker.currentNode !== node) {
      if (!this.#next()) {
        return;
      }
    }
  }
  get offset() {
    return this.#offset;
  }
};
var HIGHLIGHT_REGISTRY = "highlighted-search-result";
var CURRENT_HIGHLIGHT_REGISTRY = "current-search-result";
var highlightManagerInstance;
var HighlightManager = class _HighlightManager {
  #highlights = new Highlight();
  #currentHighlights = new Highlight();
  #stateByNode = /* @__PURE__ */ new WeakMap();
  constructor() {
    CSS.highlights.set(HIGHLIGHT_REGISTRY, this.#highlights);
    CSS.highlights.set(CURRENT_HIGHLIGHT_REGISTRY, this.#currentHighlights);
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!highlightManagerInstance || forceNew) {
      highlightManagerInstance = new _HighlightManager();
    }
    return highlightManagerInstance;
  }
  addHighlights(ranges) {
    ranges.forEach(this.addHighlight.bind(this));
  }
  removeHighlights(ranges) {
    ranges.forEach(this.removeHighlight.bind(this));
  }
  addCurrentHighlight(range) {
    this.#currentHighlights.add(range);
  }
  addCurrentHighlights(ranges) {
    ranges.forEach(this.addCurrentHighlight.bind(this));
  }
  addHighlight(range) {
    this.#highlights.add(range);
  }
  removeHighlight(range) {
    this.#highlights.delete(range);
    this.#currentHighlights.delete(range);
  }
  highlightOrderedTextRanges(root, sourceRanges, isCurrent = false) {
    const rangeWalker = new RangeWalker(root);
    const ranges = sourceRanges.map((range) => rangeWalker.nextRange(range.offset, range.length)).filter((r) => r !== null && !r.collapsed);
    if (isCurrent) {
      this.addCurrentHighlights(ranges);
    } else {
      this.addHighlights(ranges);
    }
    return ranges;
  }
  #getOrCreateState(node) {
    let state = this.#stateByNode.get(node);
    if (!state) {
      state = {
        activeRanges: [],
        ranges: [],
        currentRange: void 0
      };
      this.#stateByNode.set(node, state);
    }
    return state;
  }
  apply(node) {
    const state = this.#getOrCreateState(node);
    this.removeHighlights(state.activeRanges);
    state.activeRanges = this.highlightOrderedTextRanges(node, state.ranges);
    if (state.currentRange) {
      state.activeRanges.push(...this.highlightOrderedTextRanges(
        node,
        [state.currentRange],
        /* isCurrent=*/
        true
      ));
    }
  }
  set(element, ranges, currentRange) {
    const state = this.#getOrCreateState(element);
    state.ranges = ranges;
    state.currentRange = currentRange;
    this.apply(element);
  }
};

// gen/front_end/ui/components/highlighting/HighlightElement.js
var HighlightElement = class extends HTMLElement {
  static observedAttributes = ["ranges", "current-range"];
  #ranges = [];
  #currentRange;
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    switch (name) {
      case "ranges":
        this.#ranges = parseRanges(newValue);
        break;
      case "current-range":
        this.#currentRange = parseRanges(newValue)[0];
        break;
    }
    HighlightManager.instance().set(this, this.#ranges, this.#currentRange);
  }
};
function parseRanges(value) {
  if (!value) {
    return [];
  }
  const ranges = value.split(" ").filter((rangeString) => {
    const parts = rangeString.split(",");
    if (parts.length !== 2) {
      return false;
    }
    const num1 = Number(parts[0]);
    const num2 = Number(parts[1]);
    return !isNaN(num1) && !isNaN(num2);
  }).map((rangeString) => {
    const parts = rangeString.split(",").map((part) => Number(part));
    return new TextUtils.TextRange.SourceRange(parts[0], parts[1]);
  });
  return sortAndMergeRanges(ranges);
}
function sortAndMergeRanges(ranges) {
  ranges.sort((a, b) => a.offset - b.offset);
  if (ranges.length === 0) {
    return [];
  }
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    const current = ranges[i];
    if (current.offset <= last.offset + last.length) {
      const newEnd = Math.max(last.offset + last.length, current.offset + current.length);
      const newLength = newEnd - last.offset;
      merged[merged.length - 1] = new TextUtils.TextRange.SourceRange(last.offset, newLength);
    } else {
      merged.push(current);
    }
  }
  return merged;
}
customElements.define("devtools-highlight", HighlightElement);
export {
  HighlightManager_exports as HighlightManager
};
//# sourceMappingURL=highlighting.js.map
