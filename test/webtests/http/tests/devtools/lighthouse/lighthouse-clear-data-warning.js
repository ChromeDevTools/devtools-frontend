// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests that Lighthouse panel displays a warning when important data may affect performance.\n');
  await TestRunner.navigatePromise('resources/lighthouse-storage.html');

  await TestRunner.loadModule('lighthouse_test_runner');
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

  LighthouseTestRunner.dumpStartAuditState();

  const Events = Lighthouse.LighthousePanel.getEvents();
  const warningText = containerElement.querySelector('.lighthouse-warning-text');

  // Wait for warning event to be handled
  LighthouseTestRunner._panel()._controller.addEventListener(Events.PageWarningsChanged, () => {
    TestRunner.addResult(`Warning Text: ${warningText.textContent}`);
    TestRunner.completeTest();
  });
  LighthouseTestRunner.forcePageAuditabilityCheck();
})();
