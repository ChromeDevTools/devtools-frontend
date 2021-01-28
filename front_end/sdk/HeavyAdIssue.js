// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../common/common.js';  // eslint-disable-line rulesdir/es_modules_import

import {Issue, IssueCategory, IssueKind, MarkdownIssueDescription} from './Issue.js';  // eslint-disable-line no-unused-vars
import {IssuesModel} from './IssuesModel.js';                                  // eslint-disable-line no-unused-vars

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
          linkTitle: ls`Handling Heavy Ad Interventions`
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
