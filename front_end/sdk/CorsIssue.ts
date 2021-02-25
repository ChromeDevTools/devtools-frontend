// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './Issue.js';
import type {IssuesModel} from './IssuesModel.js';

export const UIStrings = {
  /**
  *@description Label for the link for CORS private network issues
  */
  corsForPrivateNetworksRfc: 'CORS for private networks (RFC1918)',
};
const str_ = i18n.i18n.registerUIStrings('sdk/CorsIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class CorsIssue extends Issue {
  private issueDetails: Protocol.Audits.CorsIssueDetails;

  constructor(issueDetails: Protocol.Audits.CorsIssueDetails, issuesModel: IssuesModel) {
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

  getDescription(): MarkdownIssueDescription {
    return {
      file: 'issues/descriptions/corsInsecurePrivateNetwork.md',
      substitutions: undefined,
      issueKind: IssueKind.BreakingChange,
      links: [{
        link: 'https://web.dev/cors-rfc1918-guide',
        linkTitle: i18nString(UIStrings.corsForPrivateNetworksRfc),
      }],
    };
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }
}
