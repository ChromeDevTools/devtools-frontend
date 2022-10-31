// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {getBrowserAndPages, setDevToolsSettings, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickStartButton,
  getAuditsBreakdown,
  getServiceWorkerCount,
  interceptNextFileSave,
  navigateToLighthouseTab,
  registerServiceWorker,
  renderHtmlInIframe,
  selectCategories,
  selectDevice,
  setLegacyNavigation,
  setThrottlingMethod,
  setToolbarCheckboxWithText,
  waitForResult,
} from '../helpers/lighthouse-helpers.js';

// This test will fail (by default) in headful mode, as the target page never gets painted.
// To resolve this when debugging, just make sure the target page is visible during the lighthouse run.

describe('Navigation', async function() {
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

  const modes = ['legacy', 'FR'];

  for (const mode of modes) {
    describe(`in ${mode} mode`, () => {
      it('successfully returns a Lighthouse report', async () => {
        await navigateToLighthouseTab('lighthouse/hello.html');
        await registerServiceWorker();

        await setLegacyNavigation(mode === 'legacy');
        await selectCategories([
          'performance',
          'accessibility',
          'best-practices',
          'seo',
          'pwa',
          'lighthouse-plugin-publisher-ads',
        ]);

        let numNavigations = 0;
        const {target} = await getBrowserAndPages();
        target.on('framenavigated', () => ++numNavigations);

        await clickStartButton();

        const {lhr, artifacts, reportEl} = await waitForResult();

        if (mode === 'legacy') {
          // 1 initial about:blank jump
          // 1 about:blank jump + 1 navigation for the default pass
          // 1 about:blank jump + 1 navigation for the offline pass
          // 1 navigation after auditing to reset state
          assert.strictEqual(numNavigations, 6);
        } else {
          // 1 initial about:blank jump
          // 1 about:blank jump + 1 navigation for the default pass
          // 1 navigation after auditing to reset state
          assert.strictEqual(numNavigations, 4);
        }

        assert.strictEqual(lhr.lighthouseVersion, '9.6.8');
        assert.match(lhr.finalUrl, /^https:\/\/localhost:[0-9]+\/test\/e2e\/resources\/lighthouse\/hello.html/);

        assert.strictEqual(lhr.configSettings.throttlingMethod, 'simulate');
        assert.strictEqual(lhr.configSettings.disableStorageReset, false);
        assert.strictEqual(lhr.configSettings.formFactor, 'mobile');
        assert.strictEqual(lhr.configSettings.throttling.rttMs, 150);
        assert.strictEqual(lhr.configSettings.screenEmulation.disabled, true);
        assert.include(lhr.configSettings.emulatedUserAgent, 'Mobile');

        // A bug in FR caused `networkUserAgent` to be excluded from the LHR.
        // https://github.com/GoogleChrome/lighthouse/pull/14392
        // TODO: Reenable once the fix lands in DT.
        if (mode === 'legacy') {
          assert.include(lhr.environment.networkUserAgent, 'Mobile');
        }

        assert.deepStrictEqual(artifacts.ViewportDimensions, {
          innerHeight: 640,
          innerWidth: 360,
          outerHeight: 640,
          outerWidth: 360,
          devicePixelRatio: 3,
        });

        const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr);
        assert.strictEqual(auditResults.length, 175);
        assert.strictEqual(erroredAudits.length, 0);
        assert.deepStrictEqual(failedAudits.map(audit => audit.id), [
          'service-worker',
          'installable-manifest',
          'apple-touch-icon',
          'splash-screen',
          'themed-omnibox',
          'maskable-icon',
          'document-title',
          'html-has-lang',
          'meta-description',
        ]);

        const viewTraceButton = await waitFor('.lh-button--trace', reportEl);
        const viewTraceText = await viewTraceButton.evaluate(viewTraceEl => {
          return viewTraceEl.textContent;
        });
        assert.strictEqual(viewTraceText, 'View Original Trace');

        await viewTraceButton.click();
        const selectedTab = await waitFor('.tabbed-pane-header-tab.selected[aria-label="Performance"]');
        const selectedTabText = await selectedTab.evaluate(selectedTabEl => {
          return selectedTabEl.textContent;
        });
        assert.strictEqual(selectedTabText, 'Performance');

        await navigateToLighthouseTab();

        const waitForJson = await interceptNextFileSave();

        // For some reason the CDP click command doesn't work here even if the tools menu is open.
        await reportEl.$eval('a[data-action="save-json"]', saveJsonEl => (saveJsonEl as HTMLElement).click());

        const jsonContent = await waitForJson();
        assert.strictEqual(jsonContent, JSON.stringify(lhr, null, 2));

        const waitForHtml = await interceptNextFileSave();

        // For some reason the CDP click command doesn't work here even if the tools menu is open.
        await reportEl.$eval('a[data-action="save-html"]', saveHtmlEl => (saveHtmlEl as HTMLElement).click());

        const htmlContent = await waitForHtml();
        const iframeHandle = await renderHtmlInIframe(htmlContent);
        const iframeAuditDivs = await iframeHandle.$$('.lh-audit');
        const frontendAuditDivs = await reportEl.$$('.lh-audit');
        assert.strictEqual(frontendAuditDivs.length, iframeAuditDivs.length);

        // Ensure service worker was cleared.
        assert.strictEqual(await getServiceWorkerCount(), 0);
      });

      it('successfully returns a Lighthouse report with DevTools throttling', async () => {
        await navigateToLighthouseTab('lighthouse/hello.html');

        await setThrottlingMethod('devtools');
        await setLegacyNavigation(mode === 'legacy');

        await clickStartButton();

        const {lhr, reportEl} = await waitForResult();

        assert.strictEqual(lhr.configSettings.throttlingMethod, 'devtools');

        // [crbug.com/1347220] DevTools throttling can force resources to load slow enough for these audits to fail sometimes.
        const flakyAudits = [
          'server-response-time',
          'render-blocking-resources',
        ];

        const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr, flakyAudits);
        assert.strictEqual(auditResults.length, 152);
        assert.strictEqual(erroredAudits.length, 0);
        assert.deepStrictEqual(failedAudits.map(audit => audit.id), [
          'service-worker',
          'installable-manifest',
          'apple-touch-icon',
          'splash-screen',
          'themed-omnibox',
          'maskable-icon',
          'document-title',
          'html-has-lang',
          'meta-description',
        ]);

        const viewTraceText = await reportEl.$eval('.lh-button--trace', viewTraceEl => {
          return viewTraceEl.textContent;
        });
        assert.strictEqual(viewTraceText, 'View Trace');
      });

      it('successfully returns a Lighthouse report when settings changed', async () => {
        await setDevToolsSettings({language: 'es'});
        await navigateToLighthouseTab('lighthouse/hello.html');
        await registerServiceWorker();

        await setToolbarCheckboxWithText(mode === 'legacy', 'Navegación antigua');
        await setToolbarCheckboxWithText(false, 'Borrar almacenamiento');
        await selectCategories(['performance', 'best-practices']);
        await selectDevice('desktop');

        await clickStartButton();

        const {reportEl, lhr, artifacts} = await waitForResult();

        const {innerWidth, innerHeight, devicePixelRatio} = artifacts.ViewportDimensions;
        // TODO: Figure out why outerHeight can be different depending on OS
        assert.strictEqual(innerHeight, 720);
        assert.strictEqual(innerWidth, 1280);
        assert.strictEqual(devicePixelRatio, 1);

        const {erroredAudits} = getAuditsBreakdown(lhr);
        assert.strictEqual(erroredAudits.length, 0);

        assert.deepStrictEqual(Object.keys(lhr.categories), ['performance', 'best-practices']);
        assert.strictEqual(lhr.configSettings.disableStorageReset, true);
        assert.strictEqual(lhr.configSettings.formFactor, 'desktop');
        assert.strictEqual(lhr.configSettings.throttling.rttMs, 40);
        assert.strictEqual(lhr.configSettings.screenEmulation.disabled, true);
        assert.notInclude(lhr.configSettings.emulatedUserAgent, 'Mobile');

        // A bug in FR caused `networkUserAgent` to be excluded from the LHR.
        // https://github.com/GoogleChrome/lighthouse/pull/14392
        // TODO: Reenable once the fix lands in DT.
        if (mode === 'legacy') {
          assert.notInclude(lhr.environment.networkUserAgent, 'Mobile');
        }

        const viewTraceText = await reportEl.$eval('.lh-button--trace', viewTraceEl => {
          return viewTraceEl.textContent;
        });
        assert.strictEqual(viewTraceText, 'Ver rastro original');

        const footerIssueText = await reportEl.$eval('.lh-footer__version_issue', footerIssueEl => {
          return footerIssueEl.textContent;
        });
        assert.strictEqual(lhr.i18n.rendererFormattedStrings.footerIssue, 'Notificar un problema');
        assert.strictEqual(footerIssueText, 'Notificar un problema');

        // Ensure service worker is not cleared because we disable the storage reset.
        assert.strictEqual(await getServiceWorkerCount(), 1);
      });
    });
  }
});
