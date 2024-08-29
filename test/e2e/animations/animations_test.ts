// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages, goToResource} from '../../shared/helper.js';

import {
  navigateToSiteWithAnimation,
  waitForAnimationContent,
  waitForAnimationsPanelToLoad,
} from '../helpers/animations-helpers.js';

const runAnimationTest = async (animationFn: string) => {
  const {target} = getBrowserAndPages();
  await waitForAnimationsPanelToLoad();
  await goToResource('animations/animations-shown.html');
  await target.evaluate(animationFn);
  await waitForAnimationContent();
};

describe('The Animations Panel', () => {
  it('Listens for animation in webpage', async () => {
    await waitForAnimationsPanelToLoad();
    await navigateToSiteWithAnimation();
    await waitForAnimationContent();
  });

  it('WAAPI animation with delay is displayed on the timeline', async () => {
    await runAnimationTest('startAnimationWithDelay()');
  });

  it('WAAPI animation with end delay is displayed on the timeline', async () => {
    await runAnimationTest('startAnimationWithEndDelay()');
  });

  it('WAAPI animation with negative start time is dplayed on the timeline', async () => {
    await runAnimationTest('startAnimationWithNegativeStartTime()');
  });

  it('WAAPI animation with step timing is displayed on the timeline', async () => {
    await runAnimationTest('startAnimationWithStepTiming()');
  });

  it('WAAPI animation with keyframe effect is displayed on the timeline', async () => {
    await runAnimationTest('startAnimationWithKeyframeEffect()');
  });

  it('CSS animation is displayed on the timeline', async () => {
    await runAnimationTest('startCSSAnimation()');
  });

  it('CSS transition is displayed on the timeline', async () => {
    await runAnimationTest('startCSSTransition()');
  });
});
