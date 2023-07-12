// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';

import {AffectedItem, AffectedResourcesView} from './AffectedResourcesView.js';

const UIStrings = {
  /**
   * @description Label for number of rows in the issue details table.
   */
  nViolations: '{n, plural, =1 {# violation} other {# violations}}',
  /**
   * @description Noun, label for the column showing the associated HTML element in the issue details table.
   */
  element: 'Element',
  /**
   * @description Noun, label for the column showing the invalid header value in the issue details table.
   */
  invalidHeaderValue: 'Invalid Header Value',
  /**
   * @description Noun, label for the column showing the associated network request in the issue details table.
   */
  request: 'Request',
  /**
   * @description Label for the column showing the invalid URL used in an HTML anchor element ("a link").
   * A origin is (roughly said) the front part of a URL.
   */
  untrustworthyOrigin: 'Untrustworthy origin',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AttributionReportingIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AttributionReportingIssueDetailsView extends AffectedResourcesView {
  protected override getResourceNameWithCount(count: number): string {
    return i18nString(UIStrings.nViolations, {n: count});
  }

  override update(): void {
    this.clear();
    const issues = this.issue.getAttributionReportingIssues();
    if (issues.size > 0) {
      this.#appendDetails(issues.values().next().value.code(), issues);
    } else {
      this.updateAffectedResourceCount(0);
    }
  }

  #appendDetails(
      issueCode: IssuesManager.AttributionReportingIssue.IssueCode,
      issues: Iterable<IssuesManager.AttributionReportingIssue.AttributionReportingIssue>): void {
    const header = document.createElement('tr');
    switch (issueCode) {
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterSourceHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterTriggerHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterOsSourceHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterOsTriggerHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.OsSourceIgnored:
      case IssuesManager.AttributionReportingIssue.IssueCode.OsTriggerIgnored:
      case IssuesManager.AttributionReportingIssue.IssueCode.SourceIgnored:
      case IssuesManager.AttributionReportingIssue.IssueCode.TriggerIgnored:
        this.appendColumnTitle(header, i18nString(UIStrings.request));
        this.appendColumnTitle(header, i18nString(UIStrings.invalidHeaderValue));
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.InsecureContext:
      case IssuesManager.AttributionReportingIssue.IssueCode.UntrustworthyReportingOrigin:
        this.appendColumnTitle(header, i18nString(UIStrings.element));
        this.appendColumnTitle(header, i18nString(UIStrings.request));
        this.appendColumnTitle(header, i18nString(UIStrings.untrustworthyOrigin));
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.PermissionPolicyDisabled:
        this.appendColumnTitle(header, i18nString(UIStrings.element));
        this.appendColumnTitle(header, i18nString(UIStrings.request));
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.SourceAndTriggerHeaders:
      case IssuesManager.AttributionReportingIssue.IssueCode.WebAndOsHeaders:
        this.appendColumnTitle(header, i18nString(UIStrings.request));
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.NavigationRegistrationWithoutTransientUserActivation:
        this.appendColumnTitle(header, i18nString(UIStrings.element));
        break;
    }

    this.affectedResources.appendChild(header);
    let count = 0;
    for (const issue of issues) {
      count++;
      void this.#appendDetail(issueCode, issue);
    }
    this.updateAffectedResourceCount(count);
  }

  async #appendDetail(
      issueCode: IssuesManager.AttributionReportingIssue.IssueCode,
      issue: IssuesManager.AttributionReportingIssue.AttributionReportingIssue): Promise<void> {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-directive');

    const details = issue.issueDetails;

    switch (issueCode) {
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterSourceHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterTriggerHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterOsSourceHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.InvalidRegisterOsTriggerHeader:
      case IssuesManager.AttributionReportingIssue.IssueCode.OsSourceIgnored:
      case IssuesManager.AttributionReportingIssue.IssueCode.OsTriggerIgnored:
      case IssuesManager.AttributionReportingIssue.IssueCode.SourceIgnored:
      case IssuesManager.AttributionReportingIssue.IssueCode.TriggerIgnored:
        this.#appendRequestOrEmptyCell(element, details.request);
        this.appendIssueDetailCell(element, details.invalidParameter || '');
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.InsecureContext:
      case IssuesManager.AttributionReportingIssue.IssueCode.UntrustworthyReportingOrigin:
        await this.#appendElementOrEmptyCell(element, issue);
        this.#appendRequestOrEmptyCell(element, details.request);
        this.appendIssueDetailCell(element, details.invalidParameter || '');
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.PermissionPolicyDisabled:
        await this.#appendElementOrEmptyCell(element, issue);
        this.#appendRequestOrEmptyCell(element, details.request);
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.SourceAndTriggerHeaders:
      case IssuesManager.AttributionReportingIssue.IssueCode.WebAndOsHeaders:
        this.#appendRequestOrEmptyCell(element, details.request);
        break;
      case IssuesManager.AttributionReportingIssue.IssueCode.NavigationRegistrationWithoutTransientUserActivation:
        await this.#appendElementOrEmptyCell(element, issue);
        break;
    }

    this.affectedResources.appendChild(element);
  }

  async #appendElementOrEmptyCell(
      parent: HTMLElement, issue: IssuesManager.AttributionReportingIssue.AttributionReportingIssue): Promise<void> {
    const details = issue.issueDetails;
    if (details.violatingNodeId !== undefined) {
      const target = issue.model()?.target() || null;
      parent.appendChild(await this.createElementCell(
          {backendNodeId: details.violatingNodeId, target, nodeName: 'Attribution source element'},
          issue.getCategory()));
    } else {
      this.appendIssueDetailCell(parent, '');
    }
  }

  #appendRequestOrEmptyCell(parent: HTMLElement, request?: Protocol.Audits.AffectedRequest): void {
    if (!request) {
      this.appendIssueDetailCell(parent, '');
      return;
    }

    const opts = {
      additionalOnClickAction(): void {
        Host.userMetrics.issuesPanelResourceOpened(
            IssuesManager.Issue.IssueCategory.AttributionReporting, AffectedItem.Request);
      },
    };
    parent.appendChild(this.createRequestCell(request, opts));
  }
}
