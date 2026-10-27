// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as PanelsCommon from '../common/common.js';

import {AffectedItem, AffectedResourcesView, type FrameCellData, renderFrameCell} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

const {widget} = UI.Widget;

export type {FrameCellData};

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected resources
   * in the generic issue affected resources table.
   */
  nResources: '{n, plural, =1 {# resource} other {# resources}}',
  /**
   * @description Column header in the Issues panel for frames in the generic
   * issue affected resources table.
   */
  frameId: 'Frame',
  /**
   * @description Link text in the Issues panel for the violating DOM node in
   * the generic issue affected resources table.
   */
  violatingNode: 'Violating node',
  /**
   * @description Fallback text in the Issues panel when an HTML element is
   * unavailable in the affected resources table.
   */
  unavailable: 'Unavailable',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/issues/GenericIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ElementCellData {
  nodeName: string;
  // Resolved in the presenter; `undefined` when the issue has no target.
  deferredNode?: SDK.DOMModel.DeferredDOMNode;
  onElementClick: () => void;
}

export interface GenericIssueRow {
  frame?: FrameCellData;
  element?: ElementCellData;
}

export interface ViewInput {
  showFrameHeader: boolean;
  rows: GenericIssueRow[];
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const renderElementCell = (element: ElementCellData): LitTemplate => {
    const {deferredNode} = element;
    if (!deferredNode) {
      return html`<td>${element.nodeName || i18nString(UIStrings.unavailable)}</td>`;
    }
    // clang-format off
    return html`
      <td class="affected-resource-element devtools-link">
        ${widget(PanelsCommon.DOMLinkifier.DeferredDOMNodeLink, {
          deferredNode,
          options: {textContent: element.nodeName || undefined, onClick: element.onElementClick},
        })}
      </td>
    `;
    // clang-format on
  };

  // clang-format off
  render(html`
    ${input.showFrameHeader ? html`
      <tr>
        <td class="affected-resource-header">${i18nString(UIStrings.frameId)}</td>
      </tr>
    ` : nothing}
    ${input.rows.map(row => html`
      <tr class="affected-resource-directive">
        ${row.frame ? renderFrameCell(row.frame) : nothing}
        ${row.element ? renderElementCell(row.element) : nothing}
      </tr>
    `)}
  `, target);
  // clang-format on
};

export class GenericIssueDetailsView extends AffectedResourcesView {
  readonly #view: View;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nResources, {n: count});
  }

  #appendDetails(genericIssues: ReadonlySet<IssuesManager.GenericIssue.GenericIssue>): void {
    const sampleIssueDetails = genericIssues.values().next().value?.details();
    const showFrameHeader = Boolean(sampleIssueDetails?.frameId);

    // Only some `GenericIssueDetails` have information for the 'affected
    // resources' view. We'll count them and only call `#createDetailRow` for
    // those. `updateAffectedResourceCount` will hide the section if the
    // count is zero.
    const rows: GenericIssueRow[] = [];
    for (const genericIssue of genericIssues) {
      const hasAffectedResource = genericIssue.details().frameId || genericIssue.details().violatingNodeId;
      if (hasAffectedResource) {
        rows.push(this.#createDetailRow(genericIssue));
      }
    }
    this.#view({showFrameHeader, rows}, undefined, this.affectedResources);
    this.updateAffectedResourceCount(rows.length);
  }

  #createDetailRow(genericIssue: IssuesManager.GenericIssue.GenericIssue): GenericIssueRow {
    const details = genericIssue.details();
    const category = genericIssue.getCategory();
    const frame = details.frameId ? this.createFrameCellData(details.frameId, category) : undefined;
    let element: ElementCellData|undefined;
    if (details.violatingNodeId) {
      const target = genericIssue.model()?.target();
      element = {
        nodeName: this.#violatingNodeIdName(details.errorType),
        deferredNode: target ? new SDK.DOMModel.DeferredDOMNode(target, details.violatingNodeId) : undefined,
        onElementClick: () => {
          Host.userMetrics.issuesPanelResourceOpened(category, AffectedItem.ELEMENT);
        },
      };
    }
    return {frame, element};
  }

  #violatingNodeIdName(errorType: Protocol.Audits.GenericIssueErrorType): Platform.UIString.LocalizedString {
    switch (errorType) {
      case Protocol.Audits.GenericIssueErrorType.FormLabelForNameError:
        // Since the error is referencing the <label> tag, this string doesn't
        // need to be translated.
        return i18n.i18n.lockedString('Label');
      default:
        return i18nString(UIStrings.violatingNode);
    }
  }

  override clear(): void {
    this.requestResolver.clear();
    this.#view({showFrameHeader: false, rows: []}, undefined, this.affectedResources);
  }

  override update(): void {
    this.requestResolver.clear();
    const issues = this.issue.getGenericIssues();
    if (issues.size > 0) {
      this.#appendDetails(issues);
    } else {
      this.#view({showFrameHeader: false, rows: []}, undefined, this.affectedResources);
      this.updateAffectedResourceCount(0);
    }
  }
}
