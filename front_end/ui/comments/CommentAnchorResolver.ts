// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

export interface EditorAnchorSignature {
  /** 1-based line number for CodeMirror text editor anchors */
  lineNumber: number;
  /** File path associated with the editor */
  filePath?: string;
}

export interface CommentAnchorSignature {
  /** Visual logging tree path, e.g. "Panel: elements > Pane: styles > TreeOutline > TreeItem: color" */
  vePath: string;
  /** Normalized text content of the target node */
  textSignature: string;
  /** Text content of the parent container VE node for sibling disambiguation */
  parentTextSignature?: string;
  /** 0-indexed position among siblings sharing the same visual logging path */
  siblingIndex?: number;
  /** Optional backend RequestId for Network panel elements (`data-network-request-id`) */
  networkRequestId?: string;
  /** Optional backend NodeId for Elements panel DOM nodes (`data-backend-node-id`) */
  backendNodeId?: number;
  /** Optional editor anchor coordinates for CodeMirror text editors */
  editor?: EditorAnchorSignature;
}

export interface CommentThread {
  id: string;
  anchor: CommentAnchorSignature;
  comments: Array<{
    author: 'DEVELOPER' | 'AGENT',
    text: string,
    timestamp: number,
  }>;
  status: 'ACTIVE'|'RESOLVED';
  changes?: Array<Record<string, unknown>>;
}

const IGNORED_MINOR_CONTROLS = new Set<number>([
  VisualLogging.VisualElements.Action,
  VisualLogging.VisualElements.Toggle,
  VisualLogging.VisualElements.Close,
  VisualLogging.VisualElements.Expand,
  VisualLogging.VisualElements.ToggleSubpane,
  VisualLogging.VisualElements.Toolbar,
]);

/**
 * Finds the closest ancestor (or the element itself) matching a CSS selector,
 * traversing across Shadow DOM boundaries (shadow root boundaries to shadow hosts).
 *
 * @param element The starting element for traversal.
 * @param selector The CSS selector to match against.
 * @returns The first matching Element or null if none is found.
 */
export function closestAcrossShadow(element: Element, selector: string): Element|null {
  let current: Element|null = element;
  while (current) {
    if (current.matches(selector)) {
      return current;
    }
    current = current.parentElementOrShadowHost();
  }
  return null;
}

/**
 * Checks whether an element is a CodeMirror editor container (`.cm-editor`).
 *
 * @param element The element to check.
 * @returns True if the element has the `.cm-editor` class; otherwise false.
 */
function isCodeMirrorEditor(element: Element): boolean {
  return element.classList.contains('cm-editor');
}

/**
 * Checks whether an element contains non-empty text content (after trimming whitespace),
 * including text from any nested shadow roots.
 *
 * @param element The element to check.
 * @returns True if the element contains non-empty text; otherwise false.
 */
export function isNonEmptyItem(element: Element): boolean {
  return element.deepTextContent().trim().length > 0;
}

/**
 * Determines whether an element represents a tab header or tab title
 * (e.g. PanelTabHeader, role="tab", or .tab-header class) across shadow DOM boundaries,
 * which should be excluded from commenting.
 *
 * @param element The element to check.
 * @returns True if the element or any of its ancestors is a tab title; otherwise false.
 */
export function isTabTitle(element: Element): boolean {
  let current: Element|null = element;
  while (current) {
    if (VisualLogging.needsLogging(current)) {
      try {
        const config = VisualLogging.getLoggingConfig(current);
        if (config.ve === VisualLogging.VisualElements.PanelTabHeader) {
          return true;
        }
      } catch {
        // Ignore
      }
    }
    const role = current.getAttribute('role');
    if (role === 'tab') {
      return true;
    }
    if (current.classList.contains('tab-element') || current.classList.contains('tab-header')) {
      return true;
    }
    current = current.parentElementOrShadowHost();
  }
  return false;
}

interface CodeMirrorLineInfo {
  lineNumber: number;
  textSignature: string;
}

/**
 * Resolves line information (1-based line number and trimmed line text) for an element inside a CodeMirror editor.
 *
 * Uses the underlying `CodeMirror.EditorView` and `EditorState.doc` data model directly via
 * `EditorView.findFromDOM()`. This avoids relying on virtualized DOM nodes (`.cm-line` elements)
 * which only exist for the currently visible viewport.
 *
 * @param element The source DOM element inside or on the editor.
 * @returns An object containing the 1-based line number and line text, or null if unresolvable or empty.
 */
