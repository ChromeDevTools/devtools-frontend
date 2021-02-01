// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import {AggregatedIssue} from './IssueAggregator.js';
import {IssueView} from './IssuesPane.js';

export class AffectedTrustedWebActivityIssueDetailsView extends AffectedResourcesView {
  private issue: AggregatedIssue;

  constructor(parentView: IssueView, issue: AggregatedIssue) {
    super(parentView, {singular: ls`resource`, plural: ls`resources`});
    this.issue = issue;
  }

  private appendHeaderCell(element: HTMLElement, textContent: string): void {
    const cell = document.createElement('td');
    cell.classList.add('affected-resource-header');
    cell.textContent = textContent;
    element.append(cell);
  }

  private appendIssueDetailCell(element: HTMLElement, textContent: string): void {
    const cell = document.createElement('td');
    cell.classList.add('affected-resource-cell');
    cell.textContent = textContent;
    element.append(cell);
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
      this.appendHeaderCell(header, ls`Status code`);
      this.appendHeaderCell(header, ls`Url`);
    } else if (this.issue.code() === SDK.TrustedWebActivityIssue.offlineViolationCode) {
      this.appendHeaderCell(header, ls`Url`);
    } else if (this.issue.code() === SDK.TrustedWebActivityIssue.assetlinkViolationCode) {
      this.appendHeaderCell(header, ls`Package name`);
      this.appendHeaderCell(header, ls`Url`);
      this.appendHeaderCell(header, ls`Package signature`);
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
