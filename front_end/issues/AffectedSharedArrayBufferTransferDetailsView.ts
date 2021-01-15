// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import {AggregatedIssue} from './IssueAggregator.js';
import {IssueView} from './IssuesPane.js';

export class AffectedSharedArrayBufferTransferDetailsView extends AffectedResourcesView {
  private issue: AggregatedIssue;

  constructor(parentView: IssueView, issue: AggregatedIssue) {
    super(parentView, {singular: ls`directive`, plural: ls`directives`});
    this.issue = issue;
  }

  private appendStatus(element: HTMLElement, isWarning: boolean): void {
    const status = document.createElement('td');
    if (isWarning) {
      status.classList.add('affected-resource-report-only-status');
      status.textContent = ls`warning`;
    } else {
      status.classList.add('affected-resource-blocked-status');
      status.textContent = ls`blocked`;
    }
    element.appendChild(status);
  }

  private appendDetails(sabIssues: Iterable<SDK.SharedArrayBufferTransferIssue.SharedArrayBufferTransferIssue>): void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, ls`Source Location`);
    this.appendColumnTitle(header, ls`Status`);

    this.affectedResources.appendChild(header);
    let count = 0;
    for (const sabIssue of sabIssues) {
      count++;
      this.appendDetail(sabIssue);
    }
    this.updateAffectedResourceCount(count);
  }

  private appendDetail(sabIssue: SDK.SharedArrayBufferTransferIssue.SharedArrayBufferTransferIssue): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-directive');

    const sabIssueDetails = sabIssue.details();
    this.appendSourceLocation(element, sabIssueDetails.sourceCodeLocation);
    this.appendStatus(element, sabIssueDetails.isWarning);

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this.appendDetails(this.issue.sharedArrayBufferTransfersIssues());
  }
}
