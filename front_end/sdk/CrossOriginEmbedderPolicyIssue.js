// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';

import {Issue, IssueCategory, IssueKind, LazyMarkdownIssueDescription, MarkdownIssueDescription, resolveLazyDescription} from './Issue.js';  // eslint-disable-line no-unused-vars
import {IssuesModel} from './IssuesModel.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Link text for a link to external documentation
  */
  coopAndCoep: 'COOP and COEP',
  /**
  *@description Title for an external link to more information in the issues view
  */
  samesiteAndSameorigin: 'Same-Site and Same-Origin',
};
const str_ = i18n.i18n.registerUIStrings('sdk/CrossOriginEmbedderPolicyIssue.js', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
/**
 * @param {!Protocol.Audits.BlockedByResponseReason} reason
 * @return {boolean}
 */
export function isCrossOriginEmbedderPolicyIssue(reason) {
  switch (reason) {
    case Protocol.Audits.BlockedByResponseReason.CoepFrameResourceNeedsCoepHeader:
      return true;
    case Protocol.Audits.BlockedByResponseReason.CoopSandboxedIFrameCannotNavigateToCoopPage:
      return true;
    case Protocol.Audits.BlockedByResponseReason.CorpNotSameOrigin:
      return true;
    case Protocol.Audits.BlockedByResponseReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep:
      return true;
    case Protocol.Audits.BlockedByResponseReason.CorpNotSameSite:
      return true;
  }
  return false;
}

export class CrossOriginEmbedderPolicyIssue extends Issue {
  /**
   * @param {!Protocol.Audits.BlockedByResponseIssueDetails} issueDetails
   * @param {!IssuesModel} issuesModel
   */
  constructor(issueDetails, issuesModel) {
    super(`CrossOriginEmbedderPolicyIssue::${issueDetails.reason}`, issuesModel);
    /** @type {!Protocol.Audits.BlockedByResponseIssueDetails} */
    this._details = issueDetails;
  }

  /**
   * @override
   */
  primaryKey() {
    return `${this.code()}-(${this._details.request.requestId})`;
  }

  /**
   * @override
   * @returns {!Iterable<Protocol.Audits.BlockedByResponseIssueDetails>}
   */
  getBlockedByResponseDetails() {
    return [this._details];
  }

  /**
   * @override
   * @returns {!Iterable<Protocol.Audits.AffectedRequest>}
   */
  requests() {
    return [this._details.request];
  }

  /**
   * @override
   * @return {!IssueCategory}
   */
  getCategory() {
    return IssueCategory.CrossOriginEmbedderPolicy;
  }

  /**
   * @override
   * @returns {?MarkdownIssueDescription}
   */
  getDescription() {
    return resolveLazyDescription(issueDescriptions.get(this.code()));
  }
}

/** @type {!Map<string, !LazyMarkdownIssueDescription>} */
const issueDescriptions = new Map([
  [
    'CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep', {
      file: 'issues/descriptions/CoepCorpNotSameOriginAfterDefaultedToSameOriginByCoep.md',
      substitutions: undefined,
      issueKind: IssueKind.BreakingChange,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: i18nLazyString(UIStrings.samesiteAndSameorigin)},
      ],
    }
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader', {
      file: 'issues/descriptions/CoepFrameResourceNeedsCoepHeader.md',
      substitutions: undefined,
      issueKind: IssueKind.BreakingChange,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
      ],
    }
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CoopSandboxedIframeCannotNavigateToCoopPage', {
      file: 'issues/descriptions/CoepCoopSandboxedIframeCannotNavigateToCoopPage.md',
      substitutions: undefined,
      issueKind: IssueKind.BreakingChange,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
      ],
    }
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CorpNotSameSite', {
      file: 'issues/descriptions/CoepCorpNotSameSite.md',
      substitutions: undefined,
      issueKind: IssueKind.BreakingChange,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: i18nLazyString(UIStrings.samesiteAndSameorigin)},
      ],
    }
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin', {
      file: 'issues/descriptions/CoepCorpNotSameOrigin.md',
      substitutions: undefined,
      issueKind: IssueKind.BreakingChange,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: i18nLazyString(UIStrings.samesiteAndSameorigin)},
      ],
    }
  ],
]);
