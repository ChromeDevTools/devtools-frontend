// Copyright 2020 The Chromium Authors
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
} from '../helpers/sources-helpers.js';

describe('The Sources Tab', () => {
  const fileName = 'with-sourcemap.ll';

  it('can add breakpoint for a sourcemapped wasm module', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(devToolsPage, inspectedPage, fileName, 'wasm/wasm-with-sourcemap.html');
    await addBreakpointForLine(devToolsPage, 5);

    const scriptLocation = await retrieveTopCallFrameScriptLocation(devToolsPage, inspectedPage, 'main();');
    assert.deepEqual(scriptLocation, `${fileName}:5`);
  });

  it('hits two breakpoints that are set and activated separately', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(devToolsPage, inspectedPage, fileName, 'wasm/wasm-with-sourcemap.html');

    await addBreakpointForLine(devToolsPage, 5);

    await reloadPageAndWaitForSourceFile(devToolsPage, inspectedPage, fileName);

    await openFileInEditor(devToolsPage, fileName);

    await devToolsPage.waitForFunction(async () => await isBreakpointSet(devToolsPage, 5));

    await devToolsPage.waitForFunction(async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
      return scriptLocation === `${fileName}:5`;
    });

    await devToolsPage.page.keyboard.press('F8');
    await devToolsPage.waitFor(PAUSE_BUTTON);

    await removeBreakpointForLine(devToolsPage, '5');

    await reloadPageAndWaitForSourceFile(devToolsPage, inspectedPage, fileName);

    await openFileInEditor(devToolsPage, fileName);

    await devToolsPage.waitForFunction(async () => !(await isBreakpointSet(devToolsPage, 5)));
    await checkBreakpointDidNotActivate(devToolsPage);

    await addBreakpointForLine(devToolsPage, 6);

    await reloadPageAndWaitForSourceFile(devToolsPage, inspectedPage, fileName);

    await devToolsPage.waitForFunction(async () => await isBreakpointSet(devToolsPage, 6));

    await devToolsPage.waitForFunction(async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming(devToolsPage);
      return scriptLocation === `${fileName}:6`;
    });
  });
});
