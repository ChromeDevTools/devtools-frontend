// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';

import {closeAllCloseableTabs, getBrowserAndPages, resourcesPath} from '../../shared/helper.js';

export async function prepareForCrossToolScenario() {
  const {target} = getBrowserAndPages();
  await navigateToCrossToolIntegrationSite(target);
  await closeAllCloseableTabs();
}

export async function navigateToCrossToolIntegrationSite(target: puppeteer.Page) {
  // Navigate to a website with an animation
  const targetUrl = `${resourcesPath}/cross_tool/default.html`;
  await target.goto(targetUrl);
}
