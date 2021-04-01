// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';

import {Issue, IssueCategory, IssueKind, MarkdownIssueDescription} from './Issue.js';
import type {IssuesModel} from './IssuesModel.js';

const UIStrings = {
  /**
  *@description Title for a learn more link in Heavy Ads issue description
  */
  handlingHeavyAdInterventions: 'Handling Heavy Ad Interventions',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/HeavyAdIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class HeavyAdIssue extends Issue {
  private issueDetails: Protocol.Audits.HeavyAdIssueDetails;

  constructor(issueDetails: Protocol.Audits.HeavyAdIssueDetails, issuesModel: IssuesModel) {
    const umaCode = [Protocol.Audits.InspectorIssueCode.HeavyAdIssue, issueDetails.reason].join('::');
    super({code: Protocol.Audits.InspectorIssueCode.HeavyAdIssue, umaCode}, issuesModel);
    this.issueDetails = issueDetails;
  }

  details(): Protocol.Audits.HeavyAdIssueDetails {
    return this.issueDetails;
  }

  primaryKey(): string {
    return `${Protocol.Audits.InspectorIssueCode.HeavyAdIssue}-${JSON.stringify(this.issueDetails)}`;
  }

  getDescription(): MarkdownIssueDescription {
    return {
      file: 'issues/descriptions/heavyAd.md',
      substitutions: undefined,
      links: [
        {
          link: 'https://developers.google.com/web/updates/2020/05/heavy-ad-interventions',
          linkTitle: i18nString(UIStrings.handlingHeavyAdInterventions),
        },
      ],
    };
  }

  getCategory(): IssueCategory {
    return IssueCategory.HeavyAd;
  }

  getKind(): IssueKind {
    switch (this.issueDetails.resolution) {
      case Protocol.Audits.HeavyAdResolutionStatus.HeavyAdBlocked:
        return IssueKind.PageError;
      case Protocol.Audits.HeavyAdResolutionStatus.HeavyAdWarning:
        return IssueKind.BreakingChange;
    }
  }
}
