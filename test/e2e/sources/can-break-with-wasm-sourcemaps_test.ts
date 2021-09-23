// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, step, timeout, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {addBreakpointForLine, checkBreakpointDidNotActivate, isBreakpointSet, openFileInEditor, openSourceCodeEditorForFile, reloadPageAndWaitForSourceFile, retrieveTopCallFrameScriptLocation, retrieveTopCallFrameWithoutResuming, sourceLineNumberSelector} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  it('can add breakpoint for a sourcemapped wasm module', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openSourceCodeEditorForFile('with-sourcemap.ll', 'wasm/wasm-with-sourcemap.html');
    await addBreakpointForLine(frontend, 5);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', target);
    assert.deepEqual(scriptLocation, 'with-sourcemap.ll:5');
  });

  // Flaky on linux bot
  it.skip('[crbug.com/1252330] hits two breakpoints that are set and activated separately', async function() {
    const {target, frontend} = getBrowserAndPages();
    const fileName = 'with-sourcemap.ll';

    await step('navigate to a page and open the Sources tab', async () => {
      await openSourceCodeEditorForFile(fileName, 'wasm/wasm-with-sourcemap.html');
    });

    await step('add a breakpoint to line No.5', async () => {
      await addBreakpointForLine(frontend, 5);
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(frontend, target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet(5));

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'with-sourcemap.ll:5');
    });

    await step('remove the breakpoint from the fifth line', async () => {
      await frontend.click(sourceLineNumberSelector(5));
    });

    await step('reload the page', async () => {
      await target.reload();
    });

    // FIXME(crbug/1112692): Refactor test to remove the timeout.
    await timeout(100);

    await step('open original source file', async () => {
      await openFileInEditor('with-sourcemap.ll');
    });

    await waitForFunction(async () => !(await isBreakpointSet(5)));
    await checkBreakpointDidNotActivate();

    await step('add a breakpoint to line No.6', async () => {
      await addBreakpointForLine(frontend, 6);
    });

    await step('reload the page', async () => {
      await reloadPageAndWaitForSourceFile(frontend, target, fileName);
    });

    await waitForFunction(async () => await isBreakpointSet(6));

    await step('check that the code has paused on the breakpoint at the correct script location', async () => {
      const scriptLocation = await retrieveTopCallFrameWithoutResuming();
      assert.deepEqual(scriptLocation, 'with-sourcemap.ll:6');
    });
  });
});
