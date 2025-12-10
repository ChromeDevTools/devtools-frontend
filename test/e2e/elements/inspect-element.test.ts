// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  waitForPartialContentOfSelectedElementsNode,
} from '../helpers/elements-helpers.js';

describe('The Elements panel ', () => {
  it('can inspect elements with pointer-events: none', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
      <style>
        #outer {
          width: 200px;
          height: 200px;
          background-color: green;
        }
        #inner {
          pointer-events: none;
          width: 100px;
          height: 100px;
          background-color: red;
        }
      </style>
      <div id="outer"><div id="inner"></div></div>
    `);

    const clickInnerWithShift = async (withShift: boolean) => {
      if (withShift) {
        await inspectedPage.page.keyboard.down('Shift');
      }
      await inspectedPage.page.click('#inner');
      if (withShift) {
        await inspectedPage.page.keyboard.up('Shift');
      }
    };

    // Enable inspect mode and click on #inner without shift. #outer should be selected.
    await devToolsPage.click('[aria-label="Select an element in the page to inspect it"]');
    await clickInnerWithShift(false);
    await waitForPartialContentOfSelectedElementsNode('outer', devToolsPage);

    // Enable inspect mode again and click on #inner with shift. #inner should be selected.
    await devToolsPage.click('[aria-label="Select an element in the page to inspect it"]');
    await clickInnerWithShift(true);
    await waitForPartialContentOfSelectedElementsNode('inner', devToolsPage);
  });
});
