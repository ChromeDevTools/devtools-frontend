// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {openSettingsTab} from '../helpers/settings-helpers.js';
import {addBreakpointForLine, openSourceCodeEditorForFile} from '../helpers/sources-helpers.js';

const PATTERN_ADD_BUTTON = 'button[aria-label="Add filename pattern"]';
const PATTERN_INPUT_FIELD = 'input[aria-label="Pattern"]';
const CLOSE_BUTTON = '.close-button[aria-label="Close"]';

describe('SourceMap handling', async () => {
  it('can deal with a source map that has no mappings', async () => {
    const {frontend} = getBrowserAndPages();

    await openSettingsTab('Blackboxing');
    await click(PATTERN_ADD_BUTTON);
    await waitFor(PATTERN_INPUT_FIELD);
    await click(PATTERN_INPUT_FIELD);
    await frontend.keyboard.type('cljs/user.cljs');
    await frontend.keyboard.press('Enter');
    await click(CLOSE_BUTTON);

    await openSourceCodeEditorForFile(
        'script-with-sourcemap-without-mappings.js', 'script-with-sourcemap-without-mappings.html');
    await addBreakpointForLine(frontend, 1);
  });
});
