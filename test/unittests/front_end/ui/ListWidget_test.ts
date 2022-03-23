// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UI from '../../../../front_end/ui/legacy/legacy.js';
import {describeWithLocale} from '../helpers/EnvironmentHelpers.js';

describeWithLocale('ListWidget', () => {
  it('Cancel button triggers on mouse click event', () => {
    const editor = new UI.ListWidget.Editor<string>();
    document.body.appendChild(editor.element);
    let cancelled = false;
    function cancel() {
      cancelled = true;
    }
    editor.beginEdit('test', 0, 'Commit', () => {}, cancel);
    const buttons = editor.element.getElementsByClassName('text-button');
    // Find cancel button
    let cancelButton;
    for (const button of buttons) {
      if (button.innerHTML === 'Cancel') {
        cancelButton = button;
      }
    }
    assert.isDefined(cancelButton);
    // Dispatch click events.
    cancelButton?.dispatchEvent(new MouseEvent('click'));
    assert.isTrue(cancelled);
  });

  it('Commit buttton triggers on mouse click event', () => {
    const editor = new UI.ListWidget.Editor<string>();
    document.body.appendChild(editor.element);
    let committed = false;
    function commit() {
      committed = true;
    }
    editor.beginEdit('test', 0, 'Commit', commit, () => {});
    const buttons = editor.element.getElementsByClassName('text-button');
    // Find commit button
    let commitButton;
    for (const button of buttons) {
      if (button.innerHTML === 'Commit') {
        commitButton = button;
      }
    }
    assert.isDefined(commitButton);
    // Dispatch click events.
    commitButton?.dispatchEvent(new MouseEvent('click'));
    assert.isTrue(committed);
  });
});
