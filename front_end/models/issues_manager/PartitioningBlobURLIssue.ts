// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Title for Partitioning BlobURL explainer url link.
   */
  partitioningBlobURL: 'Partitioning BlobURL',
  /**
   * @description Title for Chrome Status Entry url link.
   */
  chromeStatusEntry: 'Chrome Status Entry'
} as const;

const str_ = i18n.i18n.registerUIStrings('models/issues_manager/PartitioningBlobURLIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class PartitioningBlobURLIssue extends Issue {
  readonly #issueDetails: Protocol.Audits.PartitioningBlobURLIssueDetails;

  constructor(issueDetails: Protocol.Audits.PartitioningBlobURLIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(Protocol.Audits.InspectorIssueCode.PartitioningBlobURLIssue, issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  getDescription(): MarkdownIssueDescription {
    const fileName = this.#issueDetails.partitioningBlobURLInfo ===
            Protocol.Audits.PartitioningBlobURLInfo.BlockedCrossPartitionFetching ?
        'fetchingPartitionedBlobURL.md' :
        'navigatingPartitionedBlobURL.md';
    return {
      file: fileName,
      links: [
        {
          link: 'https://developers.google.com/privacy-sandbox/cookies/storage-partitioning',
          linkTitle: i18nString(UIStrings.partitioningBlobURL),
        },
        {
          link: 'https://chromestatus.com/feature/5130361898795008',
          linkTitle: i18nString(UIStrings.chromeStatusEntry),
        },
      ],
    };
  }

  details(): Protocol.Audits.PartitioningBlobURLIssueDetails {
    return this.#issueDetails;
  }

  getKind(): IssueKind {
    return IssueKind.BREAKING_CHANGE;
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      PartitioningBlobURLIssue[] {
    const details = inspectorIssue.details.partitioningBlobURLIssueDetails;
    if (!details) {
      console.warn('Partitioning BlobURL issue without details received.');
      return [];
    }
    return [new PartitioningBlobURLIssue(details, issuesModel)];
  }
}
