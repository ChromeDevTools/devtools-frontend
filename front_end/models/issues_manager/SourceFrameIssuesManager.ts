// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Marked from '../../third_party/marked/marked.js';

import {ContentSecurityPolicyIssue, trustedTypesPolicyViolationCode, trustedTypesSinkViolationCode} from './ContentSecurityPolicyIssue.js';
import type {Issue, IssueKind} from './Issue.js';
import {toZeroBasedLocation} from './Issue.js';
import * as IssuesManager from './IssuesManager.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';
import {findTitleFromMarkdownAst, getMarkdownFileContent} from './MarkdownIssueDescription.js';

export class SourceFrameIssuesManager {
  private issuesManager: IssuesManager.IssuesManager;
  private locationPool = new Bindings.LiveLocation.LiveLocationPool();
  private issueMessages = new Array<IssueMessage>();

  constructor(issuesManager: IssuesManager.IssuesManager) {
    this.issuesManager = issuesManager;

    this.issuesManager.addEventListener(IssuesManager.Events.IssueAdded, this.onIssueAdded, this);
    this.issuesManager.addEventListener(IssuesManager.Events.FullUpdateRequired, this.onFullUpdateRequired, this);
  }

  private onIssueAdded(event: Common.EventTarget.EventTargetEvent): void {
    const {issue} =
        /** @type {!{issue: !Issue}} */ (event.data);
    this.addIssue(issue);
  }

  private addIssue(issue: Issue): void {
    if (!this.isTrustedTypeIssue(issue)) {
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
        this.addIssueMessageToScript(issue, rawLocation);
      }
    }
  }

  private onFullUpdateRequired(): void {
    this.resetMessages();
    const issues = this.issuesManager.issues();
    for (const issue of issues) {
      this.addIssue(issue);
    }
  }

  private async getIssueTitleFromMarkdownDescription(description: MarkdownIssueDescription): Promise<string|null> {
    const rawMarkdown = await getMarkdownFileContent(description.file);
    const markdownAst = Marked.Marked.lexer(rawMarkdown);
    return findTitleFromMarkdownAst(markdownAst);
  }

  private async addIssueMessageToScript(issue: Issue, rawLocation: SDK.DebuggerModel.Location): Promise<void> {
    const description = issue.getDescription();
    if (description) {
      const title = await this.getIssueTitleFromMarkdownDescription(description);
      if (title) {
        const clickHandler = (): void => {
          Common.Revealer.reveal(issue);
        };
        this.issueMessages.push(new IssueMessage(title, issue.getKind(), rawLocation, this.locationPool, clickHandler));
      }
    }
  }

  private isTrustedTypeIssue(issue: Issue): issue is ContentSecurityPolicyIssue {
    return issue instanceof ContentSecurityPolicyIssue && issue.code() === trustedTypesSinkViolationCode ||
        issue.code() === trustedTypesPolicyViolationCode;
  }

  private resetMessages(): void {
    for (const message of this.issueMessages) {
      message.dispose();
    }
    this.issueMessages = [];
    this.locationPool.disposeAll();
  }
}

export class IssueMessage extends Workspace.UISourceCode.Message {
  private uiSourceCode?: Workspace.UISourceCode.UISourceCode = undefined;
  private kind: IssueKind;

  constructor(
      title: string, kind: IssueKind, rawLocation: SDK.DebuggerModel.Location,
      locationPool: Bindings.LiveLocation.LiveLocationPool, clickHandler: () => void) {
    super(Workspace.UISourceCode.Message.Level.Issue, title, clickHandler);
    this.kind = kind;
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createLiveLocation(
        rawLocation, this.updateLocation.bind(this), locationPool);
  }

  private async updateLocation(liveLocation: Bindings.LiveLocation.LiveLocation): Promise<void> {
    if (this.uiSourceCode) {
      this.uiSourceCode.removeMessage(this);
    }
    const uiLocation = await liveLocation.uiLocation();
    if (!uiLocation) {
      return;
    }
    this._range = TextUtils.TextRange.TextRange.createFromLocation(uiLocation.lineNumber, uiLocation.columnNumber || 0);
    this.uiSourceCode = uiLocation.uiSourceCode;
    this.uiSourceCode.addMessage(this);
  }

  getIssueKind(): IssueKind {
    return this.kind;
  }

  dispose(): void {
    if (this.uiSourceCode) {
      this.uiSourceCode.removeMessage(this);
    }
  }
}
