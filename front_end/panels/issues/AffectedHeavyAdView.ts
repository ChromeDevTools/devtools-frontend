// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {html, render} from '../../ui/lit/lit.js';

import {AffectedResourcesView, type FrameCellData, renderFrameCell} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

export type {FrameCellData};

export interface HeavyAdRow {
  reason: string;
  status: string;
  frame: FrameCellData;
}

export interface ViewInput {
  rows: HeavyAdRow[];
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <tr>
      <td class="affected-resource-header">${i18nString(UIStrings.limitExceeded)}</td>
      <td class="affected-resource-header">${i18nString(UIStrings.resolutionStatus)}</td>
      <td class="affected-resource-header">${i18nString(UIStrings.frameUrl)}</td>
    </tr>
    ${input.rows.map(row => html`
      <tr class="affected-resource-heavy-ad">
        <td class="affected-resource-heavy-ad-info">${row.reason}</td>
        <td class="affected-resource-heavy-ad-info">${row.status}</td>
        ${renderFrameCell(row.frame)}
      </tr>
    `)}
  `, target);
  // clang-format on
};

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected heavy ad
   * resources.
   */
  nResources: '{n, plural, =1 {# resource} other {# resources}}',
  /**
   * @description Column header in the Issues panel for the exceeded limit type
   * in the heavy ads affected resources table.
   */
  limitExceeded: 'Limit exceeded',
  /**
   * @description Column header in the Issues panel for the resolution status in
   * the heavy ads affected resources table.
   */
  resolutionStatus: 'Resolution status',
  /**
   * @description Column header in the Issues panel for the frame URL in the
   * heavy ads affected resources table.
   */
  frameUrl: 'Frame URL',
  /**
   * @description Resolution status in the Issues panel indicating that a heavy
   * ad was removed.
   */
  removed: 'Removed',
  /**
   * @description Resolution status in the Issues panel indicating that a heavy
   * ad received a warning.
   */
  warned: 'Warned',
  /**
   * @description Reason in the Issues panel for a heavy ad issue indicating
   * peak CPU usage limit was exceeded.
   */
  cpuPeakLimit: 'CPU peak limit',
  /**
   * @description Reason in the Issues panel for a heavy ad issue indicating
   * total CPU usage limit was exceeded.
   */
  cpuTotalLimit: 'CPU total limit',
  /**
   * @description Reason in the Issues panel for a heavy ad issue indicating
   * total network bandwidth limit was exceeded.
   */
  networkLimit: 'Network limit',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedHeavyAdView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedHeavyAdView extends AffectedResourcesView {
  readonly #view: View;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  #appendAffectedHeavyAds(heavyAds: Iterable<IssuesManager.HeavyAdIssue.HeavyAdIssue>): void {
    const rows: HeavyAdRow[] = [];
    const issueCategory = this.issue.getCategory();
    for (const heavyAd of heavyAds) {
      const details = heavyAd.details();
      rows.push({
        reason: this.#limitToString(details.reason),
        status: this.#statusToString(details.resolution),
        frame: this.createFrameCellData(details.frame.frameId, issueCategory),
      });
    }
    this.#view({rows}, undefined, this.affectedResources);
    this.updateAffectedResourceCount(rows.length);
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nResources, {n: count});
  }

  #statusToString(status: Protocol.Audits.HeavyAdResolutionStatus): string {
    switch (status) {
      case Protocol.Audits.HeavyAdResolutionStatus.HeavyAdBlocked:
        return i18nString(UIStrings.removed);
      case Protocol.Audits.HeavyAdResolutionStatus.HeavyAdWarning:
        return i18nString(UIStrings.warned);
    }
    return '';
  }

  #limitToString(status: Protocol.Audits.HeavyAdReason): string {
    switch (status) {
      case Protocol.Audits.HeavyAdReason.CpuPeakLimit:
        return i18nString(UIStrings.cpuPeakLimit);
      case Protocol.Audits.HeavyAdReason.CpuTotalLimit:
        return i18nString(UIStrings.cpuTotalLimit);
      case Protocol.Audits.HeavyAdReason.NetworkTotalLimit:
        return i18nString(UIStrings.networkLimit);
    }
    return '';
  }

  update(): void {
    this.requestResolver.clear();
    this.#appendAffectedHeavyAds(this.issue.getHeavyAdIssues());
  }
}
