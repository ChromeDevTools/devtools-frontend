// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import {AffectedResourcesView} from './AffectedResourcesView.js';

const UIStrings = {
  /**
   *@description Label for the the number of affected `Potentially-tracking Sites` associated with a
   *DevTools issue. In this context, `tracking` refers to bounce tracking and `Site` is equivalent
   *to eTLD+1.
   *See https://github.com/privacycg/nav-tracking-mitigations/blob/main/bounce-tracking-explainer.md
   *and https://developer.mozilla.org/en-US/docs/Glossary/eTLD.
   */
  nTrackingSites: '{n, plural, =1 {1 potentially tracking website} other {# potentially tracking websites}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedTrackingSitesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedTrackingSitesView extends AffectedResourcesView {
  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nTrackingSites, {n: count});
  }

  override update(): void {
    this.clear();
    const trackingSites = this.issue.getBounceTrackingSites();
    let count = 0;

    for (const site of trackingSites) {
      const row = document.createElement('tr');
      row.classList.add('affected-resource-directive');

      this.appendIssueDetailCell(row, site);
      this.affectedResources.appendChild(row);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }
}
