var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/ui/comments/CommentAnchorResolver.ts
var CommentAnchorResolver_exports = {};
__export(CommentAnchorResolver_exports, {
  COMMENT_THREAD_UI_SELECTOR: () => COMMENT_THREAD_UI_SELECTOR,
  clearCustomAnchorResolversForTest: () => clearCustomAnchorResolversForTest,
  closestAcrossShadow: () => closestAcrossShadow,
  computeVisibleRect: () => computeVisibleRect,
  deepQuerySelector: () => deepQuerySelector,
  deepQuerySelectorAll: () => deepQuerySelectorAll,
  extractVeName: () => extractVeName,
  getCustomAnchorResolverForElement: () => getCustomAnchorResolverForElement,
  getEditorFilePath: () => getEditorFilePath,
  getSiblingIndex: () => getSiblingIndex,
  isDomTrackedAnchor: () => isDomTrackedAnchor,
  isElementVisible: () => isElementVisible,
  isNonEmptyItem: () => isNonEmptyItem,
  isTabTitle: () => isTabTitle,
  matchesVePath: () => matchesVePath,
  registerCustomAnchorResolver: () => registerCustomAnchorResolver,
  rematchCommentAnchor: () => rematchCommentAnchor,
  resolveCommentAnchor: () => resolveCommentAnchor,
  resolveCommentAnchorElement: () => resolveCommentAnchorElement,
  unregisterCustomAnchorResolver: () => unregisterCustomAnchorResolver
});
import * as CodeMirror from "../../third_party/codemirror.next/codemirror.next.js";
import * as VisualLogging from "../visual_logging/visual_logging.js";
var DISALLOWED_COMMENT_TARGETS = /* @__PURE__ */ new Set([
  // Top-level containers & layout structures
  VisualLogging.VisualElements.Panel,
  VisualLogging.VisualElements.Drawer,
  VisualLogging.VisualElements.Pane,
  VisualLogging.VisualElements.Tree,
  VisualLogging.VisualElements.PanelTabHeader,
  VisualLogging.VisualElements.Resizer,
  VisualLogging.VisualElements.Menu,
  // Minor controls and toolbars
  VisualLogging.VisualElements.Action,
  VisualLogging.VisualElements.Toggle,
  VisualLogging.VisualElements.Close,
  VisualLogging.VisualElements.Expand,
  VisualLogging.VisualElements.ToggleSubpane,
  VisualLogging.VisualElements.Toolbar
]);
var COMMENT_THREAD_UI_SELECTOR = ".comment-thread-widget";
function closestAcrossShadow(element, selector) {
  let current = element;
  while (current) {
    if (current.matches(selector)) {
      return current;
    }
    current = current.parentElementOrShadowHost();
  }
  return null;
}
function isCodeMirrorEditor(element) {
  return element.classList.contains("cm-editor");
}
function getEditorFilePath(element) {
  return element.getAttribute("data-file-path") ?? void 0;
}
function isDomTrackedAnchor(anchor) {
  return !anchor.timeline;
}
var customAnchorResolvers = /* @__PURE__ */ new Set();
function registerCustomAnchorResolver(resolver) {
  customAnchorResolvers.add(resolver);
}
function unregisterCustomAnchorResolver(resolver) {
  customAnchorResolvers.delete(resolver);
}
function clearCustomAnchorResolversForTest() {
  customAnchorResolvers.clear();
}
function getCustomAnchorResolverForElement(element) {
  for (const resolver of customAnchorResolvers) {
    if (resolver.matches(element)) {
      return resolver;
    }
  }
  return null;
}
function isNonEmptyItem(element) {
  return element.deepTextContent().trim().length > 0;
}
function isTabTitle(element) {
  let current = element;
  while (current) {
    if (VisualLogging.needsLogging(current)) {
      try {
        const config = VisualLogging.getLoggingConfig(current);
        if (config.ve === VisualLogging.VisualElements.PanelTabHeader) {
          return true;
        }
      } catch {
      }
    }
    const role = current.getAttribute("role");
    if (role === "tab") {
      return true;
    }
    if (current.classList.contains("tab-element") || current.classList.contains("tab-header")) {
      return true;
    }
    current = current.parentElementOrShadowHost();
  }
  return false;
}
function resolveCodeMirrorLineInfo(element) {
  const cmEditor = element.closest(".cm-editor");
  if (!cmEditor) {
    return null;
  }
  const view = CodeMirror.EditorView.findFromDOM(cmEditor);
  if (!view) {
    throw new Error("Could not find CodeMirror EditorView from .cm-editor element");
  }
  const doc = view.state.doc;
  const gutterEl = element.closest(".cm-gutterElement");
  if (gutterEl) {
    const rawText = gutterEl.textContent?.trim() || "";
    if (rawText.length > 0 && /^\d+$/.test(rawText)) {
      const lineNum = parseInt(rawText, 10);
      if (lineNum > 0 && lineNum <= doc.lines) {
        const line = doc.line(lineNum);
        const textSignature = line.text.trim();
        return textSignature ? { lineNumber: line.number, textSignature } : null;
      }
    }
    return null;
  }
  const cmLine = element.classList.contains("cm-line") ? element : element.closest(".cm-line");
  if (cmLine) {
    try {
      const pos = view.posAtDOM(cmLine);
      const line = doc.lineAt(pos);
      const textSignature = line.text.trim();
      return textSignature ? { lineNumber: line.number, textSignature } : null;
    } catch {
      return null;
    }
  }
  return null;
}
function resolveCommentAnchorElement(element, options) {
  if (isTabTitle(element) || closestAcrossShadow(element, COMMENT_THREAD_UI_SELECTOR)) {
    return null;
  }
  const customResolver = getCustomAnchorResolverForElement(element);
  if (customResolver) {
    const result = customResolver.resolve(element, options);
    if (!result) {
      return null;
    }
    return result.anchorElement ?? element;
  }
  const cmEditor = element.closest(".cm-editor");
  if (cmEditor) {
    const lineInfo = resolveCodeMirrorLineInfo(element);
    if (!lineInfo) {
      return null;
    }
    return cmEditor;
  }
  const domainElement = closestAcrossShadow(element, "[data-network-request-id], [data-backend-node-id]");
  if (domainElement) {
    return isNonEmptyItem(domainElement) ? domainElement : null;
  }
  let target = element;
  let fallbackCandidate = null;
  while (target) {
    if (VisualLogging.needsLogging(target)) {
      try {
        const config = VisualLogging.getLoggingConfig(target);
        if (config.ve === VisualLogging.VisualElements.TableRow || config.ve === VisualLogging.VisualElements.TreeItem) {
          return isNonEmptyItem(target) ? target : null;
        }
        if (!fallbackCandidate && !DISALLOWED_COMMENT_TARGETS.has(config.ve)) {
          fallbackCandidate = target;
        }
      } catch {
      }
    }
    target = target.parentElementOrShadowHost();
  }
  if (fallbackCandidate && isNonEmptyItem(fallbackCandidate)) {
    return fallbackCandidate;
  }
  return null;
}
function extractVeName(vePath) {
  return vePath.split(" > ").pop()?.split(":")[0]?.trim() || "";
}
function matchesVePath(element, vePath, targetVeName = extractVeName(vePath)) {
  if (!VisualLogging.needsLogging(element)) {
    return false;
  }
  const jslog = element.getAttribute("jslog");
  if (targetVeName && jslog) {
    const match = jslog.trim().match(/^([a-zA-Z0-9_-]+)/);
    if (!match || match[1] !== targetVeName) {
      return false;
    }
  }
  return VisualLogging.getVePath(element) === vePath;
}
function getSiblingIndex(element, vePath, root = element.ownerDocument || document) {
  const targetVeName = extractVeName(vePath);
  const allJslog = deepQuerySelectorAll(root, "[jslog]");
  let index = 0;
  for (const el of allJslog) {
    if (el === element) {
      return index;
    }
    if (matchesVePath(el, vePath, targetVeName)) {
      index++;
    }
  }
  return index;
}
function checkCodeMirrorLineMatch(editor, editorLineNumber, textSignature) {
  const view = CodeMirror.EditorView.findFromDOM(editor);
  if (!view) {
    return false;
  }
  const doc = view.state.doc;
  if (editorLineNumber <= 0 || editorLineNumber > doc.lines) {
    return false;
  }
  const line = doc.line(editorLineNumber);
  return line.text.trim() === textSignature;
}
function resolveCommentAnchor(element, root = element.ownerDocument || document, options) {
  const customResolver = getCustomAnchorResolverForElement(element);
  if (customResolver) {
    const result = customResolver.resolve(element, options);
    return result ? result.anchor : null;
  }
  const target = resolveCommentAnchorElement(element, options);
  if (!target) {
    return null;
  }
  const vePath = VisualLogging.getVePath(target);
  if (!vePath) {
    return null;
  }
  const isEditorTarget = isCodeMirrorEditor(target);
  let textSignature;
  let parentTextSignature;
  let editor;
  if (isEditorTarget) {
    const lineInfo = resolveCodeMirrorLineInfo(element);
    if (!lineInfo) {
      return null;
    }
    textSignature = lineInfo.textSignature;
    const filePath = getEditorFilePath(target);
    editor = { lineNumber: lineInfo.lineNumber, filePath };
  } else {
    textSignature = target.deepTextContent();
    const parentEl = target.parentElementOrShadowHost();
    parentTextSignature = parentEl ? parentEl.deepTextContent() : void 0;
  }
  const siblingIndex = getSiblingIndex(target, vePath, root);
  const networkRequestId = target.getAttribute("data-network-request-id") ?? void 0;
  const backendNodeIdStr = target.getAttribute("data-backend-node-id");
  const backendNodeId = backendNodeIdStr ? Number(backendNodeIdStr) : void 0;
  const targetId = target.getAttribute("data-target-id") ?? void 0;
  const node = backendNodeId !== void 0 && targetId !== void 0 ? { backendNodeId, targetId } : void 0;
  return {
    vePath,
    textSignature,
    parentTextSignature,
    siblingIndex,
    networkRequestId,
    node,
    editor
  };
}
function deepQuerySelectorAll(root, selector, limit = Infinity) {
  const results = [];
  if (limit <= 0 || Number.isNaN(limit)) {
    return results;
  }
  function collectFromContainer(container) {
    if (container instanceof Element && container.shadowRoot) {
      if (collectFromContainer(container.shadowRoot)) {
        return true;
      }
    }
    let child = container.firstElementChild;
    while (child) {
      if (child.matches(selector)) {
        results.push(child);
        if (results.length >= limit) {
          return true;
        }
      }
      if (collectFromContainer(child)) {
        return true;
      }
      child = child.nextElementSibling;
    }
    return false;
  }
  collectFromContainer(root);
  return results;
}
function deepQuerySelector(root, selector) {
  return deepQuerySelectorAll(root, selector, 1)[0] ?? null;
}
function rematchCommentAnchor(comment, root = document, cachedJslogElements) {
  const { anchor } = comment;
  if (anchor.networkRequestId) {
    return deepQuerySelector(root, `[data-network-request-id="${CSS.escape(anchor.networkRequestId)}"]`);
  }
  if (anchor.node) {
    return deepQuerySelector(
      root,
      `[data-backend-node-id="${CSS.escape(String(anchor.node.backendNodeId))}"][data-target-id="${CSS.escape(anchor.node.targetId)}"]`
    );
  }
  if (anchor.editor) {
    const { lineNumber, filePath } = anchor.editor;
    const cmEditors = deepQuerySelectorAll(root, ".cm-editor");
    const matchingEditors = cmEditors.filter((cmEditor) => {
      if (filePath !== void 0 && getEditorFilePath(cmEditor) !== filePath) {
        return false;
      }
      return VisualLogging.getVePath(cmEditor) === anchor.vePath;
    });
    for (const cmEditor of matchingEditors) {
      if (checkCodeMirrorLineMatch(cmEditor, lineNumber, anchor.textSignature)) {
        return cmEditor;
      }
    }
    return matchingEditors[0] ?? null;
  }
  const targetVeName = extractVeName(anchor.vePath);
  const allJslog = cachedJslogElements || deepQuerySelectorAll(root, "[jslog]");
  const candidates = allJslog.filter((el) => matchesVePath(el, anchor.vePath, targetVeName));
  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }
  let candidateList = candidates;
  if (anchor.textSignature !== void 0) {
    const textMatches = candidateList.filter((el) => el.deepTextContent() === anchor.textSignature);
    if (textMatches.length > 0) {
      candidateList = textMatches;
    }
  }
  if (candidateList.length === 1) {
    return candidateList[0];
  }
  if (anchor.parentTextSignature !== void 0) {
    const parentMatches = candidateList.filter((el) => {
      const parentEl = el.parentElementOrShadowHost();
      return parentEl?.deepTextContent() === anchor.parentTextSignature;
    });
    if (parentMatches.length > 0) {
      candidateList = parentMatches;
    }
  }
  if (candidateList.length === 1) {
    return candidateList[0];
  }
  if (anchor.siblingIndex !== void 0) {
    const siblingMatches = candidateList.filter((el) => candidates.indexOf(el) === anchor.siblingIndex);
    if (siblingMatches.length > 0) {
      candidateList = siblingMatches;
    }
  }
  return candidateList[0] || null;
}
function isClippingOverflow(overflow) {
  return overflow === "hidden" || overflow === "auto" || overflow === "scroll" || overflow === "clip";
}
function computeVisibleRect(element, targetRect) {
  if (!element.isConnected) {
    return null;
  }
  if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) {
    return null;
  }
  const rect = targetRect ?? element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  let visibleLeft = rect.left;
  let visibleRight = rect.right;
  let visibleTop = rect.top;
  let visibleBottom = rect.bottom;
  const doc = element.ownerDocument || document;
  const win = doc.defaultView || window;
  const viewportWidth = win.innerWidth || doc.documentElement.clientWidth;
  const viewportHeight = win.innerHeight || doc.documentElement.clientHeight;
  visibleLeft = Math.max(visibleLeft, 0);
  visibleTop = Math.max(visibleTop, 0);
  visibleRight = Math.min(visibleRight, viewportWidth);
  visibleBottom = Math.min(visibleBottom, viewportHeight);
  if (visibleLeft >= visibleRight || visibleTop >= visibleBottom) {
    return null;
  }
  let current = element.parentElementOrShadowHost();
  while (current && current !== doc.documentElement && current !== doc.body) {
    const style = win.getComputedStyle(current);
    const clipsX = isClippingOverflow(style.overflowX);
    const clipsY = isClippingOverflow(style.overflowY);
    if (clipsX || clipsY) {
      const parentRect = current.getBoundingClientRect();
      if (clipsX) {
        visibleLeft = Math.max(visibleLeft, parentRect.left);
        visibleRight = Math.min(visibleRight, parentRect.right);
      }
      if (clipsY) {
        visibleTop = Math.max(visibleTop, parentRect.top);
        visibleBottom = Math.min(visibleBottom, parentRect.bottom);
      }
      if (visibleLeft >= visibleRight || visibleTop >= visibleBottom) {
        return null;
      }
    }
    current = current.parentElementOrShadowHost();
  }
  const width = visibleRight - visibleLeft;
  const height = visibleBottom - visibleTop;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return {
    left: visibleLeft,
    top: visibleTop,
    right: visibleRight,
    bottom: visibleBottom,
    width,
    height
  };
}
function isElementVisible(element) {
  if (!element.isConnected) {
    return false;
  }
  if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// ../../front_end/ui/comments/CommentOverlayManager.ts
var CommentOverlayManager_exports = {};
__export(CommentOverlayManager_exports, {
  COMMENT_MODE_CURSOR: () => COMMENT_MODE_CURSOR,
  CommentOverlayManager: () => CommentOverlayManager,
  Events: () => Events
});
import * as Common from "../../core/common/common.js";
import * as CommentManager from "../../models/comment_manager/comment_manager.js";
var COMMENT_MODE_CURSOR = "var(--comment-cursor)";
var Events = /* @__PURE__ */ ((Events2) => {
  Events2["POSITIONS_UPDATED"] = "PositionsUpdated";
  Events2["HOVER_HIGHLIGHT_CHANGED"] = "HoverHighlightChanged";
  return Events2;
})(Events || {});
var CommentOverlayManager = class extends Common.ObjectWrapper.ObjectWrapper {
  #commentManager;
  #liveNodeCache = /* @__PURE__ */ new WeakMap();
  #observedThreads = /* @__PURE__ */ new WeakSet();
  #intersectionObserver;
  #hoverData = null;
  #pinPositions = [];
  #highlightRects = [];
  #clickListener;
  #hoverListener;
  #suppressListener;
  #clickContainer;
  #hoverEventTypes = [
    "mouseover",
    "mouseout",
    "mouseenter",
    "mouseleave",
    "pointerover",
    "pointerout",
    "mousemove"
  ];
  #suppressEventTypes = [
    "mousedown",
    "pointerdown",
    "mouseup",
    "pointerup",
    "dblclick"
  ];
  #scrollListener;
  #scrollTarget;
  #scrollRafId;
  #devToolsResizeObserver;
  #resizeRafId;
  #mutationObserver;
  #rematchTimeoutId;
  #cursorElement = null;
  #isCreatingComment = false;
  constructor(commentManager) {
    super();
    this.#commentManager = commentManager;
    this.#commentManager.addEventListener(
      CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED,
      () => {
        if (!this.#isCreatingComment) {
          this.#updatePositions();
        }
      },
      this
    );
    this.#commentManager.addEventListener(
      CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED,
      ({ data: active }) => {
        if (!active) {
          this.#clearHover();
          this.clearDraftThreads();
        }
        document.body.style.cursor = active ? COMMENT_MODE_CURSOR : "";
      },
      this
    );
  }
  get commentManager() {
    return this.#commentManager;
  }
  /**
   * Lazily creates an IntersectionObserver that monitors the visibility and viewport intersection
   * of elements with active comment anchors.
   *
   * As anchored DOM nodes scroll in or out of visible viewport regions or virtualized lists,
   * the observer triggers position recalculations to ensure comment pins and highlights are
   * positioned accurately or hidden when out of view.
   */
  #getIntersectionObserver() {
    if (!this.#intersectionObserver) {
      this.#intersectionObserver = new IntersectionObserver(() => {
        this.#updatePositions();
      });
    }
    return this.#intersectionObserver;
  }
  setCommentMode(active) {
    this.#commentManager.setCommentMode(active);
  }
  isCommentMode() {
    return this.#commentManager.isCommentMode();
  }
  #setHoverCursor(element) {
    const previousElement = this.#cursorElement;
    const newElement = element instanceof HTMLElement ? element : null;
    if (previousElement === newElement) {
      return;
    }
    if (previousElement) {
      previousElement.style.cursor = "";
      previousElement.style.removeProperty("--override-cursor");
    }
    if (newElement) {
      newElement.style.cursor = COMMENT_MODE_CURSOR;
      newElement.style.setProperty("--override-cursor", COMMENT_MODE_CURSOR);
    }
    this.#cursorElement = newElement;
  }
  #setHoverHighlight(data) {
    if (data === null && this.#hoverData === null) {
      return;
    }
    if (data && this.#hoverData && data.top === this.#hoverData.top && data.left === this.#hoverData.left && data.width === this.#hoverData.width && data.height === this.#hoverData.height && data.visible === this.#hoverData.visible) {
      return;
    }
    this.#hoverData = data;
    this.dispatchEventToListeners("HoverHighlightChanged" /* HOVER_HIGHLIGHT_CHANGED */, data);
  }
  #clearHover() {
    this.#setHoverHighlight(null);
    this.#setHoverCursor(null);
  }
  getHoverHighlight() {
    return this.#hoverData;
  }
  getPinPositions() {
    return this.#pinPositions;
  }
  getHighlightRects() {
    return this.#highlightRects;
  }
  getAnchorElement(thread) {
    return this.#liveNodeCache.get(thread);
  }
  clearDraftThreads() {
    const draftThreads = this.#commentManager.getCommentThreads().filter((t) => t.status === "DRAFT");
    for (const thread of draftThreads) {
      this.removeCommentThread(thread.id);
    }
  }
  handleElementClick(element, options) {
    if (!this.isCommentMode() || closestAcrossShadow(element, COMMENT_THREAD_UI_SELECTOR)) {
      return false;
    }
    this.clearDraftThreads();
    const resolved = this.#resolveAnchor(element, options);
    if (!resolved) {
      return false;
    }
    const { anchorElement: anchorEl } = resolved;
    const visibleRect = computeVisibleRect(anchorEl);
    if (!visibleRect) {
      return false;
    }
    const thread = this.createComment(element, void 0, { coordinates: options });
    return thread !== null;
  }
  createComment(element, text, options) {
    const author = options?.author ?? "DEVELOPER";
    const changes = options?.changes;
    const resolved = this.#resolveAnchor(element, options?.coordinates);
    if (!resolved) {
      return null;
    }
    const { anchor, anchorElement } = resolved;
    let thread;
    this.#isCreatingComment = true;
    try {
      thread = this.#commentManager.createCommentThread(anchor, text, author, changes);
    } finally {
      this.#isCreatingComment = false;
    }
    if (isDomTrackedAnchor(anchor)) {
      this.#liveNodeCache.set(thread, anchorElement);
      const observer = this.#getIntersectionObserver();
      observer.observe(anchorElement);
      this.#observedThreads.add(anchorElement);
    }
    this.#updatePositions();
    return thread;
  }
  #resolveAnchor(element, options) {
    let anchorElement = null;
    let anchor = null;
    const customResolver = getCustomAnchorResolverForElement(element);
    if (customResolver) {
      const result = customResolver.resolve(element, options);
      if (result) {
        anchor = result.anchor;
        anchorElement = result.anchorElement ?? element;
      }
    } else {
      anchorElement = resolveCommentAnchorElement(element, options);
      anchor = resolveCommentAnchor(element, void 0, options);
    }
    if (!anchor || !anchorElement) {
      return null;
    }
    return { anchor, anchorElement };
  }
  getCommentThread(id) {
    return this.#commentManager.getCommentThread(id);
  }
  getCommentThreads() {
    return this.#commentManager.getCommentThreads();
  }
  removeCommentThread(id) {
    const thread = this.#commentManager.getCommentThread(id);
    if (!thread) {
      return;
    }
    const el = this.#liveNodeCache.get(thread);
    this.#liveNodeCache.delete(thread);
    if (el && this.#intersectionObserver) {
      let isElementStillObserved = false;
      for (const remainingThread of this.#commentManager.getCommentThreads()) {
        if (remainingThread.id !== id && this.#liveNodeCache.get(remainingThread) === el) {
          isElementStillObserved = true;
          break;
        }
      }
      if (!isElementStillObserved) {
        this.#intersectionObserver.unobserve(el);
        this.#observedThreads.delete(el);
      }
    }
    this.#commentManager.removeCommentThread(id);
  }
  /**
   * Rematches stored comments to live DOM nodes across dynamic container updates.
   *
   * Pre-queries [jslog] elements once across the container to avoid redundant deep DOM traversals
   * during batch rematching, and cleans up unobserved IntersectionObserver nodes in O(N) time.
   */
  #rematchAllComments(root = document) {
    const jslogElements = deepQuerySelectorAll(root, "[jslog]");
    const oldElements = /* @__PURE__ */ new Set();
    const newElements = /* @__PURE__ */ new Set();
    for (const thread of this.#commentManager.getCommentThreads()) {
      if (!isDomTrackedAnchor(thread.anchor)) {
        continue;
      }
      const oldEl = this.#liveNodeCache.get(thread);
      if (oldEl) {
        oldElements.add(oldEl);
      }
      const el = rematchCommentAnchor(thread, root, jslogElements);
      if (el) {
        this.#liveNodeCache.set(thread, el);
        newElements.add(el);
      } else {
        this.#liveNodeCache.delete(thread);
      }
    }
    if (this.#intersectionObserver) {
      for (const oldEl of oldElements) {
        if (!newElements.has(oldEl)) {
          this.#intersectionObserver.unobserve(oldEl);
          this.#observedThreads.delete(oldEl);
        }
      }
    }
    this.#updatePositions();
  }
  #updatePositions() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const newPins = [];
    const newHighlights = [];
    const elementPinCounts = /* @__PURE__ */ new Map();
    for (const thread of this.#commentManager.getCommentThreads()) {
      if (!isDomTrackedAnchor(thread.anchor)) {
        continue;
      }
      const el = this.#liveNodeCache.get(thread) || null;
      if (!el || !el.isConnected) {
        continue;
      }
      if (thread.anchor.editor?.filePath) {
        const currentFilePath = getEditorFilePath(el);
        if (currentFilePath && currentFilePath !== thread.anchor.editor.filePath) {
          continue;
        }
      }
      const observer = this.#getIntersectionObserver();
      if (!this.#observedThreads.has(el)) {
        observer.observe(el);
        this.#observedThreads.add(el);
      }
      const visibleRect = computeVisibleRect(el);
      if (!visibleRect) {
        continue;
      }
      const offsetIndex = elementPinCounts.get(el) || 0;
      elementPinCounts.set(el, offsetIndex + 1);
      const offsetY = offsetIndex * 26;
      newPins.push({
        id: thread.id,
        top: scrollY + visibleRect.top - 12 + offsetY,
        left: scrollX + visibleRect.right - 12,
        visible: true,
        index: thread.index
      });
      newHighlights.push({
        id: thread.id,
        top: scrollY + visibleRect.top,
        left: scrollX + visibleRect.left,
        width: visibleRect.width,
        height: visibleRect.height,
        visible: true
      });
    }
    this.#pinPositions = newPins;
    this.#highlightRects = newHighlights;
    this.dispatchEventToListeners("PositionsUpdated" /* POSITIONS_UPDATED */, {
      pins: newPins,
      highlights: newHighlights
    });
  }
  /**
   * Initializes event listeners and lifecycle observers across the target DOM container.
   *
   * Sets up:
   * - Capturing click, hover, and interaction suppression handlers to coordinate comment placement.
   * - A capturing scroll listener on the window to track scrolling across nested subpanes.
   * - A ResizeObserver to recalculate overlay coordinates when DevTools panels or drawers are resized.
   * - A MutationObserver to automatically rematch existing comment anchors when the DOM re-renders.
   */
  start(rootOrOptions) {
    let root;
    let scrollTarget;
    let resizeTarget;
    if (rootOrOptions && !(rootOrOptions instanceof Document) && !(rootOrOptions instanceof Element)) {
      root = rootOrOptions.root;
      scrollTarget = rootOrOptions.scrollTarget;
      resizeTarget = rootOrOptions.resizeTarget;
    } else if (rootOrOptions) {
      root = rootOrOptions;
    }
    root = root || document;
    scrollTarget = scrollTarget || (root instanceof Document ? root.defaultView || window : window);
    resizeTarget = resizeTarget || (root instanceof Document ? root.body || root.documentElement : root);
    this.stop();
    this.#installClickListener(root);
    this.#installScrollListener(scrollTarget);
    this.#installResizeObserver(resizeTarget);
    this.#installMutationObserver(root);
  }
  /**
   * Stops and detaches all active listeners and observers without clearing comment threads.
   */
  stop() {
    document.body.style.cursor = "";
    this.clearDraftThreads();
    this.#removeClickListener();
    this.#removeScrollListener();
    this.#removeResizeObserver();
    this.#removeMutationObserver();
    this.#clearHover();
    this.#intersectionObserver?.disconnect();
    this.#intersectionObserver = void 0;
    this.#observedThreads = /* @__PURE__ */ new WeakSet();
  }
  /**
   * Sets up capturing click, hover, and pointer interaction listeners on the container.
   *
   * When Comment Mode is active:
   * - Clicks on anchorable elements open a comment thread creation draft and consume the click event,
   *   preventing normal DevTools UI triggers such as node selection or navigation.
   * - Pointer and mouse press events are suppressed to prevent accidental text selections or drag interactions.
   * - Hover events compute and display a real-time preview highlight over the candidate anchor element.
   */
  #installClickListener(container = document) {
    this.#removeClickListener();
    this.#clickContainer = container;
    this.#clickListener = (event) => {
      if (!this.isCommentMode()) {
        return;
      }
      const composedTarget = event.composedPath()[0];
      const target = composedTarget instanceof Element ? composedTarget : event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const options = event instanceof MouseEvent ? { clientX: event.clientX, clientY: event.clientY } : void 0;
      if (this.handleElementClick(target, options)) {
        event.consume(true);
      }
    };
    this.#suppressListener = (event) => {
      if (!this.isCommentMode()) {
        return;
      }
      const composedTarget = event.composedPath()[0];
      const target = composedTarget instanceof Element ? composedTarget : event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const mouseEvent = event;
      const options = { clientX: mouseEvent.clientX, clientY: mouseEvent.clientY };
      const anchorEl = resolveCommentAnchorElement(target, options);
      if (anchorEl) {
        event.consume(true);
      }
    };
    this.#hoverListener = (event) => {
      if (!this.isCommentMode()) {
        this.#clearHover();
        return;
      }
      const composedTarget = event.composedPath()[0];
      const target = composedTarget instanceof Element ? composedTarget : event.target;
      if (!(target instanceof Element)) {
        this.#clearHover();
        return;
      }
      const isLeaveEvent = event.type === "mouseout" || event.type === "mouseleave" || event.type === "pointerout";
      const customResolver = getCustomAnchorResolverForElement(target);
      if (customResolver) {
        this.#handleCustomHover(target, event, customResolver);
        return;
      }
      const mouseEvent = event;
      const options = { clientX: mouseEvent.clientX, clientY: mouseEvent.clientY };
      const anchorEl = resolveCommentAnchorElement(target, options);
      if (isLeaveEvent) {
        const relatedTarget = event.relatedTarget;
        if (anchorEl && relatedTarget instanceof Node && anchorEl.isSelfOrAncestor(relatedTarget)) {
          event.consume(true);
          return;
        }
        this.#clearHover();
        if (anchorEl) {
          event.consume(true);
        }
        return;
      }
      if (anchorEl) {
        const cmLine = target.closest(".cm-line");
        const highlightTarget = cmLine && anchorEl.classList.contains("cm-editor") ? cmLine : anchorEl;
        const visibleRect = computeVisibleRect(highlightTarget);
        if (visibleRect) {
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          this.#setHoverHighlight({
            top: scrollY + visibleRect.top,
            left: scrollX + visibleRect.left,
            width: visibleRect.width,
            height: visibleRect.height,
            visible: true
          });
          this.#setHoverCursor(highlightTarget);
        } else {
          this.#clearHover();
        }
        event.consume(true);
      } else {
        this.#clearHover();
      }
    };
    container.addEventListener("click", this.#clickListener, { capture: true });
    for (const type of this.#suppressEventTypes) {
      container.addEventListener(type, this.#suppressListener, { capture: true });
    }
    for (const type of this.#hoverEventTypes) {
      container.addEventListener(type, this.#hoverListener, { capture: true });
    }
  }
  #removeClickListener() {
    if (this.#clickContainer) {
      if (this.#clickListener) {
        this.#clickContainer.removeEventListener("click", this.#clickListener, { capture: true });
      }
      if (this.#suppressListener) {
        for (const type of this.#suppressEventTypes) {
          this.#clickContainer.removeEventListener(type, this.#suppressListener, { capture: true });
        }
      }
      if (this.#hoverListener) {
        for (const type of this.#hoverEventTypes) {
          this.#clickContainer.removeEventListener(type, this.#hoverListener, { capture: true });
        }
      }
      this.#clickListener = void 0;
      this.#suppressListener = void 0;
      this.#hoverListener = void 0;
      this.#clickContainer = void 0;
    }
  }
  /**
   * Handles hover events for elements managed by a {@link CustomAnchorResolver}
   * (e.g. canvas-rendered flame charts where individual items lack backing DOM nodes).
   * Uses coordinate hit-testing to highlight specific entries rather than the entire element.
   */
  #handleCustomHover(target, event, customResolver) {
    const isLeaveEvent = event.type === "mouseout" || event.type === "mouseleave" || event.type === "pointerout";
    if (isLeaveEvent) {
      this.#clearHover();
      return;
    }
    const mouseEvent = event;
    const result = customResolver.resolve(
      target,
      { clientX: mouseEvent.clientX, clientY: mouseEvent.clientY, forHover: true }
    );
    if (result) {
      if (result.highlightRect && result.highlightRect.visible !== false) {
        this.#setHoverHighlight({
          top: result.highlightRect.top,
          left: result.highlightRect.left,
          width: result.highlightRect.width,
          height: result.highlightRect.height,
          visible: result.highlightRect.visible ?? true
        });
      } else {
        this.#setHoverHighlight(null);
      }
      this.#setHoverCursor(result.anchorElement ?? target);
      event.consume(true);
      return;
    }
    this.#clearHover();
  }
  /**
   * Registers a capturing scroll listener on the window or target container.
   *
   * Because DevTools contains multiple independently scrolling subpanes (such as the Elements tree,
   * Sources editor, and Network list), a capturing listener on the top-level window catches scroll
   * events anywhere in the tree and schedules a throttled position update using requestAnimationFrame.
   */
  #installScrollListener(target = window) {
    this.#removeScrollListener();
    this.#scrollTarget = target;
    this.#scrollListener = () => {
      this.#clearHover();
      if (this.#scrollRafId !== void 0) {
        cancelAnimationFrame(this.#scrollRafId);
      }
      this.#scrollRafId = requestAnimationFrame(() => {
        this.#scrollRafId = void 0;
        this.#updatePositions();
      });
    };
    target.addEventListener("scroll", this.#scrollListener, { capture: true, passive: true });
  }
  #removeScrollListener() {
    if (this.#scrollTarget && this.#scrollListener) {
      this.#scrollTarget.removeEventListener("scroll", this.#scrollListener, { capture: true });
      this.#scrollListener = void 0;
      this.#scrollTarget = void 0;
    }
    if (this.#scrollRafId !== void 0) {
      cancelAnimationFrame(this.#scrollRafId);
      this.#scrollRafId = void 0;
    }
  }
  /**
   * Observes dimensions of the root element to react to layout changes.
   *
   * Resizing DevTools windows, adjusting drawer splitters, or toggling sidebars alters the bounding
   * boxes of anchored elements. The observer ensures overlay pins and highlight boxes are updated
   * whenever container dimensions change.
   */
  #installResizeObserver(element = document.body) {
    this.#removeResizeObserver();
    this.#devToolsResizeObserver = new ResizeObserver(() => {
      this.#clearHover();
      if (this.#resizeRafId !== void 0) {
        cancelAnimationFrame(this.#resizeRafId);
      }
      this.#resizeRafId = requestAnimationFrame(() => {
        this.#resizeRafId = void 0;
        this.#updatePositions();
      });
    });
    this.#devToolsResizeObserver.observe(element);
  }
  #removeResizeObserver() {
    if (this.#devToolsResizeObserver) {
      this.#devToolsResizeObserver.disconnect();
      this.#devToolsResizeObserver = void 0;
    }
    if (this.#resizeRafId !== void 0) {
      cancelAnimationFrame(this.#resizeRafId);
      this.#resizeRafId = void 0;
    }
  }
  /**
   * Debounces rematching of comments across dynamic DOM updates.
   */
  #scheduleRematch(root = document) {
    if (this.#rematchTimeoutId) {
      clearTimeout(this.#rematchTimeoutId);
    }
    this.#rematchTimeoutId = setTimeout(() => {
      this.#rematchTimeoutId = void 0;
      this.#rematchAllComments(root);
    }, 250);
  }
  /**
   * Monitors DOM tree additions, removals, and attribute mutations across the container.
   *
   * DevTools inspector panes dynamically re-render items when expanding trees, filtering results,
   * or updating state. By observing child list mutations and key domain attributes (`jslog`,
   * `data-network-request-id`, `data-backend-node-id`, `aria-expanded`), the manager schedules a
   * debounced rematch so comments remain bound to their corresponding live DOM elements.
   */
  #installMutationObserver(root = document) {
    this.#removeMutationObserver();
    this.#mutationObserver = new MutationObserver(() => {
      this.#scheduleRematch(root);
    });
    const targetNode = root instanceof Document ? root.body || root.documentElement : root;
    this.#mutationObserver.observe(targetNode, {
      childList: true,
      subtree: true,
      attributeFilter: [
        "jslog",
        "data-network-request-id",
        "data-backend-node-id",
        "data-target-id",
        "aria-expanded",
        "data-file-path"
      ]
    });
  }
  #removeMutationObserver() {
    if (this.#mutationObserver) {
      this.#mutationObserver.disconnect();
      this.#mutationObserver = void 0;
    }
    if (this.#rematchTimeoutId) {
      clearTimeout(this.#rematchTimeoutId);
      this.#rematchTimeoutId = void 0;
    }
  }
  /**
   * Fully resets the manager by disabling comment mode, disconnecting all observers and listeners,
   * and purging all active comment threads and overlay data.
   */
  clear() {
    this.#commentManager.clear();
    this.stop();
    this.#pinPositions = [];
    this.#highlightRects = [];
    this.#updatePositions();
  }
};
export {
  CommentAnchorResolver_exports as CommentAnchorResolver,
  CommentOverlayManager_exports as CommentOverlayManager
};
//# sourceMappingURL=comments.js.map
