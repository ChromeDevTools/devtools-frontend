// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, goToResource, waitFor} from '../../shared/helper.js';

import {openPanelViaMoreTools} from './settings-helpers.js';
import {
  expectVeEvents,
  veImpression,
  veImpressionsUnder,
} from './visual-logging-helpers.js';

export async function waitForAnimationsPanelToLoad() {
  // Open panel and wait for content
  await openPanelViaMoreTools('Animations');
  await waitFor('div[aria-label="Animations panel"]');
  await waitFor('div.animation-timeline-header');
  await expectVeEvents([veImpressionsUnder('Drawer', [veImpressionForAnimationsPanel()])]);
}

export async function navigateToSiteWithAnimation() {
  // Navigate to a website with an animation
  await goToResource('animations/default.html');
}

export async function waitForAnimationContent() {
  await waitFor('.animation-timeline-buffer');
  await click('.animation-buffer-preview[aria-label="Animation Preview 1"]', {clickOptions: {offset: {x: 4, y: 4}}});
  await waitFor('.animation-node-row');
  await waitFor('svg.animation-ui');
}

export function veImpressionForAnimationsPanel() {
  return veImpression('Panel', 'animations', [
    veImpression(
        'Toolbar', undefined,
        [
          veImpression('Action', 'animations.playback-rate-100'),
          veImpression('Action', 'animations.playback-rate-25'),
          veImpression('Action', 'animations.playback-rate-10'),
          veImpression('Action', 'animations.clear'),
          veImpression('Toggle', 'animations.pause-resume-all'),
        ]),
    veImpression('Timeline', 'animations.grid-header'),
    veImpression('Action', 'animations.play-replay-pause-animation-group'),
  ]);
}
