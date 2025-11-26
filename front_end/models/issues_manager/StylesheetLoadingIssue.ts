// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

export const lateImportStylesheetLoadingCode = [
  Protocol.Audits.InspectorIssueCode.StylesheetLoadingIssue,
  Protocol.Audits.StyleSheetLoadingIssueReason.LateImportRule,
].join('::');

export class StylesheetLoadingIssue extends Issue<Protocol.Audits.StylesheetLoadingIssueDetails> {
  constructor(
      issueDetails: Protocol.Audits.StylesheetLoadingIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel|null) {
    const code =
        `${Protocol.Audits.InspectorIssueCode.StylesheetLoadingIssue}::${issueDetails.styleSheetLoadingIssueReason}`;
    super(code, issueDetails, issuesModel);
  }

  override sources(): Protocol.Audits.SourceCodeLocation[] {
    return [this.details().sourceCodeLocation];
  }
  override requests(): Protocol.Audits.AffectedRequest[] {
    const details = this.details();
    if (!details.failedRequestInfo) {
      return [];
    }
    const {url, requestId} = details.failedRequestInfo;
    if (!requestId) {
      return [];
    }
    return [{url, requestId}];
  }

  primaryKey(): string {
    return JSON.stringify(this.details());
  }

  getDescription(): MarkdownIssueDescription {
    switch (this.details().styleSheetLoadingIssueReason) {
      case Protocol.Audits.StyleSheetLoadingIssueReason.LateImportRule:
        return {
          file: 'stylesheetLateImport.md',
          links: [],
        };
      case Protocol.Audits.StyleSheetLoadingIssueReason.RequestFailed:
        return {
          file: 'stylesheetRequestFailed.md',
          links: [],
        };
    }
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  getKind(): IssueKind {
    return IssueKind.PAGE_ERROR;
  }

  static fromInspectorIssue(
      issueModel: SDK.IssuesModel.IssuesModel|null,
      inspectorIssue: Protocol.Audits.InspectorIssue): StylesheetLoadingIssue[] {
    const stylesheetLoadingDetails = inspectorIssue.details.stylesheetLoadingIssueDetails;
    if (!stylesheetLoadingDetails) {
      console.warn('Stylesheet loading issue without details received');
      return [];
    }
    return [new StylesheetLoadingIssue(stylesheetLoadingDetails, issueModel)];
  }
}
