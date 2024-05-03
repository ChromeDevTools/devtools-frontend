// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describeWithLocale('ListWidget', () => {
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
});
