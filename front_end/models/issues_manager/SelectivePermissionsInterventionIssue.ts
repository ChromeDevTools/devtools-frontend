// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Title for a learn more link in Selective Permissions Intervention issue description
   */
  selectivePermissionsIntervention: 'Selective Permissions Intervention',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/SelectivePermissionsInterventionIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SelectivePermissionsInterventionIssue extends
    Issue<Protocol.Audits.SelectivePermissionsInterventionIssueDetails> {
  constructor(
      issueDetails: Protocol.Audits.SelectivePermissionsInterventionIssueDetails,
      issuesModel: SDK.IssuesModel.IssuesModel|null) {
    super(Protocol.Audits.InspectorIssueCode.SelectivePermissionsInterventionIssue, issueDetails, issuesModel);
  }

  primaryKey(): string {
    return `${Protocol.Audits.InspectorIssueCode.SelectivePermissionsInterventionIssue}-${
        JSON.stringify(this.details())}`;
  }

  getDescription(): MarkdownIssueDescription {
    return {
      file: 'selectivePermissionsIntervention.md',
      links: [
        {
          link: 'https://crbug.com/435223477',
          linkTitle: i18nString(UIStrings.selectivePermissionsIntervention),
        },
      ],
    };
  }

  getCategory(): IssueCategory {
    return IssueCategory.SELECTIVE_PERMISSIONS_INTERVENTION;
  }

  getKind(): IssueKind {
    return IssueKind.PAGE_ERROR;
  }

  static fromInspectorIssue(
      issuesModel: SDK.IssuesModel.IssuesModel|null,
      inspectorIssue: Protocol.Audits.InspectorIssue): SelectivePermissionsInterventionIssue[] {
    const selectivePermissionsInterventionIssueDetails =
        inspectorIssue.details.selectivePermissionsInterventionIssueDetails;
    if (!selectivePermissionsInterventionIssueDetails) {
      console.warn('Selective Permissions Intervention issue without details received.');
      return [];
    }
    return [new SelectivePermissionsInterventionIssue(selectivePermissionsInterventionIssueDetails, issuesModel)];
  }
}
