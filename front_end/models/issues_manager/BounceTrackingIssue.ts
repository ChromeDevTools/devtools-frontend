// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Title for Bounce Tracking Mitigation explainer url link.
   */
  bounceTrackingMitigations: 'Bounce tracking mitigations',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/BounceTrackingIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class BounceTrackingIssue extends Issue<Protocol.Audits.BounceTrackingIssueDetails> {
  constructor(issueDetails: Protocol.Audits.BounceTrackingIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel|null) {
    super(Protocol.Audits.InspectorIssueCode.BounceTrackingIssue, issueDetails, issuesModel);
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  getDescription(): MarkdownIssueDescription {
    return {
      file: 'bounceTrackingMitigations.md',
      links: [
        {
          link: 'https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations',
          linkTitle: i18nString(UIStrings.bounceTrackingMitigations),
        },
      ],
    };
  }

  getKind(): IssueKind {
    return IssueKind.BREAKING_CHANGE;
  }

  primaryKey(): string {
    return JSON.stringify(this.details());
  }

  override trackingSites(): Iterable<string> {
    return this.details().trackingSites;
  }

  static fromInspectorIssue(
      issuesModel: SDK.IssuesModel.IssuesModel|null,
      inspectorIssue: Protocol.Audits.InspectorIssue): BounceTrackingIssue[] {
    const details = inspectorIssue.details.bounceTrackingIssueDetails;
    if (!details) {
      console.warn('Bounce tracking issue without details received.');
      return [];
    }
    return [new BounceTrackingIssue(details, issuesModel)];
  }
}
