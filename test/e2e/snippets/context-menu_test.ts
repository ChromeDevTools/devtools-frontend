// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, typeText} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getAvailableSnippets, openCommandMenu, showSnippetsAutocompletion} from '../helpers/quick_open-helpers.js';
import {createNewSnippet, openSnippetsSubPane, openSourcesPanel} from '../helpers/sources-helpers.js';

describe('Snippets subpane', () => {
  // Disabled due to flakiness
  it.skip('[crbug.com/1111255] can show newly created snippets show up in command menu', async () => {
    const {frontend} = getBrowserAndPages();

    await openSourcesPanel();
    await openSnippetsSubPane();
    await createNewSnippet('New snippet');

    await openCommandMenu();
    await showSnippetsAutocompletion();

    assert.deepEqual(await getAvailableSnippets(), [
      'New snippet\u200B',
    ]);

    await typeText('New ');
    assert.deepEqual(await getAvailableSnippets(), [
      'New snippet\u200B',
    ]);

    await typeText('w');
    assert.deepEqual(await getAvailableSnippets(), []);

    await frontend.keyboard.press('Backspace');
    assert.deepEqual(await getAvailableSnippets(), [
      'New snippet\u200B',
    ]);
  });
});
