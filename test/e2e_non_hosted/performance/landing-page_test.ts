// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as os from 'os';
import type * as puppeteer from 'puppeteer-core';

import {getCurrentConsoleMessages} from '../../e2e/helpers/console-helpers.js';
import {tabExistsInDrawer} from '../../e2e/helpers/cross-tool-helper.js';
import {
  getCategoryRow,
  navigateToMemoryTab,
  setClassFilter,
  takeHeapSnapshot,
  waitForNonEmptyHeapSnapshotData,
} from '../../e2e/helpers/memory-helpers.js';
import {navigateToPerformanceTab} from '../../e2e/helpers/performance-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

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

async function setCruxRawResponse(path: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await devToolsPage.evaluate(`(async () => {
    const CrUXManager = await import('./models/crux-manager/crux-manager.js');
    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.setEndpointForTesting(
      '${inspectedPage.getResourcesPath()}/${path}'
    )
  })()`);
}

// TODO: for some reason on windows, "TimelinePanel.ts hasPrimaryTarget" returns
// false, which removes some controls and fails a VE assert. Ignore for now.
// Might be OK after moving test to non_hosted.
const describeSkipForWindows = os.platform() === 'win32' ? describe.skip : describe;

describeSkipForWindows('The Performance panel landing page', function() {
  setup({dockingMode: 'undocked'});
  if (this.timeout() > 0) {
    this.timeout(20000);
  }

  // Consistently failing on macOS bots
  it.skipOnPlatforms(['mac'], '[crbug.com/415271011] displays live metrics', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.reloadWithParams({panel: 'timeline'});
    await inspectedPage.bringToFront();

    const inspectedPageSession = await inspectedPage.page.createCDPSession();
    try {
      const waitForLCP = await installLCPListener(inspectedPageSession);
      await inspectedPage.goToResource('performance/fake-website.html');
      await waitForLCP();
      await inspectedPage.page.click('#long-interaction');
      await inspectedPage.page.click('#long-interaction');
      await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await devToolsPage.bringToFront();

      const [lcpValueElem, clsValueElem, inpValueElem] = await devToolsPage.waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
      const interactions = await devToolsPage.$$<HTMLElement>(INTERACTION_SELECTOR);
      assert.isAtLeast(interactions.length, 2);

      const layoutShifts = await devToolsPage.$$<HTMLElement>(LAYOUT_SHIFT_SELECTOR);
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
      await inspectedPageSession.detach();
    }
  });

  // Flaky, skipped while we deflake it
  it.skip(
      '[crbug.com/415271011] displays live metrics after the page already loaded',
      async ({devToolsPage, inspectedPage}) => {
        await devToolsPage.reloadWithParams({panel: 'timeline'});
        await inspectedPage.bringToFront();

        const inspectedPageSession = await inspectedPage.page.createCDPSession();
        try {
          const waitForLCP = await installLCPListener(inspectedPageSession);
          await inspectedPage.goToResource('performance/fake-website.html');
          await waitForLCP();
          await inspectedPage.page.click('#long-interaction');
          await inspectedPage.page.click('#long-interaction');
          await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));
          await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));

          await inspectedPageSession.send('Runtime.enable');
          const executionContextPromise =
              new Promise(r => inspectedPageSession.once('Runtime.executionContextCreated', r));

          // Reload DevTools to inject new listeners after content is loaded
          await devToolsPage.reload();
          await navigateToPerformanceTab(undefined, devToolsPage, inspectedPage);

          // An execution context will be created once the web vitals library has been injected
          await executionContextPromise;

          await devToolsPage.bringToFront();

          const [lcpValueElem, clsValueElem, inpValueElem] =
              await devToolsPage.waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
          const interactions = await devToolsPage.$$(INTERACTION_SELECTOR);
          assert.isAtLeast(interactions.length, 2);

          const layoutShifts = await devToolsPage.$$(LAYOUT_SHIFT_SELECTOR);
          assert.lengthOf(layoutShifts, 1);

          const lcpValue = await lcpValueElem.evaluate(el => el.textContent) || '';
          assert.match(lcpValue, /[0-9\.]+ (s|ms)/);

          const clsValue = await clsValueElem.evaluate(el => el.textContent) || '';
          assert.match(clsValue, /[0-9\.]+/);

          const inpValue = await inpValueElem.evaluate(el => el.textContent) || '';
          assert.match(inpValue, /[0-9\.]+ (s|ms)/);
        } finally {
          await inspectedPageSession.detach();
        }
      });
  // Flaky, skipped while we deflake it
  it.skip(
      '[crbug.com/415271011] treats bfcache restoration like a regular navigation',
      async ({devToolsPage, inspectedPage}) => {
        await inspectedPage.bringToFront();

        const inspectedPageSession = await inspectedPage.page.createCDPSession();
        try {
          const waitForLCP1 = await installLCPListener(inspectedPageSession);
          await inspectedPage.goToResource('performance/fake-website.html');
          await waitForLCP1();

          await inspectedPage.page.click('#long-interaction');
          await inspectedPage.page.click('#long-interaction');
          await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));
          await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));

          await devToolsPage.bringToFront();

          await devToolsPage.waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
          const interactions1 = await devToolsPage.$$(INTERACTION_SELECTOR);
          assert.isAtLeast(interactions1.length, 2);

          const layoutShifts1 = await devToolsPage.$$(LAYOUT_SHIFT_SELECTOR);
          assert.lengthOf(layoutShifts1, 1);

          await inspectedPage.bringToFront();

          const waitForLCP2 = await installLCPListener(inspectedPageSession);
          await inspectedPage.goTo('chrome://terms');
          await waitForLCP2();
          await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));
          await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));

          await devToolsPage.bringToFront();

          await devToolsPage.waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
          const interactions2 = await devToolsPage.$$<HTMLElement>(INTERACTION_SELECTOR);
          assert.lengthOf(interactions2, 0);

          const layoutShifts2 = await devToolsPage.$$<HTMLElement>(LAYOUT_SHIFT_SELECTOR);
          assert.lengthOf(layoutShifts2, 0);

          await inspectedPage.bringToFront();

          await inspectedPage.page.goBack();
          await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));
          await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));

          await devToolsPage.bringToFront();

          // New LCP and CLS values should be emitted
          await devToolsPage.waitForMany(READY_LOCAL_METRIC_SELECTOR, 2);

          // INP and interactions should be reset
          const inpCard = await devToolsPage.waitFor('#inp devtools-metric-card');
          await devToolsPage.waitFor(WAITING_LOCAL_METRIC_SELECTOR, inpCard);

          const interactions3 = await devToolsPage.$$<HTMLElement>(INTERACTION_SELECTOR);
          assert.lengthOf(interactions3, 0);

          const layoutShifts3 = await devToolsPage.$$<HTMLElement>(LAYOUT_SHIFT_SELECTOR);
          assert.lengthOf(layoutShifts3, 0);
        } finally {
          await inspectedPageSession.detach();
        }
      });

  // Flaky, skipped while we deflake it
  it.skip('[crbug.com/415271011]ignores metrics from iframes', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.reloadWithParams({panel: 'timeline'});
    await inspectedPage.bringToFront();

    const inspectedPageSession = await inspectedPage.page.createCDPSession();

    try {
      const framePromise = new Promise<puppeteer.Frame>(resolve => {
        inspectedPage.page.once('frameattached', resolve);
      });

      let executionContexts: puppeteer.Protocol.Runtime.ExecutionContextDescription[] = [];
      inspectedPageSession.on('Runtime.executionContextCreated', event => {
        executionContexts.push(event.context);
      });
      inspectedPageSession.on('Runtime.executionContextsCleared', () => {
        executionContexts = [];
      });

      await inspectedPageSession.send('Runtime.enable');

      const waitForLCP = await installLCPListener(inspectedPageSession);
      await inspectedPage.goToResource('performance/frame-metrics/index.html');
      await waitForLCP();

      const frame = await framePromise;

      // Interactions from an iframe should be ignored
      const h1El = await frame.waitForSelector('h1');
      await h1El!.click();
      await h1El!.click();
      await frame.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await frame.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      // This should be the only interaction that shows up
      await inspectedPage.page.click('h1');
      await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await devToolsPage.bringToFront();

      await devToolsPage.waitForMany(READY_LOCAL_METRIC_SELECTOR, 3);
      const interactions = await devToolsPage.$$<HTMLElement>(INTERACTION_SELECTOR);
      assert.isAtLeast(interactions.length, 1);

      // b/40884049
      // Extra execution contexts can be created sometimes when dealing with iframes.
      // We try to avoid that if possible.
      const liveMetricContexts = executionContexts.filter(e => e.name === 'DevTools Performance Metrics');
      assert.lengthOf(liveMetricContexts, 2);
    } finally {
      await inspectedPageSession.detach();
    }
  });

  it('gets field data automatically', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.reloadWithParams({panel: 'timeline'});
    await setCruxRawResponse('performance/crux-none.rawresponse', devToolsPage, inspectedPage);
    await inspectedPage.goToResource('performance/fake-website.html');

    const fieldSetupButton = await devToolsPage.waitFor<HTMLElement>(SETUP_FIELD_BUTTON_SELECTOR);
    await fieldSetupButton.click();

    const fieldEnableButton = await devToolsPage.waitForVisible<HTMLElement>(ENABLE_FIELD_BUTTON_SELECTOR);
    await fieldEnableButton.click();

    {
      const [lcpHistogram, clsHistogram, inpHistogram] = await devToolsPage.waitForMany(HISTOGRAM_SELECTOR, 3);
      assert.deepEqual(
          await lcpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
      assert.deepEqual(
          await clsHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
      assert.deepEqual(
          await inpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
    }

    // Switch the fake CrUX endpoint data to simulate new data for a new origin
    await setCruxRawResponse('performance/crux-valid.rawresponse', devToolsPage, inspectedPage);
    await inspectedPage.goToResourceWithCustomHost('devtools.oopif.test', 'performance/fake-website.html');

    const [lcpFieldValue, clsFieldValue, inpFieldValue] =
        await devToolsPage.waitForMany(READY_FIELD_METRIC_SELECTOR, 3);
    assert.strictEqual(await lcpFieldValue.evaluate(el => el.textContent) || '', '1.20 s');
    assert.strictEqual(await clsFieldValue.evaluate(el => el.textContent) || '', '0');
    assert.strictEqual(await inpFieldValue.evaluate(el => el.textContent) || '', '49 ms');

    {
      const [lcpHistogram, clsHistogram, inpHistogram] = await devToolsPage.waitForMany(HISTOGRAM_SELECTOR, 3);
      assert.deepEqual(
          await lcpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['96%', '3%', '1%']);
      assert.deepEqual(
          await clsHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['100%', '0%', '0%']);
      assert.deepEqual(
          await inpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['98%', '2%', '1%']);
    }

    // Ensure the original CrUX data is restored when we return to the original page
    await inspectedPage.goToResource('performance/fake-website.html');
    await devToolsPage.waitForNone(READY_FIELD_METRIC_SELECTOR);

    {
      const [lcpHistogram, clsHistogram, inpHistogram] = await devToolsPage.waitForMany(HISTOGRAM_SELECTOR, 3);
      assert.deepEqual(
          await lcpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
      assert.deepEqual(
          await clsHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
      assert.deepEqual(
          await inpHistogram.$$eval('.histogram-percent', els => els.map(el => el.textContent)), ['-', '-', '-']);
    }
  });

  it('uses URL override for field data', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.reloadWithParams({panel: 'timeline'});
    await setCruxRawResponse('performance/crux-valid.rawresponse', devToolsPage, inspectedPage);
    await inspectedPage.goToResource('performance/fake-website.html');

    const fieldSetupButton = await devToolsPage.waitFor(SETUP_FIELD_BUTTON_SELECTOR);
    await fieldSetupButton.click();

    await (await devToolsPage.waitFor(ADVANCED_DETAILS_SELECTOR)).evaluate(el => el.click());

    const urlOverrideCheckbox = await devToolsPage.waitForVisible(OVERRIDE_FIELD_CHECKBOX_SELECTOR);
    await urlOverrideCheckbox.evaluate(el => el.click());
    const urlOverrideText = await devToolsPage.waitForVisible(OVERRIDE_FIELD_TEXT_SELECTOR);
    await urlOverrideText.evaluate(el => {
      el.value = 'https://example.com';
      el.dispatchEvent(new Event('change'));
    });

    const fieldEnableButton = await devToolsPage.waitForVisible(ENABLE_FIELD_BUTTON_SELECTOR);
    await fieldEnableButton.click();
    {
      const [lcpFieldValue, clsFieldValue, inpFieldValue] =
          await devToolsPage.waitForMany(READY_FIELD_METRIC_SELECTOR, 3);
      assert.strictEqual(await lcpFieldValue.evaluate(el => el.textContent) || '', '1.20 s');
      assert.strictEqual(await clsFieldValue.evaluate(el => el.textContent) || '', '0');
      assert.strictEqual(await inpFieldValue.evaluate(el => el.textContent) || '', '49 ms');
    }

    // Switch the fake CrUX endpoint data to simulate new data for a new origin
    await setCruxRawResponse('performance/crux-none.rawresponse', devToolsPage, inspectedPage);
    await inspectedPage.goToResourceWithCustomHost('devtools.oopif.test', 'performance/fake-website.html');

    // Even though the URL and field data should change, the displayed data remains teh same
    {
      const [lcpFieldValue, clsFieldValue, inpFieldValue] =
          await devToolsPage.waitForMany(READY_FIELD_METRIC_SELECTOR, 3);
      assert.strictEqual(await lcpFieldValue.evaluate(el => el.textContent) || '', '1.20 s');
      assert.strictEqual(await clsFieldValue.evaluate(el => el.textContent) || '', '0');
      assert.strictEqual(await inpFieldValue.evaluate(el => el.textContent) || '', '49 ms');
    }
  });

  it('combines interaction entries correctly', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.reloadWithParams({panel: 'timeline'});
    await inspectedPage.bringToFront();

    const inspectedPageSession = await inspectedPage.page.createCDPSession();
    try {
      // The # of interactions in other tests can vary depending on which interaction events happen to
      // occur in the same frame. This test is designed to control when specific interaction events happen
      // so that we can observe the results in the interaction log.
      await inspectedPage.goToResource('performance/interaction-tester.html');

      // Delay ensures pointerdown and pointerup are in separate frames
      await inspectedPage.page.click('#long-click', {delay: 200});

      // No delay ensures pointerdown and pointerup are in the same frame
      await inspectedPage.page.click('#long-click');

      // Delay ensures keydown and keyup are in separate frames
      await inspectedPage.page.type('#long-type', 'hi', {delay: 200});

      await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await devToolsPage.bringToFront();

      {
        const interactions = await devToolsPage.waitForMany(INTERACTION_SELECTOR, 7);
        const interactionTypes = await Promise.all(
            interactions.map(el => el.$eval('.interaction-type', el => (el as HTMLElement).innerText)));
        assert.deepEqual(interactionTypes, [
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
      await inspectedPageSession.detach();
    }
  });

  it('logs extra interaction details to console', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.reloadWithParams({panel: 'timeline'});

    await inspectedPage.bringToFront();

    const inspectedPageSession = await inspectedPage.page.createCDPSession();
    try {
      await inspectedPage.goToResource('performance/interaction-tester.html');

      await inspectedPage.page.click('#long-click');

      await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      await inspectedPage.evaluate(() => new Promise(r => requestAnimationFrame(r)));

      await devToolsPage.bringToFront();

      const interaction = await devToolsPage.waitFor(INTERACTION_SELECTOR);
      await devToolsPage.click('summary', {root: interaction});

      await devToolsPage.click('.log-extra-details-button', {root: interaction});

      await tabExistsInDrawer('#tab-console-view', devToolsPage);
      const messages = await getCurrentConsoleMessages(undefined, undefined, undefined, devToolsPage);
      assert.lengthOf(messages, 4);
      assert.match(messages[0], /^\[DevTools\] Long animation frames for \d+ms pointer interaction$/);
      assert.strictEqual(messages[1], 'Scripts:');
      assert.strictEqual(messages[2], 'Array(3)');
      assert.strictEqual(messages[3], 'Intersecting long animation frame events: [{…}]');
    } finally {
      await inspectedPageSession.detach();
    }
  });

  it('does not retain interaction nodes in memory', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.reloadWithParams({panel: 'timeline'});
    await inspectedPage.bringToFront();

    const inspectedPageSession = await inspectedPage.page.createCDPSession();
    try {
      await inspectedPage.goToHtml('<button>Click me!</button>');

      const button = await inspectedPage.waitForSelector('button');
      await button!.click();

      // This ensures that the interaction has time to make it's way through web-vitals.js and
      // be detected by the live metrics model in DevTools.
      //
      // If any unnecessary JS references to the node get created they will be created in this time period.
      await inspectedPage.evaluate(() => new Promise(requestAnimationFrame));
      await inspectedPage.evaluate(() => new Promise(requestAnimationFrame));
      await devToolsPage.bringToFront();
      await devToolsPage.waitFor(INTERACTION_SELECTOR);
      await inspectedPage.bringToFront();

      // Attempt to remove the node from memory
      await button!.evaluate(async el => {
        el.remove();
        await new Promise(requestAnimationFrame);
      });
      await button!.dispose();

      // Ensure the node is not preserved in a detached state
      const hasNoDetachedNodes = await retryUntilExpected(async () => {
        const {detachedNodes} = await inspectedPageSession.send('DOM.getDetachedDomNodes');
        return detachedNodes.length === 0;
      });
      assert.isTrue(hasNoDetachedNodes, 'detached nodes were found after retries');

      await devToolsPage.bringToFront();

      // For redundancy, ensure the button node is removed from the memory heap
      await navigateToMemoryTab(devToolsPage);
      await takeHeapSnapshot(undefined, devToolsPage);
      await waitForNonEmptyHeapSnapshotData(devToolsPage);
      await setClassFilter('Detached <button>', devToolsPage);
      const row = await getCategoryRow('Detached <button>', false, devToolsPage);
      assert.isNull(row);
    } finally {
      await inspectedPageSession.detach();
    }
  });
});

/**
 * Retries the function a number of times until it returns true, or hits the max retries.
 * Note that this is different to our waitForFunction helpers which run the
 * function in the context of the inspectedPage page. This runs in the execution of the
 * test file itself.
 */
async function retryUntilExpected(asyncFunction: () => Promise<boolean>, maxRetries = 5): Promise<boolean> {
  let retries = 0;

  async function attempt(): Promise<boolean> {
    try {
      const result = await asyncFunction();
      if (result === true) {
        return true;
      }
      // Silently retry
      if (retries < maxRetries) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return await attempt();
      }
      return false;  // Max retries exceeded

    } catch {
      // Silently retry even if there is an error
      if (retries < maxRetries) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return await attempt();
      }
      return false;  // Max retries exceeded
    }
  }

  return await attempt();
}
