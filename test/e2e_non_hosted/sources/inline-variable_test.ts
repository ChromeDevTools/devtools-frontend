// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  addBreakpointForLine,
  openSourceCodeEditorForFile,
  RESUME_BUTTON,
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';

async function retrieveCodeMirrorEditorContent(devToolsPage: DevToolsPage): Promise<string[]> {
  const editor = await devToolsPage.waitFor('[aria-label="Code editor"]');
  return await editor.evaluate(
      node => [...node.querySelectorAll('.cm-line')].map(node => node.textContent || '') || []);
}

describe('Sources Tab', function() {
  it('shows correct inline variable at definition', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('inline-variable.js', 'inline-variable.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(3, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('simple(41);');

    await devToolsPage.waitFor('.cm-line > .cm-variableValues');

    const contents = await retrieveCodeMirrorEditorContent(devToolsPage);
    assert.strictEqual(contents[0], 'function simple(a) {a = 41');
    assert.strictEqual(contents[1], '  let x = a + 1;x = 42');

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });
});
