// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../elements_test_runner/elements_test_runner.js';
import '../../core/i18n/i18n.js';

import * as Accessibility from '../../panels/accessibility/accessibility.js';
import {TestRunner} from '../test_runner/test_runner.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

export const AccessibilityTestRunner = {};

AccessibilityTestRunner.accessibilitySidebarPane = function() {
  return Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance();
};

AccessibilityTestRunner.selectNodeAndWaitForAccessibility = function(idValue) {
  return new Promise(resolve => {
    ElementsTestRunner.selectNodeWithId(idValue, function() {
      Accessibility.AccessibilitySidebarView.AccessibilitySidebarView.instance().doUpdate().then(resolve);
    });
  });
};

AccessibilityTestRunner.dumpSelectedElementAccessibilityNode = function() {
  const sidebarPane = AccessibilityTestRunner.accessibilitySidebarPane();

  if (!sidebarPane) {
    TestRunner.addResult('No sidebarPane in dumpSelectedElementAccessibilityNode');
    TestRunner.completeTest();
    return;
  }

  AccessibilityTestRunner.dumpAccessibilityNode(sidebarPane.axNodeSubPane.axNode);
};

AccessibilityTestRunner.dumpAccessibilityNode = function(accessibilityNode) {
  if (!accessibilityNode) {
    TestRunner.addResult('<null>');
    TestRunner.completeTest();
    return;
  }

  const builder = [];
  builder.push(accessibilityNode.role().value);
  builder.push((accessibilityNode.name() ? '"' + accessibilityNode.name().value + '"' : '<undefined>'));

  if (accessibilityNode.properties()) {
    for (const property of accessibilityNode.properties()) {
      if ('value' in property) {
        builder.push(property.name + '="' + property.value.value + '"');
      }
    }
  }

  TestRunner.addResult(builder.join(' '));
};

AccessibilityTestRunner.findARIAAttributeTreeElement = function(attribute) {
  const sidebarPane = AccessibilityTestRunner.accessibilitySidebarPane();

  if (!sidebarPane) {
    TestRunner.addResult('Could not get Accessibility sidebar pane.');
    TestRunner.completeTest();
    return;
  }

  const ariaSubPane = sidebarPane.ariaSubPane;
  const treeOutline = ariaSubPane.treeOutline;
  const childNodes = treeOutline.rootElement().children();

  for (const treeElement of childNodes) {
    if (treeElement.attribute.name === attribute) {
      return treeElement;
    }
  }

  return null;
};
