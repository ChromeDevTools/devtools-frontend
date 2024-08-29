// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, step, waitFor, waitForFunction} from '../../shared/helper.js';

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

  it('can add breakpoint for a sourcemapped wasm module', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile(fileName, 'wasm/wasm-with-sourcemap.html');
    await addBreakpointForLine(frontend, 5);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', target);
    assert.deepEqual(scriptLocation, `${fileName}:5`);
  });

  it('hits two breakpoints that are set and activated separately', async () => {
    const {target, frontend} = getBrowserAndPages();

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile(fileName, 'wasm/wasm-with-sourcemap.html');
    });

    await step('add a breakpoint to line No.5', async () => {
      await addBreakpointForLine(frontend, 5);
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await step('open original source file', async () => {
      await openFileInEditor(fileName);
    });

    await waitForFunction(async () => await isBreakpointSet(5));

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      await waitForFunction(async () => {
        const scriptLocation = await retrieveTopCallFrameWithoutResuming();
        return scriptLocation === `${fileName}:5`;
      });
    });

    await step('resume script execution', async () => {
      await frontend.keyboard.press('F8');
      await waitFor(PAUSE_BUTTON);
    });

    await step('remove the breakpoint from the fifth line', async () => {
      await removeBreakpointForLine(frontend, '5');
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await step('open original source file', async () => {
      await openFileInEditor(fileName);
    });

    await waitForFunction(async () => !(await isBreakpointSet(5)));
    await checkBreakpointDidNotActivate();

    await step('add a breakpoint to line No.6', async () => {
      await addBreakpointForLine(frontend, 6);
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet(6));

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      await waitForFunction(async () => {
        const scriptLocation = await retrieveTopCallFrameWithoutResuming();
        return scriptLocation === `${fileName}:6`;
      });
    });
  });
});
