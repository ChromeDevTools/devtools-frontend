// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import type {Issue} from './Issue.js';
import type {IssueAddedEvent, IssueHiddenStatusUpdatedEvent, IssuesManager} from './IssuesManager.js';
import {Events as IssuesManagerEvents} from './IssuesManagerEvents.js';

export const enum Events {
  DOM_ISSUE_ADDED = 'DOMIssueAdded',
  DOM_ISSUE_REMOVED = 'DOMIssueRemoved',
}

export interface EventTypes {
  [Events.DOM_ISSUE_ADDED]: {node: SDK.DOMModel.DOMNode, issue: Issue};
  [Events.DOM_ISSUE_REMOVED]: {node: SDK.DOMModel.DOMNode, issue: Issue};
}

export class DOMIssuesManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #issuesManager: IssuesManager;
  readonly #targetManager: SDK.TargetManager.TargetManager;
  #currentIssues = new Set<Issue>();
  #nodeToIssues = new Platform.MapUtilities.Multimap<SDK.DOMModel.DOMNode, Issue>();
  readonly #nodeIdSubscribers = new Platform.MapUtilities.Multimap<Protocol.DOM.NodeId, () => void>();

  constructor(issuesManager: IssuesManager, targetManager: SDK.TargetManager.TargetManager) {
    super();
    this.#issuesManager = issuesManager;
    this.#targetManager = targetManager;
    this.#issuesManager.addEventListener(IssuesManagerEvents.ISSUE_ADDED, this.#onIssueAdded, this);
    this.#issuesManager.addEventListener(IssuesManagerEvents.ISSUE_HIDDEN_STATUS_UPDATED,
                                         this.#onIssueHiddenStatusUpdated, this);
    this.#issuesManager.addEventListener(IssuesManagerEvents.FULL_UPDATE_REQUIRED, this.#onFullUpdateRequired, this);
    this.#targetManager.addModelListener(SDK.DOMModel.DOMModel, SDK.DOMModel.Events.DocumentUpdated,
                                         this.#onDocumentUpdated, this, {scoped: true});
  }

  subscribeByNodeId(nodeId: Protocol.DOM.NodeId, callback: () => void): void {
    this.#nodeIdSubscribers.set(nodeId, callback);
  }

  unsubscribeByNodeId(nodeId: Protocol.DOM.NodeId, callback: () => void): void {
    this.#nodeIdSubscribers.delete(nodeId, callback);
  }

  issuesForNode(node: SDK.DOMModel.DOMNode): Issue[] {
    return Array.from(this.#nodeToIssues.get(node));
  }

  #onIssueAdded(event: Common.EventTarget.EventTargetEvent<IssueAddedEvent>): void {
    void this.#addIssue(event.data.issue);
  }

  #onIssueHiddenStatusUpdated(event: Common.EventTarget.EventTargetEvent<IssueHiddenStatusUpdatedEvent>): void {
    const {issue} = event.data;
    if (issue.isHidden()) {
      void this.#removeIssue(issue);
    } else {
      void this.#addIssue(issue);
    }
  }

  #onFullUpdateRequired(): void {
    const newIssues = new Set(this.#issuesManager.issues());
    for (const issue of this.#currentIssues) {
      if (!newIssues.has(issue) || issue.isHidden()) {
        void this.#removeIssue(issue);
      }
    }
    for (const issue of newIssues) {
      if (!issue.isHidden()) {
        void this.#addIssue(issue);
      }
    }
  }

  #onDocumentUpdated(_event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMModel>): void {
    this.#nodeToIssues.clear();
    for (const issue of this.#issuesManager.issues()) {
      if (!issue.isHidden()) {
        void this.#addIssue(issue);
      }
    }
  }

  async #resolveNodesForIssue(issue: Issue): Promise<SDK.DOMModel.DOMNode[]> {
    const primaryTarget = this.#targetManager.primaryPageTarget() ?? this.#targetManager.targets()[0];
    const nodes: SDK.DOMModel.DOMNode[] = [];
    for (const element of issue.elements()) {
      const elementTarget = (element.target && typeof (element.target as SDK.Target.Target).model === 'function') ?
          (element.target as SDK.Target.Target) :
          primaryTarget;
      if (!elementTarget) {
        continue;
      }
      const domModel = elementTarget.model(SDK.DOMModel.DOMModel);
      if (!domModel) {
        continue;
      }
      const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(elementTarget, element.backendNodeId);
      const node = await deferredDOMNode.resolvePromise();
      if (node) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  async #addIssue(issue: Issue): Promise<void> {
    if (issue.isHidden()) {
      return;
    }
    this.#currentIssues.add(issue);
    const nodes = await this.#resolveNodesForIssue(issue);
    for (const node of nodes) {
      if (!this.#nodeToIssues.hasValue(node, issue)) {
        this.#nodeToIssues.set(node, issue);
        this.dispatchEventToListeners(Events.DOM_ISSUE_ADDED, {node, issue});
        for (const callback of this.#nodeIdSubscribers.get(node.id)) {
          callback();
        }
      }
    }
  }

  async #removeIssue(issue: Issue): Promise<void> {
    this.#currentIssues.delete(issue);
    const nodes = await this.#resolveNodesForIssue(issue);
    for (const node of nodes) {
      if (this.#nodeToIssues.hasValue(node, issue)) {
        this.#nodeToIssues.delete(node, issue);
        this.dispatchEventToListeners(Events.DOM_ISSUE_REMOVED, {node, issue});
        for (const callback of this.#nodeIdSubscribers.get(node.id)) {
          callback();
        }
      }
    }
  }
}
