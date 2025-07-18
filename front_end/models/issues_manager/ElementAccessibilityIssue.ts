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

export class ElementAccessibilityIssue extends Issue {
  private issueDetails: Protocol.Audits.ElementAccessibilityIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.ElementAccessibilityIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel,
      issueId?: Protocol.Audits.IssueId) {
    const issueCode = [
      Protocol.Audits.InspectorIssueCode.ElementAccessibilityIssue,
      issueDetails.elementAccessibilityIssueReason,
    ].join('::');
    super(issueCode, issuesModel, issueId);
    this.issueDetails = issueDetails;
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getDescription(): MarkdownIssueDescription|null {
    if (this.isInteractiveContentAttributesSelectDescendantIssue()) {
      return {
        file: 'selectElementAccessibilityInteractiveContentAttributesSelectDescendant.md',
        links: [],
      };
    }
    const description = issueDescriptions.get(this.issueDetails.elementAccessibilityIssueReason);
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

  details(): Protocol.Audits.ElementAccessibilityIssueDetails {
    return this.issueDetails;
  }

  isInteractiveContentAttributesSelectDescendantIssue(): boolean {
    return this.issueDetails.hasDisallowedAttributes &&
        (this.issueDetails.elementAccessibilityIssueReason !==
             Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentOptionChild &&
         this.issueDetails.elementAccessibilityIssueReason !==
             Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentSummaryDescendant);
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      ElementAccessibilityIssue[] {
    const elementAccessibilityIssueDetails = inspectorIssue.details.elementAccessibilityIssueDetails;
    if (!elementAccessibilityIssueDetails) {
      console.warn('Element Accessibility issue without details received.');
      return [];
    }
    return [new ElementAccessibilityIssue(elementAccessibilityIssueDetails, issuesModel, inspectorIssue.issueId)];
  }
}

const issueDescriptions = new Map<Protocol.Audits.ElementAccessibilityIssueReason, LazyMarkdownIssueDescription>([
  [
    Protocol.Audits.ElementAccessibilityIssueReason.DisallowedSelectChild,
    {
      file: 'selectElementAccessibilityDisallowedSelectChild.md',
      links: [],
    },
  ],
  [
    Protocol.Audits.ElementAccessibilityIssueReason.DisallowedOptGroupChild,
    {
      file: 'selectElementAccessibilityDisallowedOptGroupChild.md',
      links: [],
    },
  ],
  [
    Protocol.Audits.ElementAccessibilityIssueReason.NonPhrasingContentOptionChild,
    {
      file: 'selectElementAccessibilityNonPhrasingContentOptionChild.md',
      links: [],
    },
  ],
  [
    Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentOptionChild,
    {
      file: 'selectElementAccessibilityInteractiveContentOptionChild.md',
      links: [],
    },
  ],
  [
    Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentLegendChild,
    {
      file: 'selectElementAccessibilityInteractiveContentLegendChild.md',
      links: [],
    },
  ],
  [
    Protocol.Audits.ElementAccessibilityIssueReason.InteractiveContentSummaryDescendant,
    {
      file: 'summaryElementAccessibilityInteractiveContentSummaryDescendant.md',
      links: [],
    },
  ],
]);
