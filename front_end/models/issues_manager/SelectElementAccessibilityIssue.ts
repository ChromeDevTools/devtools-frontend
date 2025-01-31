// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
  resolveLazyDescription
} from './MarkdownIssueDescription.js';

export class SelectElementAccessibilityIssue extends Issue {
  private issueDetails: Protocol.Audits.SelectElementAccessibilityIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.SelectElementAccessibilityIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel,
      issueId?: Protocol.Audits.IssueId) {
    const issueCode = [
      Protocol.Audits.InspectorIssueCode.SelectElementAccessibilityIssue,
      issueDetails.selectElementAccessibilityIssueReason,
    ].join('::');
    super(issueCode, issuesModel, issueId);
    this.issueDetails = issueDetails;
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getDescription(): MarkdownIssueDescription|null {
    if (this.issueDetails.hasDisallowedAttributes &&
        (this.issueDetails.selectElementAccessibilityIssueReason !==
         Protocol.Audits.SelectElementAccessibilityIssueReason.InteractiveContentOptionChild)) {
      return {
        file: 'selectElementAccessibilityInteractiveContentAttributesSelectDescendant.md',
        links: [],
      };
    }
    const description = issueDescriptions.get(this.issueDetails.selectElementAccessibilityIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  getKind(): IssueKind {
    return IssueKind.PAGE_ERROR;
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  details(): Protocol.Audits.SelectElementAccessibilityIssueDetails {
    return this.issueDetails;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      SelectElementAccessibilityIssue[] {
    const selectElementAccessibilityIssueDetails = inspectorIssue.details.selectElementAccessibilityIssueDetails;
    if (!selectElementAccessibilityIssueDetails) {
      console.warn('Select Element Accessibility issue without details received.');
      return [];
    }
    return [new SelectElementAccessibilityIssue(
        selectElementAccessibilityIssueDetails, issuesModel, inspectorIssue.issueId)];
  }
}

const issueDescriptions: Map<Protocol.Audits.SelectElementAccessibilityIssueReason, LazyMarkdownIssueDescription> =
    new Map([
      [
        Protocol.Audits.SelectElementAccessibilityIssueReason.DisallowedSelectChild,
        {
          file: 'selectElementAccessibilityDisallowedSelectChild.md',
          links: [],
        },
      ],
      [
        Protocol.Audits.SelectElementAccessibilityIssueReason.DisallowedOptGroupChild,
        {
          file: 'selectElementAccessibilityDisallowedOptGroupChild.md',
          links: [],
        },
      ],
      [
        Protocol.Audits.SelectElementAccessibilityIssueReason.NonPhrasingContentOptionChild,
        {
          file: 'selectElementAccessibilityNonPhrasingContentOptionChild.md',
          links: [],
        },
      ],
      [
        Protocol.Audits.SelectElementAccessibilityIssueReason.InteractiveContentOptionChild,
        {
          file: 'selectElementAccessibilityInteractiveContentOptionChild.md',
          links: [],
        },
      ],
      [
        Protocol.Audits.SelectElementAccessibilityIssueReason.InteractiveContentLegendChild,
        {
          file: 'selectElementAccessibilityInteractiveContentLegendChild.md',
          links: [],
        },
      ],
    ]);
