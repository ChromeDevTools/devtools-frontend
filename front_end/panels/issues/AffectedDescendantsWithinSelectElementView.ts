// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {html, type LitTemplate, render} from '../../ui/lit/lit.js';
import * as PanelsCommon from '../common/common.js';

import {AffectedElementsView} from './AffectedElementsView.js';
import {AffectedItem} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

export interface SelectDescendantRow {
  backendNodeId: Protocol.DOM.BackendNodeId;
  nodeName: string;
  target: SDK.Target.Target|null;
  onElementClick: () => void;
}

export interface ViewInput {
  rows: SelectDescendantRow[];
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const renderElementCell = (row: SelectDescendantRow): LitTemplate => {
    if (!row.target) {
      return html`<td>${row.nodeName || i18nString(UIStrings.unavailable)}</td>`;
    }
    const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(row.target, row.backendNodeId);
    // clang-format off
    return html`
      <td class="affected-resource-element devtools-link">
        ${PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(
            deferredDOMNode, {textContent: row.nodeName || undefined, onClick: row.onElementClick})}
      </td>
    `;
    // clang-format on
  };

  // clang-format off
  render(html`
    ${input.rows.map(row => html`
      <tr class="affected-resource-select-element-descendant">
        ${renderElementCell(row)}
      </tr>
    `)}
  `, target);
  // clang-format on
};

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected
   * descendant nodes.
   */
  nDescendants: '{n, plural, =1 {# descendant} other {# descendants}}',
  /**
   * @description Link text in the Issues panel for a disallowed descendant
   * node.
   */
  disallowedNode: 'Disallowed descendant',
  /**
   * @description Fallback text in the Issues panel when an HTML element is
   * unavailable in the affected resources table.
   */
  unavailable: 'Unavailable',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedDescendantsWithinSelectElementView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedDescendantsWithinSelectElementView extends AffectedElementsView {
  readonly #view: View;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  override update(): void {
    this.requestResolver.clear();
    this.#appendDisallowedSelectDescendants(this.issue.getElementAccessibilityIssues());
  }

  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nDescendants, {n: count});
  }

  #createDisallowedSelectDescendantRow(issue: IssuesManager.ElementAccessibilityIssue.ElementAccessibilityIssue):
      SelectDescendantRow {
    const details = issue.details();
    const target = issue.model()?.target() || null;
    const category = issue.getCategory();
    return {
      nodeName: i18nString(UIStrings.disallowedNode),
      backendNodeId: details.nodeId,
      target,
      onElementClick: () => {
        Host.userMetrics.issuesPanelResourceOpened(category, AffectedItem.ELEMENT);
      },
    };
  }

  #appendDisallowedSelectDescendants(
      issues: Iterable<IssuesManager.ElementAccessibilityIssue.ElementAccessibilityIssue>): void {
    const rows = Array.from(issues, issue => this.#createDisallowedSelectDescendantRow(issue));
    this.#view({rows}, undefined, this.affectedResources);
    this.updateAffectedResourceCount(rows.length);
  }
}
