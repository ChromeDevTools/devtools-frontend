// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  $textContent,
  assertNotNullOrUndefined,
  click,
  waitForAria,
  waitForFunction,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {waitForSoftContextMenu} from '../helpers/context-menu-helpers.js';
import {shiftClickColorSwatch} from '../helpers/elements-helpers.js';
import {openFileInEditor, openFileInSourcesPanel} from '../helpers/sources-helpers.js';

describe('Color swatches in the sources panel', () => {
  it('allows changing the color format', async () => {
    await openFileInSourcesPanel('inline-css.html');
    await openFileInEditor('inline-css.html');

    const editor = await waitForAria('Code editor');
    assertNotNullOrUndefined(editor);

    await waitForFunction(() => $textContent('red', editor));

    await shiftClickColorSwatch(editor, 0);
    const menu = await waitForSoftContextMenu();
    await click('[aria-label="#f00"]', {root: menu});

    await waitForFunction(() => $textContent('#f00', editor));
  });
});
