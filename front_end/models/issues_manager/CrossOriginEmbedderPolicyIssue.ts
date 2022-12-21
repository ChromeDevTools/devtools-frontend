// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';

import {
  resolveLazyDescription,
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
} from './MarkdownIssueDescription.js';

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
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/CrossOriginEmbedderPolicyIssue.ts', UIStrings);
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
  #issueDetails: Protocol.Audits.BlockedByResponseIssueDetails;

  constructor(issueDetails: Protocol.Audits.BlockedByResponseIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(`CrossOriginEmbedderPolicyIssue::${issueDetails.reason}`, issuesModel);
    this.#issueDetails = issueDetails;
  }

  primaryKey(): string {
    return `${this.code()}-(${this.#issueDetails.request.requestId})`;
  }

  getBlockedByResponseDetails(): Iterable<Protocol.Audits.BlockedByResponseIssueDetails> {
    return [this.#issueDetails];
  }

  requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return [this.#issueDetails.request];
  }

  getCategory(): IssueCategory {
    return IssueCategory.CrossOriginEmbedderPolicy;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.code());
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  getKind(): IssueKind {
    return IssueKind.PageError;
  }
}

const issueDescriptions: Map<string, LazyMarkdownIssueDescription> = new Map([
  [
    'CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep',
    {
      file: 'CoepCorpNotSameOriginAfterDefaultedToSameOriginByCoep.md',
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: i18nLazyString(UIStrings.samesiteAndSameorigin)},
      ],
    },
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader',
    {
      file: 'CoepFrameResourceNeedsCoepHeader.md',
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
      ],
    },
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CoopSandboxedIframeCannotNavigateToCoopPage',
    {
      file: 'CoepCoopSandboxedIframeCannotNavigateToCoopPage.md',
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
      ],
    },
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CorpNotSameSite',
    {
      file: 'CoepCorpNotSameSite.md',
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: i18nLazyString(UIStrings.samesiteAndSameorigin)},
      ],
    },
  ],
  [
    'CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin',
    {
      file: 'CoepCorpNotSameOrigin.md',
      links: [
        {link: 'https://web.dev/coop-coep/', linkTitle: i18nLazyString(UIStrings.coopAndCoep)},
        {link: 'https://web.dev/same-site-same-origin/', linkTitle: i18nLazyString(UIStrings.samesiteAndSameorigin)},
      ],
    },
  ],
]);
