// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';

import {
  resolveLazyDescription,
  type MarkdownIssueDescription,
  type LazyMarkdownIssueDescription,
} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description Title for Client Hint specification url link
   */
  clientHintsInfrastructure: 'Client Hints Infrastructure',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/ClientHintIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class ClientHintIssue extends Issue {
  private issueDetails: Protocol.Audits.ClientHintIssueDetails;

  constructor(issueDetails: Protocol.Audits.ClientHintIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(
        {
          code: Protocol.Audits.InspectorIssueCode.ClientHintIssue,
          umaCode: [Protocol.Audits.InspectorIssueCode.ClientHintIssue, issueDetails.clientHintIssueReason].join('::'),
        },
        issuesModel);
    this.issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  details(): Protocol.Audits.ClientHintIssueDetails {
    return this.issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.issueDetails.clientHintIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  override sources(): Iterable<Protocol.Audits.SourceCodeLocation> {
    return [this.issueDetails.sourceCodeLocation];
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.BREAKING_CHANGE;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      ClientHintIssue[] {
    const details = inspectorIssue.details.clientHintIssueDetails;
    if (!details) {
      console.warn('Client Hint issue without details received.');
      return [];
    }
    return [new ClientHintIssue(details, issuesModel)];
  }
}

const issueDescriptions: Map<Protocol.Audits.ClientHintIssueReason, LazyMarkdownIssueDescription> = new Map([
  [
    Protocol.Audits.ClientHintIssueReason.MetaTagAllowListInvalidOrigin,
    {
      file: 'clientHintMetaTagAllowListInvalidOrigin.md',
      links: [{
        link: 'https://wicg.github.io/client-hints-infrastructure/',
        linkTitle: i18nLazyString(UIStrings.clientHintsInfrastructure),
      }],
    },
  ],
  [
    Protocol.Audits.ClientHintIssueReason.MetaTagModifiedHTML,
    {
      file: 'clientHintMetaTagModifiedHTML.md',
      links: [{
        link: 'https://wicg.github.io/client-hints-infrastructure/',
        linkTitle: i18nLazyString(UIStrings.clientHintsInfrastructure),
      }],
    },
  ],
]);
