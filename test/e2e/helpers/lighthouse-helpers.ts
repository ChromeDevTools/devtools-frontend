// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, goToResource, waitFor} from '../../shared/helper.js';

export async function navigateToLighthouseTab(testName: string) {
  await goToResource(`lighthouse/${testName}.html`);
  await click('#tab-lighthouse');
  // Make sure the lighthouse start view is shown
  await waitFor('.lighthouse-start-view');
}

export async function isGenerateReportButtonDisabled() {
  const button = await waitFor('.lighthouse-start-view .primary-button');
  return button.evaluate(element => (element as HTMLButtonElement).disabled);
}
