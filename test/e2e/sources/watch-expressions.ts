// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, typeText, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {openSourcesPanel} from '../helpers/sources-helpers.js';

describe('Watch Expression Pane', async () => {
  it('collapses children when editing', async () => {
    const {frontend} = getBrowserAndPages();
    await openSourcesPanel();

    // Create watch expression "Text"
    await click('[aria-label="Watch"]');
    await click('[aria-label="Add watch expression"]');
    await typeText('Text');
    await frontend.keyboard.press('Enter');

    // Expand watch element
    await frontend.keyboard.press('ArrowRight');

    // Retrieve watch element and ensure that it is expanded
    const element = await waitFor('.object-properties-section-root-element');
    const initialExpandCheck = await element.evaluate(e => e.classList.contains('expanded'));
    assert.strictEqual(initialExpandCheck, true);

    // Begin editing and check that element is now collapsed.
    await frontend.keyboard.press('Enter');
    const editingExpandCheck = await element.evaluate(e => e.classList.contains('expanded'));
    assert.strictEqual(editingExpandCheck, false);
  });
});
