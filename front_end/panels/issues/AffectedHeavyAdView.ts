// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';

const UIStrings = {
  /**
   *@description Label for number of affected resources indication in issue view
   */
  nResources: '{n, plural, =1 {# resource} other {# resources}}',
  /**
   *@description Title for a column in an Heavy Ads issue view
   */
  limitExceeded: 'Limit exceeded',
  /**
   *@description Title for a column in an Heavy Ads issue view
   */
  resolutionStatus: 'Resolution Status',
  /**
   *@description Title for a column in an Heavy Ads issue view
   */
  frameUrl: 'Frame URL',
  /**
   * @description When there is a Heavy Ad, the browser can choose to deal with it in different ways.
   * This string indicates that the ad was bad enough that it was removed.
   */
  removed: 'Removed',
  /**
   * @description When there is a Heavy Ad, the browser can choose to deal with it in different ways.
   * This string indicates that the ad was only warned, and not removed.
   */
  warned: 'Warned',
  /**
   *@description Reason for a Heavy Ad being flagged in issue view. The Ad has been flagged as a
   *Heavy Ad because it exceeded the set limit for peak CPU usage, e.g. it blocked the main thread
   *for more than 15 seconds in any 30-second window.
   */
  cpuPeakLimit: 'CPU peak limit',
  /**
   *@description Reason for a Heavy Ad being flagged in issue view
   */
  cpuTotalLimit: 'CPU total limit',
  /**
   *@description Reason for a Heavy Ad being flagged in issue view
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
