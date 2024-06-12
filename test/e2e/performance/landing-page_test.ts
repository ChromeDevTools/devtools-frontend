// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  $$,
  enableExperiment,
  getBrowserAndPages,
  goTo,
  goToResource,
  waitFor,
  waitForMany,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  navigateToPerformanceTab,
} from '../helpers/performance-helpers.js';

async function installLCPListener(session: puppeteer.CDPSession): Promise<() => Promise<void>> {
  await session.send('PerformanceTimeline.enable', {eventTypes: ['largest-contentful-paint']});
  const lcpPromise = new Promise<void>(resolve => {
    const handler: puppeteer.Handler<puppeteer.Protocol.PerformanceTimeline.TimelineEventAddedEvent> = data => {
      if (data.event.lcpDetails) {
        resolve();
        session.off('PerformanceTimeline.timelineEventAdded', handler);
      }
    };
    session.on('PerformanceTimeline.timelineEventAdded', handler);
  });
  return () => lcpPromise;
}

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
      const waitForLCP = await installLCPListener(targetSession);
      await goToResource('performance/fake-website.html');
      await waitForLCP();
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
      const waitForLCP = await installLCPListener(targetSession);
      await goToResource('performance/fake-website.html');
      await waitForLCP();
      await target.click('#long-interaction');
      await target.click('#long-interaction');
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await targetSession.send('Runtime.enable');
      const executionContextPromise = new Promise(r => targetSession.once('Runtime.executionContextCreated', r));

      // Reload DevTools to inject new listeners after content is loaded
      await frontend.reload();

      // An execution context will be created once the web vitals library has been injected
      await executionContextPromise;

      await frontend.bringToFront();
      await navigateToPerformanceTab();

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

  it('treats bfcache restoration like a regular navigation', async () => {
    const {target, frontend} = await getBrowserAndPages();

    await navigateToPerformanceTab();

    await target.bringToFront();

    const targetSession = await target.createCDPSession();
    try {
      const waitForLCP1 = await installLCPListener(targetSession);
      await goToResource('performance/fake-website.html');
      await waitForLCP1();

      await target.click('#long-interaction');
      await target.click('#long-interaction');
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await frontend.bringToFront();

      await waitForMany('.metric-card-value:not(.waiting)', 3);
      const interactions1 = await $$<HTMLElement>('.interaction');
      assert.lengthOf(interactions1, 2);

      await target.bringToFront();

      const waitForLCP2 = await installLCPListener(targetSession);
      await goTo('chrome://terms');
      await waitForLCP2();
      await target.click('body');
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await frontend.bringToFront();

      await waitForMany('.metric-card-value:not(.waiting)', 3);
      const interactions2 = await $$<HTMLElement>('.interaction');
      assert.lengthOf(interactions2, 1);

      await target.bringToFront();

      await target.goBack();
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await frontend.bringToFront();

      // New LCP and CLS values should be emitted
      await waitForMany('.metric-card-value:not(.waiting)', 2);

      // INP and interactions should be reset
      const inpValueElem = await waitFor('.metric-card-value.waiting');
      const inpCardText = await inpValueElem.evaluate(el => el.parentElement?.innerText) || '';
      assert.match(inpCardText, /Interaction to Next Paint/);
      const interactions3 = await $$<HTMLElement>('.interaction');
      assert.lengthOf(interactions3, 0);
    } finally {
      await targetSession.detach();
    }
  });
});
