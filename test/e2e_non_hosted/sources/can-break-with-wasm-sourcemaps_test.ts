// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  addBreakpointForLine,
  checkBreakpointDidNotActivate,
  isBreakpointSet,
  openFileInEditor,
  openSourceCodeEditorForFile,
  PAUSE_BUTTON,
  reloadPageAndWaitForSourceFile,
  removeBreakpointForLine,
  retrieveTopCallFrameScriptLocation,
  retrieveTopCallFrameWithoutResuming,
} from '../../e2e/helpers/sources-helpers.js';

describe('The Sources Tab', () => {
  const fileName = 'with-sourcemap.ll';

  it('can add breakpoint for a sourcemapped wasm module', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(fileName, 'wasm/wasm-with-sourcemap.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(5, devToolsPage);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', inspectedPage, devToolsPage);
    assert.deepEqual(scriptLocation, `${fileName}:5`);
  });

  it('hits two breakpoints that are set and activated separately', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(fileName, 'wasm/wasm-with-sourcemap.html', devToolsPage, inspectedPage);

    await addBreakpointForLine(5, devToolsPage);

    await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

    await openFileInEditor(fileName, devToolsPage);

    await devToolsPage.waitForFunction(async () => await isBreakpointSet(5, devToolsPage));

    await devToolsPage.waitForFunction(async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
      return scriptLocation === `${fileName}:5`;
    });

    await devToolsPage.page.keyboard.press('F8');
    await devToolsPage.waitFor(PAUSE_BUTTON);

    await removeBreakpointForLine('5', devToolsPage);

    await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

    await openFileInEditor(fileName, devToolsPage);

    await devToolsPage.waitForFunction(async () => !(await isBreakpointSet(5, devToolsPage)));
    await checkBreakpointDidNotActivate(devToolsPage);

    await addBreakpointForLine(6, devToolsPage);

    await reloadPageAndWaitForSourceFile(fileName, devToolsPage, inspectedPage);

    await devToolsPage.waitForFunction(async () => await isBreakpointSet(6, devToolsPage));

    await devToolsPage.waitForFunction(async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
      return scriptLocation === `${fileName}:6`;
    });
  });
});
