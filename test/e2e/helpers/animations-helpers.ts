// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, goToResource, waitFor} from '../../shared/helper.js';
import {openPanelViaMoreTools} from './settings-helpers.js';

export async function waitForAnimationsPanelToLoad() {
  // Open panel and wait for content
  await openPanelViaMoreTools('Animations');
  await waitFor('div[aria-label="Animations panel"]');
  await waitFor('div.animations-timeline');
}

export async function navigateToSiteWithAnimation() {
  // Navigate to a website with an animation
  await goToResource('animations/default.html');
}

export async function waitForAnimationContent() {
  const first_animation_preview_selector = '.animation-buffer-preview[aria-label="Animation Preview 1"]';
  await waitFor(first_animation_preview_selector);
  await click(first_animation_preview_selector);
  await waitFor('.animation-node-row');
  await waitFor('svg.animation-ui');
}
