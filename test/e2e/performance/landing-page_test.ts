// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  $$,
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
import {getCurrentConsoleMessages} from '../helpers/console-helpers.js';
import {reloadDevTools, tabExistsInDrawer} from '../helpers/cross-tool-helper.js';

const READY_LOCAL_METRIC_SELECTOR = '#local-value .metric-value:not(.waiting)';
const READY_FIELD_METRIC_SELECTOR = '#field-value .metric-value:not(.waiting)';
const WAITING_LOCAL_METRIC_SELECTOR = '#local-value .metric-value.waiting';
const INTERACTION_SELECTOR = '.interaction';
const LAYOUT_SHIFT_SELECTOR = '.layout-shift';
const HISTOGRAM_SELECTOR = '.bucket-summaries.histogram';
const SETUP_FIELD_BUTTON_SELECTOR = 'devtools-button[data-field-data-setup]';
const ENABLE_FIELD_BUTTON_SELECTOR = 'devtools-button[data-field-data-enable]';
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
    await reloadDevTools({selectedPanel: {name: 'timeline'}, enableExperiments: ['timeline-observations']});
  });

  it('displays live metrics', async () => {
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
      await frontend.bringToFront();

      const [lcpValueElem, clsValueElem, inpValueElem] = await waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
      const interactions = await $$<HTMLElement>(INTERACTION_SELECTOR);
      assert.isAtLeast(interactions.length, 2);

      const layoutShifts = await $$<HTMLElement>(LAYOUT_SHIFT_SELECTOR);
      assert.lengthOf(layoutShifts, 1);

      const lcpValue = await lcpValueElem.evaluate(el => el.textContent) || '';
      assert.match(lcpValue, /[0-9\.]+ (s|ms)/);

      const clsValue = await clsValueElem.evaluate(el => el.textContent) || '';
      assert.match(clsValue, /[0-9\.]+/);

      const inpValue = await inpValueElem.evaluate(el => el.textContent) || '';
      assert.match(inpValue, /[0-9\.]+ (s|ms)/);

      for (const interaction of interactions) {
        const interactionText = await interaction.evaluate(el => el.innerText) || '';
        assert.match(interactionText, /pointer( INP)?\n[\d.]+ (s|ms)/);
      }

      for (const layoutShift of layoutShifts) {
        const layoutShiftText = await layoutShift.evaluate(el => el.innerText) || '';
        assert.match(layoutShiftText, /Layout shift score: [\d.]+/);
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

      const [lcpValueElem, clsValueElem, inpValueElem] = await waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
      const interactions = await $$<HTMLElement>(INTERACTION_SELECTOR);
      assert.isAtLeast(interactions.length, 2);

      const layoutShifts = await $$<HTMLElement>(LAYOUT_SHIFT_SELECTOR);
      assert.lengthOf(layoutShifts, 1);

      const lcpValue = await lcpValueElem.evaluate(el => el.textContent) || '';
      assert.match(lcpValue, /[0-9\.]+ (s|ms)/);

      const clsValue = await clsValueElem.evaluate(el => el.textContent) || '';
      assert.match(clsValue, /[0-9\.]+/);

      const inpValue = await inpValueElem.evaluate(el => el.textContent) || '';
      assert.match(inpValue, /[0-9\.]+ (s|ms)/);
    } finally {
      await targetSession.detach();
    }
  });

  it('treats bfcache restoration like a regular navigation', async () => {
    const {target, frontend} = await getBrowserAndPages();

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
      assert.isAtLeast(interactions1.length, 2);

      const layoutShifts1 = await $$<HTMLElement>(LAYOUT_SHIFT_SELECTOR);
      assert.lengthOf(layoutShifts1, 1);

      await target.bringToFront();

      const waitForLCP2 = await installLCPListener(targetSession);
      await goTo('chrome://terms');
      await waitForLCP2();
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await frontend.bringToFront();

      await waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
      const interactions2 = await $$<HTMLElement>(INTERACTION_SELECTOR);
      assert.lengthOf(interactions2, 0);

      const layoutShifts2 = await $$<HTMLElement>(LAYOUT_SHIFT_SELECTOR);
      assert.lengthOf(layoutShifts2, 0);

      await target.bringToFront();

      await target.goBack();
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await frontend.bringToFront();

      // New LCP and CLS values should be emitted
      await waitForMany(READY_LOCAL_METRIC_SELECTOR, 2);

      // INP and interactions should be reset
      const inpCard = await waitFor('#inp devtools-metric-card');
      await waitFor(WAITING_LOCAL_METRIC_SELECTOR, inpCard);

      const interactions3 = await $$<HTMLElement>(INTERACTION_SELECTOR);
      assert.lengthOf(interactions3, 0);

      const layoutShifts3 = await $$<HTMLElement>(LAYOUT_SHIFT_SELECTOR);
      assert.lengthOf(layoutShifts3, 0);
    } finally {
      await targetSession.detach();
    }
  });

  it('ignores metrics from iframes', async () => {
    const {target, frontend} = await getBrowserAndPages();

    await target.bringToFront();

    const targetSession = await target.createCDPSession();

    try {
      const framePromise = new Promise<puppeteer.Frame>(resolve => {
        target.once('frameattached', resolve);
      });

      let executionContexts: puppeteer.Protocol.Runtime.ExecutionContextDescription[] = [];
      targetSession.on('Runtime.executionContextCreated', event => {
        executionContexts.push(event.context);
      });
      targetSession.on('Runtime.executionContextsCleared', () => {
        executionContexts = [];
      });

      await targetSession.send('Runtime.enable');

      const waitForLCP = await installLCPListener(targetSession);
      await goToResource('performance/frame-metrics/index.html');
      await waitForLCP();

      const frame = await framePromise;

      // Interactions from an iframe should be ignored
      const h1El = await frame.waitForSelector('h1');
      await h1El!.click();
      await h1El!.click();
      await frame.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await frame.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      // This should be the only interaction that shows up
      await target.click('h1');
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await frontend.bringToFront();

      await waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
      const interactions = await $$<HTMLElement>(INTERACTION_SELECTOR);
      assert.isAtLeast(interactions.length, 1);

      // b/40884049
      // Extra execution contexts can be created sometimes when dealing with iframes.
      // We try to avoid that if possible.
      const liveMetricContexts = executionContexts.filter(e => e.name === 'DevTools Performance Metrics');
      assert.lengthOf(liveMetricContexts, 2);
    } finally {
      await targetSession.detach();
    }
  });

  it('gets field data automatically', async () => {
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

  it('combines interaction entries correctly', async () => {
    const {target, frontend} = await getBrowserAndPages();

    await target.bringToFront();

    const targetSession = await target.createCDPSession();
    try {
      // The # of interactions in other tests can vary depending on which interaction events happen to
      // occur in the same frame. This test is designed to control when specific interaction events happen
      // so that we can observe the results in the interaction log.
      await goToResource('performance/interaction-tester.html');

      // Delay ensures pointerdown and pointerup are in separate frames
      await target.click('#long-click', {delay: 200});

      // No delay ensures pointerdown and pointerup are in the same frame
      await target.click('#long-click');

      // Delay ensures keydown and keyup are in separate frames
      await target.type('#long-type', 'hi', {delay: 200});

      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await frontend.bringToFront();

      {
        const interactions = await waitForMany(INTERACTION_SELECTOR, 7);
        const interactionTypes = await Promise.all(
            interactions.map(el => el.$eval('.interaction-type', el => (el as HTMLElement).innerText)));
        assert.deepStrictEqual(interactionTypes, [
          'pointer',
          'pointer INP',
          'pointer',
          'keyboard',
          'keyboard',
          'keyboard',
          'keyboard',
        ]);
      }
    } finally {
      await targetSession.detach();
    }
  });

  it('logs extra interaction details to console', async () => {
    const {target, frontend} = await getBrowserAndPages();

    await target.bringToFront();

    const targetSession = await target.createCDPSession();
    try {
      await goToResource('performance/interaction-tester.html');

      await target.click('#long-click');

      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await target.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await frontend.bringToFront();

      const interaction = await waitFor(INTERACTION_SELECTOR);
      const interactionSummary = await interaction.$('summary');
      await interactionSummary!.click();

      const logToConsole = await interaction.$('.log-extra-details-button');
      await logToConsole!.click();

      await tabExistsInDrawer('#tab-console-view');
      const messages = await getCurrentConsoleMessages();
      assert.deepStrictEqual(messages, [
        '[DevTools] Long animation frames for 504ms pointer interaction',
        'Scripts:',
        'Array(3)',
        'Intersecting long animation frame events: [{…}]',
      ]);
    } finally {
      await targetSession.detach();
    }
  });
});
