// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

ExtensionsTestRunner.startExtensionAudits = function(callback) {
  const launcherView = UI.panels.audits._launcherView;
  launcherView._selectAllClicked(false);
  launcherView._auditPresentStateElement.checked = true;
  var extensionCategories = document.querySelectorAll('.audit-categories-container > label');

  for (var i = 0; i < extensionCategories.length; ++i) {
    var shouldBeEnabled = extensionCategories[i].textContent.includes('Extension');

    if (!shouldBeEnabled && extensionCategories[i].textElement)
      shouldBeEnabled = extensionCategories[i].textElement.textContent.includes('Extension');

    if (shouldBeEnabled !== extensionCategories[i].checkboxElement.checked)
      extensionCategories[i].checkboxElement.click();
  }

  function onAuditsDone() {
    AuditsTestRunner.collectAuditResults(callback);
  }

  TestRunner.addSniffer(UI.panels.audits, 'auditFinishedCallback', onAuditsDone, true);
  launcherView._launchButtonClicked();
};

ExtensionsTestRunner.dumpAuditProgress = function() {
  var progress = document.querySelector('.progress-indicator').shadowRoot.querySelector('progress');
  TestRunner.addResult('Progress: ' + Math.round(100 * progress.value / progress.max) + '%');
};

TestRunner.initAsync(async function() {
  await TestRunner.evaluateInPagePromise(`
    function extension_runAudits(callback) {
      evaluateOnFrontend('InspectorTest.startExtensionAudits(reply);', callback);
    }
  `);
});
