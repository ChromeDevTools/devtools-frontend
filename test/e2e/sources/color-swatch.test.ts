// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitForSoftContextMenu} from '../helpers/context-menu-helpers.js';
import {shiftClickColorSwatch} from '../helpers/elements-helpers.js';
import {openFileInEditor, openFileInSourcesPanel} from '../helpers/sources-helpers.js';

describe('Color swatches in the sources panel', () => {
  it('allows changing the color format', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel(devToolsPage, inspectedPage, 'inline-css.html');
    await openFileInEditor(devToolsPage, 'inline-css.html');

    const editor = await devToolsPage.waitForAria('Code editor');

    await devToolsPage.waitForFunction(() => devToolsPage.$textContent('red', editor));
    await shiftClickColorSwatch(devToolsPage, editor, 0, 'Panel: sources > Pane: editor > TextField');
    const menu = await waitForSoftContextMenu(devToolsPage);
    await devToolsPage.click('[aria-label="#f00"]', {root: menu});

    await devToolsPage.waitForFunction(() => devToolsPage.$textContent('#f00', editor));
  });
});
