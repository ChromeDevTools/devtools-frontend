// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {veImpressionForAnimationsPanel} from '../../e2e/helpers/animations-helpers.js';
import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';
import {expectVeEvents, veImpressionsUnder} from '../../e2e/helpers/visual-logging-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('The Animations Panel', () => {
  async function runAnimationTest(animationFn: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await waitForAnimationsPanelToLoad(devToolsPage);
    await inspectedPage.goToResource('animations/animations-shown.html');
    await inspectedPage.evaluate(animationFn);
    await waitForAnimationContent(devToolsPage);
  }

  async function waitForAnimationsPanelToLoad(devToolsPage: DevToolsPage) {
    // Open panel and wait for content
    await openPanelViaMoreTools('Animations', devToolsPage);
    await devToolsPage.waitFor('div[aria-label="Animations panel"]');
    await devToolsPage.waitFor('div.animation-timeline-header');
    await expectVeEvents([veImpressionsUnder('Drawer', [veImpressionForAnimationsPanel()])], undefined, devToolsPage);
  }

  async function navigateToSiteWithAnimation(inspectedPage: InspectedPage) {
    // Navigate to a website with an animation
    await inspectedPage.goToResource('animations/default.html');
  }

  async function waitForAnimationContent(devToolsPage: DevToolsPage) {
    await devToolsPage.waitFor('.animation-timeline-buffer');
    await devToolsPage.click(
        '.animation-buffer-preview[aria-label="Animation Preview 1"]', {clickOptions: {offset: {x: 4, y: 4}}});
    await devToolsPage.waitFor('.animation-node-row');
    await devToolsPage.waitFor('svg.animation-ui');
  }

  it('Listens for animation in webpage', async ({devToolsPage, inspectedPage}) => {
    await waitForAnimationsPanelToLoad(devToolsPage);
    await navigateToSiteWithAnimation(inspectedPage);
    await waitForAnimationContent(devToolsPage);
  });

  it('WAAPI animation with delay is displayed on the timeline', async ({devToolsPage, inspectedPage}) => {
    await runAnimationTest('startAnimationWithDelay()', devToolsPage, inspectedPage);
  });

  it('WAAPI animation with end delay is displayed on the timeline', async ({devToolsPage, inspectedPage}) => {
    await runAnimationTest('startAnimationWithEndDelay()', devToolsPage, inspectedPage);
  });

  it('WAAPI animation with negative start time is dplayed on the timeline', async ({devToolsPage, inspectedPage}) => {
    await runAnimationTest('startAnimationWithNegativeStartTime()', devToolsPage, inspectedPage);
  });

  it('WAAPI animation with step timing is displayed on the timeline', async ({devToolsPage, inspectedPage}) => {
    await runAnimationTest('startAnimationWithStepTiming()', devToolsPage, inspectedPage);
  });

  it('WAAPI animation with keyframe effect is displayed on the timeline', async ({devToolsPage, inspectedPage}) => {
    await runAnimationTest('startAnimationWithKeyframeEffect()', devToolsPage, inspectedPage);
  });

  it('CSS animation is displayed on the timeline', async ({devToolsPage, inspectedPage}) => {
    await runAnimationTest('startCSSAnimation()', devToolsPage, inspectedPage);
  });

  it('CSS transition is displayed on the timeline', async ({devToolsPage, inspectedPage}) => {
    await runAnimationTest('startCSSTransition()', devToolsPage, inspectedPage);
  });
});
