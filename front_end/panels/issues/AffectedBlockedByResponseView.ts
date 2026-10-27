// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/request_link_icon/request_link_icon.js';

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import type * as Logs from '../../models/logs/logs.js';
import type * as RequestLinkIcon from '../../ui/components/request_link_icon/request_link_icon.js';
import {html, render} from '../../ui/lit/lit.js';

import {AffectedItem, AffectedResourcesView, type FrameCellData, renderFrameCell} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected network
   * requests.
   */
  nRequests: '{n, plural, =1 {# request} other {# requests}}',
  /**
   * @description Column header in the Issues panel for network requests in the
   * blocked-by-response affected resources table.
   */
  requestC: 'Request',
  /**
   * @description Column header in the Issues panel for parent frames in the
   * blocked-by-response affected resources table.
   */
  parentFrame: 'Parent frame',
  /**
   * @description Column header in the Issues panel for blocked resources in the
   * blocked-by-response affected resources table.
   */
  blockedResource: 'Blocked resource',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedBlockedByResponseView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type {FrameCellData};

export interface BlockedByResponseRow {
  request: Protocol.Audits.AffectedRequest;
  parentFrame?: FrameCellData;
  blockedFrame?: FrameCellData;
}

export interface ViewInput {
  rows: BlockedByResponseRow[];
  requestResolver: Logs.RequestResolver.RequestResolver;
  onRequestClick: () => void;
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <tr>
      <td class="affected-resource-header">${i18nString(UIStrings.requestC)}</td>
      <td class="affected-resource-header">${i18nString(UIStrings.parentFrame)}</td>
      <td class="affected-resource-header">${i18nString(UIStrings.blockedResource)}</td>
    </tr>
    ${input.rows.map(row => html`
      <tr class="affected-resource-row">
        <td class="affected-resource-cell">
          <devtools-request-link-icon .data=${{
            affectedRequest: row.request,
            requestResolver: input.requestResolver,
            displayURL: true,
            additionalOnClickAction: input.onRequestClick,
          } as RequestLinkIcon.RequestLinkIcon.RequestLinkIconData}></devtools-request-link-icon>
        </td>
        ${renderFrameCell(row.parentFrame)}
        ${renderFrameCell(row.blockedFrame)}
      </tr>
    `)}
  `, target);
  // clang-format on
};

export class AffectedBlockedByResponseView extends AffectedResourcesView {
  readonly #view: View;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  #appendDetails(details: Iterable<Protocol.Audits.BlockedByResponseIssueDetails>): void {
    const rows: BlockedByResponseRow[] = [];
    for (const detail of details) {
      rows.push(this.#createDetailRow(detail));
    }
    this.#view({
      rows,
      requestResolver: this.requestResolver,
      onRequestClick: () => {
        Host.userMetrics.issuesPanelResourceOpened(IssuesManager.Issue.IssueCategory.CROSS_ORIGIN_EMBEDDER_POLICY,
                                                   AffectedItem.REQUEST);
      },
    },
               undefined, this.affectedResources);
    this.updateAffectedResourceCount(rows.length);
  }

  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nRequests, {n: count});
  }

  #createDetailRow(details: Protocol.Audits.BlockedByResponseIssueDetails): BlockedByResponseRow {
    const issueCategory = this.issue.getCategory();
    return {
      request: details.request,
      parentFrame: details.parentFrame ? this.createFrameCellData(details.parentFrame.frameId, issueCategory) :
                                         undefined,
      blockedFrame: details.blockedFrame ? this.createFrameCellData(details.blockedFrame.frameId, issueCategory) :
                                           undefined,
    };
  }

  override update(): void {
    this.requestResolver.clear();
    this.#appendDetails(this.issue.getBlockedByResponseDetails());
  }
}
