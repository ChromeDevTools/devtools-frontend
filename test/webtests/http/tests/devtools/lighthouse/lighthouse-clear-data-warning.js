// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests that Lighthouse panel displays a warning when important data may affect performance.\n');
  await TestRunner.navigatePromise('resources/lighthouse-storage.html');

  await TestRunner.loadTestModule('lighthouse_test_runner');
  await TestRunner.showPanel('lighthouse');
  await TestRunner.RuntimeAgent.invoke_evaluate({
    expression: 'webSqlPromise',
    awaitPromise: true,
  });

  const containerElement = LighthouseTestRunner.getContainerElement();
  const ensureDisabledNames = ['Accessibility', 'Best practices', 'SEO', 'Progressive Web App'];
  const checkboxes = Array.from(containerElement.querySelectorAll('.checkbox'));
  for (const checkbox of checkboxes) {
    if (!ensureDisabledNames.includes(checkbox.textElement.textContent)) {
      continue;
    }

    if (checkbox.checkboxElement.checked) {
      checkbox.checkboxElement.click();
    }
  }

  LighthouseTestRunner.dumpStartAuditState();

  const Events = Lighthouse.LighthousePanel.getEvents();

  // Wait for warning event to be handled
  LighthouseTestRunner._panel().controller.addEventListener(Events.PageWarningsChanged, () => {
    const warningText = containerElement.querySelector('.lighthouse-warning-text');
    TestRunner.addResult(`Warning Text: ${warningText.textContent}`);
    TestRunner.completeTest();
  });
  LighthouseTestRunner.forcePageAuditabilityCheck();
})();
