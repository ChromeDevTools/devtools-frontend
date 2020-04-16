// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';

import {$, click, resourcesPath, waitFor} from '../../shared/helper.js';

export async function navigateToLighthouseTab(target: puppeteer.Page, testName: string) {
  await target.goto(`${resourcesPath}/lighthouse/${testName}.html`);
  await click('#tab-lighthouse');
  // Make sure the lighthouse start view is shown
  await waitFor('.lighthouse-start-view');
}

export async function isGenerateReportButtonDisabled() {
  const button = await $('.lighthouse-start-view .primary-button');
  return button.evaluate(element => element.disabled);
}
