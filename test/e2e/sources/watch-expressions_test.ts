// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, enableExperiment, getBrowserAndPages, step, typeText, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  addBreakpointForLine,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  waitForStackTopMatch,
} from '../helpers/sources-helpers.js';

describe('Watch Expression Pane', async () => {
  it('collapses children when editing', async () => {
    const {frontend} = getBrowserAndPages();
    await openSourcesPanel();

    // Create watch expression "Text"
    await click('[aria-label="Watch"]');
    await click('[aria-label="Add watch expression"]');
    await typeText('Text');
    await frontend.keyboard.press('Enter');

    // Expand watch element
    const element = await waitFor('.object-properties-section-root-element');
    await frontend.keyboard.press('ArrowRight');

    // Retrieve watch element and ensure that it is expanded
    const initialExpandCheck = await element.evaluate(e => e.classList.contains('expanded'));
    assert.strictEqual(initialExpandCheck, true);

    // Begin editing and check that element is now collapsed.
    await frontend.keyboard.press('Enter');
    const editingExpandCheck = await element.evaluate(e => e.classList.contains('expanded'));
    assert.strictEqual(editingExpandCheck, false);

    // Remove the watch so that it does not interfere with other tests.
    await frontend.keyboard.press('Escape');
    await frontend.keyboard.press('Delete');
  });

  it('deobfuscates variable names', async () => {
    const {target, frontend} = getBrowserAndPages();
    await enableExperiment('evaluateExpressionsWithSourceMaps');

    await openSourceCodeEditorForFile('sourcemap-scopes-minified.js', 'sourcemap-scopes-minified.html');

    const breakLocationOuterRegExp = /sourcemap-scopes-minified\.js:2$/;
    const watchText = 'arg0+1';
    const watchValue = '11';

    await step('Run to outer scope breakpoint', async () => {
      await addBreakpointForLine(frontend, 2);

      void target.evaluate('foo(10);');

      const scriptLocation = await waitForStackTopMatch(breakLocationOuterRegExp);
      assert.match(scriptLocation, breakLocationOuterRegExp);
    });

    await step('Create a watch expression', async () => {
      await click('[aria-label="Watch"]');
      await click('[aria-label="Add watch expression"]');
      await typeText(watchText);
      await frontend.keyboard.press('Enter');
    });

    await step('Check the value for the deobfuscated name', async () => {
      const element = await waitFor('.watch-expression-title');
      const nameAndValue = await element.evaluate(e => e.textContent);

      assert.strictEqual(nameAndValue, `${watchText}: ${watchValue}`);
    });
  });
});
