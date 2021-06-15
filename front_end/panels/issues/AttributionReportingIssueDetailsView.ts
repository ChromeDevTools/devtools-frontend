// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';

import {AffectedItem, AffectedResourcesView} from './AffectedResourcesView.js';

import type {AggregatedIssue} from './IssueAggregator.js';
import type {IssueView} from './IssueView.js';

const UIStrings = {
  /**
   * @description Label for number of rows in the issue details table.
   */
  nViolations: '{n, plural, =1 {# violation} other {# violations}}',
  /**
   * @description Noun, label for the column showing the associated frame in the issue details table.
   * The associated frame can either be the "main frame" (or main window), or an HTML iframe.
   */
  frame: 'Frame',
  /**
   * @description Noun, label for the column showing the associated HTML element in the issue details table.
   */
  element: 'Element',
  /**
   * @description Noun, label for the column showing the associated network request in the issue details table.
   */
  request: 'Request',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AttributionReportingIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AttributionReportingIssueDetailsView extends AffectedResourcesView {
  constructor(parentView: IssueView, private issue: AggregatedIssue) {
    super(parentView);
  }

  protected override getResourceNameWithCount(count: number): string {
    return i18nString(UIStrings.nViolations, {n: count});
  }

  override update(): void {
    this.clear();
    const issues = this.issue.getAttributionReportingIssues();
    if (issues.size > 0) {
      this.appendDetails(issues.values().next().value.code(), issues);
    } else {
      this.updateAffectedResourceCount(0);
    }
  }

  private appendDetails(
      issueCode: IssuesManager.AttributionReportingIssue.IssueCode,
      issues: Iterable<IssuesManager.AttributionReportingIssue.AttributionReportingIssue>): void {
    const header = document.createElement('tr');
    switch (issueCode) {
      case IssuesManager.AttributionReportingIssue.IssueCode.PermissionPolicyDisabled:
        this.appendColumnTitle(header, i18nString(UIStrings.frame));
        this.appendColumnTitle(header, i18nString(UIStrings.element));
        this.appendColumnTitle(header, i18nString(UIStrings.request));
        break;
      default:
        Platform.assertUnhandled<
            IssuesManager.AttributionReportingIssue.IssueCode.AttributionSourceUntrustworthyFrameOrigin|
            IssuesManager.AttributionReportingIssue.IssueCode.AttributionSourceUntrustworthyOrigin|
            IssuesManager.AttributionReportingIssue.IssueCode.AttributionUntrustworthyFrameOrigin|
            IssuesManager.AttributionReportingIssue.IssueCode.AttributionUntrustworthyOrigin|
            IssuesManager.AttributionReportingIssue.IssueCode.InvalidAttributionData|
            IssuesManager.AttributionReportingIssue.IssueCode.InvalidAttributionSourceEventId|
            IssuesManager.AttributionReportingIssue.IssueCode.MissingAttributionData>(issueCode);
    }

    this.affectedResources.appendChild(header);
    let count = 0;
    for (const issue of issues) {
      count++;
      this.appendDetail(issueCode, issue);
    }
    this.updateAffectedResourceCount(count);
  }

  private async appendDetail(
      issueCode: IssuesManager.AttributionReportingIssue.IssueCode,
      issue: IssuesManager.AttributionReportingIssue.AttributionReportingIssue): Promise<void> {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-directive');

    const opts = {
      additionalOnClickAction(): void {
        Host.userMetrics.issuesPanelResourceOpened(
            IssuesManager.Issue.IssueCategory.AttributionReporting, AffectedItem.Element);
      },
    };

    const details = issue.issueDetails;

    switch (issueCode) {
      case IssuesManager.AttributionReportingIssue.IssueCode.PermissionPolicyDisabled:
        if (details.frame) {
          element.appendChild(this.createFrameCell(details.frame.frameId, issue));
        } else {
          this.appendIssueDetailCell(element, '');
        }

        if (details.violatingNodeId !== undefined) {
          const target = issue.model()?.target() || null;
          element.appendChild(await this.createElementCell(
              {backendNodeId: details.violatingNodeId, target, nodeName: 'Attribution source element'},
              issue.getCategory()));
        } else {
          this.appendIssueDetailCell(element, '');
        }

        if (details.request) {
          element.appendChild(this.createRequestCell(details.request, opts));
        } else {
          this.appendIssueDetailCell(element, '');
        }
        break;
    }

    this.affectedResources.appendChild(element);
  }
}
