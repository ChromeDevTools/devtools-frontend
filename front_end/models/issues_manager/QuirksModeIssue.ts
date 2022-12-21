// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {type MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description Link title for the Quirks Mode issue in the Issues panel
   */
  documentCompatibilityMode: 'Document compatibility mode',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/QuirksModeIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class QuirksModeIssue extends Issue {
  #issueDetails: Protocol.Audits.QuirksModeIssueDetails;

  constructor(issueDetails: Protocol.Audits.QuirksModeIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    const mode = issueDetails.isLimitedQuirksMode ? 'LimitedQuirksMode' : 'QuirksMode';
    const umaCode = [Protocol.Audits.InspectorIssueCode.QuirksModeIssue, mode].join('::');
    super({code: Protocol.Audits.InspectorIssueCode.QuirksModeIssue, umaCode}, issuesModel);
    this.#issueDetails = issueDetails;
  }

  primaryKey(): string {
    return `${this.code()}-(${this.#issueDetails.documentNodeId})-(${this.#issueDetails.url})`;
  }

  getCategory(): IssueCategory {
    return IssueCategory.QuirksMode;
  }

  details(): Protocol.Audits.QuirksModeIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription {
    return {
      file: 'CompatibilityModeQuirks.md',
      links: [
        {
          link: 'https://web.dev/doctype/',
          linkTitle: i18nString(UIStrings.documentCompatibilityMode),
        },
      ],
    };
  }

  getKind(): IssueKind {
    return IssueKind.Improvement;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      QuirksModeIssue[] {
    const quirksModeIssueDetails = inspectorIssue.details.quirksModeIssueDetails;
    if (!quirksModeIssueDetails) {
      console.warn('Quirks Mode issue without details received.');
      return [];
    }
    return [new QuirksModeIssue(quirksModeIssueDetails, issuesModel)];
  }
}
