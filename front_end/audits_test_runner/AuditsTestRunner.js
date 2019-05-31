// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

/**
 * @return {!Audits.AuditsPanel}
 */
AuditsTestRunner._panel = function() {
  return /** @type {!Object} **/ (UI.panels).audits;
};

/**
 * @return {?Element}
 */
AuditsTestRunner.getContainerElement = function() {
  return AuditsTestRunner._panel().contentElement;
};

/**
 * @return {?Element}
 */
AuditsTestRunner.getResultsElement = function() {
  return AuditsTestRunner._panel()._auditResultsElement;
};

/**
 * @return {?Element}
 */
AuditsTestRunner.getDialogElement = function() {
  return AuditsTestRunner._panel()._statusView._dialog.contentElement.shadowRoot.querySelector('.audits-view');
};

/**
 * @return {?Element}
 */
AuditsTestRunner.getRunButton = function() {
  const dialog = AuditsTestRunner.getContainerElement();
  return dialog && dialog.querySelectorAll('button')[0];
};

/**
 * @return {?Element}
 */
AuditsTestRunner.getCancelButton = function() {
  const dialog = AuditsTestRunner.getDialogElement();
  return dialog && dialog.querySelectorAll('button')[0];
};

AuditsTestRunner.openStartAudit = function() {
  AuditsTestRunner._panel()._renderStartView();
};

/**
 * @param {function(string)} onMessage
 */
AuditsTestRunner.addStatusListener = function(onMessage) {
  TestRunner.addSniffer(Audits.StatusView.prototype, 'updateStatus', onMessage, true);
};

/**
 * @return {!Promise<!Object>}
 */
AuditsTestRunner.waitForResults = function() {
  return new Promise(resolve => {
    TestRunner.addSniffer(Audits.AuditsPanel.prototype, '_buildReportUI', resolve);
  });
};

AuditsTestRunner.forcePageAuditabilityCheck = function() {
  AuditsTestRunner._panel()._controller.recomputePageAuditability();
};

/**
 * @param {?Element} checkboxContainer
 * @return {string}
 */
AuditsTestRunner._checkboxStateLabel = function(checkboxContainer) {
  if (!checkboxContainer)
    return 'missing';

  const label = checkboxContainer.textElement.textContent;
  const checkedLabel = checkboxContainer.checkboxElement.checked ? 'x' : ' ';
  return `[${checkedLabel}] ${label}`;
};

/**
 * @param {?Element} button
 * @return {string}
 */
AuditsTestRunner._buttonStateLabel = function(button) {
  if (!button)
    return 'missing';

  const enabledLabel = button.disabled ? 'disabled' : 'enabled';
  const hiddenLabel = window.getComputedStyle(button).getPropertyValue('visibility');
  return `${button.textContent}: ${enabledLabel} ${hiddenLabel}`;
};

AuditsTestRunner.dumpStartAuditState = function() {
  TestRunner.addResult('\n========== Audits Start Audit State ==========');

  const containerElement = AuditsTestRunner.getContainerElement();
  const checkboxes = [...containerElement.querySelectorAll('.checkbox')];
  checkboxes.forEach(element => {
    TestRunner.addResult(AuditsTestRunner._checkboxStateLabel(element));
  });

  const helpText = containerElement.querySelector('.audits-help-text');
  if (!helpText.classList.contains('hidden'))
    TestRunner.addResult(`Help text: ${helpText.textContent}`);

  TestRunner.addResult(AuditsTestRunner._buttonStateLabel(AuditsTestRunner.getRunButton()));
};
