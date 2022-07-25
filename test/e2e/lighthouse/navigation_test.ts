// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickStartButton,
  getAuditsBreakdown,
  navigateToLighthouseTab,
  setLegacyNavigation,
  setThrottlingMethod,
  waitForResult,
} from '../helpers/lighthouse-helpers.js';

// This test will fail (by default) in headful mode, as the target page never gets painted.
// To resolve this when debugging, just make sure the target page is visible during the lighthouse run.

// Flaky on Mac
describe.skipOnPlatforms(['mac'], '[crbug.com/1347220] Navigation', async function() {
  // The tests in this suite are particularly slow
  this.timeout(60_000);

  const modes = ['legacy', 'FR'];

  for (const mode of modes) {
    describe(`in ${mode} mode`, () => {
      beforeEach(() => {
        if (mode === 'FR') {
          // TODO: Figure out why these are emitted in FR.
          expectError(/Protocol Error: the message with wrong session id/);
          expectError(/Protocol Error: the message with wrong session id/);
        }
      });

      it('successfully returns a Lighthouse report', async () => {
        await navigateToLighthouseTab('lighthouse/hello.html');

        await setLegacyNavigation(mode === 'legacy');
        await clickStartButton();

        const {lhr, artifacts, reportEl} = await waitForResult();

        assert.strictEqual(lhr.lighthouseVersion, '9.6.2');
        assert.match(lhr.finalUrl, /^https:\/\/localhost:[0-9]+\/test\/e2e\/resources\/lighthouse\/hello.html/);
        assert.strictEqual(lhr.configSettings.throttlingMethod, 'simulate');

        const {innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio} = artifacts.ViewportDimensions;
        // This value can vary slightly, depending on the display.
        assert.approximately(innerHeight, 1742, 1);
        assert.strictEqual(innerWidth, 980);
        assert.strictEqual(outerWidth, 360);
        assert.strictEqual(outerHeight, 640);
        assert.strictEqual(devicePixelRatio, 3);

        const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr);
        assert.strictEqual(auditResults.length, 152);
        assert.strictEqual(erroredAudits.length, 0);
        assert.deepStrictEqual(failedAudits.map(audit => audit.id), [
          'service-worker',
          'viewport',
          'installable-manifest',
          'apple-touch-icon',
          'splash-screen',
          'themed-omnibox',
          'maskable-icon',
          'content-width',
          'document-title',
          'html-has-lang',
          'meta-description',
          'font-size',
          'tap-targets',
        ]);

        const viewTraceText = await reportEl.$eval('.lh-button--trace', viewTraceEl => {
          return viewTraceEl.textContent;
        });
        assert.strictEqual(viewTraceText, 'View Original Trace');
      });

      it('successfully returns a Lighthouse report with DevTools throttling', async () => {
        await navigateToLighthouseTab('lighthouse/hello.html');

        await setThrottlingMethod('devtools');
        await setLegacyNavigation(mode === 'legacy');
        await clickStartButton();

        const {lhr, reportEl} = await waitForResult();

        assert.strictEqual(lhr.configSettings.throttlingMethod, 'devtools');

        const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr);
        assert.strictEqual(auditResults.length, 152);
        assert.strictEqual(erroredAudits.length, 0);
        assert.deepStrictEqual(failedAudits.map(audit => audit.id), [
          'service-worker',
          'viewport',
          'installable-manifest',
          'apple-touch-icon',
          'splash-screen',
          'themed-omnibox',
          'maskable-icon',
          'content-width',
          'document-title',
          'html-has-lang',
          'meta-description',
          'font-size',
          'tap-targets',
        ]);

        const viewTraceText = await reportEl.$eval('.lh-button--trace', viewTraceEl => {
          return viewTraceEl.textContent;
        });
        assert.strictEqual(viewTraceText, 'View Trace');
      });
    });
  }
});
