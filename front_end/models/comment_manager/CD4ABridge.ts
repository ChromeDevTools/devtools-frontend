// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Logs from '../logs/logs.js';

import * as CommentManager from './CommentManager.js';

export interface CommentThread {
  id: string;
  text: string;
  networkRequestId?: string;
  backendNodeId?: number;
  editor?: CommentManager.EditorAnchorSignature;
}

export const enum Events {
  COMMENT_THREADS_CHANGED = 'CommentThreadsChanged',
}

export interface EventTypes {
  [Events.COMMENT_THREADS_CHANGED]: void;
}

/**
 * Headless model bridge connecting DevTools comments subsystem to CD4A.
 * Provides serialization, transmission state tracking, and element reveal capabilities.
 */
export class CD4ABridge extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #commentManager: CommentManager.CommentManager;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];

  constructor(
      commentManager: CommentManager.CommentManager,
      _targetManager?: SDK.TargetManager.TargetManager,
      _networkLog?: Logs.NetworkLog.NetworkLog,
      _inspectorFrontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI =
          Host.InspectorFrontendHost.InspectorFrontendHostInstance,
  ) {
    super();
    this.#commentManager = commentManager;

    this.#eventListeners = [
      this.#commentManager.addEventListener(
          CommentManager.Events.COMMENT_THREADS_CHANGED,
          () => {
            this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED);
          },
          ),
    ];
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
  }

  getCommentThreads(): CommentThread[] {
    const threads = this.#commentManager.takeComments();
    return threads.map(thread => {
      const threadPayload: CommentThread = {
        id: thread.id,
        text: thread.comments[0]?.text ?? '',
      };
      if (thread.anchor.networkRequestId) {
        threadPayload.networkRequestId = thread.anchor.networkRequestId;
      }
      if (thread.anchor.backendNodeId !== undefined) {
        threadPayload.backendNodeId = thread.anchor.backendNodeId;
      }
      if (thread.anchor.editor) {
        threadPayload.editor = thread.anchor.editor;
      }
      return threadPayload;
    });
  }

  takeComments(): CommentThread[] {
    return this.getCommentThreads();
  }

  resolveCommentThread(threadId: string, replyText?: string): boolean {
    return this.#commentManager.resolveCommentThread(threadId, replyText);
  }
}
