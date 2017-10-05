// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

/**
 * @return {!Audits2.Audits2Panel}
 */
Audits2TestRunner._panel = function() {
  return /** @type {!Object} **/ (UI.panels).audits2;
};

/**
 * @return {?Element}
 */
Audits2TestRunner.getResultsElement = function() {
  return Audits2TestRunner._panel()._auditResultsElement;
};

/**
 * @return {?Element}
 */
Audits2TestRunner.getDialogElement = function() {
  return Audits2TestRunner._panel()._dialog.contentElement.shadowRoot.querySelector('.audits2-view');
};

/**
 * @return {?Element}
 */
Audits2TestRunner.getRunButton = function() {
  var dialog = Audits2TestRunner.getDialogElement();
  return dialog && dialog.querySelectorAll('button')[0];
};

/**
 * @return {?Element}
 */
Audits2TestRunner.getCancelButton = function() {
  var dialog = Audits2TestRunner.getDialogElement();
  return dialog && dialog.querySelectorAll('button')[1];
};

Audits2TestRunner.openDialog = function() {
  var resultsElement = Audits2TestRunner.getResultsElement();
  resultsElement.querySelector('button').click();
};

/**
 * @param {function(string)} onMessage
 */
Audits2TestRunner.addStatusListener = function(onMessage) {
  TestRunner.addSniffer(Audits2.Audits2Panel.prototype, '_updateStatus', onMessage, true);
};

/**
 * @return {!Promise<!Object>}
 */
Audits2TestRunner.waitForResults = function() {
  return new Promise(resolve => {
    TestRunner.addSniffer(Audits2.Audits2Panel.prototype, '_buildReportUI', resolve);
  });
};

/**
 * @param {?Element} checkboxContainer
 * @return {string}
 */
Audits2TestRunner._checkboxStateLabel = function(checkboxContainer) {
  if (!checkboxContainer)
    return 'missing';

  var label = checkboxContainer.textElement.textContent;
  var checkedLabel = checkboxContainer.checkboxElement.checked ? 'x' : ' ';
  return `[${checkedLabel}] ${label}`;
};

/**
 * @param {?Element} button
 * @return {string}
 */
Audits2TestRunner._buttonStateLabel = function(button) {
  if (!button)
    return 'missing';

  var enabledLabel = button.disabled ? 'disabled' : 'enabled';
  var hiddenLabel = window.getComputedStyle(button).getPropertyValue('visibility');
  return `${button.textContent}: ${enabledLabel} ${hiddenLabel}`;
};

Audits2TestRunner.dumpDialogState = function() {
  TestRunner.addResult('\n========== Audits2 Dialog State ==========');
  var dialog = Audits2TestRunner._panel()._dialog;
  TestRunner.addResult(dialog ? 'Dialog is visible\n' : 'No dialog');
  if (!dialog)
    return;

  var dialogElement = Audits2TestRunner.getDialogElement();
  var checkboxes = [...dialogElement.querySelectorAll('.checkbox')];
  checkboxes.forEach(element => {
    TestRunner.addResult(Audits2TestRunner._checkboxStateLabel(element));
  });

  var helpText = dialogElement.querySelector('.audits2-dialog-help-text');
  if (!helpText.classList.contains('hidden'))
    TestRunner.addResult(`Help text: ${helpText.textContent}`);

  TestRunner.addResult(Audits2TestRunner._buttonStateLabel(Audits2TestRunner.getRunButton()));
  TestRunner.addResult(Audits2TestRunner._buttonStateLabel(Audits2TestRunner.getCancelButton()) + '\n');
};