// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$$, click, getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {addBreakpointForLine, openFileInEditor, openFileInSourcesPanel, RESUME_BUTTON} from '../helpers/sources-helpers.js';

describe('Source Tab', async () => {
  beforeEach(async function() {
    const {frontend} = getBrowserAndPages();
    await openFileInSourcesPanel('wasm/scopes.html');
    await openFileInEditor('scopes.wasm');
    await addBreakpointForLine(frontend, 15);
  });

  async function getScopeNames() {
    const scopeElements = await $$('.scope-chain-sidebar-pane-section-title');
    const scopeNames = await scopeElements.evaluate(nodes => nodes.map((n: HTMLElement) => n.textContent));
    return scopeNames;
  }

  async function getValuesForScope(scope: string) {
    const scopeSelector = `[aria-label="${scope}"]`;
    const valueSelector = `${scopeSelector} + ol .name-and-value`;
    const values = await (await $$(valueSelector)).evaluate(nodes => nodes.map((n: HTMLElement) => n.textContent));
    return values;
  }

  it('shows the module, local, and stack scope while pausing', async () => {
    const {target} = getBrowserAndPages();
    const scriptEvaluation = target.evaluate('main(42);');
    await waitFor(RESUME_BUTTON);

    const scopeNames = await getScopeNames();
    assert.deepEqual(scopeNames, ['Module', 'Local', 'Stack']);

    await click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  // Disabled to the Chromium binary -> DevTools roller working again.
  it('correctly shows local scope content.', async () => {
    const {target} = getBrowserAndPages();
    const scriptEvaluation = target.evaluate('main(42);');
    await waitFor(RESUME_BUTTON);

    const localValues = await getValuesForScope('Local');
    assert.deepEqual(localValues, ['f32_var: 5.5', 'f64_var: 2.23e-11', 'i32: 42', 'i64_var: 9221120237041090']);

    await click(RESUME_BUTTON);
    await scriptEvaluation;
  });
});
