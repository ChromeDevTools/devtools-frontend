// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  $$,
  enableExperiment,
  getBrowserAndPages,
  getResourcesPath,
  goTo,
  goToResource,
  goToResourceWithCustomHost,
  waitFor,
  waitForMany,
  waitForNone,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  navigateToPerformanceTab,
} from '../helpers/performance-helpers.js';

const READY_LOCAL_METRIC_SELECTOR = '.local-value .metric-value:not(.waiting)';
const READY_FIELD_METRIC_SELECTOR = '.field-value .metric-value:not(.waiting)';
const WAITING_LOCAL_METRIC_SELECTOR = '.local-value .metric-value.waiting';
const INTERACTION_SELECTOR = '.interaction';
const HISTOGRAM_SELECTOR = '.field-data-histogram';
const FIELD_CHECKBOX_SELECTOR = '#field-setup setting-checkbox';

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

async function setCruxRawResponse(path: string) {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(`(async () => {
    const CrUXManager = await import('./models/crux-manager/crux-manager.js');
    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.setEndpointForTesting(
      '${getResourcesPath()}/${path}'
    )
  })()`);
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

      const [lcpValueElem, clsValueElem, inpValueElem] = await waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
      const interactions = await $$<HTMLElement>(INTERACTION_SELECTOR);
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

      const [lcpValueElem, clsValueElem, inpValueElem] = await waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
      const interactions = await $$<HTMLElement>(INTERACTION_SELECTOR);
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

      await waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
      const interactions1 = await $$<HTMLElement>(INTERACTION_SELECTOR);
      assert.lengthOf(interactions1, 2);

      await target.bringToFront();

      const waitForLCP2 = await installLCPListener(targetSession);
      await goTo('chrome://terms');
      await waitForLCP2();
      await target.click('body');
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await frontend.bringToFront();

      await waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
      const interactions2 = await $$<HTMLElement>(INTERACTION_SELECTOR);
      assert.lengthOf(interactions2, 1);

      await target.bringToFront();

      await target.goBack();
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await frontend.bringToFront();

      // New LCP and CLS values should be emitted
      await waitForMany(READY_LOCAL_METRIC_SELECTOR, 2);

      // INP and interactions should be reset
      await waitFor(`#inp ${WAITING_LOCAL_METRIC_SELECTOR}`);
      const interactions3 = await $$<HTMLElement>(INTERACTION_SELECTOR);
      assert.lengthOf(interactions3, 0);
    } finally {
      await targetSession.detach();
    }
  });

  it('gets field data manually', async () => {
    await setCruxRawResponse('performance/crux-valid.rawresponse');
    await navigateToPerformanceTab();

    const manualFetchButton = await waitFor(FIELD_CHECKBOX_SELECTOR);
    await manualFetchButton.click();

    const [lcpHistogram, clsHistogram, inpHistogram] = await waitForMany(HISTOGRAM_SELECTOR, 3);

    assert.strictEqual(
        await lcpHistogram.evaluate(el => (el as HTMLElement).innerText),
        'Good (≤2.50 s)\n96%\nNeeds improvement (2.50 s-4.00 s)\n3%\nPoor (>4.00 s)\n1%');
    assert.strictEqual(
        await clsHistogram.evaluate(el => (el as HTMLElement).innerText),
        'Good (≤0.10)\n100%\nNeeds improvement (0.10-0.25)\n0%\nPoor (>0.25)\n0%');
    assert.strictEqual(
        await inpHistogram.evaluate(el => (el as HTMLElement).innerText),
        'Good (≤200 ms)\n98%\nNeeds improvement (200 ms-500 ms)\n2%\nPoor (>500 ms)\n1%');

    const [lcpFieldValue, clsFieldValue, inpFieldValue] = await waitForMany(READY_FIELD_METRIC_SELECTOR, 3);
    assert.strictEqual(await lcpFieldValue.evaluate(el => el.textContent) || '', '1.20 s');
    assert.strictEqual(await clsFieldValue.evaluate(el => el.textContent) || '', '0');
    assert.strictEqual(await inpFieldValue.evaluate(el => el.textContent) || '', '49 ms');
  });

  it('gets field data automatically', async () => {
    await navigateToPerformanceTab();

    await setCruxRawResponse('performance/crux-none.rawresponse');
    await goToResource('performance/fake-website.html');

    const manualFetchButton = await waitFor(FIELD_CHECKBOX_SELECTOR);
    await manualFetchButton.click();

    const histograms1 = await $$<HTMLElement>(HISTOGRAM_SELECTOR);
    assert.lengthOf(histograms1, 0);

    // Switch the fake CrUX endpoint data to simulate new data for a new origin
    await setCruxRawResponse('performance/crux-valid.rawresponse');
    await goToResourceWithCustomHost('devtools.oopif.test', 'performance/fake-website.html');

    const [lcpHistogram, clsHistogram, inpHistogram] = await waitForMany(HISTOGRAM_SELECTOR, 3);

    assert.strictEqual(
        await lcpHistogram.evaluate(el => (el as HTMLElement).innerText),
        'Good (≤2.50 s)\n96%\nNeeds improvement (2.50 s-4.00 s)\n3%\nPoor (>4.00 s)\n1%');
    assert.strictEqual(
        await clsHistogram.evaluate(el => (el as HTMLElement).innerText),
        'Good (≤0.10)\n100%\nNeeds improvement (0.10-0.25)\n0%\nPoor (>0.25)\n0%');
    assert.strictEqual(
        await inpHistogram.evaluate(el => (el as HTMLElement).innerText),
        'Good (≤200 ms)\n98%\nNeeds improvement (200 ms-500 ms)\n2%\nPoor (>500 ms)\n1%');

    const [lcpFieldValue, clsFieldValue, inpFieldValue] = await waitForMany(READY_FIELD_METRIC_SELECTOR, 3);
    assert.strictEqual(await lcpFieldValue.evaluate(el => el.textContent) || '', '1.20 s');
    assert.strictEqual(await clsFieldValue.evaluate(el => el.textContent) || '', '0');
    assert.strictEqual(await inpFieldValue.evaluate(el => el.textContent) || '', '49 ms');

    // Ensure the original CrUX data is restored when we return to the original page
    await goToResource('performance/fake-website.html');
    await waitForNone(HISTOGRAM_SELECTOR);
  });
});
