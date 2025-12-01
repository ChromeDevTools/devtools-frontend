// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as UI from '../../ui/legacy/legacy.js';

import {AffectedElementsView} from './AffectedElementsView.js';

const UIStrings = {
  /**
   * @description Noun for singular or plural number of affected element resource indication in issue view.
   */
  nElements: '{n, plural, =1 {# element} other {# elements}}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedPermissionElementsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedPermissionElementsView extends AffectedElementsView {
  override update(): void {
    this.clear();
    void this.#appendAffectedElements(this.issue.getPermissionElementIssues());
  }

  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nElements, {n: count});
  }

  async #appendAffectedElements(issues: Iterable<IssuesManager.PermissionElementIssue.PermissionElementIssue>):
      Promise<void> {
    let count = 0;
    for (const issue of issues) {
      for (const element of issue.elements()) {
        const rowElement = UI.Fragment.html`
    <tr>
      ${await this.createElementCell(element, this.issue.getCategory())}
    </tr>`;
        this.affectedResources.appendChild(rowElement);
        count++;
      }
    }
    this.updateAffectedResourceCount(count);
  }
}
