// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {html, render} from '../../ui/lit/lit.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
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
  issues: Iterable<IssuesManager.LazyLoadImageIssue.LazyLoadImageIssue>;
  issueCategory: IssuesManager.Issue.IssueCategory;
  createElementCell: (element: IssuesManager.Issue.AffectedElement,
                      category: IssuesManager.Issue.IssueCategory) => Promise<Element>;
}

export type View = (input: ViewInput, output: object, target: HTMLElement) => Promise<void>;

export const DEFAULT_VIEW: View = async (input, _output, target) => {
  const templates = [];
  for (const issue of input.issues) {
    for (const element of issue.elements()) {
      templates.push(html`<tr>
        ${await input.createElementCell(element, input.issueCategory)}
      </tr>`);
    }
  }
  render(html`${templates}`, target);
};

export class AffectedLazyLoadImagesView extends AffectedResourcesView {
  readonly #view: View;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  override update(): void {
    this.requestResolver.clear();
    void this.#render();
  }

  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nElements, {n: count});
  }

  async #render(): Promise<void> {
    const issues = this.issue.getLazyLoadImageIssues();
    let count = 0;
    for (const issue of issues) {
      count += issue.elementCount();
    }
    this.updateAffectedResourceCount(count);

    const input = {
      issues,
      issueCategory: this.issue.getCategory(),
      createElementCell: this.createElementCell.bind(this),
    };
    await this.#view(input, {}, this.affectedResources);
  }
}
