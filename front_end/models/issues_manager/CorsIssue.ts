// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './Issue.js';


const UIStrings = {
  /**
  *@description Label for the link for CORS private network issues
  */
  corsForPrivateNetworksRfc: 'CORS for private networks (RFC1918)',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/CorsIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CorsIssue extends Issue {
  private issueDetails: Protocol.Audits.CorsIssueDetails;

  constructor(issueDetails: Protocol.Audits.CorsIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    const issueCode = [Protocol.Audits.InspectorIssueCode.CorsIssue, issueDetails.corsErrorStatus.corsError].join('::');
    super(issueCode, issuesModel);
    this.issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.Cors;
  }

  details(): Protocol.Audits.CorsIssueDetails {
    return this.issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    switch (this.issueDetails.corsErrorStatus.corsError) {
      case Protocol.Network.CorsError.InsecurePrivateNetwork:
        return {
          file: 'issues/descriptions/corsInsecurePrivateNetwork.md',
          substitutions: undefined,
          links: [{
            link: 'https://web.dev/cors-rfc1918-guide',
            linkTitle: i18nString(UIStrings.corsForPrivateNetworksRfc),
          }],
        };
      default:
        return null;
    }
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getKind(): IssueKind {
    if (this.issueDetails.isWarning &&
        this.issueDetails.corsErrorStatus.corsError === Protocol.Network.CorsError.InsecurePrivateNetwork) {
      return IssueKind.BreakingChange;
    }
    return IssueKind.PageError;
  }

  static fromInspectorIssue(
      issuesModel: SDK.IssuesModel.IssuesModel, inspectorDetails: Protocol.Audits.InspectorIssueDetails): CorsIssue[] {
    const corsIssueDetails = inspectorDetails.corsIssueDetails;
    if (!corsIssueDetails) {
      console.warn('Cors issue without details received.');
      return [];
    }
    return [new CorsIssue(corsIssueDetails, issuesModel)];
  }
}
