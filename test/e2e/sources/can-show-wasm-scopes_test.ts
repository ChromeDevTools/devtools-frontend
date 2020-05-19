// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$$, click, getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {addBreakpointForLine, openFileInEditor, openFileInSourcesPanel, RESUME_BUTTON} from '../helpers/sources-helpers.js';

describe('Source Tab', async () => {
  it('shows the module, local, and stack scope while pausing', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openFileInSourcesPanel(target, 'wasm/scopes.html');
    await openFileInEditor(target, 'scopes.wasm');
    await addBreakpointForLine(frontend, 16);

    const scriptEvaluation = target.evaluate('main(42);');
    await waitFor('.paused-status');

    const scopeElements = await $$('.scope-chain-sidebar-pane-section-title');
    const scopeTitles = await scopeElements.evaluate(nodes => nodes.map((n: HTMLElement) => n.textContent));
    assert.deepEqual(scopeTitles, ['Module', 'Local', 'Stack']);

    await click(RESUME_BUTTON);
    await scriptEvaluation;
  });
});
