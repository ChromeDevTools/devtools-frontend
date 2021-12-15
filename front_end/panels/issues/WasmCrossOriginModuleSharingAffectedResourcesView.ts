// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import type * as Protocol from '../../generated/protocol.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';

const UIStrings = {
  /**
   * @description Label for number of affected resources indication in issue view. The number designates the number of attempts to transfer a module to cross-origin context.
   *
   */
  nModuleTransfers: '{n, plural, =1 {# module} other {# modules}}',
  /**
  *@description Title for a column in an Wasm cross-origin module sharing affected resource view
  */
  wasmModuleUrl: 'Wasm Module URL',
  /**
   * @description Title for a column in an Wasm cross-origin module sharing affected resource view.
   * The issue is about a transfer of a module between different origins (see  https://developer.mozilla.org/en-US/docs/Glossary/Origin).
   * The transfer occurs from a source origin to a target origin.
   */
  sourceOrigin: 'Source Origin',
  /**
   * @description Title for a column in an Wasm cross-origin module sharing affected resource view.
   * The issue is about a transfer of a module between different origins (see  https://developer.mozilla.org/en-US/docs/Glossary/Origin).
   * The transfer occurs from a source origin to a target origin.
   */
  targetOrigin: 'Target Origin',
  /**
  *@description Title for a column in an Wasm cross-origin module sharing affected resource view
  */
  status: 'Status',
  /**
  * @description Indicates that the Wasm module transfer was blocked.
  */
  blocked: 'blocked',
  /**
  * @description Indicated that the Wasm module transfer was not blocked, but only warned about.
  */
  warned: 'warning',
};
const str_ =
    i18n.i18n.registerUIStrings('panels/issues/WasmCrossOriginModuleSharingAffectedResourcesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class WasmCrossOriginModuleSharingAffectedResourcesView extends AffectedResourcesView {
  #appendIssues(issues: Iterable<IssuesManager.WasmCrossOriginModuleSharingIssue.WasmCrossOriginModuleSharingIssue>):
      void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.wasmModuleUrl));
    this.appendColumnTitle(header, i18nString(UIStrings.sourceOrigin));
    this.appendColumnTitle(header, i18nString(UIStrings.targetOrigin));
    this.appendColumnTitle(header, i18nString(UIStrings.status));

    this.affectedResources.appendChild(header);

    let count = 0;
    for (const issue of issues) {
      this.#appendDetails(issue.details());
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nModuleTransfers, {n: count});
  }

  #appendDetails(details: Protocol.Audits.WasmCrossOriginModuleSharingIssueDetails): void {
    const element = document.createElement('tr');

    element.appendChild(this.createIssueDetailCell(details.wasmModuleUrl));
    element.appendChild(this.createIssueDetailCell(details.sourceOrigin));
    element.appendChild(this.createIssueDetailCell(details.targetOrigin));
    element.appendChild(
        this.createIssueDetailCell(details.isWarning ? i18nString(UIStrings.warned) : i18nString(UIStrings.blocked)));

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this.#appendIssues(this.issue.getWasmCrossOriginModuleSharingIssue());
  }
}
