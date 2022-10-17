// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {getBrowserAndPages} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickStartButton,
  endTimespan,
  getAuditsBreakdown,
  getServiceWorkerCount,
  navigateToLighthouseTab,
  registerServiceWorker,
  selectDevice,
  selectMode,
  setThrottlingMethod,
  waitForResult,
  waitForTimespanStarted,
} from '../helpers/lighthouse-helpers.js';

// This test will fail (by default) in headful mode, as the target page never gets painted.
// To resolve this when debugging, just make sure the target page is visible during the lighthouse run.

describe('Timespan', async function() {
  // The tests in this suite are particularly slow
  this.timeout(60_000);

  beforeEach(() => {
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1357791
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
  });

  it('successfully returns a Lighthouse report for user interactions', async () => {
    await navigateToLighthouseTab('lighthouse/hello.html');
    await registerServiceWorker();

    // https://bugs.chromium.org/p/chromium/issues/detail?id=1364257
    await selectDevice('desktop');

    await selectMode('timespan');
    await setThrottlingMethod('simulate');

    let numNavigations = 0;
    const {target} = await getBrowserAndPages();
    target.on('framenavigated', () => ++numNavigations);

    await clickStartButton();
    await waitForTimespanStarted();

    await target.click('button');
    await target.click('button');
    await target.click('button');

    await endTimespan();

    const {lhr, artifacts, reportEl} = await waitForResult();

    assert.strictEqual(numNavigations, 0);

    assert.strictEqual(lhr.gatherMode, 'timespan');

    // Even though the dropdown is set to "simulate", throttling method should be overriden to "devtools".
    assert.strictEqual(lhr.configSettings.throttlingMethod, 'devtools');

    const {innerWidth, innerHeight, devicePixelRatio} = artifacts.ViewportDimensions;
    // TODO: Figure out why outerHeight can be different depending on OS
    assert.strictEqual(innerHeight, 720);
    assert.strictEqual(innerWidth, 1280);
    assert.strictEqual(devicePixelRatio, 1);

    const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr);
    assert.strictEqual(auditResults.length, 47);
    assert.strictEqual(erroredAudits.length, 0);
    assert.deepStrictEqual(failedAudits.map(audit => audit.id), []);

    // Ensure the timespan captured the user interaction.
    const interactionAudit = lhr.audits['experimental-interaction-to-next-paint'];
    assert.ok(interactionAudit.score);
    assert.ok(interactionAudit.numericValue);
    assert.strictEqual(interactionAudit.scoreDisplayMode, 'numeric');

    // Trace was collected in timespan mode.
    // Timespan mode can only do DevTools throttling so the text will be "View Trace".
    const viewTraceText = await reportEl.$eval('.lh-button--trace', viewTraceEl => {
      return viewTraceEl.textContent;
    });
    assert.strictEqual(viewTraceText, 'View Trace');

    // Ensure service worker is not cleared in timespan mode.
    assert.strictEqual(await getServiceWorkerCount(), 1);
  });
});
