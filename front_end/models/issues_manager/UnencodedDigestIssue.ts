// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
  resolveLazyDescription,
} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description Title for HTTP Unencoded Digest specification url
   */
  unencodedDigestHeader: 'HTTP Unencoded Digest specification',
  /**
   *@description Title for the URL of the integration of unencoded-digest and SRI.
   */
  integrityIntegration: 'Server-Initiated Integrity Checks',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/UnencodedDigestIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class UnencodedDigestIssue extends Issue<string> {
  readonly #issueDetails: Protocol.Audits.UnencodedDigestIssueDetails;

  constructor(issueDetails: Protocol.Audits.UnencodedDigestIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(
        {
          code: `${Protocol.Audits.InspectorIssueCode.UnencodedDigestIssue}::${issueDetails.error}`,
          umaCode: `${Protocol.Audits.InspectorIssueCode.UnencodedDigestIssue}::${issueDetails.error}`,
        },
        issuesModel);
    this.#issueDetails = issueDetails;
  }

  details(): Protocol.Audits.UnencodedDigestIssueDetails {
    return this.#issueDetails;
  }

  override primaryKey(): string {
    return JSON.stringify(this.details());
  }

  override getDescription(): MarkdownIssueDescription|null {
    const description: LazyMarkdownIssueDescription = {
      file: `unencodedDigest${this.details().error}.md`,
      links: [
        {
          link: 'https://www.ietf.org/archive/id/draft-ietf-httpbis-unencoded-digest-01.html',
          linkTitle: i18nLazyString(UIStrings.unencodedDigestHeader),
        },
        {
          link: 'https://wicg.github.io/signature-based-sri/#unencoded-digest-validation',
          linkTitle: i18nLazyString(UIStrings.integrityIntegration),
        },
      ],
    };
    return resolveLazyDescription(description);
  }

  override getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  override getKind(): IssueKind {
    return IssueKind.PAGE_ERROR;
  }

  override requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return this.details().request ? [this.details().request] : [];
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      UnencodedDigestIssue[] {
    const details = inspectorIssue.details.unencodedDigestIssueDetails;
    if (!details) {
      console.warn('Unencoded-Digest issue without details received.');
      return [];
    }
    return [new UnencodedDigestIssue(details, issuesModel)];
  }
}
