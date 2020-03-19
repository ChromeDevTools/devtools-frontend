// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, getElementPosition, timeout, waitFor} from '../../shared/helper.js';

export const openPanelViaMoreTools = async (panelTitle: string) => {
  const {frontend} = getBrowserAndPages();

  const moreToolsSelector = '[aria-label="More tools"]';
  const contextMenuItemSelector = `.soft-context-menu-item[aria-label="${panelTitle}"]`;
  const panelSelector = `.view-container[aria-label="${panelTitle} panel"]`;

  // Head to the triple dot menu.
  await click('.toolbar-button[aria-label="Customize and control DevTools"]');

  // Hover over the “More Tools” option.
  const moreTools = await getElementPosition(moreToolsSelector);
  await frontend.mouse.move(moreTools.x, moreTools.y);

  // The menu is set to appear after 150 ms, so wait here. The menu
  // itself does not have a particular selector onto which we can
  // attach, hence the timeout.
  await timeout(200);

  // Choose the desired menu item and wait for the corresponding panel
  // to appear.
  await click(contextMenuItemSelector);
  await waitFor(panelSelector);
};
