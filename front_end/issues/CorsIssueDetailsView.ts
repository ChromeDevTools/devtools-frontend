// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import {AggregatedIssue} from './IssueAggregator.js';
import {IssueView} from './IssueView.js';

export const UIStrings = {
  /**
  *@description Label for number of affected resources indication in issue view
  */
  item: 'item',
  /**
  *@description Label for number of affected resources indication in issue view
  */
  items: 'items',
  /**
  *@description Value for the status column in Shared Array Buffer issues
  */
  warning: 'warning',
  /**
  *@description The kind of resolution for a mixed content issue
  */
  blocked: 'blocked',
  /**
  *@description Text for the status of something
  */
  status: 'Status',
  /**
  *@description Text for the status of something
  */
  request: 'Request',
  /**
   *@description Text for the status of something
   */
  resourceAddressSpace: 'Resource Address',
  /**
   *@description Text for the status of something
   */
  initiatorAddressSpace: 'Initiator Address',
  /**
  *@description Text for the status of something
  */
  secure: 'secure',
  /**
  *@description Text for the status of something
  */
  insecure: 'insecure',
  /**
  *@description Text for the status of something
  */
  initiatorContext: 'Initiator Context',
};
const str_ = i18n.i18n.registerUIStrings('issues/CorsIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CorsIssueDetailsView extends AffectedResourcesView {
  private issue: AggregatedIssue;

  constructor(parentView: IssueView, issue: AggregatedIssue) {
    super(parentView, {singular: i18nString(UIStrings.item), plural: i18nString(UIStrings.items)});
    this.issue = issue;
  }

  private appendStatus(element: HTMLElement, isWarning: boolean): void {
    const status = document.createElement('td');
    if (isWarning) {
      status.classList.add('affected-resource-report-only-status');
      status.textContent = i18nString(UIStrings.warning);
    } else {
      status.classList.add('affected-resource-blocked-status');
      status.textContent = i18nString(UIStrings.blocked);
    }
    element.appendChild(status);
  }

  private appendDetails(issues: Iterable<SDK.CorsIssue.CorsIssue>): void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.request));
    this.appendColumnTitle(header, i18nString(UIStrings.status));
    this.appendColumnTitle(header, i18nString(UIStrings.resourceAddressSpace));
    this.appendColumnTitle(header, i18nString(UIStrings.initiatorAddressSpace));
    this.appendColumnTitle(header, i18nString(UIStrings.initiatorContext));

    this.affectedResources.appendChild(header);
    let count = 0;
    for (const issue of issues) {
      count++;
      this.appendDetail(issue);
    }
    this.updateAffectedResourceCount(count);
  }

  private appendSecureContextCell(element: HTMLElement, isSecureContext: boolean|undefined): void {
    if (isSecureContext === undefined) {
      this.appendIssueDetailCell(element, '');
      return;
    }
    this.appendIssueDetailCell(
        element, isSecureContext ? i18nString(UIStrings.secure) : i18nString(UIStrings.insecure));
  }


  private appendDetail(issue: SDK.CorsIssue.CorsIssue): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-directive');

    const details = issue.details();
    element.appendChild(this.createRequestCell(details.request));
    this.appendStatus(element, details.isWarning);
    this.appendIssueDetailCell(element, details.resourceIPAddressSpace ?? '');
    this.appendIssueDetailCell(element, details.clientSecurityState?.initiatorIPAddressSpace ?? '');
    this.appendSecureContextCell(element, details.clientSecurityState?.initiatorIsSecureContext);


    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this.appendDetails(this.issue.getCorsIssues());
  }
}
