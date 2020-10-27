// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../common/common.js';  // eslint-disable-line rulesdir/es_modules_import

import {Issue, IssueCategory, IssueKind, MarkdownIssueDescription} from './Issue.js';  // eslint-disable-line no-unused-vars

export class MixedContentIssue extends Issue {
  /**
   * @param {!Protocol.Audits.MixedContentIssueDetails} issueDetails
   */
  constructor(issueDetails) {
    super(Protocol.Audits.InspectorIssueCode.MixedContentIssue);
    this._issueDetails = issueDetails;
  }

  /**
   * @param {string} resolutionStatus
   * @returns {!string}
   */
  static translateStatus(resolutionStatus) {
    return mixedContentStatus.get(resolutionStatus) || resolutionStatus;
  }

  /**
   * @override
   * @returns {!Iterable<Protocol.Audits.AffectedRequest>}
   */
  requests() {
    if (this._issueDetails.request) {
      return [this._issueDetails.request];
    }
    return [];
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.MixedContentIssueDetails>}
   */
  mixedContents() {
    return [this._issueDetails];
  }

  /**
   * @override
   * @return {!IssueCategory}
   */
  getCategory() {
    return IssueCategory.MixedContent;
  }

  /**
   * @override
   * @returns {!MarkdownIssueDescription}
   */
  getDescription() {
    return {
      file: 'issues/descriptions/mixedContent.md',
      issueKind: IssueKind.BreakingChange,
      links: [{link: 'https://web.dev/what-is-mixed-content/', linkTitle: ls`Preventing mixed content`}],
    };
  }

  /**
  * @override
  */
  primaryKey() {
    return JSON.stringify(this._issueDetails);
  }
}

/** @type {!Map<string, string>} */
const mixedContentStatus = new Map([
  ['MixedContentBlocked', ls`blocked`],
  ['MixedContentAutomaticallyUpgraded', ls`automatically upgraded`],
  ['MixedContentWarning', ls`warned`],
]);
