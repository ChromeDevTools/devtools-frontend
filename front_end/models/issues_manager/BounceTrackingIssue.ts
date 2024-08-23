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
   *@description Title for Bounce Tracking Mitigation explainer url link.
   */
  bounceTrackingMitigations: 'Bounce tracking mitigations',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/BounceTrackingIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class BounceTrackingIssue extends Issue {
  readonly #issueDetails: Protocol.Audits.BounceTrackingIssueDetails;

  constructor(issueDetails: Protocol.Audits.BounceTrackingIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(Protocol.Audits.InspectorIssueCode.BounceTrackingIssue, issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  getDescription(): MarkdownIssueDescription {
    return {
      file: 'bounceTrackingMitigations.md',
      links: [
        {
          link: 'https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations',
          linkTitle: i18nString(UIStrings.bounceTrackingMitigations),
        },
      ],
    };
  }

  details(): Protocol.Audits.BounceTrackingIssueDetails {
    return this.#issueDetails;
  }

  getKind(): IssueKind {
    return IssueKind.BREAKING_CHANGE;
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  override trackingSites(): Iterable<string> {
    if (this.#issueDetails.trackingSites) {
      return this.#issueDetails.trackingSites;
    }
    return [];
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      BounceTrackingIssue[] {
    const details = inspectorIssue.details.bounceTrackingIssueDetails;
    if (!details) {
      console.warn('Bounce tracking issue without details received.');
      return [];
    }
    return [new BounceTrackingIssue(details, issuesModel)];
  }
}
