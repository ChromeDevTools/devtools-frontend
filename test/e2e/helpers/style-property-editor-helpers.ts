// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {$$, waitFor} from '../../shared/helper.js';

export async function clickStylePropertyEditorButton(
    title: string, editorElement: 'devtools-grid-editor'|'devtools-flexbox-editor') {
  const gridEditorButtons = await $$(`[title="${title}"]`);
  assert.deepEqual(gridEditorButtons.length, 1);
  const gridEditorButton = gridEditorButtons[0];
  gridEditorButton.click();
  await waitFor(editorElement);
}

export async function clickPropertyButton(selector: string) {
  await waitFor(selector);
  const buttons = await $$(selector);
  assert.strictEqual(buttons.length, 1);
  const button = buttons[0];
  button.click();
}
