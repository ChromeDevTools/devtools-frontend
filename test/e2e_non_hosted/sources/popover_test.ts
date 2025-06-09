// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {addBreakpointForLine, openSourceCodeEditorForFile, RESUME_BUTTON} from '../../e2e/helpers/sources-helpers.js';

const LAST_ELEMENT_SELECTOR = '.cm-executionLine > span:last-child';

describe('Sources Tab', function() {
  it('shows correct preview for `object.foo` member expressions', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('popover.js', 'popover.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(5, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('f1();');
    await devToolsPage.hover(LAST_ELEMENT_SELECTOR);

    const popover = await devToolsPage.waitFor('[data-stable-name-for-test="object-popover-content"]');
    const value =
        await devToolsPage.waitFor('.object-value-number', popover).then(e => e.evaluate(node => node.textContent));
    assert.strictEqual(value, '1');

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('shows correct preview for `array[1].foo` member expressions', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('popover.js', 'popover.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(9, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('f2();');
    await devToolsPage.hover(LAST_ELEMENT_SELECTOR);

    const popover = await devToolsPage.waitFor('[data-stable-name-for-test="object-popover-content"]');
    const value =
        await devToolsPage.waitFor('.object-value-number', popover).then(e => e.evaluate(node => node.textContent));
    assert.strictEqual(value, '5');

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('shows correct preview for `array[i][0]` member expressions', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('popover.js', 'popover.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(13, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('f3(3);');
    await devToolsPage.hover(LAST_ELEMENT_SELECTOR);

    const popover = await devToolsPage.waitFor('[data-stable-name-for-test="object-popover-content"]');
    const value =
        await devToolsPage.waitFor('.object-value-number', popover).then(e => e.evaluate(node => node.textContent));
    assert.strictEqual(value, '42');

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });

  it('shows correct preview for `this.#x` member expressions in TypeScript', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('popover-typescript.ts', 'popover-typescript.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(5, devToolsPage);

    const scriptEvaluation = inspectedPage.evaluate('test();');
    await devToolsPage.hover(LAST_ELEMENT_SELECTOR);

    const popover = await devToolsPage.waitFor('[data-stable-name-for-test="object-popover-content"]');
    const value =
        await devToolsPage.waitFor('.object-value-number', popover).then(e => e.evaluate(node => node.textContent));
    assert.strictEqual(value, '84');

    await devToolsPage.click(RESUME_BUTTON);
    await scriptEvaluation;
  });
});
