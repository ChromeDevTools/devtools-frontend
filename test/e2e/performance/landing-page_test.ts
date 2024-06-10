// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $$,
  enableExperiment,
  getBrowserAndPages,
  goToResource,
  waitForMany,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  navigateToPerformanceTab,
} from '../helpers/performance-helpers.js';

describe('The Performance panel landing page', () => {
  beforeEach(async () => {
    await enableExperiment('timeline-observations');
  });

  it('displays live metrics', async () => {
    const {target, frontend} = await getBrowserAndPages();

    await navigateToPerformanceTab();

    await target.bringToFront();

    const targetSession = await target.createCDPSession();
    try {
      await targetSession.send('PerformanceTimeline.enable', {eventTypes: ['largest-contentful-paint']});
      const lcpPromise = new Promise<void>(resolve => {
        targetSession.on('PerformanceTimeline.timelineEventAdded', data => {
          if (data.event.lcpDetails) {
            resolve();
          }
        });
      });

      await goToResource('performance/fake-website.html');
      await lcpPromise;
      await target.click('#long-interaction');
      await target.click('#long-interaction');
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await frontend.bringToFront();

      const [lcpValueElem, clsValueElem, inpValueElem] = await waitForMany('.metric-card-value:not(.waiting)', 3);
      const interactions = await $$<HTMLElement>('.interaction');
      assert.lengthOf(interactions, 2);

      const lcpValue = await lcpValueElem.evaluate(el => el.textContent) || '';
      assert.match(lcpValue, /[0-9\.]+ (s|ms)/);

      const clsValue = await clsValueElem.evaluate(el => el.textContent) || '';
      assert.match(clsValue, /[0-9\.]+/);

      const inpValue = await inpValueElem.evaluate(el => el.textContent) || '';
      assert.match(inpValue, /[0-9\.]+ (s|ms)/);

      for (const interaction of interactions) {
        const interactionText = await interaction.evaluate(el => el.innerText) || '';
        assert.match(interactionText, /pointer\n[\d.]+ (s|ms)/);
      }
    } finally {
      await targetSession.detach();
    }
  });

  it('displays live metrics after the page already loaded', async () => {
    const {target, frontend} = await getBrowserAndPages();

    await target.bringToFront();

    const targetSession = await target.createCDPSession();
    try {
      await targetSession.send('PerformanceTimeline.enable', {eventTypes: ['largest-contentful-paint']});
      const lcpPromise = new Promise<void>(resolve => {
        targetSession.on('PerformanceTimeline.timelineEventAdded', data => {
          if (data.event.lcpDetails) {
            resolve();
          }
        });
      });

      await goToResource('performance/fake-website.html');
      await lcpPromise;
      await target.click('#long-interaction');
      await target.click('#long-interaction');
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await targetSession.send('Runtime.enable');
      const executionContextPromise = new Promise(r => targetSession.once('Runtime.executionContextCreated', r));

      // Switch to the performance panel using internal JS because the inspector tab
      // is hidden at this point in the test.
      await frontend.evaluate(`
        (async () => {
          const UI = await import('./ui/legacy/legacy.js');
          await UI.ViewManager.ViewManager.instance().showView('timeline');
        })();
      `);

      // An execution context will be created once the web vitals library has been injected
      await executionContextPromise;

      await frontend.bringToFront();

      const [lcpValueElem, clsValueElem, inpValueElem] = await waitForMany('.metric-card-value:not(.waiting)', 3);
      const interactions = await $$<HTMLElement>('.interaction');
      assert.lengthOf(interactions, 2);

      const lcpValue = await lcpValueElem.evaluate(el => el.textContent) || '';
      assert.match(lcpValue, /[0-9\.]+ (s|ms)/);

      const clsValue = await clsValueElem.evaluate(el => el.textContent) || '';
      assert.match(clsValue, /[0-9\.]+/);

      const inpValue = await inpValueElem.evaluate(el => el.textContent) || '';
      assert.match(inpValue, /[0-9\.]+ (s|ms)/);

      for (const interaction of interactions) {
        const interactionText = await interaction.evaluate(el => el.innerText) || '';
        assert.match(interactionText, /pointer\n[\d.]+ (s|ms)/);
      }
    } finally {
      await targetSession.detach();
    }
  });
});
