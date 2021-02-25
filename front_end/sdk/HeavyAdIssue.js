// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';

import {Issue, IssueCategory, IssueKind, MarkdownIssueDescription} from './Issue.js';  // eslint-disable-line no-unused-vars
import {IssuesModel} from './IssuesModel.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Title for a learn more link in Heavy Ads issue description
  */
  handlingHeavyAdInterventions: 'Handling Heavy Ad Interventions',
};
const str_ = i18n.i18n.registerUIStrings('sdk/HeavyAdIssue.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class HeavyAdIssue extends Issue {
  /**
   * @param {!Protocol.Audits.HeavyAdIssueDetails} issueDetails
   * @param {!IssuesModel} issuesModel
   */
  constructor(issueDetails, issuesModel) {
    const umaCode = [Protocol.Audits.InspectorIssueCode.HeavyAdIssue, issueDetails.reason].join('::');
    super({code: Protocol.Audits.InspectorIssueCode.HeavyAdIssue, umaCode}, issuesModel);
    this._issueDetails = issueDetails;
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.HeavyAdIssueDetails>}
   */
  heavyAds() {
    return [this._issueDetails];
  }

  /**
   * @override
   * @returns {string}
   */
  primaryKey() {
    return `${Protocol.Audits.InspectorIssueCode.HeavyAdIssue}-${JSON.stringify(this._issueDetails)}`;
  }

  /**
   * @override
   * @return {MarkdownIssueDescription}
   */
  getDescription() {
    return {
      file: 'issues/descriptions/heavyAd.md',
      substitutions: undefined,
      issueKind: IssueKind.BreakingChange,
      links: [
        {
          link: 'https://developers.google.com/web/updates/2020/05/heavy-ad-interventions',
          linkTitle: i18nString(UIStrings.handlingHeavyAdInterventions)
        },
      ],
    };
  }

  /**
   * @override
   * @return {!IssueCategory}
   */
  getCategory() {
    return IssueCategory.HeavyAd;
  }
}
