// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {type MarkdownIssueDescription} from './MarkdownIssueDescription.js';

export const lateImportStylesheetLoadingCode = [
  Protocol.Audits.InspectorIssueCode.StylesheetLoadingIssue,
  Protocol.Audits.StyleSheetLoadingIssueReason.LateImportRule,
].join('::');

export class StylesheetLoadingIssue extends Issue {
  #issueDetails: Protocol.Audits.StylesheetLoadingIssueDetails;
  constructor(issueDetails: Protocol.Audits.StylesheetLoadingIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    const code =
        `${Protocol.Audits.InspectorIssueCode.StylesheetLoadingIssue}::${issueDetails.styleSheetLoadingIssueReason}`;
    super(code, issuesModel);
    this.#issueDetails = issueDetails;
  }

  override sources(): Array<Protocol.Audits.SourceCodeLocation> {
    return [this.#issueDetails.sourceCodeLocation];
  }
  override requests(): Array<Protocol.Audits.AffectedRequest> {
    if (!this.#issueDetails.failedRequestInfo) {
      return [];
    }
    const {url, requestId} = this.#issueDetails.failedRequestInfo;
    if (!requestId) {
      return [];
    }
    return [{url, requestId}];
  }

  details(): Protocol.Audits.StylesheetLoadingIssueDetails {
    return this.#issueDetails;
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  getDescription(): MarkdownIssueDescription {
    switch (this.#issueDetails.styleSheetLoadingIssueReason) {
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

  static fromInspectorIssue(issueModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      StylesheetLoadingIssue[] {
    const stylesheetLoadingDetails = inspectorIssue.details.stylesheetLoadingIssueDetails;
    if (!stylesheetLoadingDetails) {
      console.warn('Stylesheet loading issue without details received');
      return [];
    }
    return [new StylesheetLoadingIssue(stylesheetLoadingDetails, issueModel)];
  }
}
