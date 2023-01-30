// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, goToResource, waitForAria, waitForElementWithTextContent} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  expandSelectedNodeRecursively,
} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';

describe('The Elements tab', async function() {
  it('is able to update shadow dom tree structure upon typing', async () => {
    await goToResource('elements/shadow-dom-modify-chardata.html');
    const {target} = getBrowserAndPages();
    await togglePreferenceInSettingsTab('Show user agent shadow DOM');
    await expandSelectedNodeRecursively();
    const tree = await waitForAria('Page DOM');
    assert.include(await tree.evaluate(e => e.textContent), '<div>​</div>​');
    const input = await target.$('#input1');
    await input?.type('Bar');
    await waitForElementWithTextContent('Bar', tree);
    assert.include(await tree.evaluate(e => e.textContent), '<div>​Bar​</div>​');
  });
});
