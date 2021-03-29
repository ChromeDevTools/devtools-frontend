// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests that Lighthouse block requests specified in DevTools BlockedURLsPane.\n');
  await TestRunner.navigatePromise('resources/lighthouse-basic.html');

  await TestRunner.loadTestModule('lighthouse_test_runner');
  await TestRunner.showPanel('lighthouse');

  const containerElement = LighthouseTestRunner.getContainerElement();
  const checkboxes = containerElement.querySelectorAll('.checkbox');
  for (const checkbox of checkboxes) {
    if (checkbox.textElement.textContent === 'Performance' || checkbox.textElement.textContent === 'Clear storage') {
      continue;
    }

    if (checkbox.checkboxElement.checked) {
      checkbox.checkboxElement.click();
    }
  }

  const networkManager = self.SDK.MultitargetNetworkManager.instance();
  networkManager.setBlockingEnabled(true);
  networkManager.setBlockedPatterns([{enabled: true, url: '*.css'}]);

  LighthouseTestRunner.dumpStartAuditState();
  LighthouseTestRunner.getRunButton().click();
  const {lhr} = await LighthouseTestRunner.waitForResults();

  const requestsMade = [];
  const requestsBlocked = [];
  for (const item of lhr.audits['network-requests'].details.items) {
    if (item.statusCode === -1) {
      requestsBlocked.push(item.url);
    } else {
      requestsMade.push(item.url);
    }
  }

  TestRunner.addResult(`\nRequests made: ${requestsMade.join(', ')}`);
  TestRunner.addResult(`Requests blocked: ${requestsBlocked.join(', ')}`);

  networkManager.setBlockingEnabled(false);
  networkManager.setBlockedPatterns([]);

  TestRunner.completeTest();
})();
