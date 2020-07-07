// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, goToResource, waitFor} from '../../shared/helper.js';

const OVERVIEW_TAB_SELECTOR = '#tab-cssoverview';

export async function navigateToCssOverviewTab(testName: string) {
  await goToResource(`css_overview/${testName}.html`);
  await click(OVERVIEW_TAB_SELECTOR);
  // Make sure the css overview start view is shown
  await waitFor('.overview-start-view');
}
