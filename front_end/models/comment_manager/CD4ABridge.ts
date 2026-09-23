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
  node?: CommentManager.DOMNodeAnchorSignature;
}

export interface RevealTarget {
  networkRequestId?: string;
  node?: CommentManager.DOMNodeAnchorSignature;
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

  #getDOMNode(nodeSignature: CommentManager.DOMNodeAnchorSignature): SDK.DOMModel.DOMNode|undefined {
    if (!this.#targetManager) {
      return undefined;
    }
    const target = this.#targetManager.targetById(nodeSignature.targetId);
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return undefined;
    }
    for (const node of domModel.idToDOMNode.values()) {
      if (node.backendNodeId() === nodeSignature.backendNodeId) {
        return node;
      }
    }
    return undefined;
  }

  #formatCommentText(thread: CommentManager.CommentThread): string {
    const rawText = thread.comments[0]?.text ?? '';
    const details: string[] = [];

    if (thread.anchor.textSignature) {
      details.push(`- DevTools element: ${thread.anchor.textSignature}`);
    }

    if (thread.anchor.node) {
      const domNode = this.#getDOMNode(thread.anchor.node);
      const simpleSelector = domNode?.simpleSelector();
      if (simpleSelector) {
        details.push(`- DOM node selector: ${simpleSelector}`);
      }
    }

    if (thread.anchor.editor) {
      const editorInfo = thread.anchor.editor.filePath ?
          `${thread.anchor.editor.filePath}:${thread.anchor.editor.lineNumber}` :
          `line ${thread.anchor.editor.lineNumber}`;
      details.push(`- Editor: ${editorInfo}`);
    }

    if (thread.changes?.length) {
      for (const change of thread.changes) {
        details.push(`- Change: ${change.description}`);
      }
    }

    if (details.length === 0) {
      return rawText;
    }

    return rawText ? `${rawText}\n\n${details.join('\n')}` : details.join('\n');
  }

  getCommentThreads(): CommentThread[] {
    const threads = this.#commentManager.takeComments();
    return threads.map(thread => {
      const threadPayload: CommentThread = {
        id: thread.id,
        text: this.#formatCommentText(thread),
      };
      if (thread.anchor.networkRequestId) {
        threadPayload.networkRequestId = thread.anchor.networkRequestId;
      }
      if (thread.anchor.node) {
        threadPayload.node = {...thread.anchor.node};
      }
      return threadPayload;
    });
  }

  setAgentAttached(value: boolean): void {
    this.#commentManager.setAgentAttached(value);
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

    if (target?.node && this.#targetManager) {
      const sdkTarget = this.#targetManager.targetById(target.node.targetId);
      const domModel = sdkTarget?.model(SDK.DOMModel.DOMModel);
      if (domModel) {
        const cdpNodeId = target.node.backendNodeId as Protocol.DOM.BackendNodeId;
        const nodeMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([cdpNodeId]));
        const node = nodeMap?.get(cdpNodeId);
        if (node) {
          await Common.Revealer.reveal(node);
        }
      }
    }
  }
}
