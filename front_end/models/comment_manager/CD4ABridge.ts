// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as Logs from '../logs/logs.js';

import * as CommentManager from './CommentManager.js';

export interface CommentThread {
  id: string;
  text: string;
  networkRequestId?: string;
  backendNodeId?: number;
  editor?: CommentManager.EditorAnchorSignature;
}

export interface RevealTarget {
  networkRequestId?: string;
  backendNodeId?: number;
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
  readonly #targetManager?: SDK.TargetManager.TargetManager;
  readonly #networkLog?: Logs.NetworkLog.NetworkLog;
  readonly #inspectorFrontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];

  constructor(
      commentManager: CommentManager.CommentManager,
      targetManager?: SDK.TargetManager.TargetManager,
      networkLog?: Logs.NetworkLog.NetworkLog,
      inspectorFrontendHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI =
          Host.InspectorFrontendHost.InspectorFrontendHostInstance,
  ) {
    super();
    this.#commentManager = commentManager;
    this.#targetManager = targetManager;
    this.#networkLog = networkLog;
    this.#inspectorFrontendHost = inspectorFrontendHost;

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
      if (thread.anchor.node) {
        threadPayload.backendNodeId = thread.anchor.node.backendNodeId;
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

  async reveal(panelName: string, target?: RevealTarget): Promise<void> {
    if (panelName) {
      this.#inspectorFrontendHost.events.dispatchEventToListeners(
          Host.InspectorFrontendHostAPI.Events.ShowPanel,
          panelName,
      );
    }

    if (target?.networkRequestId && this.#networkLog) {
      const [request] = this.#networkLog.requestsForId(target.networkRequestId);
      if (request) {
        await Common.Revealer.reveal(request);
      }
    }

    if (target?.backendNodeId !== undefined && this.#targetManager) {
      const primaryTarget = this.#targetManager.primaryPageTarget();
      const domModel = primaryTarget?.model(SDK.DOMModel.DOMModel);
      if (domModel) {
        const cdpNodeId = target.backendNodeId as Protocol.DOM.BackendNodeId;
        const nodeMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([cdpNodeId]));
        const node = nodeMap?.get(cdpNodeId);
        if (node) {
          await Common.Revealer.reveal(node);
        }
      }
    }
  }
}
