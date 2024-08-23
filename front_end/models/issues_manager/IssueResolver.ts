// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Protocol from '../../generated/protocol.js';

import {type Issue} from './Issue.js';
import {IssuesManager, Events as IssueManagerEvents, type IssueAddedEvent} from './IssuesManager.js';

/**
 * A class that facilitates resolving an issueId to an issue. See `ResolverBase` for more info.
 */
export class IssueResolver extends Common.ResolverBase.ResolverBase<Protocol.Audits.IssueId, Issue> {
  #issuesListener: Common.EventTarget.EventDescriptor|null = null;
  #issuesManager: IssuesManager;

  constructor(issuesManager: IssuesManager = IssuesManager.instance()) {
    super();
    this.#issuesManager = issuesManager;
  }

  protected override getForId(id: Protocol.Audits.IssueId): Issue|null {
    return this.#issuesManager.getIssueById(id) || null;
  }

  #onIssueAdded(event: Common.EventTarget.EventTargetEvent<IssueAddedEvent>): void {
    const {issue} = event.data;
    const id = issue.getIssueId();
    if (id) {
      this.onResolve(id, issue);
    }
  }

  protected override startListening(): void {
    if (this.#issuesListener) {
      return;
    }
    this.#issuesListener =
        this.#issuesManager.addEventListener(IssueManagerEvents.ISSUE_ADDED, this.#onIssueAdded, this);
  }

  protected override stopListening(): void {
    if (!this.#issuesListener) {
      return;
    }
    Common.EventTarget.removeEventListeners([this.#issuesListener]);
    this.#issuesListener = null;
  }
}
