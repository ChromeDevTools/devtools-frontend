// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

export class WebInstallIssue extends Issue<Protocol.Audits.WebInstallIssueDetails> {
  constructor(issueDetails: Protocol.Audits.WebInstallIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel|null) {
    super(`${Protocol.Audits.InspectorIssueCode.WebInstallIssue}::${issueDetails.reason}`, issueDetails, issuesModel);
  }

  override requests(): Protocol.Audits.AffectedRequest[] {
    const {manifestUrl, reason} = this.details();
    if (reason === Protocol.Audits.WebInstallIssueReason.NoManifest || !manifestUrl) {
      return [];
    }
    return [{url: manifestUrl}];
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  getDescription(): MarkdownIssueDescription|null {
    switch (this.details().reason) {
      case Protocol.Audits.WebInstallIssueReason.ManifestParsingOrNetworkError:
        return {file: 'webInstallManifestParsingOrNetworkError.md', links: []};
      case Protocol.Audits.WebInstallIssueReason.StartUrlInvalid:
        return {file: 'webInstallStartUrlInvalid.md', links: []};
      case Protocol.Audits.WebInstallIssueReason.ManifestMissingNameOrShortName:
        return {file: 'webInstallManifestMissingNameOrShortName.md', links: []};
      case Protocol.Audits.WebInstallIssueReason.ManifestMissingId:
        return {file: 'webInstallManifestMissingId.md', links: []};
      case Protocol.Audits.WebInstallIssueReason.NoManifest:
        return {file: 'webInstallNoManifest.md', links: []};
      default:
        console.warn('Unknown WebInstallIssueReason:', this.details().reason);
        return null;
    }
  }

  getKind(): IssueKind {
    return IssueKind.PAGE_ERROR;
  }

  primaryKey(): string {
    return JSON.stringify(this.details());
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel|null,
                            inspectorIssue: Protocol.Audits.InspectorIssue): WebInstallIssue[] {
    const details = inspectorIssue.details.webInstallIssueDetails;
    if (!details) {
      console.warn('Web install issue without details received.');
      return [];
    }
    return [new WebInstallIssue(details, issuesModel)];
  }
}
