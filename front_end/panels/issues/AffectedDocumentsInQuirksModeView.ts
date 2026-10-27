// Copyright 2021 The Chromium Authors
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

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected document nodes.
   */
  nDocuments: '{n, plural, =1 { document} other { documents}}',
  /**
   * @description Column header in the Issues panel for document DOM nodes in the quirks mode affected documents table.
   */
  documentInTheDOMTree: 'Document in the DOM tree',
  /**
   * @description Column header in the Issues panel for URLs in the quirks mode affected documents table.
   */
  url: 'URL',
  /**
   * @description Column header in the Issues panel for document quirks mode in the quirks mode affected documents table.
   */
  mode: 'Mode',
  /**
   * @description Fallback text in the Issues panel when an HTML element is unavailable in the affected resources table.
   */
  unavailable: 'Unavailable',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedDocumentsInQuirksModeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface QuirksModeRow {
  nodeName: string;
  backendNodeId: Protocol.DOM.BackendNodeId;
  target: SDK.Target.Target|null;
  onElementClick: () => void;
  mode: string;
  url: string;
}

export interface ViewInput {
  rows: QuirksModeRow[];
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const renderElementCell = (row: QuirksModeRow): LitTemplate => {
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
    <tr>
      <td class="affected-resource-header">${i18nString(UIStrings.documentInTheDOMTree)}</td>
      <td class="affected-resource-header">${i18nString(UIStrings.mode)}</td>
      <td class="affected-resource-header">${i18nString(UIStrings.url)}</td>
    </tr>
    ${input.rows.map(row => html`
      <tr class="affected-resource-quirks-mode">
        ${renderElementCell(row)}
        <td>${row.mode}</td>
        <td>${row.url}</td>
      </tr>
    `)}
  `, target);
  // clang-format on
};

export class AffectedDocumentsInQuirksModeView extends AffectedElementsView {
  readonly #view: View;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  override update(): void {
    this.requestResolver.clear();
    this.#appendQuirksModeDocuments(this.issue.getQuirksModeIssues());
  }

  protected getResourceName(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nDocuments, {n: count});
  }

  #createQuirksModeDocumentRow(issue: IssuesManager.QuirksModeIssue.QuirksModeIssue): QuirksModeRow {
    const details = issue.details();
    const target =
        SDK.FrameManager.FrameManager.instance().getFrame(details.frameId)?.resourceTreeModel().target() || null;
    const category = issue.getCategory();
    return {
      nodeName: 'document',
      backendNodeId: details.documentNodeId,
      target,
      onElementClick: () => {
        Host.userMetrics.issuesPanelResourceOpened(category, AffectedItem.ELEMENT);
      },
      mode: details.isLimitedQuirksMode ? 'Limited Quirks Mode' : 'Quirks Mode',
      url: details.url,
    };
  }

  #appendQuirksModeDocuments(issues: Iterable<IssuesManager.QuirksModeIssue.QuirksModeIssue>): void {
    const rows = Array.from(issues, issue => this.#createQuirksModeDocumentRow(issue));
    this.#view({rows}, undefined, this.affectedResources);
    this.updateAffectedResourceCount(rows.length);
  }
}
