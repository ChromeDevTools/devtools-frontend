// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../common/common.js';  // eslint-disable-line rulesdir/es_modules_import

import {Issue, IssueCategory, IssueKind, MarkdownIssueDescription} from './Issue.js';  // eslint-disable-line no-unused-vars
import {IssuesModel} from './IssuesModel.js';  // eslint-disable-line no-unused-vars

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
        link: 'https://web.dev/cors-rfc1918-feedback/',
        linkTitle: ls`CORS for private networks (RFC1918)`,
      }],
    };
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }
}
