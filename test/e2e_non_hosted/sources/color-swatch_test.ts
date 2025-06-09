// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitForSoftContextMenu} from '../../e2e/helpers/context-menu-helpers.js';
import {shiftClickColorSwatch} from '../../e2e/helpers/elements-helpers.js';
import {openFileInEditor, openFileInSourcesPanel} from '../../e2e/helpers/sources-helpers.js';

describe('Color swatches in the sources panel', () => {
  it('allows changing the color format', async ({devToolsPage, inspectedPage}) => {
    await openFileInSourcesPanel('inline-css.html', devToolsPage, inspectedPage);
    await openFileInEditor('inline-css.html', devToolsPage);

    const editor = await devToolsPage.waitForAria('Code editor');

    await devToolsPage.waitForFunction(() => devToolsPage.$textContent('red', editor));
    await shiftClickColorSwatch(editor, 0, 'Panel: sources > Pane: editor > TextField', devToolsPage);
    const menu = await waitForSoftContextMenu(devToolsPage);
    await devToolsPage.click('[aria-label="#f00"]', {root: menu});

    await devToolsPage.waitForFunction(() => devToolsPage.$textContent('#f00', editor));
  });
});
