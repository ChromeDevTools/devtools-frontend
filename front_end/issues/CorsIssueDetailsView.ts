// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../core/i18n/i18n.js';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import {AggregatedIssue} from './IssueAggregator.js';
import {IssueView} from './IssueView.js';

const UIStrings = {
  /**
  *@description Label for number of affected resources indication in issue view
  */
  nItems: '{n, plural, =1 { item} other { items}}',
  /**
  *@description Label for number of affected resources indication in issue view
  */
  item: 'item',
  /**
  *@description Label for number of affected resources indication in issue view
  */
  items: 'items',
  /**
  *@description Value for the status column in SharedArrayBuffer issues
  */
  warning: 'warning',
  /**
  *@description The kind of resolution for a mixed content issue
  */
  blocked: 'blocked',
  /**
  *@description Text for the status column in the item list in the CORS issue details view
  */
  status: 'Status',
  /**
  *@description Text for the column showing the associated network request in the item list in the CORS issue details view
  */
  request: 'Request',
  /**
   *@description Text for the column showing the resource's address in the item list in the CORS issue details view
   */
  resourceAddressSpace: 'Resource Address',
  /**
   *@description Text for the column showing the address of the resource load initiator in the item list in the CORS issue details view
   */
  initiatorAddressSpace: 'Initiator Address',
  /**
  *@description Text for the status of the initiator context
  */
  secure: 'secure',
  /**
  *@description Text for the status of the initiator context
  */
  insecure: 'insecure',
  /**
  *@description Title for a column showing the status of the initiator context. The initiator context is either secure or insecure depending on whether it was loaded via HTTP or HTTPS.
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

  protected getResourceName(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nItems, {n: count});
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
