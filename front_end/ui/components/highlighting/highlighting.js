var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/highlighting/HighlightElement.js
import * as TextUtils2 from "./../../../models/text_utils/text_utils.js";

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

// gen/front_end/ui/components/highlighting/MarkupHighlight.js
import * as TextUtils from "./../../../models/text_utils/text_utils.js";
var highlightedSearchResultClassName = "highlighted-search-result";
var highlightedCurrentSearchResultClassName = "current-search-result";
function highlightRangesWithStyleClass(element, resultRanges, styleClass, changes) {
  changes = changes || [];
  const highlightNodes = [];
  const textNodes = element.childTextNodes();
  const lineText = textNodes.map(function(node) {
    return node.textContent;
  }).join("");
  const ownerDocument = element.ownerDocument;
  if (textNodes.length === 0) {
    return highlightNodes;
  }
  const nodeRanges = [];
  let rangeEndOffset = 0;
  for (const textNode of textNodes) {
    const range = new TextUtils.TextRange.SourceRange(rangeEndOffset, textNode.textContent ? textNode.textContent.length : 0);
    rangeEndOffset = range.offset + range.length;
    nodeRanges.push(range);
  }
  let startIndex = 0;
  for (let i = 0; i < resultRanges.length; ++i) {
    const startOffset = resultRanges[i].offset;
    const endOffset = startOffset + resultRanges[i].length;
    while (startIndex < textNodes.length && nodeRanges[startIndex].offset + nodeRanges[startIndex].length <= startOffset) {
      startIndex++;
    }
    let endIndex = startIndex;
    while (endIndex < textNodes.length && nodeRanges[endIndex].offset + nodeRanges[endIndex].length < endOffset) {
      endIndex++;
    }
    if (endIndex === textNodes.length) {
      break;
    }
    const highlightNode = ownerDocument.createElement("span");
    highlightNode.className = styleClass;
    highlightNode.textContent = lineText.substring(startOffset, endOffset);
    const lastTextNode = textNodes[endIndex];
    const lastText = lastTextNode.textContent || "";
    lastTextNode.textContent = lastText.substring(endOffset - nodeRanges[endIndex].offset);
    changes.push({
      node: lastTextNode,
      type: "changed",
      oldText: lastText,
      newText: lastTextNode.textContent,
      nextSibling: void 0,
      parent: void 0
    });
    if (startIndex === endIndex && lastTextNode.parentElement) {
      lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
      changes.push({
        node: highlightNode,
        type: "added",
        nextSibling: lastTextNode,
        parent: lastTextNode.parentElement,
        oldText: void 0,
        newText: void 0
      });
      highlightNodes.push(highlightNode);
      const prefixNode = ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
      lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
      changes.push({
        node: prefixNode,
        type: "added",
        nextSibling: highlightNode,
        parent: lastTextNode.parentElement,
        oldText: void 0,
        newText: void 0
      });
    } else {
      const firstTextNode = textNodes[startIndex];
      const firstText = firstTextNode.textContent || "";
      const anchorElement = firstTextNode.nextSibling;
      if (firstTextNode.parentElement) {
        firstTextNode.parentElement.insertBefore(highlightNode, anchorElement);
        changes.push({
          node: highlightNode,
          type: "added",
          nextSibling: anchorElement || void 0,
          parent: firstTextNode.parentElement,
          oldText: void 0,
          newText: void 0
        });
        highlightNodes.push(highlightNode);
      }
      firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
      changes.push({
        node: firstTextNode,
        type: "changed",
        oldText: firstText,
        newText: firstTextNode.textContent,
        nextSibling: void 0,
        parent: void 0
      });
      for (let j = startIndex + 1; j < endIndex; j++) {
        const textNode = textNodes[j];
        const text = textNode.textContent;
        textNode.textContent = "";
        changes.push({
          node: textNode,
          type: "changed",
          oldText: text || void 0,
          newText: textNode.textContent,
          nextSibling: void 0,
          parent: void 0
        });
      }
    }
    startIndex = endIndex;
    nodeRanges[startIndex].offset = endOffset;
    nodeRanges[startIndex].length = lastTextNode.textContent.length;
  }
  return highlightNodes;
}
function revertDomChanges(domChanges) {
  for (let i = domChanges.length - 1; i >= 0; --i) {
    const entry = domChanges[i];
    switch (entry.type) {
      case "added":
        entry.node.remove();
        break;
      case "changed":
        entry.node.textContent = entry.oldText ?? null;
        break;
    }
  }
}

// gen/front_end/ui/components/highlighting/HighlightElement.js
var HighlightElement = class extends HTMLElement {
  static observedAttributes = ["ranges", "current-range", "type"];
  #ranges = [];
  #currentRange;
  #type = "css";
  #markupChanges = [];
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
      case "type":
        this.#type = newValue || "css";
        break;
    }
    queueMicrotask(() => {
      if (this.#type === "css") {
        HighlightManager.instance().set(this, this.#ranges, this.#currentRange);
      } else {
        revertDomChanges(this.#markupChanges);
        highlightRangesWithStyleClass(this, this.#ranges, "highlight", this.#markupChanges);
      }
    });
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
    return new TextUtils2.TextRange.SourceRange(parts[0], parts[1]);
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
      merged[merged.length - 1] = new TextUtils2.TextRange.SourceRange(last.offset, newLength);
    } else {
      merged.push(current);
    }
  }
  return merged;
}
customElements.define("devtools-highlight", HighlightElement);
export {
  HighlightManager_exports as HighlightManager,
  highlightRangesWithStyleClass,
  highlightedCurrentSearchResultClassName,
  highlightedSearchResultClassName,
  revertDomChanges
};
//# sourceMappingURL=highlighting.js.map
