// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';

import {AffectedElementsView} from './AffectedElementsView.js';
import {AggregatedIssue} from './IssueAggregator.js';
import {IssueView} from './IssuesPane.js';

export class AffectedElementsWithLowContrastView extends AffectedElementsView {
  private aggregateIssue: AggregatedIssue;
  private runningUpdatePromise: Promise<void> = Promise.resolve();

  constructor(parent: IssueView, issue: AggregatedIssue) {
    super(parent, issue);
    this.aggregateIssue = issue;
  }

  update(): void {
    // Ensure that doUpdate is invoked atomically by serializing the update calls
    // because it's not re-entrace safe.
    this.runningUpdatePromise = this.runningUpdatePromise.then(this.doUpdate.bind(this));
  }

  private async doUpdate(): Promise<void> {
    this.clear();
    await this.appendLowContrastElements(this.aggregateIssue.lowContrastIssues());
  }

  private async appendLowContrastElement(issue: SDK.LowTextContrastIssue.LowTextContrastIssue): Promise<void> {
    const row = document.createElement('tr');
    row.classList.add('affected-resource-low-contrast');

    const details = issue.details();

    row.appendChild(await this.renderElementCell(
        {nodeName: details.violatingNodeSelector, backendNodeId: details.violatingNodeId}));
    this.appendIssueDetailCell(row, String(Platform.NumberUtilities.floor(details.contrastRatio)));
    this.appendIssueDetailCell(row, String(details.thresholdAA));
    this.appendIssueDetailCell(row, String(details.thresholdAAA));
    this.appendIssueDetailCell(row, details.fontSize);
    this.appendIssueDetailCell(row, details.fontWeight);

    this.affectedResources.appendChild(row);
  }

  private async appendLowContrastElements(issues: Iterable<SDK.LowTextContrastIssue.LowTextContrastIssue>):
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
      await this.appendLowContrastElement(lowContrastIssue);
    }
    this.updateAffectedResourceCount(count);
  }
}

export const UIStrings = {
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
};
const str_ = i18n.i18n.registerUIStrings('issues/AffectedElementsWithLowContrastView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
