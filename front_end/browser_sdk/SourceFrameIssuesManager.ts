// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';  // eslint-disable-line no-unused-vars
import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
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

  private onIssueAdded(event: Common.EventTarget.EventTargetEvent) {
    const {issue} =
        /** @type {!{issue: !SDK.Issue.Issue}} */ (event.data);
    this.addIssue(issue);
  }

  private addIssue(issue: SDK.Issue.Issue) {
    if (!this.isTrustedTypeIssue(issue)) {
      return;
    }
    const issuesModel = issue.model();
    if (!issuesModel) {
      return;
    }
    const debuggerModel = issuesModel.target().model(SDK.DebuggerModel.DebuggerModel);
    const srcLocation = issue.details().sourceCodeLocation;
    if (srcLocation && debuggerModel) {
      const rawLocation =
          debuggerModel.createRawLocationByURL(srcLocation.url, srcLocation.lineNumber, srcLocation.columnNumber);
      if (rawLocation) {
        this.addIssueMessageToScript(issue, rawLocation);
      }
    }
  }

  private onFullUpdateRequired() {
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

  private addIssueMessageToScript(issue: SDK.Issue.Issue, rawLocation: SDK.DebuggerModel.Location) {
    const description = issue.getDescription();
    if (description && 'file' in description) {
      const title = this.createIssueDescriptionFromMarkdown(description);
      if (title) {
        this.issueMessages.push(new IssueMessage(title, rawLocation, this.locationPool));
      }
    }
  }

  private isTrustedTypeIssue(issue: SDK.Issue.Issue):
      issue is SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue {
    return issue instanceof SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue &&
        issue.code() === SDK.ContentSecurityPolicyIssue.trustedTypesSinkViolationCode ||
        issue.code() === SDK.ContentSecurityPolicyIssue.trustedTypesPolicyViolationCode;
  }

  private resetMessages() {
    for (const message of this.issueMessages) {
      message.dispose();
    }
    this.issueMessages = [];
    this.locationPool.disposeAll();
  }
}

export class IssueMessage {
  private text: string;
  private level: string;
  private uiMessage?: Workspace.UISourceCode.Message;

  constructor(
      title: string, rawLocation: SDK.DebuggerModel.Location, locationPool: Bindings.LiveLocation.LiveLocationPool) {
    this.text = title;
    this.level = Workspace.UISourceCode.Message.Level.Issue;
    this.uiMessage = undefined;
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createLiveLocation(
        rawLocation, this.updateLocation.bind(this), locationPool);
  }

  private async updateLocation(liveLocation: Bindings.LiveLocation.LiveLocation) {
    if (this.uiMessage) {
      this.uiMessage.remove();
    }
    const uiLocation = await liveLocation.uiLocation();
    if (!uiLocation) {
      return;
    }
    this.uiMessage =
        uiLocation.uiSourceCode.addLineMessage(this.level, this.text, uiLocation.lineNumber, uiLocation.columnNumber);
  }

  dispose() {
    this.uiMessage?.remove();
  }

  getText(): string {
    return this.text;
  }

  getLevel(): string {
    return this.level;
  }
}
