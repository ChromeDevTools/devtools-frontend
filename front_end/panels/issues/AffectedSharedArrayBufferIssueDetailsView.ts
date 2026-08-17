// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected violations in the SharedArrayBuffer affected resources table.
   */
  nViolations: '{n, plural, =1 {# violation} other {# violations}}',
  /**
   * @description Violation status in the Issues panel indicating that a SharedArrayBuffer issue produced a warning.
   */
  warning: 'Warning',
  /**
   * @description Violation status in the Issues panel indicating that a SharedArrayBuffer operation was blocked.
   */
  blocked: 'Blocked',
  /**
   * @description Trigger type in the Issues panel indicating that a SharedArrayBuffer was instantiated.
   */
  instantiation: 'Instantiation',
  /**
   * @description Tooltip in the Issues panel explaining that a SharedArrayBuffer was instantiated in a non-cross-origin-isolated context.
   */
  aSharedarraybufferWas: 'A `SharedArrayBuffer` was instantiated in a context that is not cross-origin isolated',
  /**
   * @description Trigger type in the Issues panel indicating that a SharedArrayBuffer was transferred.
   */
  transfer: 'Transfer',
  /**
   * @description Tooltip in the Issues panel explaining that a SharedArrayBuffer was transferred to a non-cross-origin-isolated context.
   */
  sharedarraybufferWasTransferedTo:
      '`SharedArrayBuffer` was transferred to a context that is not cross-origin isolated',
  /**
   * @description Column header in the Issues panel for source locations in the SharedArrayBuffer affected resources table.
   */
  sourceLocation: 'Source location',
  /**
   * @description Column header in the Issues panel for trigger types in the SharedArrayBuffer affected resources table.
   */
  trigger: 'Trigger',
  /**
   * @description Column header in the Issues panel for violation status in the SharedArrayBuffer affected resources table.
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
