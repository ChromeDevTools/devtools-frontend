// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, step, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  addBreakpointForLine,
  getScopeNames,
  getValuesForScope,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  reloadPageAndWaitForSourceFile,
  RESUME_BUTTON,
} from '../helpers/sources-helpers.js';

describe('Source Tab', async () => {
  it('shows and updates the module, local, and stack scope while pausing', async () => {
    const {frontend, target} = getBrowserAndPages();
    const breakpointLine = '0x05f';
    const fileName = 'scopes.wasm';
    let moduleScopeValues: string[];
    let localScopeValues: string[];

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile('scopes.wasm', 'wasm/scopes.html');
    });

    await step(`add a breakpoint to line No.${breakpointLine}`, async () => {
      await addBreakpointForLine(frontend, breakpointLine);
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await step('check that the module, local, and stack scope appear', async () => {
      const scopeNames = await waitForFunction(async () => {
        const names = await getScopeNames();
        return names.length === 3 ? names : undefined;
      });
      assert.deepEqual(scopeNames, ['Expression', 'Local', 'Module']);
    });

    await step('expand the module scope', async () => {
      await click('[aria-label="Module"]');
    });

    await step('check that the stack scope content is as expected', async () => {
      const stackScopeValues = await getValuesForScope('Expression', 0, 0);
      assert.deepEqual(stackScopeValues, [
        'stack: Stack\xA0{}',
      ]);
    });

    await step('check that the local scope content is as expected', async () => {
      localScopeValues = await getValuesForScope('Local', 0, 4);
      assert.deepEqual(localScopeValues, [
        '$f32_var: f32 {value: 5.5}',
        '$f64_var: f64 {value: 2.23e-11}',
        '$i32: i32 {value: 42}',
        '$i64_var: i64 {value: 9221120237041090n}',
      ]);
    });

    await step('check that the module scope content is as expected', async () => {
      moduleScopeValues = await getValuesForScope('Module', 0, 4);
      // Remove occurrences of arrays.
      const formattedValues = moduleScopeValues.map((line: string) => {
        return line.replace(/\[[^\]]*\]/, '').trim();
      });
      assert.deepEqual(formattedValues, [
        'functions: Functions\xA0{$foo: ƒ}',
        'globals: Globals\xA0{$imports.global: i32}',
        'instance: Instance\xA0{exports: {…}}',
        'memories: Memories',
        '$memory0: Memory(1)',
        'module: Module\xA0{}',
      ]);
    });

    await step('step one time', async () => {
      await frontend.keyboard.press('F9');
      await waitFor(PAUSE_INDICATOR_SELECTOR);
    });

    await step('check that the module scope content is as before', async () => {
      const currentModuleScopeValues = await getValuesForScope('Module', 0, moduleScopeValues.length);
      assert.deepEqual(currentModuleScopeValues, moduleScopeValues);
    });

    await step('check that the local scope content is as before', async () => {
      const updatedLocalScopeValues = await getValuesForScope('Local', 0, localScopeValues.length);
      assert.deepEqual(updatedLocalScopeValues, localScopeValues);
    });

    await step('check that the stack scope content is updated to reflect the change', async () => {
      const stackScopeValues = await getValuesForScope('Expression', 0, 1);
      assert.deepEqual(stackScopeValues, [
        'stack: Stack\xA0{0: i32}',
      ]);
    });

    await step('resume execution', async () => {
      await click(RESUME_BUTTON);
    });
  });
});
