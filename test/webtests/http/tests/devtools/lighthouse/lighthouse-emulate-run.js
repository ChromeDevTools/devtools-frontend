// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests that mobile emulation works.\n');
  await TestRunner.navigatePromise('resources/lighthouse-emulate-pass.html');

  await TestRunner.loadTestModule('lighthouse_test_runner');
  await TestRunner.showPanel('lighthouse');

  LighthouseTestRunner.dumpStartAuditState();
  LighthouseTestRunner.getRunButton().click();
  const {lhr} = await LighthouseTestRunner.waitForResults();

  TestRunner.addResult('\n=============== Lighthouse Results ===============');
  TestRunner.addResult(`URL: ${lhr.finalUrl}`);
  TestRunner.addResult(`Version: ${lhr.lighthouseVersion}`);
  TestRunner.addResult(`formFactor: ${lhr.configSettings.formFactor}`);
  TestRunner.addResult(`screenEmulation: ${JSON.stringify(lhr.configSettings.screenEmulation, null, 2)}`);
  TestRunner.addResult(`Mobile network UA?: ${lhr.environment.networkUserAgent.includes('Mobile')}`);
  TestRunner.addResult(`Mobile configured UA?: ${lhr.configSettings.emulatedUserAgent.includes('Mobile')}`);
  TestRunner.addResult(`throttlingMethod: ${lhr.configSettings.throttlingMethod}`);
  TestRunner.addResult(`throttling.rttMs: ${lhr.configSettings.throttling.rttMs}`);
  TestRunner.addResult('\n');

  const auditName = 'content-width';
  const audit = lhr.audits[auditName];
  if (audit.scoreDisplayMode === 'error') {
    TestRunner.addResult(`${auditName}: ERROR ${audit.errorMessage}`);
  } else if (audit.scoreDisplayMode === 'binary') {
    TestRunner.addResult(`${auditName}: ${audit.score ? 'pass' : 'fail'} ${audit.explanation}`);
  } else {
    TestRunner.addResult(`${auditName}: ${audit.scoreDisplayMode}`);
  }

  TestRunner.completeTest();
})();
