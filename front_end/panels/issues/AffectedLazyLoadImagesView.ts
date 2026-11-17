// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {html, render} from '../../ui/lit/lit.js';

import {AffectedResourcesView, type ElementCellData, renderElementCell} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected elements for lazy-load image issues.
   */
  nElements: '{n, plural, =1 {# element} other {# elements}}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedLazyLoadImagesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  elements: ElementCellData[];
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    ${input.elements.map(element => html`<tr>${renderElementCell(element)}</tr>`)}
  `, target);
  // clang-format on
};

export class AffectedLazyLoadImagesView extends AffectedResourcesView {
  readonly #view: View;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  override update(): void {
    this.requestResolver.clear();
    this.#render();
  }

  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nElements, {n: count});
  }

  #render(): void {
    const issues = this.issue.getLazyLoadImageIssues();
    const issueCategory = this.issue.getCategory();
    let count = 0;
    const elements: ElementCellData[] = [];
    for (const issue of issues) {
      count += issue.elementCount();
      for (const element of issue.elements()) {
        elements.push(this.createElementCellData(element, issueCategory));
      }
    }
    this.updateAffectedResourceCount(count);
    this.#view({elements}, undefined, this.affectedResources);
  }
}
