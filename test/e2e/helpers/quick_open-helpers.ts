// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$$, getBrowserAndPages, platform, typeText, waitFor} from '../../shared/helper.js';

const QUICK_OPEN_SELECTOR = '[aria-label="Quick open"]';

export const openCommandMenu = async () => {
  const {frontend} = getBrowserAndPages();

  switch (platform) {
    case 'mac':
      await frontend.keyboard.down('Meta');
      await frontend.keyboard.down('Shift');
      break;

    case 'linux':
    case 'win32':
      await frontend.keyboard.down('Control');
      await frontend.keyboard.down('Shift');
      break;
  }

  await frontend.keyboard.press('P');

  switch (platform) {
    case 'mac':
      await frontend.keyboard.up('Meta');
      await frontend.keyboard.up('Shift');
      break;

    case 'linux':
    case 'win32':
      await frontend.keyboard.up('Control');
      await frontend.keyboard.up('Shift');
      break;
  }

  await waitFor(QUICK_OPEN_SELECTOR);
};

export const showSnippetsAutocompletion = async () => {
  const {frontend} = getBrowserAndPages();

  // Clear the `>` character, as snippets use a `!` instead
  await frontend.keyboard.press('Backspace');

  await typeText('!');
};

export async function getAvailableSnippets() {
  const quickOpenElement = await waitFor(QUICK_OPEN_SELECTOR);
  const snippetsDOMElements = await $$('.filtered-list-widget-item', quickOpenElement);
  const snippets = await Promise.all(snippetsDOMElements.map(elem => elem.evaluate(elem => elem.textContent)));
  return snippets;
}
