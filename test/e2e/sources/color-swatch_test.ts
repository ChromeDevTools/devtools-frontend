// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$textContent, click, waitForAria, waitForFunction} from '../../shared/helper.js';

import {waitForSoftContextMenu} from '../helpers/context-menu-helpers.js';
import {shiftClickColorSwatch} from '../helpers/elements-helpers.js';
import {openFileInEditor, openFileInSourcesPanel} from '../helpers/sources-helpers.js';

describe('Color swatches in the sources panel', () => {
  it('allows changing the color format', async () => {
    await openFileInSourcesPanel('inline-css.html');
    await openFileInEditor('inline-css.html');

    const editor = await waitForAria('Code editor');

    await waitForFunction(() => $textContent('red', editor));

    await shiftClickColorSwatch(editor, 0, 'Panel: sources > Pane: editor > TextField');
    const menu = await waitForSoftContextMenu();
    await click('[aria-label="#f00"]', {root: menu});

    await waitForFunction(() => $textContent('#f00', editor));
  });
});
