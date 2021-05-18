// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests that audits panel renders View Trace button.\n');
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

  LighthouseTestRunner.dumpStartAuditState();
  LighthouseTestRunner.getRunButton().click();

  const {lhr} = await LighthouseTestRunner.waitForResults();
  TestRunner.addResult('\n=============== Audits run ===============');
  TestRunner.addResult(Object.keys(lhr.audits).sort().join('\n'));

  const waitForShowView = new Promise(resolve => {
    TestRunner.addSniffer(UI.ViewManager.prototype, 'showView', resolve);
  });
  const viewTraceButton = LighthouseTestRunner.getResultsElement().querySelector('.lh-button--trace');
  TestRunner.addResult(`\nView Trace Button Text: "${viewTraceButton.textContent}"`);
  TestRunner.addResult(`View Trace Button Title: "${UI.Tooltip.getContent(viewTraceButton)}"`);
  viewTraceButton.click();
  const viewShown = await waitForShowView;
  TestRunner.addResult(`\nShowing view: ${viewShown}`);

  TestRunner.completeTest();
})();
