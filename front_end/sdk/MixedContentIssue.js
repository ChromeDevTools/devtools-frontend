// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';

import {Issue, IssueCategory, IssueKind, MarkdownIssueDescription} from './Issue.js';  // eslint-disable-line no-unused-vars
import {IssuesModel} from './IssuesModel.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Label for the link for Mixed Content Issues
  */
  preventingMixedContent: 'Preventing mixed content',
  /**
  *@description The kind of resolution for a mixed content issue
  */
  blocked: 'blocked',
  /**
  *@description The kind of resolution for a mixed content issue
  */
  automaticallyUpgraded: 'automatically upgraded',
  /**
  *@description The kind of resolution for a mixed content issue
  */
  warned: 'warned',
};
const str_ = i18n.i18n.registerUIStrings('sdk/MixedContentIssue.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class MixedContentIssue extends Issue {
  /**
   * @param {!Protocol.Audits.MixedContentIssueDetails} issueDetails
   * @param {!IssuesModel} issuesModel
   */
  constructor(issueDetails, issuesModel) {
    super(Protocol.Audits.InspectorIssueCode.MixedContentIssue, issuesModel);
    this._issueDetails = issueDetails;
  }

  /**
   * @param {string} resolutionStatus
   * @returns {!string}
   */
  static translateStatus(resolutionStatus) {
    const translateStatus = mixedContentStatus.get(resolutionStatus);
    return translateStatus ? translateStatus() : resolutionStatus;
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

  getDetails() {
    return this._issueDetails;
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
      substitutions: undefined,
      issueKind: IssueKind.BreakingChange,
      links:
          [{link: 'https://web.dev/what-is-mixed-content/', linkTitle: i18nString(UIStrings.preventingMixedContent)}],
    };
  }

  /**
  * @override
  */
  primaryKey() {
    return JSON.stringify(this._issueDetails);
  }
}

/** @type {!Map<string, () => string>} */
const mixedContentStatus = new Map([
  ['MixedContentBlocked', i18nLazyString(UIStrings.blocked)],
  ['MixedContentAutomaticallyUpgraded', i18nLazyString(UIStrings.automaticallyUpgraded)],
  ['MixedContentWarning', i18nLazyString(UIStrings.warned)],
]);
