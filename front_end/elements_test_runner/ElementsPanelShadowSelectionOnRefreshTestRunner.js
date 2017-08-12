// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

ElementsTestRunner.selectReloadAndDump = function(next, node) {
  ElementsTestRunner.selectNode(node).then(onSelected);
  var reloaded = false;
  var selected = false;

  function onSelected() {
    TestRunner.reloadPage(onReloaded);
    TestRunner.addSniffer(Elements.ElementsPanel.prototype, '_lastSelectedNodeSelectedForTest', onReSelected);
  }

  function onReloaded() {
    reloaded = true;
    maybeDumpSelectedNode();
  }

  function onReSelected() {
    selected = true;
    maybeDumpSelectedNode();
  }

  function maybeDumpSelectedNode() {
    if (!reloaded || !selected)
      return;

    var selectedElement = ElementsTestRunner.firstElementsTreeOutline().selectedTreeElement;
    var nodeName = (selectedElement ? selectedElement.node().nodeNameInCorrectCase() : 'null');
    TestRunner.addResult('Selected node: \'' + nodeName + '\'');
    next();
  }
};
