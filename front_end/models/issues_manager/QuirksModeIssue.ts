// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Link title for the Quirks Mode issue in the Issues panel
   */
  documentCompatibilityMode: 'Document compatibility mode',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/QuirksModeIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class QuirksModeIssue extends Issue<Protocol.Audits.QuirksModeIssueDetails> {
  constructor(issueDetails: Protocol.Audits.QuirksModeIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel|null) {
    const mode = issueDetails.isLimitedQuirksMode ? 'LimitedQuirksMode' : 'QuirksMode';
    const umaCode = [Protocol.Audits.InspectorIssueCode.QuirksModeIssue, mode].join('::');
    super({code: Protocol.Audits.InspectorIssueCode.QuirksModeIssue, umaCode}, issueDetails, issuesModel);
  }

  primaryKey(): string {
    return `${this.code()}-(${this.details().documentNodeId})-(${this.details().url})`;
  }

  getCategory(): IssueCategory {
    return IssueCategory.QUIRKS_MODE;
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
    return IssueKind.IMPROVEMENT;
  }

  static fromInspectorIssue(
      issuesModel: SDK.IssuesModel.IssuesModel|null,
      inspectorIssue: Protocol.Audits.InspectorIssue): QuirksModeIssue[] {
    const quirksModeIssueDetails = inspectorIssue.details.quirksModeIssueDetails;
    if (!quirksModeIssueDetails) {
      console.warn('Quirks Mode issue without details received.');
      return [];
    }
    return [new QuirksModeIssue(quirksModeIssueDetails, issuesModel)];
  }
}
