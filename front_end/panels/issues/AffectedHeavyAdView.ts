// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected heavy ad resources.
   */
  nResources: '{n, plural, =1 {# resource} other {# resources}}',
  /**
   * @description Column header in the Issues panel for the exceeded limit type in the heavy ads affected resources table.
   */
  limitExceeded: 'Limit exceeded',
  /**
   * @description Column header in the Issues panel for the resolution status in the heavy ads affected resources table.
   */
  resolutionStatus: 'Resolution status',
  /**
   * @description Column header in the Issues panel for the frame URL in the heavy ads affected resources table.
   */
  frameUrl: 'Frame URL',
  /**
   * @description Resolution status in the Issues panel indicating that a heavy ad was removed.
   */
  removed: 'Removed',
  /**
   * @description Resolution status in the Issues panel indicating that a heavy ad received a warning.
   */
  warned: 'Warned',
  /**
   * @description Reason in the Issues panel for a heavy ad issue indicating peak CPU usage limit was exceeded.
   */
  cpuPeakLimit: 'CPU peak limit',
  /**
   * @description Reason in the Issues panel for a heavy ad issue indicating total CPU usage limit was exceeded.
   */
  cpuTotalLimit: 'CPU total limit',
  /**
   * @description Reason in the Issues panel for a heavy ad issue indicating total network bandwidth limit was exceeded.
   */
  networkLimit: 'Network limit',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedHeavyAdView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedHeavyAdView extends AffectedResourcesView {
  #appendAffectedHeavyAds(heavyAds: Iterable<IssuesManager.HeavyAdIssue.HeavyAdIssue>): void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.limitExceeded));
    this.appendColumnTitle(header, i18nString(UIStrings.resolutionStatus));
    this.appendColumnTitle(header, i18nString(UIStrings.frameUrl));

    this.affectedResources.appendChild(header);

    let count = 0;
    for (const heavyAd of heavyAds) {
      this.#appendAffectedHeavyAd(heavyAd.details());
      count++;
    }
    this.updateAffectedResourceCount(count);
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

  #appendAffectedHeavyAd(heavyAd: Protocol.Audits.HeavyAdIssueDetails): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-heavy-ad');

    const reason = document.createElement('td');
    reason.classList.add('affected-resource-heavy-ad-info');
    reason.textContent = this.#limitToString(heavyAd.reason);
    element.appendChild(reason);

    const status = document.createElement('td');
    status.classList.add('affected-resource-heavy-ad-info');
    status.textContent = this.#statusToString(heavyAd.resolution);
    element.appendChild(status);

    const frameId = heavyAd.frame.frameId;
    const frameUrl = this.createFrameCell(frameId, this.issue.getCategory());
    element.appendChild(frameUrl);

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this.#appendAffectedHeavyAds(this.issue.getHeavyAdIssues());
  }
}
