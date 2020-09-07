// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../common/common.js';  // eslint-disable-line rulesdir/es_modules_import

import {Issue, IssueCategory, IssueKind, MarkdownIssueDescription} from './Issue.js';  // eslint-disable-line no-unused-vars

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
   */
  constructor(issueDetails) {
    super(`CrossOriginEmbedderPolicy::${issueDetails.reason}`);
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
  blockedByResponseDetails() {
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
    const description = issueDescriptions.get(this.code());
    if (!description) {
      return null;
    }
    return description;
  }
}

/** @type {!Map<string, !MarkdownIssueDescription>} */
const issueDescriptions = new Map([
  [
    'CrossOriginEmbedderPolicy::CorpNotSameOriginAfterDefaultedToSameOriginByCoep', {
      file: 'issues/descriptions/CoepCorpNotSameOriginAfterDefaultedToSameOriginByCoep.md',
      issueKind: IssueKind.BreakingChange,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: ls`COOP and COEP`},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: ls`Same-Site and Same-Origin`},
      ],
    }
  ],
  [
    'CrossOriginEmbedderPolicy::CoepFrameResourceNeedsCoepHeader', {
      file: 'issues/descriptions/CoepFrameResourceNeedsCoepHeader.md',
      issueKind: IssueKind.BreakingChange,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: ls`COOP and COEP`},
      ],
    }
  ],
  [
    'CrossOriginEmbedderPolicy::CoopSandboxedIframeCannotNavigateToCoopPage', {
      file: 'issues/descriptions/CoepCoopSandboxedIframeCannotNavigateToCoopPage.md',
      issueKind: IssueKind.BreakingChange,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: ls`COOP and COEP`},
      ],
    }
  ],
  [
    'CrossOriginEmbedderPolicy::CorpNotSameSite', {
      file: 'issues/descriptions/CoepCorpNotSameSite.md',
      issueKind: IssueKind.BreakingChange,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: ls`COOP and COEP`},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: ls`Same-Site and Same-Origin`},
      ],
    }
  ],
  [
    'CrossOriginEmbedderPolicy::CorpNotSameOrigin', {
      file: 'issues/descriptions/CoepCorpNotSameOrigin.md',
      issueKind: IssueKind.BreakingChange,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: ls`COOP and COEP`},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: ls`Same-Site and Same-Origin`},
      ],
    }
  ],
]);
