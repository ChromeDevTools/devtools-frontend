// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$, click, getBrowserAndPages, resetPages, resourcesPath, waitFor} from '../../shared/helper.js';
import {addBreakpointForLine, listenForSourceFilesAdded, openFileInEditor, openFileInSourcesPanel, openSourcesPanel, PAUSE_ON_EXCEPTION_BUTTON, retrieveSourceFilesAdded, retrieveTopCallFrameScriptLocation, waitForAdditionalSourceFiles} from '../helpers/sources-helpers.js';

// TODO: Remove once Chromium updates its version of Node.js to 12+.
const globalThis: any = global;

declare global {
  interface Window {
    __sourceFilesAddedEvents: string[];
  }
}

// This testcase reaches into DevTools internals to install the mock plugin. At this point, there is no sensible
// alternative, since using a real plugin would require spinning up an external service. Installing the plugin in this
// way is not the correct level to test things, but there is no first class feature to controlling or installing custom
// plugins as of yet.
describe('The Debugger Language Plugins', async () => {
  beforeEach(async () => {
    await resetPages({'enabledExperiments': ['wasmDWARFDebugging', 'protocolMonitor']});
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      globalThis.MockLanguagePluginBase = class {
        handleScript(script: any) {
          return script.isWasm() && script.codeOffset() > 0;
        }

        async addRawModule(rawModuleId: any, symbols: any, rawModule: any) {
          return [];
        }

        /* async */ sourceLocationToRawLocation(sourceLocation: any) {
          return null;
        }

        /* async */ rawLocationToSourceLocation(rawLocation: any) {
          return null;
        }

        async listVariablesInScope(rawLocation: any) {
          return null;
        }

        async evaluateVariable(name: any, location: any) {
          return null;
        }

        dispose() {
        }
      };
      /* eslint-enable @typescript-eslint/no-unused-vars */

      globalThis.installMockPlugin = function(plugin: any) {
        const bindings = globalThis.Bindings.debuggerWorkspaceBinding;
        const models = bindings._debuggerModelToData.keys();
        for (const debuggerModel of models) {
          const pluginManager = bindings.getLanguagePluginManager(debuggerModel);
          pluginManager.clearPlugins();
          pluginManager.addPlugin(plugin);
        }
      };
    });
  });

  // Load a simple wasm file and verify that the source file shows up in the file tree.
  it('can show C filenames after loading the module', async () => {
    const {target, frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      // A simple plugin that resolves to a single source file
      class SingleFilePlugin extends globalThis.MockLanguagePluginBase {
        async addRawModule(
            rawModuleId: any, symbols: any, rawModule: any) {  // eslint-disable-line @typescript-eslint/no-unused-vars
          return ['source_file.c'];
        }
      }

      globalThis.installMockPlugin(new SingleFilePlugin());
    });

    await openFileInSourcesPanel(target, 'wasm/global_variable.html');
    await listenForSourceFilesAdded(frontend);
    await target.evaluate('go();');
    await waitForAdditionalSourceFiles(frontend);

    const capturedFileNames = await retrieveSourceFilesAdded(frontend);

    assert.deepEqual(capturedFileNames, ['/test/e2e/resources/sources/wasm/global_variable.wasm', '/source_file.c']);
  });


  // Resolve a single code offset to a source line to test the correctness of offset computations.
  it('use correct code offsets to interpret raw locations', async () => {
    const {target, frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      class LocationMappingPlugin extends globalThis.MockLanguagePluginBase {
        async addRawModule(
            rawModuleId: any, symbols: any, rawModule: any) {  // eslint-disable-line @typescript-eslint/no-unused-vars
          return ['/test/e2e/resources/sources/wasm/unreachable.ll'];
        }

        /* async */ rawLocationToSourceLocation(rawLocation: any) {
          if (rawLocation.codeOffset === 6) {
            return [{sourceFile: '/test/e2e/resources/sources/wasm/unreachable.ll', lineNumber: 4, columnNumber: 2}];
          }
          return null;
        }
      }

      globalThis.installMockPlugin(new LocationMappingPlugin());
    });

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await target.goto(`${resourcesPath}/sources/wasm/unreachable.html`);
    await waitFor('.paused-status');

    const scriptLocation =
        await (await $('.call-frame-location')).evaluate((location: HTMLElement) => location.textContent);
    assert.deepEqual(scriptLocation, 'unreachable.ll:5');
  });

  // Resolve the location for a breakpoint.
  it('resolve locations for breakpoints correctly', async () => {
    const {target, frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
      // This plugin will emulate a source mapping with a single file and a single corresponding source line and byte
      // code offset pair.
      class LocationMappingPlugin extends globalThis.MockLanguagePluginBase {
        async addRawModule(
            rawModuleId: any, symbols: any, rawModule: any) {  // eslint-disable-line @typescript-eslint/no-unused-vars
          this.sourceLocation = {
            sourceFile: 'test/e2e/resources/sources/wasm/global_variable.ll',
            lineNumber: 8,
            columnNumber: 0,
          };
          this.rawLocation = {rawModuleId: rawModuleId, codeOffset: 25};
          return [this.sourceLocation.sourceFile];
        }

        /* async */ rawLocationToSourceLocation(rawLocation: any) {
          if (rawLocation.rawModuleId === this.rawLocation.rawModuleId &&
              rawLocation.codeOffset === this.rawLocation.codeOffset) {
            return [this.sourceLocation];
          }
          return null;
        }

        /* async */ sourceLocationToRawLocation(sourceLocation: any) {
          if (sourceLocation.sourceFile === this.sourceLocation.sourceFile &&
              sourceLocation.lineNumber === this.sourceLocation.lineNumber) {
            return [this.rawLocation];
          }
          return null;
        }
      }

      globalThis.installMockPlugin(new LocationMappingPlugin());
    });

    await openFileInSourcesPanel(target, 'wasm/global_variable.html');
    await target.evaluate('go();');
    await openFileInEditor(target, 'global_variable.ll');
    await addBreakpointForLine(frontend, 9);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', target);
    assert.deepEqual(scriptLocation, 'global_variable.ll:9');
  });
});
