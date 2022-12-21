// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {type MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description Link title for the Low Text Contrast issue in the Issues panel
   */
  colorAndContrastAccessibility: 'Color and contrast accessibility',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/LowTextContrastIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class LowTextContrastIssue extends Issue {
  #issueDetails: Protocol.Audits.LowTextContrastIssueDetails;

  constructor(issueDetails: Protocol.Audits.LowTextContrastIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super('LowTextContrastIssue', issuesModel);
    this.#issueDetails = issueDetails;
  }

  primaryKey(): string {
    // We intend to keep only one issue per element so other issues for the element will be discarded even
    // if the issue content is slightly different.
    return `${this.code()}-(${this.#issueDetails.violatingNodeId})`;
  }

  getCategory(): IssueCategory {
    return IssueCategory.LowTextContrast;
  }

  details(): Protocol.Audits.LowTextContrastIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription {
    return {
      file: 'LowTextContrast.md',
      links: [
        {
          link: 'https://web.dev/color-and-contrast-accessibility/',
          linkTitle: i18nString(UIStrings.colorAndContrastAccessibility),
        },
      ],
    };
  }

  getKind(): IssueKind {
    return IssueKind.Improvement;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      LowTextContrastIssue[] {
    const lowTextContrastIssueDetails = inspectorIssue.details.lowTextContrastIssueDetails;
    if (!lowTextContrastIssueDetails) {
      console.warn('LowTextContrast issue without details received.');
      return [];
    }
    return [new LowTextContrastIssue(lowTextContrastIssueDetails, issuesModel)];
  }
}