function resolveCodeMirrorLineInfo(element: Element): CodeMirrorLineInfo|null {
  const cmEditor = element.closest('.cm-editor') as HTMLElement | null;
  if (!cmEditor) {
    return null;
  }
  const view = CodeMirror.EditorView.findFromDOM(cmEditor);
  if (!view) {
    throw new Error('Could not find CodeMirror EditorView from .cm-editor element');
  }
  const doc = view.state.doc;

  // 1. Gutter element clicked (line numbers)
  const gutterEl = element.closest('.cm-gutterElement');
  if (gutterEl) {
    const rawText = gutterEl.textContent?.trim() || '';
    if (rawText.length > 0 && /^\d+$/.test(rawText)) {
      const lineNum = parseInt(rawText, 10);
      if (lineNum > 0 && lineNum <= doc.lines) {
        const line = doc.line(lineNum);
        const textSignature = line.text.trim();
        return textSignature ? {lineNumber: line.number, textSignature} : null;
      }
    }
    return null;
  }

  // 2. Content / line / token clicked: use line element directly or escalate to closest .cm-line
  const cmLine = element.classList.contains('cm-line') ? element : element.closest('.cm-line');
  if (cmLine) {
    try {
      const pos = view.posAtDOM(cmLine);
      const line = doc.lineAt(pos);
      const textSignature = line.text.trim();
      return textSignature ? {lineNumber: line.number, textSignature} : null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Resolves an arbitrary clicked or targeted DOM element to its appropriate semantic comment anchor element.
 *
 * Traversal hierarchy:
 * 1. Checks if the element is part of a tab title (returns null if so).
 * 2. Escalates CodeMirror line/gutter elements to .cm-editor (only if the clicked line is non-empty).
 * 3. Checks for domain IDs (`data-network-request-id` or `data-backend-node-id`) across shadow boundaries,
 *    returning the owning domain element.
 * 4. Escalates minor controls / sub-elements up to semantic containers (e.g., TableRow, TreeItem).
 * 5. Falls back to the nearest visual logging element if no semantic container is found.
 *
 * @param element The source DOM element to resolve.
 * @returns The resolved semantic anchor Element, or null if unresolvable/empty/excluded.
 */
export function resolveCommentAnchorElement(element: Element): Element|null {
  if (isTabTitle(element)) {
    return null;
  }
  // CodeMirror internal lines, gutters, and content live inside .cm-editor.
  // We only allow commenting on non-empty lines within the editor; the whole editor
  // container is never a valid comment target.
  const cmEditor = element.closest('.cm-editor');
  if (cmEditor) {
    const lineInfo = resolveCodeMirrorLineInfo(element);
    if (!lineInfo) {
      return null;
    }
    return cmEditor;
  }
  const domainElement = closestAcrossShadow(element, '[data-network-request-id], [data-backend-node-id]');
  if (domainElement) {
    return isNonEmptyItem(domainElement) ? domainElement : null;
  }
  let target: Element|null = element;
  let fallbackCandidate: Element|null = null;

  while (target) {
    if (VisualLogging.needsLogging(target)) {
      try {
        const config = VisualLogging.getLoggingConfig(target);
        if (config.ve === VisualLogging.VisualElements.TableRow ||
            config.ve === VisualLogging.VisualElements.TreeItem) {
          return isNonEmptyItem(target) ? target : null;
        }
        if (!fallbackCandidate && !IGNORED_MINOR_CONTROLS.has(config.ve)) {
          fallbackCandidate = target;
        }
      } catch {
        // Ignore
      }
    }
    target = target.parentElementOrShadowHost();
  }

  if (fallbackCandidate && isNonEmptyItem(fallbackCandidate)) {
    return fallbackCandidate;
  }
  return null;
}

/**
 * Extracts the trailing Visual Element type name from a full visual logging path.
 * Used as a fast pre-filter optimization before calculating full ancestor VE paths.
 *
 * @param vePath The full visual logging path string (e.g. "Panel: elements > TreeItem: rule").
 * @returns The trailing VE type name (e.g. "TreeItem").
 */
export function extractVeName(vePath: string): string {
  return vePath.split(' > ').pop()?.split(':')[0]?.trim() || '';
}

/**
 * Checks if an element matches the given visual logging path.
 *
 * @param element The DOM element to test.
 * @param vePath The expected visual logging path.
 * @param targetVeName Optional trailing VE name used as a fast pre-filter optimization to reject
 * non-matching elements without performing an expensive full DOM ancestor traversal in `VisualLogging.getVePath`.
 * @returns True if the element's VE path matches vePath; otherwise false.
 */
export function matchesVePath(element: Element, vePath: string, targetVeName: string = extractVeName(vePath)): boolean {
  if (!VisualLogging.needsLogging(element)) {
    return false;
  }
  // Optimization: fast pre-filter on local jslog attribute to avoid full getVePath() ancestor tree traversal
  const jslog = element.getAttribute('jslog');
  if (targetVeName && jslog) {
    const match = jslog.trim().match(/^([a-zA-Z0-9_-]+)/);
    if (!match || match[1] !== targetVeName) {
      return false;
    }
  }
  // Authoritative check
  return VisualLogging.getVePath(element) === vePath;
}

/**
 * Computes the 0-indexed position of an element among all elements sharing the same visual logging path
 * in document order across light and shadow DOM trees.
 *
 * @param element The target element.
 * @param vePath The visual logging path to match.
 * @param root The root Document or Element to search within (defaults to element's ownerDocument or document).
 * @returns The 0-based index among VE siblings.
 */
export function getSiblingIndex(element: Element, vePath: string,
                                root: Document|Element = element.ownerDocument || document): number {
  const targetVeName = extractVeName(vePath);
  const allJslog = deepQuerySelectorAll(root, '[jslog]');
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

/**
 * Checks whether a CodeMirror editor matches a specific line number and text signature.
 *
 * Uses `EditorView.findFromDOM()` to inspect the document model in memory rather than
 * querying virtualized DOM line nodes.
 *
 * @param editor The `.cm-editor` element.
 * @param editorLineNumber The expected 1-based line number.
 * @param textSignature The expected text content of the line.
 * @returns True if the editor contains the line matching both line number and text signature; otherwise false.
 */
function checkCodeMirrorLineMatch(editor: Element, editorLineNumber: number, textSignature: string): boolean {
  const view = CodeMirror.EditorView.findFromDOM(editor as HTMLElement);
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

/**
 * Resolves a DOM element to a robust, serializable `CommentAnchorSignature`.
 *
 * The signature captures visual logging paths, text content, sibling index disambiguation,
 * domain IDs (`networkRequestId`, `backendNodeId`), and CodeMirror editor coordinates to allow
 * resilient rematching across DOM re-renders, filtering, and DevTools sessions.
 *
 * @param element The source DOM element to resolve into an anchor signature.
 * @param root Optional root Document or Element to search within for sibling index calculation.
 * @returns The resolved CommentAnchorSignature, or null if unresolvable.
 */
export function resolveCommentAnchor(
    element: Element, root: Document|Element = element.ownerDocument || document): CommentAnchorSignature|null {
  const target = resolveCommentAnchorElement(element);
  if (!target) {
    return null;
  }

  // 1. Construct vePath
  const vePath = VisualLogging.getVePath(target);
  if (!vePath) {
    return null;
  }

  // 2. Extract text signature and parent text signature
  const isEditorTarget = isCodeMirrorEditor(target);
  let textSignature: string;
  let parentTextSignature: string|undefined;
  let editor: EditorAnchorSignature|undefined;

  if (isEditorTarget) {
    const lineInfo = resolveCodeMirrorLineInfo(element);
    if (!lineInfo) {
      return null;
    }
    textSignature = lineInfo.textSignature;
    const filePath = target.getAttribute('data-file-path') ?? undefined;
    editor = {lineNumber: lineInfo.lineNumber, filePath};
  } else {
    textSignature = target.deepTextContent();
    const parentEl = target.parentElementOrShadowHost();
    parentTextSignature = parentEl ? parentEl.deepTextContent() : undefined;
  }

  // 3. Calculate sibling index among elements with same vePath in document order
  const siblingIndex = getSiblingIndex(target, vePath, root);

  // 4. Extract optional domain IDs directly from the resolved target element
  const networkRequestId = target.getAttribute('data-network-request-id') ?? undefined;

  const backendNodeIdStr = target.getAttribute('data-backend-node-id');
  const backendNodeId = backendNodeIdStr ? Number(backendNodeIdStr) : undefined;

  return {
    vePath,
    textSignature,
    parentTextSignature,
    siblingIndex,
    networkRequestId,
    backendNodeId,
    editor,
  };
}

/**
 * Searches a document or element tree (recursively traversing all Shadow DOM roots)
 * and returns all matching descendant elements up to the specified limit in document order.
 *
 * Note: The root container itself is not matched against selector; only descendants are returned.
 *
 * @param root The root Document or Element to search from.
 * @param selector The CSS selector to match against.
 * @param limit Maximum number of matching elements to return (defaults to Infinity).
 * @returns Array of matching Elements in document order.
 */
export function deepQuerySelectorAll(root: Document|Element, selector: string, limit = Infinity): Element[] {
  const results: Element[] = [];
  if (limit <= 0 || Number.isNaN(limit)) {
    return results;
  }

  function collectFromContainer(container: Document|Element|ShadowRoot): boolean {
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

/**
 * Finds the first matching descendant element across light and shadow DOM trees.
 *
 * @param root The root Document or Element to search from.
 * @param selector The CSS selector to match against.
 * @returns The first matching Element or null if none is found.
 */
export function deepQuerySelector(root: Document|Element, selector: string): Element|null {
  return deepQuerySelectorAll(root, selector, 1)[0] ?? null;
}

/**
 * Rematches a stored comment thread to its live corresponding DOM element.
 *
 * Matching pipeline:
 * 1. Primary fast-path: Query by domain IDs (`networkRequestId` or `backendNodeId`) across shadow roots.
 * 2. CodeMirror editor line match: Match editor and line number/text, scoped by `filePath` if present.
 * 3. Visual logging path fallback: Find all candidate elements matching `vePath`.
 * 4. Text content refinement: Filter candidates by `textSignature` and `parentTextSignature`.
 * 5. Sibling index disambiguation: Match exact sibling position when multiple candidates exist.
 *
 * @param comment The comment thread containing the anchor signature to rematch.
 * @param root The root Document or Element to search within (defaults to document).
 * @param cachedJslogElements Optional pre-collected list of `[jslog]` elements for performance.
 * @returns The rematched live Element, or null if no match is found.
 */
export function rematchCommentAnchor(comment: CommentThread, root: Document|Element = document,
                                     cachedJslogElements?: Element[]): Element|null {
  const {anchor} = comment;

  // Step 1: Primary domain ID fast-path (shadow-piercing data attribute query)
  if (anchor.networkRequestId) {
    return deepQuerySelector(root, `[data-network-request-id="${CSS.escape(anchor.networkRequestId)}"]`);
  }
  if (anchor.backendNodeId !== undefined) {
    return deepQuerySelector(root, `[data-backend-node-id="${CSS.escape(String(anchor.backendNodeId))}"]`);
  }
  if (anchor.editor) {
    const {lineNumber, filePath} = anchor.editor;
    const cmEditors =
        cachedJslogElements ? cachedJslogElements.filter(isCodeMirrorEditor) : deepQuerySelectorAll(root, '.cm-editor');
    const matchingEditors = cmEditors.filter(cmEditor => {
      if (filePath !== undefined && cmEditor.getAttribute('data-file-path') !== filePath) {
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

  // Step 2: VE path and deepTextContent fallback (for non-ID controls and console logs)
  const targetVeName = extractVeName(anchor.vePath);
  // Optimization: use cachedJslogElements if provided to avoid re-scanning the entire DOM
  const allJslog = cachedJslogElements || deepQuerySelectorAll(root, '[jslog]');
  const candidates = allJslog.filter(el => matchesVePath(el, anchor.vePath, targetVeName));

  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }

  let candidateList = candidates;

  // Filter by textSignature
  if (anchor.textSignature !== undefined) {
    const textMatches = candidateList.filter(el => el.deepTextContent() === anchor.textSignature);
    if (textMatches.length > 0) {
      candidateList = textMatches;
    }
  }
  if (candidateList.length === 1) {
    return candidateList[0];
  }

  // Filter by parentTextSignature
  if (anchor.parentTextSignature !== undefined) {
    const parentMatches = candidateList.filter(el => {
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

  // Disambiguate with siblingIndex
  if (anchor.siblingIndex !== undefined) {
    const siblingMatches = candidateList.filter(el => candidates.indexOf(el) === anchor.siblingIndex);
    if (siblingMatches.length > 0) {
      candidateList = siblingMatches;
    }
  }

  // Step 3: Single-Element Canonicalization (return the first matching node in document order)
  return candidateList[0] || null;
}

/**
 * Checks whether an element is connected to the DOM, visible according to `checkVisibility()`,
 * and has non-zero bounding box dimensions.
 *
 * @param element The element to check visibility for.
 * @returns True if the element is connected and rendered with non-zero size; otherwise false.
 */
export function isElementVisible(element: Element): boolean {
  if (!element.isConnected) {
    return false;
  }
  if (!element.checkVisibility({checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true})) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
