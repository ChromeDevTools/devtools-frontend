// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UI from '../../../../front_end/ui/ui.js';

import {assertNotNull, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

describe('TreeOutline', () => {
  it('responds correctly to navigation keys', () => {
    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    renderElementIntoDOM(treeOutline.element);

    for (let i = 0; i < 10; i++) {
      const treeElement = new UI.TreeOutline.TreeElement(String(i), true);
      treeElement.appendChild(new UI.TreeOutline.TreeElement(String(i) + ' child'));
      treeOutline.appendChild(treeElement);
    }

    let selectedTitles: string[] = [];
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementSelected, event => {
      selectedTitles.push(String(event.data.title));
    });

    const firstChild = treeOutline.firstChild();
    assertNotNull(firstChild);
    firstChild.select(false, true);

    const distance = 25;

    assert.deepEqual(selectedTitles, ['0']);
    selectedTitles = [];

    function sendKeyMultipleTimes(key: string, n: number) {
      for (let i = 0; i < n; i++) {
        sendKey(key);
      }
    }

    sendKeyMultipleTimes('ArrowDown', distance);
    assert.deepEqual(selectedTitles, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    selectedTitles = [];

    sendKeyMultipleTimes('ArrowUp', distance);
    assert.deepEqual(selectedTitles, ['8', '7', '6', '5', '4', '3', '2', '1', '0']);
    selectedTitles = [];

    sendKey('End');
    assert.deepEqual(selectedTitles, ['9']);
    selectedTitles = [];

    sendKey('Home');
    assert.deepEqual(selectedTitles, ['0']);
    selectedTitles = [];

    sendKeyMultipleTimes('ArrowRight', distance);
    assert.deepEqual(selectedTitles, ['0 child']);
    selectedTitles = [];

    sendKeyMultipleTimes('ArrowLeft', distance);
    assert.deepEqual(selectedTitles, ['0']);
    selectedTitles = [];

    const innerTreeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    const firstInnerChild = new UI.TreeOutline.TreeElement('First inner child');
    const firstInnerGrandChild = new UI.TreeOutline.TreeElement('First inner grandchild');
    innerTreeOutline.appendChild(firstInnerChild);
    firstInnerChild.appendChild(firstInnerGrandChild);

    const treeElementForNestedTree = new UI.TreeOutline.TreeElement(innerTreeOutline.element);
    treeOutline.appendChild(treeElementForNestedTree);

    const innerFirstChild = innerTreeOutline.firstChild();
    assertNotNull(innerFirstChild);
    innerFirstChild.select(false, true);
    sendKey('ArrowRight');

    assert.isTrue(innerFirstChild.expanded, 'child is not expanded');

    function sendKey(key: string) {
      const deepActiveElement = document.deepActiveElement();
      assertNotNull(deepActiveElement);
      const keyEvent = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key});
      deepActiveElement.dispatchEvent(keyEvent);
    }
  });
});
