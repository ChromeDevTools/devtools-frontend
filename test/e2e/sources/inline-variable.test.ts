// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  openSourceCodeEditorForFile,
  RESUME_BUTTON,
  STEP_INTO_BUTTON,
  STEP_OVER_BUTTON,
} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function waitForInlineVariables(devToolsPage: DevToolsPage, count: number): Promise<string[]> {
  const inlineVariables = await devToolsPage.waitForMany('.cm-variableValues', count);
  return await Promise.all(inlineVariables.map(e => e.evaluate(e => e.textContent)));
}

describe('Sources Tab', function() {
  it('shows correct inline variable at definition', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('inline-variable.js', 'inline-variable.html', devToolsPage, inspectedPage);

    // For each step, which inline variables we expect CodeMirror to show.
    const expectedInlineVariables: string[][] = [
      [],  // The 'debugger;' statement.
      [],  // The first actual statement.
      ['a = {k: 1}'],
      ['a = {k: 1}', 'b = (5) [1, 2, 3, 4, 5]'],
      ['a = {k: 1}', 'b = (5) [1, 2, 3, 4, 5]'],
      ['a = {k: 1}', 'b = (5) [1, 2, 3, 4, 5]', 'c = (100) [empty × 10, 1, empty × 89]'],
      ['a = {k: 2}', 'b = (5) [1, 2, 3, 4, 5]', 'c = (100) [empty × 10, 1, empty × 89]', 'a = {k: 2}'],
      [
        'a = {k: 2, l: Window}', 'b = (5) [1, 2, 3, 4, 5]', 'c = (100) [empty × 10, 1, empty × 89]',
        'a = {k: 2, l: Window}'
      ],
      [
        'a = {k: 2, l: Window}', 'b = (5) [1, 3, 3, 4, 5]', 'c = (100) [empty × 10, 1, empty × 89]',
        'a = {k: 2, l: Window}', 'b = (5) [1, 3, 3, 4, 5]'
      ],
      [
        'a = {k: 2, l: Window}', 'b = (5) [1, 3, body, 4, 5]', 'c = (100) [empty × 10, 1, empty × 89]',
        'a = {k: 2, l: Window}', 'b = (5) [1, 3, body, 4, 5]'
      ],
    ];

    const scriptEvaluation = inspectedPage.evaluate('testFunction();');

    for (const expected of expectedInlineVariables) {
      assert.deepEqual(await waitForInlineVariables(devToolsPage, expected.length), expected);
      await devToolsPage.click(STEP_OVER_BUTTON);
    }

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('shows correct inline variables for same-named variables in different functions',
     async ({devToolsPage, inspectedPage}) => {
       await openSourceCodeEditorForFile(
           'inline-variable-frames.js', 'inline-variable-frames.html', devToolsPage, inspectedPage);

       // For each step, which inline variables we expect CodeMirror to show.
       const expectedInlineVariables: string[][] = [
         [],  // The 'debugger;' statement.
         [],  // The first actual statement.
         ['sameName = "foo"'],
         ['sameName = "not-foo"'],
         ['sameName = "not-foo"'],
         ['sameName = "foo"'],
       ];

       const scriptEvaluation = inspectedPage.evaluate('testFunction();');

       for (const expected of expectedInlineVariables) {
         assert.deepEqual(await waitForInlineVariables(devToolsPage, expected.length), expected);
         await devToolsPage.click(STEP_INTO_BUTTON);
       }

       await devToolsPage.click(RESUME_BUTTON);
       await scriptEvaluation;
     });
});
