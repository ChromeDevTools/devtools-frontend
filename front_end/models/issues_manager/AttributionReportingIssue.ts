// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {type MarkdownIssueDescription} from './MarkdownIssueDescription.js';

export const enum IssueCode {
  PermissionPolicyDisabled = 'AttributionReportingIssue::PermissionPolicyDisabled',
  AttributionSourceUntrustworthyFrameOrigin = 'AttributionReportingIssue::AttributionSourceUntrustworthyFrameOrigin',
  AttributionSourceUntrustworthyOrigin = 'AttributionReportingIssue::AttributionSourceUntrustworthyOrigin',
  AttributionUntrustworthyFrameOrigin = 'AttributionReportingIssue::AttributionUntrustworthyFrameOrigin',
  AttributionUntrustworthyOrigin = 'AttributionReportingIssue::AttributionUntrustworthyOrigin',
  InvalidHeader = 'AttributionReportingIssue::InvalidHeader',
}

function getIssueCode(details: Protocol.Audits.AttributionReportingIssueDetails): IssueCode {
  switch (details.violationType) {
    case Protocol.Audits.AttributionReportingIssueType.PermissionPolicyDisabled:
      return IssueCode.PermissionPolicyDisabled;
    case Protocol.Audits.AttributionReportingIssueType.AttributionSourceUntrustworthyOrigin:
      return details.frame !== undefined ? IssueCode.AttributionSourceUntrustworthyFrameOrigin :
                                           IssueCode.AttributionSourceUntrustworthyOrigin;
    case Protocol.Audits.AttributionReportingIssueType.AttributionUntrustworthyOrigin:
      return details.frame !== undefined ? IssueCode.AttributionUntrustworthyFrameOrigin :
                                           IssueCode.AttributionUntrustworthyOrigin;
    case Protocol.Audits.AttributionReportingIssueType.InvalidHeader:
      return IssueCode.InvalidHeader;
  }
}

export class AttributionReportingIssue extends Issue<IssueCode> {
  issueDetails: Readonly<Protocol.Audits.AttributionReportingIssueDetails>;

  constructor(
      issueDetails: Protocol.Audits.AttributionReportingIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(getIssueCode(issueDetails), issuesModel);
    this.issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.AttributionReporting;
  }

  getDescription(): MarkdownIssueDescription|null {
    switch (this.code()) {
      case IssueCode.PermissionPolicyDisabled:
        return {
          file: 'arPermissionPolicyDisabled.md',
          links: [],
        };
      case IssueCode.AttributionSourceUntrustworthyFrameOrigin:
        return {
          file: 'arAttributionSourceUntrustworthyFrameOrigin.md',
          links: [],
        };
      case IssueCode.AttributionSourceUntrustworthyOrigin:
        return {
          file: 'arAttributionSourceUntrustworthyOrigin.md',
          links: [
            {
              link:
                  'https://developer.chrome.com/docs/privacy-sandbox/attribution-reporting-event-guide/#html-attribute-attributiondestination-required',
              linkTitle: 'attributiondestination attribute',
            },
            {
              link:
                  'https://developer.chrome.com/docs/privacy-sandbox/attribution-reporting-event-guide/#html-attribute-attributionreportto',
              linkTitle: 'attributionreportto attribute',
            },
          ],
        };
      case IssueCode.AttributionUntrustworthyFrameOrigin:
        return {
          file: 'arAttributionUntrustworthyFrameOrigin.md',
          links: [],
        };
      case IssueCode.AttributionUntrustworthyOrigin:
        return {
          file: 'arAttributionUntrustworthyOrigin.md',
          links: [],
        };
      case IssueCode.InvalidHeader:
        return {
          file: 'arInvalidHeader.md',
          links: [],
        };
    }
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.PageError;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      AttributionReportingIssue[] {
    const {attributionReportingIssueDetails} = inspectorIssue.details;
    if (!attributionReportingIssueDetails) {
      console.warn('Attribution Reporting issue without details received.');
      return [];
    }
    return [new AttributionReportingIssue(attributionReportingIssueDetails, issuesModel)];
  }
}
