// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {TestRunner} from '../test_runner/test_runner.js';

import {expandElementsTree, selectNodeWithId} from './ElementsTestRunner.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

export let events = [];
export let containerId;
export let containerText;

export const setUpTestSuite = function(next) {
  expandElementsTree(step1);

  function step1() {
    selectNodeWithId('container', step2);
  }

  function step2(node) {
    containerId = node.id;
    TestRunner.DOMAgent.getOuterHTML(containerId).then(step3);
  }

  function step3(text) {
    containerText = text;

    for (const key in SDK.DOMModel.Events) {
      const eventName = SDK.DOMModel.Events[key];

      if (eventName === SDK.DOMModel.Events.MarkersChanged || eventName === SDK.DOMModel.Events.DOMMutated) {
        continue;
      }

      TestRunner.domModel.addEventListener(eventName, recordEvent.bind(null, eventName));
    }

    next();
  }
};

export const recordEvent = function(eventName, event) {
  if (!event.data) {
    return;
  }

  const node = event.data.node || event.data;
  const parent = event.data.parent;

  for (let currentNode = parent || node; currentNode; currentNode = currentNode.parentNode) {
    if (currentNode.getAttribute('id') === 'output') {
      return;
    }
  }

  events.push('Event ' + eventName.toString() + ': ' + node.nodeName());
};

export const patchOuterHTML = function(pattern, replacement, next) {
  TestRunner.addResult('Replacing \'' + pattern + '\' with \'' + replacement + '\'\n');
  setOuterHTML(containerText.replace(pattern, replacement), next);
};

export const patchOuterHTMLUseUndo = function(pattern, replacement, next) {
  TestRunner.addResult('Replacing \'' + pattern + '\' with \'' + replacement + '\'\n');
  setOuterHTMLUseUndo(containerText.replace(pattern, replacement), next);
};

export const setOuterHTML = function(newText, next) {
  innerSetOuterHTML(newText, false, bringBack);

  function bringBack() {
    TestRunner.addResult('\nBringing things back\n');
    innerSetOuterHTML(containerText, true, next);
  }
};

export const setOuterHTMLUseUndo = function(newText, next) {
  innerSetOuterHTML(newText, false, bringBack);

  async function bringBack() {
    TestRunner.addResult('\nBringing things back\n');
    await SDK.DOMModel.DOMModelUndoStack.instance().undo();
    _dumpOuterHTML(true, next);
  }
};

export const innerSetOuterHTML = async function(newText, last, next) {
  await TestRunner.DOMAgent.setOuterHTML(containerId, newText);
  TestRunner.domModel.markUndoableState();
  _dumpOuterHTML(last, next);
};

export const _dumpOuterHTML = async function(last, next) {
  const result = await TestRunner.RuntimeAgent.evaluate('document.getElementById("identity").wrapperIdentity');
  TestRunner.addResult('Wrapper identity: ' + result.value);
  events.sort();

  for (let i = 0; i < events.length; ++i) {
    TestRunner.addResult(events[i]);
  }

  events = [];
  const text = await TestRunner.DOMAgent.getOuterHTML(containerId);
  TestRunner.addResult('==========8<==========');
  TestRunner.addResult(text);
  TestRunner.addResult('==========>8==========');

  if (last) {
    TestRunner.addResult('\n\n\n');
  }

  next();
};
