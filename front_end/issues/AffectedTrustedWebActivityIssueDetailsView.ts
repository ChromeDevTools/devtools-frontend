// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import {AggregatedIssue} from './IssueAggregator.js';
import {IssueView} from './IssuesPane.js';

export const UIStrings = {
  /**
  *@description Label for number of affected resources indication in issue view
  */
  resource: 'resource',
  /**
  *@description Label for number of affected resources indication in issue view
  */
  resources: 'resources',
  /**
  *@description Title for a column in a Trusted Web Activity issue view
  */
  statusCode: 'Status code',
  /**
  *@description Text in Timeline UIUtils of the Performance panel
  */
  url: 'Url',
  /**
  *@description Title for a column in a Trusted Web Activity issue view
  */
  packageName: 'Package name',
  /**
  *@description Title for a column in a Trusted Web Activity issue view
  */
  packageSignature: 'Package signature',
};
const str_ = i18n.i18n.registerUIStrings('issues/AffectedTrustedWebActivityIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AffectedTrustedWebActivityIssueDetailsView extends AffectedResourcesView {
  private issue: AggregatedIssue;

  constructor(parentView: IssueView, issue: AggregatedIssue) {
    super(parentView, {singular: i18nString(UIStrings.resource), plural: i18nString(UIStrings.resources)});
    this.issue = issue;
  }

  private appendDetail(twaIssue: SDK.TrustedWebActivityIssue.TrustedWebActivityIssue): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-row');

    const details = twaIssue.details();
    if (this.issue.code() === SDK.TrustedWebActivityIssue.httpViolationCode && details.httpStatusCode) {
      this.appendIssueDetailCell(element, details.httpStatusCode.toString());
      this.appendIssueDetailCell(element, details.url);
    } else if (this.issue.code() === SDK.TrustedWebActivityIssue.offlineViolationCode) {
      this.appendIssueDetailCell(element, details.url);
    } else if (this.issue.code() === SDK.TrustedWebActivityIssue.assetlinkViolationCode) {
      this.appendIssueDetailCell(element, details.packageName || '');
      this.appendIssueDetailCell(element, details.url);
      this.appendIssueDetailCell(element, details.signature || '');
    }

    this.affectedResources.appendChild(element);
  }

  private appendDetails(twaIssues: Iterable<SDK.TrustedWebActivityIssue.TrustedWebActivityIssue>): void {
    const header = document.createElement('tr');
    if (this.issue.code() === SDK.TrustedWebActivityIssue.httpViolationCode) {
      this.appendColumnTitle(header, i18nString(UIStrings.statusCode));
      this.appendColumnTitle(header, i18nString(UIStrings.url));
    } else if (this.issue.code() === SDK.TrustedWebActivityIssue.offlineViolationCode) {
      this.appendColumnTitle(header, i18nString(UIStrings.url));
    } else if (this.issue.code() === SDK.TrustedWebActivityIssue.assetlinkViolationCode) {
      this.appendColumnTitle(header, i18nString(UIStrings.packageName));
      this.appendColumnTitle(header, i18nString(UIStrings.url));
      this.appendColumnTitle(header, i18nString(UIStrings.packageSignature));
    }
    this.affectedResources.appendChild(header);

    let count = 0;
    for (const twaIssue of twaIssues) {
      this.appendDetail(twaIssue);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  update(): void {
    this.clear();
    this.appendDetails(this.issue.trustedWebActivityIssues());
  }
}
