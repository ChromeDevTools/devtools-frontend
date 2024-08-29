// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, waitFor} from '../../shared/helper.js';

import {addBreakpointForLine, openSourceCodeEditorForFile, RESUME_BUTTON} from '../helpers/sources-helpers.js';

async function retrieveCodeMirrorEditorContent(): Promise<Array<string>> {
  const editor = await waitFor('[aria-label="Code editor"]');
  return editor.evaluate(node => [...node.querySelectorAll('.cm-line')].map(node => node.textContent || '') || []);
}

describe('Sources Tab', function() {
  it('shows correct inline variable at definition', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('inline-variable.js', 'inline-variable.html');
    await addBreakpointForLine(frontend, 3);

    const scriptEvaluation = target.evaluate('simple(41);');

    await waitFor('.cm-line > .cm-variableValues');

    const contents = await retrieveCodeMirrorEditorContent();
    assert.strictEqual(contents[0], 'function simple(a) {a = 41');
    assert.strictEqual(contents[1], '  let x = a + 1;x = 42');

    await click(RESUME_BUTTON);
    await scriptEvaluation;
  });
});
