// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {DevToolsPage} from '../shared/frontend-helper.js';

export async function clickStylePropertyEditorButton(
    title: string, editorElement: 'devtools-grid-editor'|'devtools-flexbox-editor'|'devtools-grid-lanes-editor',
    devToolsPage: DevToolsPage) {
  const gridEditorButtons = await devToolsPage.$$(`[title="${title}"]`);
  assert.lengthOf(gridEditorButtons, 1);
  const gridEditorButton = gridEditorButtons[0];
  await gridEditorButton.click();
  await devToolsPage.waitFor(editorElement);
}

export async function clickPropertyButton(selector: string, devToolsPage: DevToolsPage) {
  await devToolsPage.waitFor(selector);
  const buttons = await devToolsPage.$$(selector);
  assert.lengthOf(buttons, 1);
  const button = buttons[0];
  await button.click();
}
