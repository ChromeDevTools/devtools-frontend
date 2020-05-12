// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';

import {click, resourcesPath, waitFor} from '../../shared/helper.js';
import {openPanelViaMoreTools} from './settings-helpers.js';

export async function waitForAnimationsPanelToLoad() {
  // Open panel and wait for content
  await openPanelViaMoreTools('Animations');
  await waitFor('div[aria-label="Animations panel"]');
}

export async function navigateToSiteWithAnimation(target: puppeteer.Page) {
  // Navigate to a website with an animation
  const targetUrl = `${resourcesPath}/animations/default.html`;
  await target.goto(targetUrl);
}

export async function waitForAnimationContent() {
  const first_animation_preview_selector = '.animation-buffer-preview[aria-label="Animation Preview 1"]';
  await waitFor(first_animation_preview_selector);
  await click(first_animation_preview_selector);
  await waitFor('.animation-node-row');
  await waitFor('svg.animation-ui');
}
