// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

import {TestRunner} from '../test_runner/test_runner.js';

import {dumpElementsTree, expandedNodeWithId, firstElementsTreeOutline, selectNodeWithId} from './ElementsTestRunner';

export const doAddAttribute = function(testName, dataNodeId, attributeText, next) {
  domActionTestForNodeId(testName, dataNodeId, testBody, next);

  function testBody(node, done) {
    editNodePart(node, 'webkit-html-attribute');
    eventSender.keyDown('Tab');
    TestRunner.deprecatedRunAfterPendingDispatches(testContinuation);

    function testContinuation() {
      const editorElement = firstElementsTreeOutline().shadowRoot.getSelection().anchorNode.parentElement;
      editorElement.textContent = attributeText;
      editorElement.dispatchEvent(TestRunner.createKeyEvent('Enter'));
      TestRunner.addSniffer(Elements.ElementsTreeOutline.prototype, 'updateModifiedNodes', done);
    }
  }
};

export const domActionTestForNodeId = function(testName, dataNodeId, testBody, next) {
  function callback(testNode, continuation) {
    selectNodeWithId(dataNodeId, continuation);
  }

  domActionTest(testName, callback, testBody, next);
};

export const domActionTest = function(testName, dataNodeSelectionCallback, testBody, next) {
  const testNode = expandedNodeWithId(testName);
  TestRunner.addResult('==== before ====');
  dumpElementsTree(testNode);
  dataNodeSelectionCallback(testNode, step0);

  function step0(node) {
    TestRunner.deprecatedRunAfterPendingDispatches(step1.bind(null, node));
  }

  function step1(node) {
    testBody(node, step2);
  }

  function step2() {
    TestRunner.addResult('==== after ====');
    dumpElementsTree(testNode);
    next();
  }
};

export const editNodePart = function(node, className) {
  const treeElement = firstElementsTreeOutline().findTreeElement(node);
  let textElement = treeElement.listItemElement.getElementsByClassName(className)[0];

  if (!textElement && treeElement.childrenListElement) {
    textElement = treeElement.childrenListElement.getElementsByClassName(className)[0];
  }

  treeElement.startEditingTarget(textElement);
  return textElement;
};

export const editNodePartAndRun = function(node, className, newValue, step2, useSniffer) {
  const editorElement = editNodePart(node, className);
  editorElement.textContent = newValue;
  editorElement.dispatchEvent(TestRunner.createKeyEvent('Enter'));

  if (useSniffer) {
    TestRunner.addSniffer(Elements.ElementsTreeOutline.prototype, 'updateModifiedNodes', step2);
  } else {
    TestRunner.deprecatedRunAfterPendingDispatches(step2);
  }
};
