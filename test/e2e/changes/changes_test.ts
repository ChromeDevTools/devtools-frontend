// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getChangesList, openChangesPanelAndNavigateTo, waitForNewChanges} from '../helpers/changes-helpers.js';
import {editCSSProperty} from '../helpers/elements-helpers.js';

describe('The Changes Panel', () => {
  it('Shows changes made in the Styles pane', async () => {
    const TEST_PAGE = 'styled-page';

    await openChangesPanelAndNavigateTo(TEST_PAGE);

    let changes = await getChangesList();
    assert.strictEqual(changes.length, 0, 'There should be no changes by default');

    await editCSSProperty('html, body', 'background', 'red');
    await waitForNewChanges(changes);

    changes = await getChangesList();
    assert.strictEqual(changes.length, 1, 'There should now be 1 change in the list');
    assert.strictEqual(changes[0], `${TEST_PAGE}.html`);
  });
});
