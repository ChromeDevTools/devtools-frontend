// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

export async function clickStylePropertyEditorButton(
    title: string, editorElement: 'devtools-grid-editor'|'devtools-flexbox-editor',
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const gridEditorButtons = await devToolsPage.$$(`[title="${title}"]`);
  assert.lengthOf(gridEditorButtons, 1);
  const gridEditorButton = gridEditorButtons[0];
  await gridEditorButton.click();
  await devToolsPage.waitFor(editorElement);
}

export async function clickPropertyButton(selector: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitFor(selector);
  const buttons = await devToolsPage.$$(selector);
  assert.lengthOf(buttons, 1);
  const button = buttons[0];
  await button.click();
}
