// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';

import {Issue, IssueCategory, IssueKind, LazyMarkdownIssueDescription, MarkdownIssueDescription, resolveLazyDescription} from './Issue.js';
import type {IssuesModel} from './IssuesModel.js';

const UIStrings = {
  /**
  *@description Link text for a link to external documentation
  */
  coopAndCoep: 'COOP and COEP',
  /**
  *@description Title for an external link to more information in the issues view
  */
  samesiteAndSameorigin: 'Same-Site and Same-Origin',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/CrossOriginEmbedderPolicyIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export function isCrossOriginEmbedderPolicyIssue(reason: Protocol.Audits.BlockedByResponseReason): boolean {
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
  private issueDetails: Protocol.Audits.BlockedByResponseIssueDetails;

  constructor(issueDetails: Protocol.Audits.BlockedByResponseIssueDetails, issuesModel: IssuesModel) {
    super(`CrossOriginEmbedderPolicyIssue::${issueDetails.reason}`, issuesModel);
    this.issueDetails = issueDetails;
  }

  primaryKey(): string {
    return `${this.code()}-(${this.issueDetails.request.requestId})`;
  }

  getBlockedByResponseDetails(): Iterable<Protocol.Audits.BlockedByResponseIssueDetails> {
    return [this.issueDetails];
  }

  requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return [this.issueDetails.request];
  }

  getCategory(): IssueCategory {
    return IssueCategory.CrossOriginEmbedderPolicy;
  }

  getDescription(): MarkdownIssueDescription|null {
    return resolveLazyDescription(issueDescriptions.get(this.code()));
  }

  getKind(): IssueKind {
    return IssueKind.PageError;
  }
}

const issueDescriptions: Map<string, LazyMarkdownIssueDescription> = new Map([
  [
    'CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep',
    {
      file: 'issues/descriptions/CoepCorpNotSameOriginAfterDefaultedToSameOriginByCoep.md',
      substitutions: undefined,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: i18nLazyString(UIStrings.samesiteAndSameorigin)},
      ],
    },
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader',
    {
      file: 'issues/descriptions/CoepFrameResourceNeedsCoepHeader.md',
      substitutions: undefined,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
      ],
    },
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CoopSandboxedIframeCannotNavigateToCoopPage',
    {
      file: 'issues/descriptions/CoepCoopSandboxedIframeCannotNavigateToCoopPage.md',
      substitutions: undefined,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
      ],
    },
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CorpNotSameSite',
    {
      file: 'issues/descriptions/CoepCorpNotSameSite.md',
      substitutions: undefined,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: i18nLazyString(UIStrings.samesiteAndSameorigin)},
      ],
    },
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin',
    {
      file: 'issues/descriptions/CoepCorpNotSameOrigin.md',
      substitutions: undefined,
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: i18nLazyString(UIStrings.samesiteAndSameorigin)},
      ],
    },
  ],
]);
