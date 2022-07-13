// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';

import {
  ContentSecurityPolicyIssue,
  trustedTypesPolicyViolationCode,
  trustedTypesSinkViolationCode,
} from './ContentSecurityPolicyIssue.js';

import {toZeroBasedLocation, type Issue, type IssueKind} from './Issue.js';
import {type IssueAddedEvent, type IssuesManager} from './IssuesManager.js';
import {Events} from './IssuesManagerEvents.js';
import {getIssueTitleFromMarkdownDescription} from './MarkdownIssueDescription.js';

export class SourceFrameIssuesManager {
  #locationPool = new Bindings.LiveLocation.LiveLocationPool();
  #issueMessages = new Array<IssueMessage>();

  constructor(private readonly issuesManager: IssuesManager) {
    this.issuesManager.addEventListener(Events.IssueAdded, this.#onIssueAdded, this);
    this.issuesManager.addEventListener(Events.FullUpdateRequired, this.#onFullUpdateRequired, this);
  }

  #onIssueAdded(event: Common.EventTarget.EventTargetEvent<IssueAddedEvent>): void {
    const {issue} = event.data;
    this.#addIssue(issue);
  }

  #addIssue(issue: Issue): void {
    if (!this.#isTrustedTypeIssue(issue)) {
      return;
    }
    const issuesModel = issue.model();
    if (!issuesModel) {
      return;
    }
    const debuggerModel = issuesModel.target().model(SDK.DebuggerModel.DebuggerModel);
    const srcLocation = toZeroBasedLocation(issue.details().sourceCodeLocation);
    if (srcLocation && debuggerModel) {
      const rawLocation =
          debuggerModel.createRawLocationByURL(srcLocation.url, srcLocation.lineNumber, srcLocation.columnNumber);
      if (rawLocation) {
        void this.#addIssueMessageToScript(issue, rawLocation);
      }
    }
  }

  #onFullUpdateRequired(): void {
    this.#resetMessages();
    const issues = this.issuesManager.issues();
    for (const issue of issues) {
      this.#addIssue(issue);
    }
  }

  async #addIssueMessageToScript(issue: Issue, rawLocation: SDK.DebuggerModel.Location): Promise<void> {
    const description = issue.getDescription();
    if (description) {
      const title = await getIssueTitleFromMarkdownDescription(description);
      if (title) {
        const clickHandler = (): void => {
          void Common.Revealer.reveal(issue);
        };
        this.#issueMessages.push(
            new IssueMessage(title, issue.getKind(), rawLocation, this.#locationPool, clickHandler));
      }
    }
  }

  #isTrustedTypeIssue(issue: Issue): issue is ContentSecurityPolicyIssue {
    return issue instanceof ContentSecurityPolicyIssue && issue.code() === trustedTypesSinkViolationCode ||
        issue.code() === trustedTypesPolicyViolationCode;
  }

  #resetMessages(): void {
    for (const message of this.#issueMessages) {
      message.dispose();
    }
    this.#issueMessages = [];
    this.#locationPool.disposeAll();
  }
}

export class IssueMessage extends Workspace.UISourceCode.Message {
  #uiSourceCode?: Workspace.UISourceCode.UISourceCode = undefined;
  #kind: IssueKind;

  constructor(
      title: string, kind: IssueKind, rawLocation: SDK.DebuggerModel.Location,
      locationPool: Bindings.LiveLocation.LiveLocationPool, clickHandler: () => void) {
    super(Workspace.UISourceCode.Message.Level.Issue, title, clickHandler);
    this.#kind = kind;
    void Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createLiveLocation(
        rawLocation, this.#updateLocation.bind(this), locationPool);
  }

  async #updateLocation(liveLocation: Bindings.LiveLocation.LiveLocation): Promise<void> {
    if (this.#uiSourceCode) {
      this.#uiSourceCode.removeMessage(this);
    }
    const uiLocation = await liveLocation.uiLocation();
    if (!uiLocation) {
      return;
    }
    this.range = TextUtils.TextRange.TextRange.createFromLocation(uiLocation.lineNumber, uiLocation.columnNumber || 0);
    this.#uiSourceCode = uiLocation.uiSourceCode;
    this.#uiSourceCode.addMessage(this);
  }

  getIssueKind(): IssueKind {
    return this.#kind;
  }

  dispose(): void {
    if (this.#uiSourceCode) {
      this.#uiSourceCode.removeMessage(this);
    }
  }
}
