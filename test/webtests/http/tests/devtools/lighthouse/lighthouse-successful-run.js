// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  // screenshots in content shell are flaky and NO_NAVSTART occurs on bots way more frequently than local
  // ignore the results of the trace-dependent audits, just make sure they ran
  const FLAKY_AUDITS = [
    // metrics
    'first-contentful-paint',
    'first-meaningful-paint',
    'first-cpu-idle',
    'interactive',
    'estimated-input-latency',
    'speed-index',
    'metrics',
    'screenshot-thumbnails',
    // misc trace-based audits
    'long-tasks',
    'user-timings',
    'bootup-time',
    // opportunities
    'efficient-animated-content',
    'offscreen-images',
    'redirects',
    'render-blocking-resources',
    'unminified-css',
    'unminified-javascript',
    'unused-css-rules',
    'uses-optimized-images',
    'uses-rel-preload',
    'uses-responsive-images',
    'uses-text-compression',
    'uses-webp-images',
  ];

  TestRunner.addResult('Tests that audits panel works.\n');
  await TestRunner.navigatePromise('resources/lighthouse-basic.html');

  await TestRunner.loadModule('lighthouse_test_runner');
  await TestRunner.showPanel('lighthouse');

  // Use all the default settings, but also enable a plugin.
  const containerElement = LighthouseTestRunner.getContainerElement();
  const checkboxes = containerElement.querySelectorAll('.checkbox');
  for (const checkbox of checkboxes) {
    if (checkbox.textElement.textContent === 'Publisher Ads') {
      checkbox.checkboxElement.click();
    }
  }

  LighthouseTestRunner.dumpStartAuditState();

  TestRunner.addResult('\n=============== Lighthouse Status Updates ===============');
  LighthouseTestRunner.addStatusListener(msg => TestRunner.addResult(msg));
  LighthouseTestRunner.getRunButton().click();

  const {artifacts, lhr} = await LighthouseTestRunner.waitForResults();
  TestRunner.addResult('\n=============== Lighthouse Results ===============');
  TestRunner.addResult(`URL: ${lhr.finalUrl}`);
  TestRunner.addResult(`Version: ${lhr.lighthouseVersion}`);
  TestRunner.addResult(`ViewportDimensions: ${JSON.stringify(artifacts.ViewportDimensions, null, 2)}`);
  TestRunner.addResult('\n');

  Object.keys(lhr.audits).sort().forEach(auditName => {
    const audit = lhr.audits[auditName];

    if (FLAKY_AUDITS.includes(auditName)) {
      TestRunner.addResult(`${auditName}: flaky`);
    } else if (audit.scoreDisplayMode === 'error') {
      TestRunner.addResult(`${auditName}: ERROR ${audit.errorMessage}`);
    } else if (audit.scoreDisplayMode === 'binary') {
      TestRunner.addResult(`${auditName}: ${audit.score ? 'pass' : 'fail'}`);
    } else {
      TestRunner.addResult(`${auditName}: ${audit.scoreDisplayMode}`);
    }
  });

  const resultsElement = LighthouseTestRunner.getResultsElement();
  const auditElements = [...resultsElement.querySelectorAll('.lh-audit')];
  const auditElementNames = auditElements.map(e => e.id).sort((a, b) => a.localeCompare(b));
  TestRunner.addResult(`\n# of .lh-audit divs: ${auditElements.length}`);
  TestRunner.addResult(`\n.lh-audit divs:\n${auditElementNames.join('\n')}`);

  TestRunner.completeTest();
})();
