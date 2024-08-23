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
  thirdPartyPhaseoutExplained: 'Changes to Chrome\'s treatment of third-party cookies',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/CookieDeprecationMetadataIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// TODO(b/305738703): Move this issue into a warning on CookieIssue.
export class CookieDeprecationMetadataIssue extends Issue {
  readonly #issueDetails: Protocol.Audits.CookieDeprecationMetadataIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.CookieDeprecationMetadataIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    // Set a distinct code for ReadCookie and SetCookie issues, so they are grouped separately.
    const issueCode = Protocol.Audits.InspectorIssueCode.CookieDeprecationMetadataIssue + '_' + issueDetails.operation;
    super(issueCode, issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  getDescription(): MarkdownIssueDescription {
    const fileName = this.#issueDetails.operation === 'SetCookie' ? 'cookieWarnMetadataGrantSet.md' :
                                                                    'cookieWarnMetadataGrantRead.md';

    let optOutText = '';
    if (this.#issueDetails.isOptOutTopLevel) {
      optOutText = '\n\n (Top level site opt-out: ' + this.#issueDetails.optOutPercentage +
          '% - [learn more](gracePeriodStagedControlExplainer))';
    }

    return {
      file: fileName,
      substitutions: new Map([
        ['PLACEHOLDER_topleveloptout', optOutText],
      ]),
      links: [
        {
          link: 'https://goo.gle/changes-to-chrome-browsing',
          linkTitle: i18nString(UIStrings.thirdPartyPhaseoutExplained),
        },
      ],
    };
  }

  details(): Protocol.Audits.CookieDeprecationMetadataIssueDetails {
    return this.#issueDetails;
  }

  getKind(): IssueKind {
    return IssueKind.BREAKING_CHANGE;
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
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
