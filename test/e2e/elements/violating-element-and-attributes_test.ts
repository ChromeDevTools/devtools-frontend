// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {enableExperiment, goToResource, waitForMany} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';

/**
 * Skipping this test for now as it only works on non-headless chrome.
 */
describe.skip('[crbug.com/1399414]: Element has violating properties', async function() {
  beforeEach(async function() {
    await enableExperiment('highlightErrorsElementsPanel');
    await goToResource('elements/form-with-issues.html');
  });

  it('tag is highlighted on input without name nor id', async () => {
    const elements = await waitForMany('.violating-element', 2);
    const violatingElementOrAttr = await elements[0].evaluate(node => node.textContent);
    assert.strictEqual(violatingElementOrAttr, 'input');
  });
  it('autocomplete attribute is highlighted when empty.', async () => {
    const elements = await waitForMany('.violating-element', 2);
    const violatingElementOrAttr = await elements[1].evaluate(node => node.textContent);
    assert.strictEqual(violatingElementOrAttr, 'autocomplete');
  });
});
