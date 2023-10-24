// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

import * as Elements from '../../panels/elements/elements.js';
import {TestRunner} from '../test_runner/test_runner.js';

import {firstElementsTreeOutline, selectNode} from './ElementsTestRunner';

export const selectReloadAndDump = function(next, node) {
  selectNode(node).then(onSelected);
  let reloaded = false;
  let selected = false;

  function onSelected() {
    TestRunner.addSniffer(
        Elements.ElementsPanel.ElementsPanel.prototype, 'lastSelectedNodeSelectedForTest', onReSelected);
    TestRunner.reloadPage(onReloaded);
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
    if (!reloaded || !selected) {
      return;
    }
    const selectedElement = firstElementsTreeOutline().selectedTreeElement;
    const nodeName = (selectedElement ? selectedElement.node().nodeNameInCorrectCase() : 'null');
    TestRunner.addResult('Selected node: \'' + nodeName + '\'');
    next();
  }
};
