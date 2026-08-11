// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {
  type CommentThread,
  resolveCommentAnchor,
  resolveCommentAnchorElement,
} from './CommentAnchorResolver.js';

export interface StartOptions {
  root?: Document|Element;
  defaultText?: string;
}

export interface HoverHighlightData {
  top: number;
  left: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface EventTypes {
  [Events.COMMENT_THREADS_CHANGED]: CommentThread[];
  [Events.COMMENT_MODE_CHANGED]: boolean;
  [Events.HOVER_HIGHLIGHT_CHANGED]: HoverHighlightData|null;
}

export const enum Events {
  COMMENT_THREADS_CHANGED = 'CommentThreadsChanged',
  COMMENT_MODE_CHANGED = 'CommentModeChanged',
  HOVER_HIGHLIGHT_CHANGED = 'HoverHighlightChanged',
}

/**
 * Manages comment threads and coordinates interactive commenting UI mode.
 */
export class CommentManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #commentThreads = new Map<string, CommentThread>();
  #commentMode = false;
  #nextId = 1;

  #hoverData: HoverHighlightData|null = null;

  #clickListener?: (event: Event) => void;
  #hoverListener?: (event: Event) => void;
  #suppressListener?: (event: Event) => void;
  #clickContainer?: Element|Document;

