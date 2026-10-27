// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

const {ifDefined} = Directives;

export interface ElementRow {
  cellElement: Element;
  backendNodeId?: string;
  targetId?: string;
}

export interface ViewInput {
  rows: ElementRow[];
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    ${input.rows.map(row => html`
      <tr jslog=${VisualLogging.tableRow('affected-element')}
          data-backend-node-id=${ifDefined(row.backendNodeId)}
          data-target-id=${ifDefined(row.targetId)}>
        ${row.cellElement}
      </tr>
    `)}
  `, target);
  // clang-format on
};

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected elements.
   */
  nElements: '{n, plural, =1 {# element} other {# elements}}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedElementsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AffectedElementsView extends AffectedResourcesView {
  readonly #view: View;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  async #appendAffectedElements(affectedElements: Iterable<IssuesManager.Issue.AffectedElement>): Promise<void> {
    const rows: ElementRow[] = [];
    for (const element of affectedElements) {
      rows.push(await this.#createAffectedElementRow(element));
    }
    this.#view({rows}, undefined, this.affectedResources);
    this.updateAffectedResourceCount(rows.length);
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nElements, {n: count});
  }

  async #createAffectedElementRow(element: IssuesManager.Issue.AffectedElement): Promise<ElementRow> {
    const cellElement = await this.createElementCell(element, this.issue.getCategory());
    return {
      cellElement,
      backendNodeId: element.backendNodeId ? String(element.backendNodeId) : undefined,
      targetId: element.backendNodeId && element.target ? element.target.id() : undefined,
    };
  }

  update(): void {
    this.requestResolver.clear();
    void this.#appendAffectedElements(this.issue.elements());
  }
}
