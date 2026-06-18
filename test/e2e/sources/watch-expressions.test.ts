
// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  addBreakpointForLine,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  waitForStackTopMatch,
} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function addWatchExpression(expression: string, devToolsPage: DevToolsPage) {
  await devToolsPage.click('[aria-label="Watch"]');
  await devToolsPage.click('[aria-label="Add watch expression"]');
  await devToolsPage.typeText(expression);
  await devToolsPage.pressKey('Enter');
}

describe('Watch Expression Pane', () => {
  it('collapses children when editing', async ({devToolsPage}) => {
    await openSourcesPanel(devToolsPage);

    // Create watch expression "Text"
    await addWatchExpression('Text', devToolsPage);

    // Expand watch element
    const element = await devToolsPage.waitFor('.watch-expression-tree-item');
    await devToolsPage.click('.watch-expression-tree-item');
    await devToolsPage.pressKey('ArrowRight');

    // Retrieve watch element and ensure that it is expanded
    const initialExpandCheck = await element.evaluate(e => e.classList.contains('expanded'));
    assert.isTrue(initialExpandCheck);

    // Begin editing and check that element is now collapsed.
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitForFunction(async () => {
      return await element.evaluate(e => !e.classList.contains('expanded'));
    });

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

    await addWatchExpression(watchText, devToolsPage);

    const expectedText = `${watchText}: ${watchValue}`;
    await devToolsPage.waitForElementWithTextContent(expectedText);
  });

  it('preserves expansion', async ({devToolsPage, inspectedPage}) => {
    await openSourcesPanel(devToolsPage);

    await inspectedPage.goToHtml(`
      <script>
        var globalObject = {foo: {bar: {baz: 2012}}};
      </script>
    `);

    await addWatchExpression('globalObject', devToolsPage);
    await devToolsPage.waitForElementWithTextContent('globalObject: Object');

    await devToolsPage.click('.watch-expression-title');
    await devToolsPage.pressKey('ArrowRight');
    const fooProp = await devToolsPage.waitFor('foo', undefined, undefined, 'pierceShadowText');
    await devToolsPage.clickElement(fooProp);

    await inspectedPage.reload();

    await devToolsPage.waitFor('.watch-expression-title');
    await devToolsPage.$textContent('{bar: 2012}');
  });
});
