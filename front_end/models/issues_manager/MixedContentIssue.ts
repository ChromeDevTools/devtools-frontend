// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Label for the link for Mixed Content Issues
   */
  preventingMixedContent: 'Preventing mixed content',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/MixedContentIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class MixedContentIssue extends Issue<Protocol.Audits.MixedContentIssueDetails> {
  constructor(issueDetails: Protocol.Audits.MixedContentIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel|null) {
    super(Protocol.Audits.InspectorIssueCode.MixedContentIssue, issueDetails, issuesModel);
  }

  override requests(): Iterable<Protocol.Audits.AffectedRequest> {
    const details = this.details();
    if (details.request) {
      return [details.request];
    }
    return [];
  }

  getCategory(): IssueCategory {
    return IssueCategory.MIXED_CONTENT;
  }

  getDescription(): MarkdownIssueDescription {
    return {
      file: 'mixedContent.md',
      links:
          [{link: 'https://web.dev/what-is-mixed-content/', linkTitle: i18nString(UIStrings.preventingMixedContent)}],
    };
  }

  primaryKey(): string {
    return JSON.stringify(this.details());
  }

  getKind(): IssueKind {
    switch (this.details().resolutionStatus) {
      case Protocol.Audits.MixedContentResolutionStatus.MixedContentAutomaticallyUpgraded:
        return IssueKind.IMPROVEMENT;
      case Protocol.Audits.MixedContentResolutionStatus.MixedContentBlocked:
        return IssueKind.PAGE_ERROR;
      case Protocol.Audits.MixedContentResolutionStatus.MixedContentWarning:
        return IssueKind.IMPROVEMENT;
    }
  }

  static fromInspectorIssue(
      issuesModel: SDK.IssuesModel.IssuesModel|null,
      inspectorIssue: Protocol.Audits.InspectorIssue): MixedContentIssue[] {
    const mixedContentDetails = inspectorIssue.details.mixedContentIssueDetails;
    if (!mixedContentDetails) {
      console.warn('Mixed content issue without details received.');
      return [];
    }
    return [new MixedContentIssue(mixedContentDetails, issuesModel)];
  }
}
