// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export interface EditorAnchorSignature {
  /** 1-based line number for CodeMirror text editor anchors */
  lineNumber: number;
  /** File path associated with the editor */
  filePath?: string;
}

export interface DOMNodeAnchorSignature {
  /** Backend NodeId for DOM nodes (`data-backend-node-id`) */
  backendNodeId: number;
  /** Target ID associated with the DOM node (`data-target-id`) */
  targetId: string;
}

export interface TimelineAnchorSignature {
  /** Identifier of the trace to scope comments to a specific recording */
  traceId: string;
  /** Serializable key from Trace.EventsSerializer (e.g. 'r-123', 'p-1-2-3-4', 's-5') */
  traceEventKey: string;
  /** Primary event title or category name */
  entryName: string;
  /** Event start timestamp in microseconds */
  startTimeMicro: number;
  /** Chart location */
  chartLocation: 'main'|'network';
  /** Event duration in microseconds (omitted for instant markers) */
  durationMicro?: number;
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
  /** Optional DOM node identifiers (`data-backend-node-id`, `data-target-id`) */
  node?: DOMNodeAnchorSignature;
  /** Optional editor anchor coordinates for CodeMirror text editors */
  editor?: EditorAnchorSignature;
  /** Optional timeline flamechart anchor coordinates for Performance panel trace entries */
  timeline?: TimelineAnchorSignature;
}

export interface Comment {
  author: 'DEVELOPER'|'AGENT';
  text: string;
  timestamp: number;
}

export type CommentThreadStatus = 'DRAFT'|'ACTIVE'|'SENT_TO_AGENT'|'RESOLVED';

export const enum Events {
  CHANGED = 'Changed',
}

export interface EventTypes {
  [Events.CHANGED]: void;
}

export interface CommentThreadOptions {
  anchor: CommentAnchorSignature;
  comments?: Comment[];
  /** True for comments generated from the change tracker. */
  isGeneratedComment?: boolean;
}

export class CommentThread extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  static #nextIndex = 1;

  static resetIndex(): void {
    CommentThread.#nextIndex = 1;
  }

  readonly id: string = crypto.randomUUID();
  readonly anchor: CommentAnchorSignature;
  /** True for comments generated from the change tracker. */
  readonly isGeneratedComment: boolean;
  #savedIndex?: number;
  comments: Comment[];
  status: CommentThreadStatus = 'DRAFT';
  transmitted: boolean = false;

  constructor(options: CommentThreadOptions) {
    super();
    this.anchor = options.anchor;
    this.comments = options.comments ?? [];
    this.isGeneratedComment = Boolean(options.isGeneratedComment);
  }

  get index(): number {
    return this.#savedIndex ?? CommentThread.#nextIndex;
  }

  /**
   * Returns whether it was changed.
   */
  #saveText(text?: string, author: 'DEVELOPER'|'AGENT' = 'DEVELOPER'): boolean {
    if (text && text.trim().length > 0) {
      this.comments.push({
        author,
        text: text.trim(),
        timestamp: Date.now(),
      });
      return true;
    }
    return false;
  }

  save(text?: string, author: 'DEVELOPER'|'AGENT' = 'DEVELOPER'): void {
    let changed = this.#saveText(text, author);
    if (this.status === 'DRAFT') {
      if (this.#savedIndex === undefined) {
        this.#savedIndex = CommentThread.#nextIndex++;
      }
      this.status = 'ACTIVE';
      changed = true;
    }
    if (changed) {
      this.dispatchEventToListeners(Events.CHANGED);
    }
  }

  sendToAgent(text?: string, author: 'DEVELOPER'|'AGENT' = 'DEVELOPER'): void {
    let changed = this.#saveText(text, author);
    if (this.status === 'DRAFT' || this.status === 'ACTIVE') {
      if (this.#savedIndex === undefined) {
        this.#savedIndex = CommentThread.#nextIndex++;
      }
      this.status = 'SENT_TO_AGENT';
      changed = true;
    }
    if (changed) {
      this.dispatchEventToListeners(Events.CHANGED);
    }
  }

  resolve(replyText?: string): void {
    if (replyText && replyText.trim().length > 0) {
      this.comments.push({
        author: 'AGENT',
        text: replyText.trim(),
        timestamp: Date.now(),
      });
    }
    if (this.#savedIndex === undefined) {
      this.#savedIndex = CommentThread.#nextIndex++;
    }
    this.status = 'RESOLVED';
    this.dispatchEventToListeners(Events.CHANGED);
  }
}
