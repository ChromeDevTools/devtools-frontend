// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  addBreakpointForLine,
  getScopeNames,
  getValuesForScope,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  reloadPageAndWaitForSourceFile,
  RESUME_BUTTON,
  retrieveTopCallFrameWithoutResuming,
} from '../../e2e/helpers/sources-helpers.js';

describe('Source Tab', () => {
  it('shows and updates the module, local, and stack scope while pausing', async ({devToolsPage, inspectedPage}) => {
    const breakpointLine = '0x05f';
    const fileName = 'scopes.wasm';
    let stackScopeValues: string[];
    let expectedValues: string[];

    await openSourceCodeEditorForFile('scopes.wasm', 'wasm/scopes.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(breakpointLine, devToolsPage);
    let scriptLocation;
    // Note: this is a flake in our breakpoint logic code: we sometimes wrongly stop at a different
    // location, reload until we actually stop where we want to for this test.
    do {
      await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);
      scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
    } while (scriptLocation !== 'scopes.wasm:0x5f');

    const scopeNames = await devToolsPage.waitForFunction(async () => {
      const names = await getScopeNames(devToolsPage);
      return names.length === 3 ? names : undefined;
    });
    assert.deepEqual(scopeNames, ['Expression', 'Local', 'Module']);

    await devToolsPage.click('[aria-label="Module"]');

    expectedValues = [
      'stack: Stack\xA0{}',
    ];
    stackScopeValues = await getValuesForScope('Expression', 0, expectedValues.length, devToolsPage);
    assert.deepEqual(stackScopeValues, expectedValues);

    expectedValues = [
      '$f32_var: f32 {value: 5.5}',
      '$f64_var: f64 {value: 2.23e-11}',
      '$i32: i32 {value: 42}',
      '$i64_var: i64 {value: 9221120237041090n}',
    ];
    const localScopeValues = await getValuesForScope('Local', 0, expectedValues.length, devToolsPage);
    assert.deepEqual(localScopeValues, expectedValues);

    expectedValues = [
      'functions: Functions\xA0{$foo: ƒ}',
      'globals: Globals\xA0{$imports.global: i32}',
      'instance: Instance\xA0{exports: {…}}',
      'memories: Memories',
      '$memory0: Memory(1)',
      'module: Module\xA0{}',
    ];
    const moduleScopeValues = await getValuesForScope('Module', 0, 4, devToolsPage);
    // Remove occurrences of arrays.
    const formattedValues = moduleScopeValues.map((line: string) => {
      return line.replace(/\[[^\]]*\]/, '').trim();
    });
    assert.deepEqual(formattedValues, expectedValues);

    await devToolsPage.pressKey('F9');
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);

    const currentModuleScopeValues = await getValuesForScope('Module', 0, moduleScopeValues.length, devToolsPage);
    assert.deepEqual(currentModuleScopeValues, moduleScopeValues);

    const updatedLocalScopeValues = await getValuesForScope('Local', 0, localScopeValues.length, devToolsPage);
    assert.deepEqual(updatedLocalScopeValues, localScopeValues);

    expectedValues = [
      'stack: Stack\xA0{0: i32}',
    ];
    stackScopeValues = await getValuesForScope('Expression', 0, expectedValues.length, devToolsPage);
    assert.deepEqual(stackScopeValues, expectedValues);

    await devToolsPage.click(RESUME_BUTTON);
  });
});
