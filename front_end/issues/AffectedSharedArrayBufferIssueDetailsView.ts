// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import {AggregatedIssue} from './IssueAggregator.js';
import {IssueView} from './IssuesPane.js';

export class AffectedSharedArrayBufferIssueDetailsView extends AffectedResourcesView {
  private issue: AggregatedIssue;

  constructor(parentView: IssueView, issue: AggregatedIssue) {
    super(parentView, {singular: ls`violation`, plural: ls`violations`});
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

  private appendType(element: HTMLElement, type: Protocol.Audits.SharedArrayBufferIssueType): void {
    const status = document.createElement('td');
    switch (type) {
      case Protocol.Audits.SharedArrayBufferIssueType.CreationIssue:
        status.textContent = ls`Instantiation`;
        UI.Tooltip.Tooltip.install(
            status, ls`A SharedArrayBuffer was instantiated in a context that is not cross-origin isolated`);
        break;
      case Protocol.Audits.SharedArrayBufferIssueType.TransferIssue:
        status.textContent = ls`Transfer`;
        UI.Tooltip.Tooltip.install(
            status, ls`SharedArrayBuffer was transfered to a context that is not cross-origin isolated`);
        break;
    }
    element.appendChild(status);
  }

  private appendDetails(sabIssues: Iterable<SDK.SharedArrayBufferIssue.SharedArrayBufferIssue>): void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, ls`Source Location`);
    this.appendColumnTitle(header, ls`Trigger`);
    this.appendColumnTitle(header, ls`Status`);

    this.affectedResources.appendChild(header);
    let count = 0;
    for (const sabIssue of sabIssues) {
      count++;
      this.appendDetail(sabIssue);
    }
    this.updateAffectedResourceCount(count);
  }

  private appendDetail(sabIssue: SDK.SharedArrayBufferIssue.SharedArrayBufferIssue): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-directive');

    const sabIssueDetails = sabIssue.details();
    this.appendSourceLocation(element, sabIssueDetails.sourceCodeLocation);
    this.appendType(element, sabIssueDetails.type);
    this.appendStatus(element, sabIssueDetails.isWarning);

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this.appendDetails(this.issue.sharedArrayBufferIssues());
  }
}
