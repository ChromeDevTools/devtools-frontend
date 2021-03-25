// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Marked from '../third_party/marked/marked.js';
import * as Workspace from '../workspace/workspace.js';

import * as IssuesManager from './IssuesManager.js';
import {findTitleFromMarkdownAst, getMarkdownFileContent} from './MarkdownHelpers.js';

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
        /** @type {!{issue: !SDK.Issue.Issue}} */ (event.data);
    this.addIssue(issue);
  }

  private addIssue(issue: SDK.Issue.Issue): void {
    if (!this.isTrustedTypeIssue(issue)) {
      return;
    }
    const issuesModel = issue.model();
    if (!issuesModel) {
      return;
    }
    const debuggerModel = issuesModel.target().model(SDK.DebuggerModel.DebuggerModel);
    const srcLocation = SDK.Issue.toZeroBasedLocation(issue.details().sourceCodeLocation);
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

  private createIssueDescriptionFromMarkdown(description: SDK.Issue.MarkdownIssueDescription): string|null {
    const rawMarkdown = getMarkdownFileContent(description.file);
    const markdownAst = Marked.Marked.lexer(rawMarkdown);
    return findTitleFromMarkdownAst(markdownAst);
  }

  private addIssueMessageToScript(issue: SDK.Issue.Issue, rawLocation: SDK.DebuggerModel.Location): void {
    const description = issue.getDescription();
    if (description) {
      const title = this.createIssueDescriptionFromMarkdown(description);
      if (title) {
        const clickHandler = (): void => {
          Common.Revealer.reveal(issue);
        };
        this.issueMessages.push(new IssueMessage(title, rawLocation, this.locationPool, clickHandler));
      }
    }
  }

  private isTrustedTypeIssue(issue: SDK.Issue.Issue):
      issue is SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue {
    return issue instanceof SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue &&
        issue.code() === SDK.ContentSecurityPolicyIssue.trustedTypesSinkViolationCode ||
        issue.code() === SDK.ContentSecurityPolicyIssue.trustedTypesPolicyViolationCode;
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

  constructor(
      title: string, rawLocation: SDK.DebuggerModel.Location, locationPool: Bindings.LiveLocation.LiveLocationPool,
      clickHandler: () => void) {
    super(Workspace.UISourceCode.Message.Level.Issue, title, clickHandler);
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

  dispose(): void {
    if (this.uiSourceCode) {
      this.uiSourceCode.removeMessage(this);
    }
  }
}
