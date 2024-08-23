// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';

import {
  ContentSecurityPolicyIssue,
  trustedTypesPolicyViolationCode,
  trustedTypesSinkViolationCode,
} from './ContentSecurityPolicyIssue.js';
import {type Issue, type IssueKind, toZeroBasedLocation} from './Issue.js';
import {type IssueAddedEvent, type IssuesManager} from './IssuesManager.js';
import {Events} from './IssuesManagerEvents.js';
import {getIssueTitleFromMarkdownDescription} from './MarkdownIssueDescription.js';
import {PropertyRuleIssue} from './PropertyRuleIssue.js';
import {lateImportStylesheetLoadingCode, type StylesheetLoadingIssue} from './StylesheetLoadingIssue.js';

export class SourceFrameIssuesManager {
  #sourceFrameMessageManager = new Bindings.PresentationConsoleMessageHelper.PresentationSourceFrameMessageManager();
  constructor(private readonly issuesManager: IssuesManager) {
    this.issuesManager.addEventListener(Events.ISSUE_ADDED, this.#onIssueAdded, this);
    this.issuesManager.addEventListener(Events.FULL_UPDATE_REQUIRED, this.#onFullUpdateRequired, this);
  }

  #onIssueAdded(event: Common.EventTarget.EventTargetEvent<IssueAddedEvent>): void {
    const {issue} = event.data;
    void this.#addIssue(issue);
  }

  async #addIssue(issue: Issue): Promise<void> {
    if (!this.#isTrustedTypeIssue(issue) && !this.#isLateImportIssue(issue) && !this.#isPropertyRuleIssue(issue)) {
      return;
    }
    const issuesModel = issue.model();
    if (!issuesModel) {
      return;
    }
    const srcLocation = toZeroBasedLocation(issue.details().sourceCodeLocation);
    const description = issue.getDescription();
    if (!description || !srcLocation) {
      return;
    }
    const messageText = await getIssueTitleFromMarkdownDescription(description);
    if (!messageText) {
      return;
    }
    const clickHandler = (): void => {
      void Common.Revealer.reveal(issue);
    };
    this.#sourceFrameMessageManager.addMessage(
        new IssueMessage(messageText, issue.getKind(), clickHandler), {
          line: srcLocation.lineNumber,
          column: srcLocation.columnNumber ?? -1,
          url: srcLocation.url,
          scriptId: srcLocation.scriptId,
        },
        issuesModel.target());
  }

  #onFullUpdateRequired(): void {
    this.#resetMessages();
    const issues = this.issuesManager.issues();
    for (const issue of issues) {
      void this.#addIssue(issue);
    }
  }

  #isTrustedTypeIssue(issue: Issue): issue is ContentSecurityPolicyIssue {
    return issue instanceof ContentSecurityPolicyIssue && issue.code() === trustedTypesSinkViolationCode ||
        issue.code() === trustedTypesPolicyViolationCode;
  }

  #isPropertyRuleIssue(issue: Issue): issue is PropertyRuleIssue {
    return issue instanceof PropertyRuleIssue;
  }

  #isLateImportIssue(issue: Issue): issue is StylesheetLoadingIssue {
    return issue.code() === lateImportStylesheetLoadingCode;
  }

  #resetMessages(): void {
    this.#sourceFrameMessageManager.clear();
  }
}

export class IssueMessage extends Workspace.UISourceCode.Message {
  #kind: IssueKind;
  constructor(title: string, kind: IssueKind, clickHandler: () => void) {
    super(Workspace.UISourceCode.Message.Level.ISSUE, title, clickHandler);
    this.#kind = kind;
  }

  getIssueKind(): IssueKind {
    return this.#kind;
  }
}
