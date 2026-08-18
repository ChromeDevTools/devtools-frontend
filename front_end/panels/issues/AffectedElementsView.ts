// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected elements.
   */
  nElements: '{n, plural, =1 {# element} other {# elements}}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedElementsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AffectedElementsView extends AffectedResourcesView {
  async #appendAffectedElements(affectedElements: Iterable<IssuesManager.Issue.AffectedElement>): Promise<void> {
    let count = 0;
    for (const element of affectedElements) {
      await this.#appendAffectedElement(element);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nElements, {n: count});
  }

  async #appendAffectedElement(element: IssuesManager.Issue.AffectedElement): Promise<void> {
    const cellElement = await this.createElementCell(element, this.issue.getCategory());
    const rowElement = document.createElement('tr');
    rowElement.setAttribute('jslog', `${VisualLogging.tableRow('affected-element')}`);
    if (element.backendNodeId) {
      rowElement.setAttribute('data-backend-node-id', String(element.backendNodeId));
    }
    rowElement.appendChild(cellElement);
    this.affectedResources.appendChild(rowElement);
  }

  update(): void {
    this.clear();
    void this.#appendAffectedElements(this.issue.elements());
  }
}
