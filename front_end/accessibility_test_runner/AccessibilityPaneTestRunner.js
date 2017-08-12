// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

AccessibilityTestRunner.accessibilitySidebarPane = function() {
  return self.runtime.sharedInstance(Accessibility.AccessibilitySidebarView);
};

AccessibilityTestRunner.selectNodeAndWaitForAccessibility = function(idValue) {
  return new Promise(resolve => {
    ElementsTestRunner.selectNodeWithId(idValue, function() {
      self.runtime.sharedInstance(Accessibility.AccessibilitySidebarView).doUpdate().then(resolve);
    });
  });
};

AccessibilityTestRunner.dumpSelectedElementAccessibilityNode = function() {
  var sidebarPane = AccessibilityTestRunner.accessibilitySidebarPane();

  if (!sidebarPane) {
    TestRunner.addResult('No sidebarPane in dumpSelectedElementAccessibilityNode');
    TestRunner.completeTest();
    return;
  }

  AccessibilityTestRunner.dumpAccessibilityNode(sidebarPane._axNodeSubPane._axNode);
};

AccessibilityTestRunner.dumpAccessibilityNode = function(accessibilityNode) {
  if (!accessibilityNode) {
    TestRunner.addResult('<null>');
    TestRunner.completeTest();
    return;
  }

  var builder = [];
  builder.push(accessibilityNode.role().value);
  builder.push((accessibilityNode.name() ? '"' + accessibilityNode.name().value + '"' : '<undefined>'));

  if (accessibilityNode.properties()) {
    for (var property of accessibilityNode.properties()) {
      if ('value' in property)
        builder.push(property.name + '="' + property.value.value + '"');
    }
  }

  TestRunner.addResult(builder.join(' '));
};

AccessibilityTestRunner.findARIAAttributeTreeElement = function(attribute) {
  var sidebarPane = AccessibilityTestRunner.accessibilitySidebarPane();

  if (!sidebarPane) {
    TestRunner.addResult('Could not get Accessibility sidebar pane.');
    TestRunner.completeTest();
    return;
  }

  var ariaSubPane = sidebarPane._ariaSubPane;
  var treeOutline = ariaSubPane._treeOutline;
  var childNodes = treeOutline._rootElement._children;

  for (var treeElement of childNodes) {
    if (treeElement._attribute.name === attribute)
      return treeElement;
  }

  return null;
};
