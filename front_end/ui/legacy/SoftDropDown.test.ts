// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describeWithEnvironment('SoftDropDown', () => {
  class Delegate implements UI.SoftDropDown.Delegate<Item> {
    titleFor(item: Item): string {
      return item.title;
    }

    createElementForItem(item: Item): Element {
      const element = document.createElement('div');
      element.textContent = this.titleFor(item);
      return element;
    }

    isItemSelectable(item: Item): boolean {
      return !item.disabled;
    }

    itemSelected(_item: Item|null): void {
    }

    highlightedItemChanged(_from: Item|null, _to: Item|null, _fromElement: Element|null, _toElement: Element|null):
        void {
    }
  }

  interface Item {
    title: string;
    index: number;
    disabled?: boolean;
  }

  const items: Item[] = [
    {title: 'first', index: 0},
    {title: 'second', index: 1},
    {title: 'third', index: 2},
    {title: 'fourth', index: 3},
    {title: 'disabled 4.5', disabled: true, index: 4},
    {title: 'fifth', index: 5},
    {title: 'sixth', index: 6},
    {title: 'seventh', index: 7},
    {title: 'eighth', index: 8},
  ];

  it('navigates with keyboard', () => {
    const model = new UI.ListModel.ListModel<Item>();
    const delegate = new Delegate();
    const dropDown = new UI.SoftDropDown.SoftDropDown(model, delegate);
    for (const item of items) {
      model.insertWithComparator(item, (a, b) => a.index - b.index);
    }

    // Initial check
    dropDown.selectItem(items[5]);  // Select 'fifth'
    assert.strictEqual(dropDown.getSelectedItem()?.title, 'fifth');

    // Show dropdown
    dropDown.element.dispatchEvent(new MouseEvent('mousedown'));
    assert.strictEqual(dropDown.element.getAttribute('aria-expanded'), 'true');

    // Helper to simulate key press and check highlighted item
    function checkKeyDown(key: string, expectedTitle: string) {
      const list = (dropDown as unknown as {list: UI.ListControl.ListControl<Item>}).list;
      if (key.length === 1) {
        // SoftDropDown handles simple characters in 'onKeyDownList'
        list.element.dispatchEvent(new KeyboardEvent('keydown', {key}));
      } else {
        // Arrow keys are handled by SoftDropDown 'onKeyDownButton' or list
        // When dropdown is open, list is focused.
        const target = list.element;
        target.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true, composed: true}));
      }

      const highlightedItem = list.selectedItem();
      assert.strictEqual(highlightedItem?.title, expectedTitle, `After pressing ${key}`);
    }

    // ArrowDown x3
    checkKeyDown('ArrowDown', 'sixth');
    checkKeyDown('ArrowDown', 'seventh');
    checkKeyDown('ArrowDown', 'eighth');

    // ArrowUp x3
    checkKeyDown('ArrowUp', 'seventh');
    checkKeyDown('ArrowUp', 'sixth');
    checkKeyDown('ArrowUp', 'fifth');

    // ArrowDown x2
    checkKeyDown('ArrowDown', 'sixth');
    checkKeyDown('ArrowDown', 'seventh');

    // Type 'f' -> 'first'
    checkKeyDown('f', 'first');

    // Type 'f' -> 'fourth'
    checkKeyDown('f', 'fourth');

    // Type 't' -> 'third'
    checkKeyDown('t', 'third');
  });

  it('selects item on tap (mousedown and mouseup without mousemove movement)', () => {
    const model = new UI.ListModel.ListModel<Item>();
    const delegate = new Delegate();
    const dropDown = new UI.SoftDropDown.SoftDropDown(model, delegate);
    for (const item of items) {
      model.insertWithComparator(item, (a, b) => a.index - b.index);
    }

    dropDown.selectItem(items[0]);  // Select 'first'
    assert.strictEqual(dropDown.getSelectedItem()?.title, 'first');

    const list = (dropDown as unknown as {list: UI.ListControl.ListControl<Item>}).list;
    list.element.style.height = '200px';

    // Open dropdown
    dropDown.element.dispatchEvent(new MouseEvent('mousedown'));
    assert.strictEqual(dropDown.element.getAttribute('aria-expanded'), 'true');

    const itemElements = list.element.querySelectorAll('.item');
    const thirdElement = Array.from(itemElements).find(el => el.textContent === 'third');
    assert.exists(thirdElement);

    // Simulate touch tap: mousemove with 0 movement, followed by mousedown and mouseup
    thirdElement.dispatchEvent(new MouseEvent('mousemove', {bubbles: true, movementX: 0, movementY: 0}));
    thirdElement.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
    thirdElement.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));

    assert.strictEqual(dropDown.getSelectedItem()?.title, 'third');
    assert.strictEqual(dropDown.element.getAttribute('aria-expanded'), 'false');
  });

  it('ignores clicks on disabled items and non-primary mouse buttons', () => {
    const model = new UI.ListModel.ListModel<Item>();
    const delegate = new Delegate();
    const dropDown = new UI.SoftDropDown.SoftDropDown(model, delegate);
    for (const item of items) {
      model.insertWithComparator(item, (a, b) => a.index - b.index);
    }

    dropDown.selectItem(items[0]);  // Select 'first'
    const list = (dropDown as unknown as {list: UI.ListControl.ListControl<Item>}).list;
    list.element.style.height = '200px';

    dropDown.element.dispatchEvent(new MouseEvent('mousedown'));
    assert.strictEqual(dropDown.element.getAttribute('aria-expanded'), 'true');

    const itemElements = Array.from(list.element.querySelectorAll('.item'));
    const secondElement = itemElements.find(el => el.textContent === 'second');
    const thirdElement = itemElements.find(el => el.textContent === 'third');
    const disabledElement = itemElements.find(el => el.textContent === 'disabled 4.5');
    assert.exists(secondElement);
    assert.exists(thirdElement);
    assert.exists(disabledElement);

    // Highlight 'second' via hover, then click disabled item: should not select 'second' or close
    secondElement.dispatchEvent(new MouseEvent('mousemove', {bubbles: true, movementX: 1, movementY: 0}));
    assert.strictEqual(list.selectedItem()?.title, 'second');

    disabledElement.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, button: 0}));
    disabledElement.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, button: 0}));
    assert.strictEqual(dropDown.getSelectedItem()?.title, 'first');
    assert.strictEqual(dropDown.element.getAttribute('aria-expanded'), 'true');

    // Right-click (button: 2) on 'third' should not highlight, select, or close
    thirdElement.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, button: 2}));
    thirdElement.dispatchEvent(new MouseEvent('mouseup', {bubbles: true, button: 2}));
    assert.strictEqual(list.selectedItem()?.title, 'second');
    assert.strictEqual(dropDown.getSelectedItem()?.title, 'first');
    assert.strictEqual(dropDown.element.getAttribute('aria-expanded'), 'true');
  });
});
