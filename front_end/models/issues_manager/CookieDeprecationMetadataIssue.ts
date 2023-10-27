// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {type MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Label for a link for third-party cookie Issues.
   */
  thirdPartyPhaseoutExplained: 'Prepare for phasing out third-party cookies',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/CookieDeprecationMetadataIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// TODO(b/305738703): Move this issue into a warning on CookieIssue.
export class CookieDeprecationMetadataIssue extends Issue {
  readonly #issueDetails: Protocol.Audits.CookieDeprecationMetadataIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.CookieDeprecationMetadataIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(Protocol.Audits.InspectorIssueCode.CookieDeprecationMetadataIssue, issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.Other;
  }

  getDescription(): MarkdownIssueDescription {
    return {
      file: 'cookieWarnMetadataGrantRead.md',
      links: [
        {
          link: 'https://developer.chrome.com/docs/privacy-sandbox/third-party-cookie-phase-out/',
          linkTitle: i18nString(UIStrings.thirdPartyPhaseoutExplained),
        },
      ],
    };
  }

  details(): Protocol.Audits.CookieDeprecationMetadataIssueDetails {
    return this.#issueDetails;
  }

  getKind(): IssueKind {
    return IssueKind.BreakingChange;
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  override metadataAllowedSites(): Iterable<string> {
    if (this.#issueDetails.allowedSites) {
      return this.#issueDetails.allowedSites;
    }
    return [];
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      CookieDeprecationMetadataIssue[] {
    const details = inspectorIssue.details.cookieDeprecationMetadataIssueDetails;
    if (!details) {
      console.warn('Cookie deprecation metadata issue without details received.');
      return [];
    }
    return [new CookieDeprecationMetadataIssue(details, issuesModel)];
  }
}
