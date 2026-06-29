// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describeWithEnvironment('ListControl', () => {
  class Delegate implements UI.ListControl.ListDelegate<number> {
    height: number;
    constructor() {
      this.height = 10;
    }

    createElementForItem(item: number): HTMLElement {
      const element = document.createElement('div');
      element.style.height = this.height + 'px';
      element.textContent = String(item);
      return element;
    }

    heightForItem(_item: number): number {
      return this.height;
    }

    isItemSelectable(item: number): boolean {
      return (item % 5 === 0) || (item % 5 === 2);
    }

    selectedItemChanged(from: number|null, to: number|null, fromElement: HTMLElement|null,
                        toElement: HTMLElement|null): void {
      if (fromElement) {
        fromElement.classList.remove('selected');
      }
      if (toElement) {
        toElement.classList.add('selected');
      }
    }

    updateSelectedItemARIA(_fromElement: HTMLElement|null, _toElement: HTMLElement|null): boolean {
      return false;
    }
  }

  it('renders equal height items correctly', () => {
    const delegate = new Delegate();
    const model = new UI.ListModel.ListModel<number>();
    const list = new UI.ListControl.ListControl<number>(model, delegate, UI.ListControl.ListMode.EqualHeightItems);
    list.element.style.height = '73px';

    renderElementIntoDOM(list.element);

    model.replaceAll([0, 1, 2]);

    // Verify rendering
    assert.lengthOf(list.element.children, 5);
    assert.strictEqual(list.element.children[1].textContent, '0');
    assert.strictEqual(list.element.children[2].textContent, '1');
    assert.strictEqual(list.element.children[3].textContent, '2');
  });

  it('supports keyboard navigation', () => {
    const delegate = new Delegate();
    const model = new UI.ListModel.ListModel<number>();
    const list = new UI.ListControl.ListControl<number>(model, delegate, UI.ListControl.ListMode.EqualHeightItems);
    list.element.style.height = '73px';

    renderElementIntoDOM(list.element);

    model.replaceAll(Array.from({length: 20}, (_, i) => i));

    list.selectItem(0);
    assert.strictEqual(list.selectedItem(), 0);

    // ArrowDown should select 2 (skipping 1)
    list.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown'}));
    assert.strictEqual(list.selectedItem(), 2);

    // ArrowDown should select 5 (skipping 3, 4)
    list.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown'}));
    assert.strictEqual(list.selectedItem(), 5);

    // ArrowUp should select 2
    list.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp'}));
    assert.strictEqual(list.selectedItem(), 2);

    // PageDown should select 10 (from 2)
    list.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageDown'}));
    assert.strictEqual(list.selectedItem(), 10);

    // PageDown should select 17 (from 10)
    list.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageDown'}));
    assert.strictEqual(list.selectedItem(), 17);

    // PageUp should select 7 (from 17)
    list.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageUp'}));
    assert.strictEqual(list.selectedItem(), 7);

    // PageUp should select 0 (from 7)
    list.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageUp'}));
    assert.strictEqual(list.selectedItem(), 0);
  });

  it('renders non-viewport mode correctly', () => {
    class NonViewportDelegate extends Delegate {
      override heightForItem(_item: number): number {
        throw new Error('heightForItem should not be called');
      }
    }

    const delegate = new NonViewportDelegate();
    const model = new UI.ListModel.ListModel<number>();
    const list = new UI.ListControl.ListControl<number>(model, delegate, UI.ListControl.ListMode.NonViewport);

    renderElementIntoDOM(list.element);

    model.replaceAll([0, 1, 2]);

    // Verify rendering
    assert.lengthOf(list.element.children, 5);
    assert.strictEqual(list.element.children[1].textContent, '0');
    assert.strictEqual(list.element.children[2].textContent, '1');
    assert.strictEqual(list.element.children[3].textContent, '2');

    // Adding 3-20
    model.replaceRange(
        3,
        3,
        [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    );
    assert.lengthOf(list.element.children, 22);

    // Scrolling
    list.scrollItemIntoView(19);
    list.scrollItemIntoView(13, true);

    // Replacing 0, 1 with 25-36
    model.replaceRange(0, 2, [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]);
    assert.lengthOf(list.element.children, 32);

    // Scrolling
    list.scrollItemIntoView(28);

    // Replacing 25-36 with 0-1
    model.replaceRange(0, 12, [0, 1]);
    assert.lengthOf(list.element.children, 22);

    // Replacing 16-18 with 45
    model.replaceRange(16, 19, [45]);
    assert.lengthOf(list.element.children, 20);

    // Scrolling
    list.scrollItemIntoView(4);

    // Replacing 45 with 16-18
    model.replaceRange(16, 17, [16, 17, 18]);
    assert.lengthOf(list.element.children, 22);
  });

  it('renders various height items correctly', () => {
    class VariousHeightDelegate extends Delegate {
      override heightForItem(item: number): number {
        return 7 + item % 10;
      }

      override createElementForItem(item: number): HTMLElement {
        const element = super.createElementForItem(item);
        element.style.height = this.heightForItem(item) + 'px';
        return element;
      }
    }

    const delegate = new VariousHeightDelegate();
    const model = new UI.ListModel.ListModel<number>();
    const list = new UI.ListControl.ListControl<number>(model, delegate, UI.ListControl.ListMode.VariousHeightItems);
    list.element.style.height = '73px';

    renderElementIntoDOM(list.element);

    model.replaceAll([0, 1, 2]);

    // Verify rendering
    assert.lengthOf(list.element.children, 5);
    assert.strictEqual((list.element.children[1] as HTMLElement).style.height, '7px');
    assert.strictEqual((list.element.children[2] as HTMLElement).style.height, '8px');
    assert.strictEqual((list.element.children[3] as HTMLElement).style.height, '9px');
  });
});
