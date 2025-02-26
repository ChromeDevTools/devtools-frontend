// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';

const UIStrings = {
  /**
   *@description Label for number of affected resources indication in issue view
   */
  nViolations: '{n, plural, =1 {# violation} other {# violations}}',
  /**
   *@description Value for the status column in SharedArrayBuffer issues
   */
  warning: 'warning',
  /**
   *@description The kind of resolution for a mixed content issue
   */
  blocked: 'blocked',
  /**
   *@description Value for the 'Trigger' column in the SAB affected resources list
   */
  instantiation: 'Instantiation',
  /**
   *@description Tooltip for the 'Trigger' column in the SAB affected resources list
   */
  aSharedarraybufferWas: 'A `SharedArrayBuffer` was instantiated in a context that is not cross-origin isolated',
  /**
   *@description Value for the 'Trigger' column in the SAB affected resources list
   */
  transfer: 'Transfer',
  /**
   *@description Tooltip for the 'Trigger' column in the SAB affected resources list
   */
  sharedarraybufferWasTransferedTo: '`SharedArrayBuffer` was transfered to a context that is not cross-origin isolated',
  /**
   *@description Header for the source location column
   */
  sourceLocation: 'Source Location',
  /**
   *@description Title for the 'Trigger' column in the SAB affected resources list
   */
  trigger: 'Trigger',
  /**
   *@description Title for the status column in the SAB affected resources list
   */
  status: 'Status',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedSharedArrayBufferIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AffectedSharedArrayBufferIssueDetailsView extends AffectedResourcesView {
  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nViolations, {n: count});
  }

  #appendStatus(element: HTMLElement, isWarning: boolean): void {
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

  #appendType(element: HTMLElement, type: Protocol.Audits.SharedArrayBufferIssueType): void {
    const status = document.createElement('td');
    switch (type) {
      case Protocol.Audits.SharedArrayBufferIssueType.CreationIssue:
        status.textContent = i18nString(UIStrings.instantiation);
        status.title = i18nString(UIStrings.aSharedarraybufferWas);
        break;
      case Protocol.Audits.SharedArrayBufferIssueType.TransferIssue:
        status.textContent = i18nString(UIStrings.transfer);
        status.title = i18nString(UIStrings.sharedarraybufferWasTransferedTo);
        break;
    }
    element.appendChild(status);
  }

  #appendDetails(sabIssues: Iterable<IssuesManager.SharedArrayBufferIssue.SharedArrayBufferIssue>): void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.sourceLocation));
    this.appendColumnTitle(header, i18nString(UIStrings.trigger));
    this.appendColumnTitle(header, i18nString(UIStrings.status));

    this.affectedResources.appendChild(header);
    let count = 0;
    for (const sabIssue of sabIssues) {
      count++;
      this.#appendDetail(sabIssue);
    }
    this.updateAffectedResourceCount(count);
  }

  #appendDetail(sabIssue: IssuesManager.SharedArrayBufferIssue.SharedArrayBufferIssue): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-directive');

    const sabIssueDetails = sabIssue.details();
    const location = IssuesManager.Issue.toZeroBasedLocation(sabIssueDetails.sourceCodeLocation);
    this.appendSourceLocation(element, location, sabIssue.model()?.getTargetIfNotDisposed());
    this.#appendType(element, sabIssueDetails.type);
    this.#appendStatus(element, sabIssueDetails.isWarning);

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this.#appendDetails(this.issue.getSharedArrayBufferIssues());
  }
}
