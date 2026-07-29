// Copyright 2020 The Chromium Authors
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
  waitValuesForScope,
} from '../helpers/sources-helpers.js';

describe('Source Tab', () => {
  it('shows and updates the module, local, and stack scope while pausing', async ({devToolsPage, inspectedPage}) => {
    const breakpointLine = '0x05f';
    const fileName = 'scopes.wasm';
    let expectedValues: string[];

    await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'scopes.wasm', 'wasm/scopes.html');
    await addBreakpointForLine(devToolsPage, breakpointLine);
    let scriptLocation;
    // Note: this is a flake in our breakpoint logic code: we sometimes wrongly stop at a different
    // location, reload until we actually stop where we want to for this test.
    do {
      await reloadPageAndWaitForSourceFile(devToolsPage, inspectedPage, fileName);
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
    await waitValuesForScope(devToolsPage, 'Expression', 0, expectedValues);

    expectedValues = [
      '$f32_var: f32 {value: 5.5}',
      '$f64_var: f64 {value: 2.23e-11}',
      '$i32: i32 {value: 42}',
      '$i64_var: i64 {value: 9221120237041090n}',
    ];
    const localScopeValues = await waitValuesForScope(devToolsPage, 'Local', 0, expectedValues);

    expectedValues = [
      'functions: Functions\xA0{$foo: ƒ}',
      'globals: Globals\xA0{$imports.global: i32}',
      'instance: Instance\xA0{exports: {…}}',
      'memories: Memories',
      '$memory0: Memory(1)',
      'module: Module\xA0{}',
    ];
    const moduleScopeValues = await getValuesForScope(devToolsPage, 'Module', 0, 4);
    // Remove occurrences of arrays.
    const formattedValues = moduleScopeValues.map((line: string) => {
      return line.replace(/\[[^\]]*\]/, '').trim();
    });
    assert.deepEqual(formattedValues, expectedValues);

    await devToolsPage.pressKey('F9');
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);

    await waitValuesForScope(devToolsPage, 'Module', 0, moduleScopeValues);
    await waitValuesForScope(devToolsPage, 'Local', 0, localScopeValues);

    expectedValues = [
      'stack: Stack\xA0{0: i32}',
    ];
    await waitValuesForScope(devToolsPage, 'Expression', 0, expectedValues);
    await devToolsPage.click(RESUME_BUTTON);
  });
});
