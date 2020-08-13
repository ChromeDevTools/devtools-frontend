// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {click, enableExperiment, getBrowserAndPages, getResourcesPath, goToResource, waitFor} from '../../shared/helper.js';
import {addBreakpointForLine, getValuesForScope, listenForSourceFilesAdded, openFileInEditor, openFileInSourcesPanel, openSourcesPanel, PAUSE_ON_EXCEPTION_BUTTON, RESUME_BUTTON, retrieveSourceFilesAdded, retrieveTopCallFrameScriptLocation, waitForAdditionalSourceFiles} from '../helpers/sources-helpers.js';


// TODO: Remove once Chromium updates its version of Node.js to 12+.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalThis: any = global;

declare global {
  interface Window {
    __sourceFilesAddedEvents: string[];
  }
}

declare function RegisterExtension(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extensionAPI: {languageServices: any}, pluginImpl: any, name: string,
    supportedScriptTypes: {language: string, symbol_types: string[]}): void;

// This testcase reaches into DevTools internals to install the extension plugin. At this point, there is no sensible
// alternative, because loading a real extension is not supported in our test setup.
describe('The Debugger Language Plugins', async () => {
  beforeEach(async () => {
    await enableExperiment('wasmDWARFDebugging');

    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(resourcePath => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      globalThis.installExtensionPlugin = function(registerPluginCallback: any) {
        const extensionServer = globalThis.Extensions.extensionServer;
        /** @type {!{startPage: string, name: string, exposeExperimentalAPIs: boolean}} */
        const extensionInfo = {
          startPage: `${resourcePath}/sources/language_extensions.html`,
          name: 'TestExtension',
        };
        extensionServer._addExtension(extensionInfo);


        const extensionIFrames = document.body.querySelectorAll(`[data-devtools-extension="${extensionInfo.name}"]`);
        const injectedAPI = globalThis.buildExtensionAPIInjectedScript(
            extensionInfo, undefined, globalThis.UI.themeSupport.themeName(),
            globalThis.UI.shortcutRegistry.globalShortcutKeys(), registerPluginCallback);

        function injectAPICallback(completionCallback: () => void) {
          return (ev: Event) => {
            if (ev.target) {
              const iframeWin = (ev.target as HTMLIFrameElement).contentWindow;
              if (iframeWin) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (iframeWin as any).eval(`${injectedAPI}()`);
              }
            }
            completionCallback();
          };
        }

        return Promise.all(Array.from(extensionIFrames, element => new Promise(resolve => {
                                                          (element as HTMLIFrameElement).onload =
                                                              injectAPICallback(resolve);
                                                        })));
      };
    }, getResourcesPath());
  });

  // Load a simple wasm file and verify that the source file shows up in the file tree.
  it('can show C filenames after loading the module', async () => {
    const {target, frontend} = getBrowserAndPages();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await frontend.evaluate(() => globalThis.installExtensionPlugin((extensionServerClient: any, extensionAPI: any) => {
      // A simple plugin that resolves to a single source file
      class SingleFilePlugin {
        async addRawModule(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rawModuleId: any, symbols: any, rawModule: any) {  // eslint-disable-line @typescript-eslint/no-unused-vars
          const fileUrl = new URL('/source_file.c', rawModule.url);
          return [fileUrl.href];
        }
      }

      RegisterExtension(
          extensionAPI, new SingleFilePlugin(), 'Single File', {language: 'WebAssembly', symbol_types: ['None']});
    }));

    await openFileInSourcesPanel('wasm/global_variable.html');
    await listenForSourceFilesAdded(frontend);
    const additionalFilesPromise = waitForAdditionalSourceFiles(frontend);
    await target.evaluate('go();');
    await additionalFilesPromise;

    const capturedFileNames = await retrieveSourceFilesAdded(frontend);
    assert.deepEqual(capturedFileNames, ['/test/e2e/resources/sources/wasm/global_variable.wasm', '/source_file.c']);
  });


  // Resolve a single code offset to a source line to test the correctness of offset computations.
  // Disabled to the Chromium binary -> DevTools roller working again.
  it('use correct code offsets to interpret raw locations', async () => {
    const {frontend} = getBrowserAndPages();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await frontend.evaluate(() => globalThis.installExtensionPlugin((extensionServerClient: any, extensionAPI: any) => {
      class LocationMappingPlugin {
        _modules: Map<string, string>;
        constructor() {
          this._modules = new Map();
        }

        async addRawModule(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rawModuleId: any, symbols: any, rawModule: any) {  // eslint-disable-line @typescript-eslint/no-unused-vars
          this._modules.set(rawModuleId.url, rawModule.url);
          const fileUrl = new URL('unreachable.ll', rawModule.url);
          return [fileUrl.href];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async rawLocationToSourceLocation(rawLocation: any) {
          if (rawLocation.codeOffset === 6) {
            const moduleUrl = this._modules.get(rawLocation.rawModuleId);
            const sourceFile = new URL('unreachable.ll', moduleUrl);
            return [{sourceFileURL: sourceFile.href, lineNumber: 5, columnNumber: 2}];
          }
          return null;
        }
      }

      RegisterExtension(
          extensionAPI, new LocationMappingPlugin(), 'Location Mapping',
          {language: 'WebAssembly', symbol_types: ['None']});
    }));

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor('.paused-status');

    const callFrameLoc = await waitFor('.call-frame-location');
    const scriptLocation = await callFrameLoc.evaluate(location => location.textContent);
    assert.deepEqual(scriptLocation, 'unreachable.ll:6');
  });

  // Resolve the location for a breakpoint.
  it('resolve locations for breakpoints correctly', async () => {
    const {target, frontend} = getBrowserAndPages();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await frontend.evaluate(() => globalThis.installExtensionPlugin((extensionServerClient: any, extensionAPI: any) => {
      // This plugin will emulate a source mapping with a single file and a single corresponding source line and byte
      // code offset pair.
      class LocationMappingPlugin {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceLocation: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawLocationRange: any;
        async addRawModule(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rawModuleId: any, symbols: any, rawModule: any) {  // eslint-disable-line @typescript-eslint/no-unused-vars
          this.sourceLocation = {
            sourceFileURL: new URL('global_variable.ll', rawModule.url).href,
            lineNumber: 8,
            columnNumber: 0,
          };
          this.rawLocationRange = {rawModuleId: rawModuleId.url, startOffset: 25, endOffset: 26};
          return [this.sourceLocation.sourceFileURL];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async rawLocationToSourceLocation(rawLocation: any) {
          if (rawLocation.rawModuleId === this.rawLocationRange.rawModuleId &&
              rawLocation.codeOffset === this.rawLocationRange.startOffset) {
            return [this.sourceLocation];
          }
          return null;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async sourceLocationToRawLocation(sourceLocation: any) {
          if (sourceLocation.sourceFileURL === this.sourceLocation.sourceFileURL &&
              sourceLocation.lineNumber === this.sourceLocation.lineNumber) {
            return [this.rawLocationRange];
          }
          return null;
        }
      }

      RegisterExtension(
          extensionAPI, new LocationMappingPlugin(), 'Location Mapping',
          {language: 'WebAssembly', symbol_types: ['None']});
    }));

    await openFileInSourcesPanel('wasm/global_variable.html');
    await target.evaluate('go();');
    await openFileInEditor('global_variable.ll');
    await addBreakpointForLine(frontend, 9);

    const scriptLocation = await retrieveTopCallFrameScriptLocation('main();', target);
    assert.deepEqual(scriptLocation, 'global_variable.ll:9');
  });

  it('shows top-level and nested variables', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluateHandle(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => globalThis.installExtensionPlugin((extensionServerClient: any, extensionAPI: any) => {
          class VariableListingPlugin {
            _modules: Map<string, string>;
            evaluatedVariables: Array<string>;
            constructor() {
              this._modules = new Map();
              this.evaluatedVariables = [];
            }

            async addRawModule(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rawModuleId: any, symbols: any,  // eslint-disable-line @typescript-eslint/no-unused-vars
                rawModule: any) {                // eslint-disable-line @typescript-eslint/no-explicit-any
              this._modules.set(rawModuleId.url, rawModule.url);
              const fileUrl = new URL('unreachable.ll', rawModule.url);
              return [fileUrl.href];
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async rawLocationToSourceLocation(rawLocation: any) {
              if (rawLocation.codeOffset === 6) {
                const moduleUrl = this._modules.get(rawLocation.rawModuleId);
                const sourceFile = new URL('unreachable.ll', moduleUrl);
                return [{sourceFileURL: sourceFile.href, lineNumber: 5, columnNumber: 2}];
              }
              return null;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async listVariablesInScope(rawLocation: any) {  // eslint-disable-line @typescript-eslint/no-unused-vars
              return [
                {scope: 'LOCAL', name: 'localX', type: 'int'},
                {scope: 'GLOBAL', name: 'n1::n2::globalY', nestedName: ['n1', 'n2', 'globalY'], type: 'float'},
              ];
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async evaluateVariable(name: any, location: any) {  // eslint-disable-line @typescript-eslint/no-unused-vars
              console.error(`Test was not supposed to evaluate ${name}`);
            }
          }

          RegisterExtension(
              extensionAPI, new VariableListingPlugin(), 'Location Mapping',
              {language: 'WebAssembly', symbol_types: ['None']});
        }));

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    const locals = await getValuesForScope('LOCAL');
    assert.deepEqual(locals, ['localX: int']);
    const globals = await getValuesForScope('GLOBAL', 2);
    assert.deepEqual(globals, ['n1: namespace', 'n2: namespace', 'globalY: float']);
  });
});
