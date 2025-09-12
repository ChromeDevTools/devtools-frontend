// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  addBreakpointForLine,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  waitForStackTopMatch,
} from '../../e2e/helpers/sources-helpers.js';

describe('Watch Expression Pane', () => {
  it('collapses children when editing', async ({devToolsPage}) => {
    await openSourcesPanel(devToolsPage);

    // Create watch expression "Text"
    await devToolsPage.click('[aria-label="Watch"]');
    await devToolsPage.click('[aria-label="Add watch expression"]');
    await devToolsPage.typeText('Text');
    await devToolsPage.pressKey('Enter');

    // Expand watch element
    const element = await devToolsPage.waitFor('.object-properties-section-root-element');
    await devToolsPage.pressKey('ArrowRight');

    // Retrieve watch element and ensure that it is expanded
    const initialExpandCheck = await element.evaluate(e => e.classList.contains('expanded'));
    assert.isTrue(initialExpandCheck);

    // Begin editing and check that element is now collapsed.
    await devToolsPage.pressKey('Enter');
    const editingExpandCheck = await element.evaluate(e => e.classList.contains('expanded'));
    assert.isFalse(editingExpandCheck);

    // Remove the watch so that it does not interfere with other tests.
    await devToolsPage.pressKey('Escape');
    await devToolsPage.pressKey('Delete');
  });

  it('deobfuscates variable names', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'sourcemap-scopes-minified.js', 'sourcemap-scopes-minified.html', devToolsPage, inspectedPage);

    const breakLocationOuterRegExp = /sourcemap-scopes-minified\.js:2$/;
    const watchText = 'arg0+1';
    const watchValue = '11';

    await addBreakpointForLine(2, devToolsPage);

    void inspectedPage.evaluate('foo(10);');

    const scriptLocation = await waitForStackTopMatch(breakLocationOuterRegExp, devToolsPage);
    assert.match(scriptLocation, breakLocationOuterRegExp);

    await devToolsPage.click('[aria-label="Watch"]');
    await devToolsPage.click('[aria-label="Add watch expression"]');
    await devToolsPage.typeText(watchText);
    await devToolsPage.pressKey('Enter');

    const element = await devToolsPage.waitFor('.watch-expression-title');
    const nameAndValue = await element.evaluate(e => e.textContent);

    assert.strictEqual(nameAndValue, `${watchText}: ${watchValue}`);
  });
});
