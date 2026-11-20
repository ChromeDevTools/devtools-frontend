
// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {ELEMENTS_PANEL_SELECTOR} from '../helpers/elements-helpers.js';
import {
  addBreakpointForLine,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
  waitForStackTopMatch,
} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';

async function addWatchExpression(expression: string, devToolsPage: DevToolsPage) {
  const watchSection = await devToolsPage.waitFor('[aria-label="Watch"]');
  const isWatchOpen = await watchSection.evaluate(el => el.getAttribute('aria-expanded') === 'true' ||
                                                      el.getAttribute('aria-selected') === 'true');
  if (!isWatchOpen) {
    await devToolsPage.click('[aria-label="Watch"]');
    await devToolsPage.waitFor('.watch-expressions');
  }
  await devToolsPage.click('[aria-label="Add watch expression"]');
  await devToolsPage.waitFor('.watch-expression-editing');
  await devToolsPage.typeText(expression);
  await devToolsPage.pressKey('Enter');
  await devToolsPage.waitForNone('.watch-expression-editing');
}

describe('Watch Expression Pane', () => {
  it('collapses children when editing', async ({devToolsPage}) => {
    await openSourcesPanel(devToolsPage);

    // Create watch expression "Text"
    await addWatchExpression('Text', devToolsPage);
    await devToolsPage.waitForElementWithTextContent('Text: ƒ Text()');

    // Expand watch element
    const element = await devToolsPage.waitFor('.watch-expression-tree-item');
    await devToolsPage.click('.watch-expression-tree-item');
    await devToolsPage.pressKey('ArrowRight');

    // Wait for watch element to be expanded
    await devToolsPage.waitForClass(element, 'expanded');

    // Begin editing and check that element is now collapsed.
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitFor('.watch-expression-editing');
    await devToolsPage.waitForFunction(async () => {
      return await element.evaluate(e => !e.classList.contains('expanded'));
    });

    // Remove the watch so that it does not interfere with other tests.
    await devToolsPage.pressKey('Escape');
    await devToolsPage.waitForNone('.watch-expression-editing');
    await devToolsPage.click('.watch-expression-delete-button');
    await devToolsPage.waitForNone('.watch-expression-tree-item');
  });

  it('deobfuscates variable names', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'sourcemap-scopes-minified.js',
                                      'sourcemap-scopes-minified.html');

    const breakLocationOuterRegExp = /sourcemap-scopes-minified\.js:2$/;
    const watchText = 'arg0+1';
    const watchValue = '11';

    await addBreakpointForLine(devToolsPage, 2);

    void inspectedPage.evaluate('foo(10);');

    const scriptLocation = await waitForStackTopMatch(devToolsPage, breakLocationOuterRegExp);
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

  it('evaluates watch expressions across panel switches when debugger pauses',
     async ({devToolsPage, inspectedPage}) => {
       await openSourcesPanel(devToolsPage);

       await inspectedPage.evaluate(`
      function testFunction() {
        var x = Math.sqrt(16);
        debugger;
        return x;
      }
    `);

       await addWatchExpression('x', devToolsPage);
       await addWatchExpression('y.foo', devToolsPage);

       const watchesBefore = await devToolsPage.waitForFunction(async () => {
         const items = await devToolsPage.$$('.watch-expression-title');
         if (items.length !== 2) {
           return undefined;
         }
         const texts = await Promise.all(items.map(item => item.evaluate(el => {
           return el.querySelector('.value') ? (el.textContent?.trim() ?? '') : '';
         })));
         return texts.every(Boolean) ? texts.sort() : undefined;
       });
       assert.deepEqual(watchesBefore, ['x: <not available>', 'y.foo: <not available>']);

       await devToolsPage.click('#tab-elements');
       await devToolsPage.waitFor('#tab-elements[aria-selected="true"]');
       await devToolsPage.waitFor(ELEMENTS_PANEL_SELECTOR);

       const evaluation = inspectedPage.evaluate('testFunction()');
       await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
       await devToolsPage.waitFor('#tab-sources[aria-selected="true"]');
       await devToolsPage.waitFor('.panel[aria-label="sources"]');

       const watchesOnPause = await devToolsPage.waitForFunction(async () => {
         const items = await devToolsPage.$$('.watch-expression-title');
         if (items.length !== 2) {
           return undefined;
         }
         const states = await Promise.all(items.map(
             item => item.evaluate(el => ({
                                     text: el.querySelector('.value') ? (el.textContent?.trim() ?? '') : '',
                                     hasNonErrorValue: Boolean(el.querySelector('.value:not(.watch-expression-error)')),
                                   }))));
         if (!states.every(state => state.text) || !states.some(state => state.hasNonErrorValue)) {
           return undefined;
         }
         return states.map(state => state.text).sort();
       });
       assert.deepEqual(watchesOnPause, ['x: 4', 'y.foo: <not available>']);

       await devToolsPage.click(RESUME_BUTTON);
       await evaluation;
     });
});