  readonly #hoverEventTypes = [
    'mouseover',
    'mouseout',
    'mouseenter',
    'mouseleave',
    'pointerover',
    'pointerout',
    'mousemove',
  ];
  readonly #suppressEventTypes = [
    'mousedown',
    'pointerdown',
    'mouseup',
    'pointerup',
    'dblclick',
  ];

  setCommentMode(active: boolean): void {
    if (this.#commentMode === active) {
      return;
    }
    this.#commentMode = active;
    if (!active) {
      this.#setHoverHighlight(null);
    }
    document.body.style.cursor = active ? 'crosshair' : '';
    this.dispatchEventToListeners(Events.COMMENT_MODE_CHANGED, active);
  }

  isCommentMode(): boolean {
    return this.#commentMode;
  }

  #setHoverHighlight(data: HoverHighlightData|null): void {
    if (data === null && this.#hoverData === null) {
      return;
    }
    if (data && this.#hoverData && data.top === this.#hoverData.top && data.left === this.#hoverData.left &&
        data.width === this.#hoverData.width && data.height === this.#hoverData.height &&
        data.visible === this.#hoverData.visible) {
      return;
    }
    this.#hoverData = data;
    this.dispatchEventToListeners(Events.HOVER_HIGHLIGHT_CHANGED, data);
  }

  getHoverHighlight(): HoverHighlightData|null {
    return this.#hoverData;
  }

  handleElementClick(element: Element, commentText = 'New comment'): CommentThread|null {
    if (!this.#commentMode) {
      return null;
    }
    return this.createComment(element, commentText, 'DEVELOPER');
  }

  createComment(
      element: Element,
      text: string,
      author: 'DEVELOPER'|'AGENT' = 'DEVELOPER',
      changes?: Array<Record<string, unknown>>,
      ): CommentThread|null {
    const anchor = resolveCommentAnchor(element);
    if (!anchor) {
      return null;
    }

    const id = `comment-${this.#nextId++}`;
    const thread: CommentThread = {
      id,
      anchor,
      comments: [{
        author,
        text,
        timestamp: Date.now(),
      }],
      status: 'ACTIVE',
      changes,
    };

    this.#commentThreads.set(id, thread);
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, this.getCommentThreads());

    return thread;
  }

  getCommentThread(id: string): CommentThread|undefined {
    return this.#commentThreads.get(id);
  }

  getCommentThreads(): CommentThread[] {
    return Array.from(this.#commentThreads.values());
  }

  removeCommentThread(id: string): void {
    const thread = this.#commentThreads.get(id);
    if (!thread) {
      return;
    }
    this.#commentThreads.delete(id);
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, this.getCommentThreads());
  }

  /**
   * Initializes event listeners across the target DOM container.
   */
  start(rootOrOptions?: Document|Element|StartOptions, defaultText = 'New comment'): void {
    let root: Document|Element|undefined;
    let text = defaultText;

    if (rootOrOptions && !(rootOrOptions instanceof Document) && !(rootOrOptions instanceof Element)) {
      root = rootOrOptions.root;
      text = rootOrOptions.defaultText ?? defaultText;
    } else if (rootOrOptions) {
      root = rootOrOptions;
    }

    root = root || document;

    this.stop();
    this.#installClickListener(root, text);
  }

  /**
   * Stops and detaches active listeners without clearing comment threads.
   */
  stop(): void {
    this.#removeClickListener();
  }

  /**
   * Sets up capturing click, hover, and pointer interaction listeners on the container.
   *
   * When Comment Mode is active:
   * - Clicks on anchorable elements create new comment threads and consume the click event,
   *   preventing normal DevTools UI triggers such as node selection or navigation.
   * - Pointer and mouse press events are suppressed to prevent accidental text selections or drag interactions.
   * - Hover events compute and display a real-time preview highlight over the candidate anchor element.
   */
  #installClickListener(container: Element|Document = document, defaultText = 'New comment'): void {
    this.#removeClickListener();
    this.#clickContainer = container;

    this.#clickListener = (event: Event): void => {
      if (!this.#commentMode) {
        return;
      }
      const composedTarget = event.composedPath()[0];
      const target = (composedTarget instanceof Element) ? composedTarget : event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const thread = this.handleElementClick(target, defaultText);
      if (thread) {
        event.consume(true);
      }
    };

    this.#suppressListener = (event: Event): void => {
      if (!this.#commentMode) {
        return;
      }
      const composedTarget = event.composedPath()[0];
      const target = (composedTarget instanceof Element) ? composedTarget : event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const anchorEl = resolveCommentAnchorElement(target);
      if (anchorEl) {
        event.consume(true);
      }
    };

    this.#hoverListener = (event: Event): void => {
      if (!this.#commentMode) {
        this.#setHoverHighlight(null);
        return;
      }
      const composedTarget = event.composedPath()[0];
      const target = (composedTarget instanceof Element) ? composedTarget : event.target;
      if (!(target instanceof Element)) {
        this.#setHoverHighlight(null);
        return;
      }
      const isLeaveEvent = event.type === 'mouseout' || event.type === 'mouseleave' || event.type === 'pointerout';
      const anchorEl = resolveCommentAnchorElement(target);
      if (isLeaveEvent) {
        const relatedTarget = (event as MouseEvent | PointerEvent).relatedTarget;
        if (anchorEl && relatedTarget instanceof Node && anchorEl.contains(relatedTarget)) {
          event.consume(true);
          return;
        }

        this.#setHoverHighlight(null);
        if (anchorEl) {
          event.consume(true);
        }
        return;
      }
      if (anchorEl) {
        const cmLine = target.closest('.cm-line');
        const highlightTarget = (cmLine && anchorEl.classList.contains('cm-editor')) ? cmLine : anchorEl;
        const rect = highlightTarget.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        this.#setHoverHighlight({
          top: scrollY + rect.top,
          left: scrollX + rect.left,
          width: rect.width,
          height: rect.height,
          visible: true,
        });
        event.consume(true);
      } else {
        this.#setHoverHighlight(null);
      }
    };

    container.addEventListener('click', this.#clickListener, {capture: true});
    for (const type of this.#suppressEventTypes) {
      container.addEventListener(type, this.#suppressListener, {capture: true});
    }
    for (const type of this.#hoverEventTypes) {
      container.addEventListener(type, this.#hoverListener, {capture: true});
    }
  }

  #removeClickListener(): void {
    if (this.#clickContainer) {
      if (this.#clickListener) {
        this.#clickContainer.removeEventListener('click', this.#clickListener, {capture: true});
      }
      if (this.#suppressListener) {
        for (const type of this.#suppressEventTypes) {
          this.#clickContainer.removeEventListener(type, this.#suppressListener, {capture: true});
        }
      }
      if (this.#hoverListener) {
        for (const type of this.#hoverEventTypes) {
          this.#clickContainer.removeEventListener(type, this.#hoverListener, {capture: true});
        }
      }
      this.#clickListener = undefined;
      this.#suppressListener = undefined;
      this.#hoverListener = undefined;
      this.#clickContainer = undefined;
    }
  }

  clear(): void {
    this.setCommentMode(false);
    this.stop();
    this.#commentThreads.clear();
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, []);
  }
}
