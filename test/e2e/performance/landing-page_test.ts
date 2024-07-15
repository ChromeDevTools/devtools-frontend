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
  waitForVisible,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  navigateToPerformanceTab,
} from '../helpers/performance-helpers.js';

const READY_LOCAL_METRIC_SELECTOR = '[slot="local-value"] .metric-value:not(.waiting)';
const READY_FIELD_METRIC_SELECTOR = '[slot="field-value"] .metric-value:not(.waiting)';
const WAITING_LOCAL_METRIC_SELECTOR = '[slot="local-value"] .metric-value.waiting';
const INTERACTION_SELECTOR = '.interaction';
const HISTOGRAM_SELECTOR = '.field-data-histogram';
const SETUP_FIELD_BUTTON_SELECTOR = 'devtools-button[jslogcontext="field-data-setup"]';
const ENABLE_FIELD_BUTTON_SELECTOR = 'devtools-button[jslogcontext="field-data-enable"]';
const ADVANCED_DETAILS_SELECTOR = '.content summary';
const OVERRIDE_FIELD_CHECKBOX_SELECTOR = '.content input[type="checkbox"]';
const OVERRIDE_FIELD_TEXT_SELECTOR = '.content input[type="text"]';

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

  it('gets field data automatically', async () => {
    await navigateToPerformanceTab();

    await setCruxRawResponse('performance/crux-none.rawresponse');
    await goToResource('performance/fake-website.html');

    const fieldSetupButton = await waitFor<HTMLElement>(SETUP_FIELD_BUTTON_SELECTOR);
    await fieldSetupButton.click();

    const fieldEnableButton = await waitForVisible<HTMLElement>(ENABLE_FIELD_BUTTON_SELECTOR);
    await fieldEnableButton.click();

    {
      const [lcpHistogram, clsHistogram, inpHistogram] = await waitForMany(HISTOGRAM_SELECTOR, 3);
      assert.deepStrictEqual(
          await lcpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
      assert.deepStrictEqual(
          await clsHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
      assert.deepStrictEqual(
          await inpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
    }

    // Switch the fake CrUX endpoint data to simulate new data for a new origin
    await setCruxRawResponse('performance/crux-valid.rawresponse');
    await goToResourceWithCustomHost('devtools.oopif.test', 'performance/fake-website.html');

    const [lcpFieldValue, clsFieldValue, inpFieldValue] = await waitForMany(READY_FIELD_METRIC_SELECTOR, 3);
    assert.strictEqual(await lcpFieldValue.evaluate(el => el.textContent) || '', '1.20 s');
    assert.strictEqual(await clsFieldValue.evaluate(el => el.textContent) || '', '0');
    assert.strictEqual(await inpFieldValue.evaluate(el => el.textContent) || '', '49 ms');

    {
      const [lcpHistogram, clsHistogram, inpHistogram] = await waitForMany(HISTOGRAM_SELECTOR, 3);
      assert.deepStrictEqual(
          await lcpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['96%', '3%', '1%']);
      assert.deepStrictEqual(
          await clsHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['100%', '0%', '0%']);
      assert.deepStrictEqual(
          await inpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['98%', '2%', '1%']);
    }

    // Ensure the original CrUX data is restored when we return to the original page
    await goToResource('performance/fake-website.html');
    await waitForNone(READY_FIELD_METRIC_SELECTOR);

    {
      const [lcpHistogram, clsHistogram, inpHistogram] = await waitForMany(HISTOGRAM_SELECTOR, 3);
      assert.deepStrictEqual(
          await lcpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
      assert.deepStrictEqual(
          await clsHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
      assert.deepStrictEqual(
          await inpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
    }
  });

  it('uses URL override for field data', async () => {
    await navigateToPerformanceTab();

    await setCruxRawResponse('performance/crux-valid.rawresponse');
    await goToResource('performance/fake-website.html');

    const fieldSetupButton = await waitFor(SETUP_FIELD_BUTTON_SELECTOR);
    await fieldSetupButton.click();

    await (await waitFor<HTMLElement>(ADVANCED_DETAILS_SELECTOR)).evaluate(el => el.click());

    const urlOverrideCheckbox = await waitForVisible<HTMLInputElement>(OVERRIDE_FIELD_CHECKBOX_SELECTOR);
    await urlOverrideCheckbox.evaluate(el => el.click());

    const urlOverrideText = await waitForVisible<HTMLInputElement>(OVERRIDE_FIELD_TEXT_SELECTOR);
    await urlOverrideText.evaluate(el => {
      el.value = 'https://example.com';
      el.dispatchEvent(new Event('change'));
    });

    const fieldEnableButton = await waitForVisible(ENABLE_FIELD_BUTTON_SELECTOR);
    await fieldEnableButton.click();

    {
      const [lcpFieldValue, clsFieldValue, inpFieldValue] = await waitForMany(READY_FIELD_METRIC_SELECTOR, 3);
      assert.strictEqual(await lcpFieldValue.evaluate(el => el.textContent) || '', '1.20 s');
      assert.strictEqual(await clsFieldValue.evaluate(el => el.textContent) || '', '0');
      assert.strictEqual(await inpFieldValue.evaluate(el => el.textContent) || '', '49 ms');
    }

    // Switch the fake CrUX endpoint data to simulate new data for a new origin
    await setCruxRawResponse('performance/crux-none.rawresponse');
    await goToResourceWithCustomHost('devtools.oopif.test', 'performance/fake-website.html');

    // Even though the URL and field data should change, the displayed data remains teh same
    {
      const [lcpFieldValue, clsFieldValue, inpFieldValue] = await waitForMany(READY_FIELD_METRIC_SELECTOR, 3);
      assert.strictEqual(await lcpFieldValue.evaluate(el => el.textContent) || '', '1.20 s');
      assert.strictEqual(await clsFieldValue.evaluate(el => el.textContent) || '', '0');
      assert.strictEqual(await inpFieldValue.evaluate(el => el.textContent) || '', '49 ms');
    }
  });
});
