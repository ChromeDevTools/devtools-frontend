// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$, click, getBrowserAndPages, resetPages, resourcesPath, waitFor, waitForFunction} from '../../shared/helper.js';
import {addBreakpointForLine, listenForSourceFilesAdded, openFileInEditor, openFileInSourcesPanel, openSourcesPanel, PAUSE_ON_EXCEPTION_BUTTON, retrieveSourceFilesAdded, retrieveTopCallFrameScriptLocation, waitForAdditionalSourceFiles} from '../helpers/sources-helpers.js';

describe('The CXX DWARF Language Plugin', async () => {
  beforeEach(async () => {
    await resetPages({'enabledExperiments': ['wasmDWARFDebugging']});
  });

  beforeEach(function() {
    if (!process.env.WITH_SYMBOL_SERVER) {
      this.skip();
    }
  });

  // Load a simple wasm file and verify that the source file shows up in the file tree.
  it('can show C filenames after loading the module', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel(target, 'wasm/global_variable_with_dwarf.html');
    await listenForSourceFilesAdded(frontend);
    await target.evaluate('go();');
    await waitForAdditionalSourceFiles(frontend, 2);


    const capturedFileNames = await retrieveSourceFilesAdded(frontend);

    assert.deepEqual(capturedFileNames, [
      '/test/e2e/resources/sources/wasm/global_variable_with_dwarf.wasm',
      '/test/e2e/resources/sources/wasm/global_variable_with_dwarf.c',
    ]);
  });


  // Resolve a single code offset to a source line to test the correctness of offset computations.
  it('use correct code offsets to interpret raw locations', async () => {
    const {target} = getBrowserAndPages();

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await target.goto(`${resourcesPath}/sources/wasm/unreachable_with_dwarf.html`);
    await waitFor('.paused-status');

    const scriptLocation = await waitForFunction(async () => {
      const scriptLocation =
          await (await $('.call-frame-location')).evaluate((location: HTMLElement) => location.textContent);
      if (scriptLocation && scriptLocation.startsWith('unreachable_with_dwarf.ll')) {
        return scriptLocation;
      }
      return null;
    }, 'Got no call frames');
    assert.deepEqual(scriptLocation, 'unreachable_with_dwarf.ll:9');
  });

  // Resolve the location for a breakpoint.
  it('resolves locations for breakpoints correctly', async () => {
    const {target, frontend} = getBrowserAndPages();

    await openFileInSourcesPanel(target, 'wasm/global_variable_with_dwarf.html');
    await target.evaluate('go();');
    await openFileInEditor(target, 'global_variable_with_dwarf.c');
    await addBreakpointForLine(frontend, 4);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', target);
    assert.deepEqual(scriptLocation, 'global_variable_with_dwarf.c:4');
  });
});
