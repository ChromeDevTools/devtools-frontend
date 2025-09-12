// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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

  describe('capturing animation groups', () => {
    it('should correctly update animation groups for animations', async ({devToolsPage, inspectedPage}) => {
      await waitForAnimationsPanelToLoad(devToolsPage);
      await inspectedPage.goToResource('animations/animation-groups.html');
      const steps = [
        {expression: 'restartAnimation(\'node1\', \'expandWidth\')', numberOfAnimationGroups: 1},
        {expression: 'restartAnimation(\'node2\', \'expandWidth\')', numberOfAnimationGroups: 1}, {
          expression: 'toggleClass(\'node1\', \'expandWidth\', false); restartAnimation(\'node1\', \'expand\')',
          numberOfAnimationGroups: 2
        },
        {expression: 'restartAnimation(\'node3\', \'expand\')', numberOfAnimationGroups: 2},
        {expression: 'restartAnimation(\'node3\', \'expand\')', numberOfAnimationGroups: 2},
        {expression: 'restartAnimation(\'node2\', \'expand\')', numberOfAnimationGroups: 3}, {
          expression: 'toggleClass(\'node1\', \'long\', true); restartAnimation(\'node1\', \'expand\')',
          numberOfAnimationGroups: 4
        },
        {
          expression: 'toggleClass(\'node3\', \'long\', true); restartAnimation(\'node3\', \'expand\')',
          numberOfAnimationGroups: 4
        },
        {
          expression:
              'toggleClass(\'node2\', \'expandWidth\', false); toggleClass(\'node2\', \'long\', true); restartAnimation(\'node2\', \'expand\')',
          numberOfAnimationGroups: 4
        }
      ];

      for (const step of steps) {
        await inspectedPage.evaluate(step.expression);
        await devToolsPage.waitForMany('.animation-buffer-preview', step.numberOfAnimationGroups);
      }
    });

    it('should correctly update animation groups for transitions', async ({devToolsPage, inspectedPage}) => {
      await waitForAnimationsPanelToLoad(devToolsPage);
      await inspectedPage.goToResource('animations/transition-groups.html');
      const steps = [
        {
          // "New group #0" -> Total groups: 1
          expression: 'resetElement(\'node1\'); startTransition(\'node1\')',
          numberOfAnimationGroups: 1
        },
        {
          // "Group #0 started again!" -> Total groups: 1
          expression: 'resetElement(\'node2\'); startTransition(\'node2\')',
          numberOfAnimationGroups: 1
        },
        {
          // "Group #0 started again!" -> Total groups: 1
          expression: 'resetElement(\'node3\'); startTransition(\'node3\')',
          numberOfAnimationGroups: 1
        },
        {
          // "New group #1" -> Total groups: 2
          expression: 'resetElement(\'node1\'); toggleClass(\'node1\', \'duration\'); startTransition(\'node1\')',
          numberOfAnimationGroups: 2
        },
        {
          // "Group #1 started again!" -> Total groups: 2
          expression: 'resetElement(\'node1\'); toggleClass(\'node1\', \'duration\'); startTransition(\'node1\')',
          numberOfAnimationGroups: 2
        },
        {
          // "Group #1 started again!" -> Total groups: 2
          expression: 'resetElement(\'node2\'); toggleClass(\'node2\', \'duration\'); startTransition(\'node2\')',
          numberOfAnimationGroups: 2
        },
        {
          // "New group #2" -> Total groups: 3
          expression: 'resetElement(\'node1\'); toggleClass(\'node1\', \'expand\')',
          numberOfAnimationGroups: 3
        },
        {
          // "Group #2 started again!" -> Total groups: 3
          expression: 'resetElement(\'node1\'); toggleClass(\'node1\', \'expand\')',
          numberOfAnimationGroups: 3
        },
        {
          // "Group #2 started again!" -> Total groups: 3
          expression: 'resetElement(\'node3\'); toggleClass(\'node3\', \'expand\')',
          numberOfAnimationGroups: 3
        },
        {
          // "New group #3" -> Total groups: 4
          expression: 'resetElement(\'node4\'); startTransition(\'node4\')',
          numberOfAnimationGroups: 4
        },
        {
          // "New group #4" -> Total groups: 5
          expression: 'resetElement(\'node4\'); toggleClass(\'node4\', \'expand\')',
          numberOfAnimationGroups: 5
        },
        {
          // "Group #4 started again!" -> Total groups: 5
          expression: 'resetElement(\'node4\'); toggleClass(\'node4\', \'expand\')',
          numberOfAnimationGroups: 5
        },
        {
          // "New group #5" -> Total groups: 6
          expression:
              'resetElement(\'node4\'); toggleClass(\'node4\', \'duration\'); toggleClass(\'node4\', \'expand\')',
          numberOfAnimationGroups: 6
        },
        {
          // "Group #4 started again!" -> Total groups: 6
          expression: 'resetElement(\'node4\'); toggleClass(\'node4\', \'expand\')',
          numberOfAnimationGroups: 6
        }
      ];

      for (const step of steps) {
        await inspectedPage.evaluate(step.expression);
        await devToolsPage.waitForMany('.animation-buffer-preview', step.numberOfAnimationGroups);
      }
    });

    it('should group transitions and animations correctly', async ({devToolsPage, inspectedPage}) => {
      await waitForAnimationsPanelToLoad(devToolsPage);
      await inspectedPage.goToResource('animations/transition-and-animation-groups.html');

      const steps = [
        // The first 5 steps trigger the same transition, which DevTools should consolidate into a single group.
        {
          expression: 'startCSSTransition()',
          numberOfAnimationGroups: 1,
        },
        {
          expression: 'startCSSTransition()',
          numberOfAnimationGroups: 1,
        },
        {
          expression: 'startCSSTransition()',
          numberOfAnimationGroups: 1,
        },
        {
          expression: 'startCSSTransition()',
          numberOfAnimationGroups: 1,
        },
        {
          expression: 'startCSSTransition()',
          numberOfAnimationGroups: 1,
        },
        // This step triggers a CSS animation, which should create a new, separate animation group.
        {
          expression: 'startCSSAnimation()',
          numberOfAnimationGroups: 2,
        },
      ];

      for (const step of steps) {
        await inspectedPage.evaluate(step.expression);
        // After each action, we verify the total number of animation groups displayed in the timeline.
        await devToolsPage.waitForMany('.animation-buffer-preview', step.numberOfAnimationGroups);
      }
    });

    it('should not show animations with empty keyframes in the timeline', async ({devToolsPage, inspectedPage}) => {
      await waitForAnimationsPanelToLoad(devToolsPage);
      await inspectedPage.goToHtml('<div id="node" style="background-color: red; height: 100px"></div>');

      // Ensure the timeline is initially empty.
      const animationPreviews = await devToolsPage.$$('.animation-buffer-preview');
      assert.lengthOf(animationPreviews, 0);

      // Trigger a web animation with an empty keyframe array.
      await inspectedPage.evaluate('document.getElementById("node").animate([], { duration: 200, delay: 100 })');

      // Give DevTools a moment to process the animation. If it were going to appear,
      // it would have by now.
      const animationPreviewsAfterEmptyAnimation = await devToolsPage.$$('.animation-buffer-preview');
      assert.lengthOf(animationPreviewsAfterEmptyAnimation, 0);
    });
  });
});
