// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';

import * as UI from './legacy.js';

describe('ListWidget', () => {
  setupLocaleHooks();
  describe('Editor', () => {
    it('Cancel button triggers on mouse click event', () => {
      const editor = new UI.ListWidget.Editor<string>();
      renderElementIntoDOM(editor.element);
      let cancelled = false;
      function cancel() {
        cancelled = true;
      }
      editor.beginEdit('test', 0, 'Commit', () => {}, cancel);
      const buttons = editor.element.querySelectorAll('devtools-button');
      for (const button of buttons) {
        if (button.innerHTML === 'Cancel') {
          dispatchClickEvent(button);
          break;
        }
      }
      assert.isTrue(cancelled);
    });

    it('Commit button triggers on mouse click event', () => {
      const editor = new UI.ListWidget.Editor<string>();
      renderElementIntoDOM(editor.element);
      let committed = false;
      function commit() {
        committed = true;
      }
      editor.beginEdit('test', 0, 'Commit', commit, () => {});
      const buttons = editor.element.querySelectorAll('devtools-button');
      for (const button of buttons) {
        if (button.innerHTML === 'Commit') {
          dispatchClickEvent(button);
          break;
        }
      }
      assert.isTrue(committed);
    });
  });

  it('adds a new item even when the empty string', () => {
    class MockEditor extends UI.ListWidget.Editor<string> {
      override beginEdit(
          item: string, index: number, commitButtonTitle: string, commit: () => void, cancel: () => void): void {
        super.beginEdit(item, index, commitButtonTitle, commit, cancel);
        commit();
      }
    }
    class MockDelegate implements UI.ListWidget.Delegate<string> {
      committed = false;
      beginEdit(_item: string): UI.ListWidget.Editor<string> {
        return new MockEditor();
      }
      commitEdit(_item: string, _editor: UI.ListWidget.Editor<string>, _isNew: boolean): void {
        this.committed = true;
      }
      removeItemRequested(_item: string, _index: number): void {
      }
      renderItem(_item: string, _editable: boolean): Element {
        return document.createElement('span');
      }
    }
    const delegate = new MockDelegate();
    const list = new UI.ListWidget.ListWidget(delegate);
    list.markAsRoot();
    list.show(renderElementIntoDOM(document.createElement('main')));
    list.addNewItem(0, '');
    assert.isTrue(delegate.committed);
  });

  class MockDelegate implements UI.ListWidget.Delegate<string> {
    updateItem(content: Element, item: string): void {
      content.textContent = item;
    }

    renderItem(item: string): Element {
      const element = document.createElement('div');
      element.textContent = item;
      return element;
    }

    removeItemRequested(): void {
    }

    beginEdit(): UI.ListWidget.Editor<string> {
      return new UI.ListWidget.Editor<string>();
    }

    commitEdit(): void {
    }
  }

  describe('updates', () => {
    it('an item at the beginning', () => {
      const listWidget = new UI.ListWidget.ListWidget(new MockDelegate());

      listWidget.appendItem('a', true);
      listWidget.appendItem('b', true);
      listWidget.appendItem('c', true);

      listWidget.updateItem(0, 'd', true);

      const items = Array.from(listWidget.element.shadowRoot!.querySelectorAll('.list-item')).map(i => i.textContent);
      assert.deepEqual(items, ['d', 'b', 'c']);
    });

    it('an item in the middle', () => {
      const listWidget = new UI.ListWidget.ListWidget(new MockDelegate());

      listWidget.appendItem('a', true);
      listWidget.appendItem('b', true);
      listWidget.appendItem('c', true);

      listWidget.updateItem(1, 'd', true);

      const items = Array.from(listWidget.element.shadowRoot!.querySelectorAll('.list-item')).map(i => i.textContent);
      assert.deepEqual(items, ['a', 'd', 'c']);
    });

    it('an item at the end', () => {
      const listWidget = new UI.ListWidget.ListWidget(new MockDelegate());

      listWidget.appendItem('a', true);
      listWidget.appendItem('b', true);
      listWidget.appendItem('c', true);

      listWidget.updateItem(2, 'd', true);

      const items = Array.from(listWidget.element.shadowRoot!.querySelectorAll('.list-item')).map(i => i.textContent);
      assert.deepEqual(items, ['a', 'b', 'd']);
    });

    it('an item with an index < 0', () => {
      const listWidget = new UI.ListWidget.ListWidget(new MockDelegate());

      listWidget.appendItem('a', true);
      listWidget.appendItem('b', true);
      listWidget.appendItem('c', true);

      listWidget.updateItem(-1, 'd', true);

      const items = Array.from(listWidget.element.shadowRoot!.querySelectorAll('.list-item')).map(i => i.textContent);
      assert.deepEqual(items, ['a', 'b', 'c', 'd']);
    });

    it('an item with an index > list length', () => {
      const listWidget = new UI.ListWidget.ListWidget(new MockDelegate());

      listWidget.appendItem('a', true);
      listWidget.appendItem('b', true);
      listWidget.appendItem('c', true);

      listWidget.updateItem(10, 'd', true);

      const items = Array.from(listWidget.element.shadowRoot!.querySelectorAll('.list-item')).map(i => i.textContent);
      assert.deepEqual(items, ['a', 'b', 'c', 'd']);

      listWidget.element.remove();
    });

    it('reorders items', () => {
      const listWidget = new UI.ListWidget.ListWidget(new MockDelegate());

      listWidget.appendItem('a', true);
      listWidget.appendItem('b', true);
      listWidget.appendItem('c', true);

      listWidget.updateItem(2, 'a', true);
      listWidget.updateItem(1, 'c', true);
      listWidget.updateItem(0, 'b', true);

      const items = Array.from(listWidget.element.shadowRoot!.querySelectorAll('.list-item')).map(i => i.textContent);
      assert.deepEqual(items, ['b', 'c', 'a']);
    });
  });
});
