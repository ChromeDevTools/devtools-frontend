// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

export interface CommentAnchorSignature {
  /** Visual logging tree path, e.g. "Panel: elements > Pane: styles > TreeOutline > TreeItem: color" */
  vePath: string;
  /** Normalized text content of the target node */
  textSignature: string;
  /** Text content of the parent container VE node for sibling disambiguation */
  parentTextSignature?: string;
  /** 0-indexed position among siblings sharing the same visual logging path and text signature */
  siblingIndex?: number;
  /** Optional backend RequestId for Network panel elements (`data-network-request-id`) */
  networkRequestId?: string;
  /** Optional backend NodeId for Elements panel DOM nodes (`data-backend-node-id`) */
  backendNodeId?: number;
  /** Optional 1-indexed line number for CodeMirror text editors */
  editorLineNumber?: number;
  /** Optional file path of the document displayed in the CodeMirror editor */
  editorFilePath?: string;
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

export function isNonEmptyItem(element: Element): boolean {
  return element.deepTextContent().trim().length > 0;
}

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

export function resolveCommentAnchorElement(element: Element): Element|null {
  if (isTabTitle(element)) {
    return null;
  }
  let target: Element|null = element;
  let fallbackCandidate: Element|null = null;

  while (target) {
    const hasDomainId = target.hasAttribute('data-network-request-id') || target.hasAttribute('data-backend-node-id');

    if (hasDomainId) {
      return isNonEmptyItem(target) ? target : null;
    }
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
