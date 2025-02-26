// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';

import {AffectedElementsView} from './AffectedElementsView.js';

export class AffectedElementsWithLowContrastView extends AffectedElementsView {
  #runningUpdatePromise: Promise<void> = Promise.resolve();

  override update(): void {
    // Ensure that doUpdate is invoked atomically by serializing the update calls
    // because it's not re-entrace safe.
    this.#runningUpdatePromise = this.#runningUpdatePromise.then(this.#doUpdate.bind(this));
  }

  async #doUpdate(): Promise<void> {
    this.clear();
    await this.#appendLowContrastElements(this.issue.getLowContrastIssues());
  }

  async #appendLowContrastElement(issue: IssuesManager.LowTextContrastIssue.LowTextContrastIssue): Promise<void> {
    const row = document.createElement('tr');
    row.classList.add('affected-resource-low-contrast');

    const details = issue.details();
    const target = issue.model()?.target() || null;
    row.appendChild(await this.createElementCell(
        {nodeName: details.violatingNodeSelector, backendNodeId: details.violatingNodeId, target},
        issue.getCategory()));
    this.appendIssueDetailCell(row, String(Platform.NumberUtilities.floor(details.contrastRatio, 2)));
    this.appendIssueDetailCell(row, String(details.thresholdAA));
    this.appendIssueDetailCell(row, String(details.thresholdAAA));
    this.appendIssueDetailCell(row, details.fontSize);
    this.appendIssueDetailCell(row, details.fontWeight);

    this.affectedResources.appendChild(row);
  }

  async #appendLowContrastElements(issues: Iterable<IssuesManager.LowTextContrastIssue.LowTextContrastIssue>):
      Promise<void> {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.element));
    this.appendColumnTitle(header, i18nString(UIStrings.contrastRatio));
    this.appendColumnTitle(header, i18nString(UIStrings.minimumAA));
    this.appendColumnTitle(header, i18nString(UIStrings.minimumAAA));
    this.appendColumnTitle(header, i18nString(UIStrings.textSize));
    this.appendColumnTitle(header, i18nString(UIStrings.textWeight));

    this.affectedResources.appendChild(header);
    let count = 0;
    for (const lowContrastIssue of issues) {
      count++;
      await this.#appendLowContrastElement(lowContrastIssue);
    }
    this.updateAffectedResourceCount(count);
  }
}

const UIStrings = {
  /**
   *@description Column title for the element column in the low contrast issue view
   */
  element: 'Element',
  /**
   *@description Column title for the contrast ratio column in the low contrast issue view
   */
  contrastRatio: 'Contrast ratio',
  /**
   *@description Column title for the minimum AA contrast ratio column in the low contrast issue view
   */
  minimumAA: 'Minimum AA ratio',
  /**
   *@description Column title for the minimum AAA contrast ratio column in the low contrast issue view
   */
  minimumAAA: 'Minimum AAA ratio',
  /**
   *@description Column title for the text size column in the low contrast issue view
   */
  textSize: 'Text size',
  /**
   *@description Column title for the text weight column in the low contrast issue view
   */
  textWeight: 'Text weight',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedElementsWithLowContrastView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
