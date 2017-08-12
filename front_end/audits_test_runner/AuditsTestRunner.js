// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

AuditsTestRunner.collectAuditResults = function(callback) {
  UI.panels.audits.showResults(UI.panels.audits._auditResultsTreeElement.firstChild().results);
  var trees = UI.panels.audits.visibleView.element.querySelectorAll('.audit-result-tree');

  for (var i = 0; i < trees.length; ++i) {
    var liElements = trees[i].shadowRoot.querySelectorAll('li');

    for (var j = 0; j < liElements.length; ++j) {
      if (liElements[j].treeElement)
        liElements[j].treeElement.expand();
    }
  }

  TestRunner.deprecatedRunAfterPendingDispatches(function() {
    AuditsTestRunner.collectTextContent(UI.panels.audits.visibleView.element, '');
    callback();
  });
};

AuditsTestRunner.launchAllAudits = function(shouldReload, callback) {
  TestRunner.addSniffer(Audits.AuditController.prototype, '_auditFinishedCallback', callback);
  var launcherView = UI.panels.audits._launcherView;
  launcherView._selectAllClicked(true);
  launcherView._auditPresentStateElement.checked = !shouldReload;
  launcherView._launchButtonClicked();
};

AuditsTestRunner.collectTextContent = function(element, indent) {
  var nodeOutput = '';
  var child = element.shadowRoot || element.firstChild;

  var nonTextTags = {'STYLE': 1, 'SCRIPT': 1};

  while (child) {
    if (child.nodeName === 'CONTENT') {
      AuditsTestRunner.collectTextContent(child.getDistributedNodes()[0], indent);
    } else if (child.nodeType === Node.TEXT_NODE) {
      if (!nonTextTags[child.parentElement.nodeName])
        nodeOutput += child.nodeValue.replace('​', '');
    } else if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      if (nodeOutput !== '') {
        TestRunner.addResult(indent + nodeOutput);
        nodeOutput = '';
      }

      if (!child.firstChild && child.classList.contains('severity'))
        nodeOutput = '[' + child.className + '] ';
      else
        AuditsTestRunner.collectTextContent(child, indent + ' ');
    }

    child = child.nextSibling;
  }

  if (nodeOutput !== '')
    TestRunner.addResult(indent + nodeOutput);
};
