// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import {expectError} from '../../conductor/events.js';
import {
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  getCurrentConsoleMessages,
  getStructuredConsoleMessages,
} from '../../e2e/helpers/console-helpers.js';
import {checkIfTabExistsInDrawer} from '../../e2e/helpers/cross-tool-helper.js';
import {loadExtension} from '../../e2e/helpers/extension-helpers.js';
import {
  captureAddedSourceFiles,
  DEBUGGER_PAUSED_EVENT,
  getCallFrameLocations,
  getCallFrameNames,
  getNonBreakableLines,
  getValuesForScope,
  type LabelMapping,
  openFileInEditor,
  openSourcesPanel,
  PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR,
  RESUME_BUTTON,
  retrieveTopCallFrameWithoutResuming,
  stepOver,
  switchToCallFrame,
  WasmLocationLabels,
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const DEVELOPER_RESOURCES_TAB_SELECTOR = '#tab-developer-resources';
declare global {
  let chrome: Chrome.DevTools.Chrome;
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Module: {instance: WebAssembly.Instance};
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
declare function RegisterExtension(
    pluginImpl: Partial<Chrome.DevTools.LanguageExtensionPlugin>, name: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    supportedScriptTypes: {language: string, symbol_types: string[]}): void;

function goToWasmResource(
    moduleName: string, options: {autoLoadModule?: boolean, runFunctionAfterLoad?: string} = {},
    inspectedPage: InspectedPage): Promise<void> {
  const queryParams = [`module=${moduleName}`];
  if (!options.autoLoadModule) {
    queryParams.push('defer=1');
  }
  if (options.runFunctionAfterLoad) {
    queryParams.push(`autorun=${options.runFunctionAfterLoad}`);
  }
  return inspectedPage.goToResource(`extensions/wasm_module.html?${queryParams.join('&')}`);
}

/**
 * We need a dummy external DWARF file such that DevTools uses the mock extensions
 * for debugging the WebAssembly.
 **/
async function addDummyExternalDWARFInfo(wasmFile: string, devToolsPage: DevToolsPage) {
  await openFileInEditor(wasmFile, devToolsPage);
  await devToolsPage.click('aria/Code editor', {clickOptions: {button: 'right'}});
  await devToolsPage.click('aria/Add DWARF debug info…');
  await devToolsPage.waitFor('.add-source-map');
  await devToolsPage.typeText('dummy-external-file');
  await devToolsPage.pressKey('Enter');
}

// This testcase reaches into DevTools internals to install the extension plugin. At this point, there is no sensible
// alternative, because loading a real extension is not supported in our test setup.
describe('The Debugger Language Plugins', () => {
  setup({dockingMode: 'undocked'});

  // Load a simple wasm file and verify that the source file shows up in the file tree.
  it('can show C filenames after loading the module', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess*/ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      /** A simple plugin that resolves to a single source file **/
      class SingleFilePlugin {
        async addRawModule(_rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          const fileUrl = new URL('/source_file.c', rawModule.url || symbols);
          return [fileUrl.href];
        }
      }

      RegisterExtension(
          new SingleFilePlugin(), 'Single File', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await goToWasmResource('/test/e2e/resources/extensions/global_variable.wasm', undefined, inspectedPage);
    await openSourcesPanel(devToolsPage);

    const capturedFileNames = captureAddedSourceFiles(2, async () => {
      await inspectedPage.evaluate('loadModule();');
    }, devToolsPage);
    await addDummyExternalDWARFInfo('global_variable.wasm', devToolsPage);

    assert.deepEqual(await capturedFileNames, [
      '/test/e2e/resources/extensions/global_variable.wasm',
      '/source_file.c',
    ]);
  });

  // Resolve a single code offset to a source line to test the correctness of offset computations.
  it('use correct code offsets to interpret raw locations', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    const locationLabels = WasmLocationLabels.load(
        'extensions/unreachable.wat', 'extensions/unreachable.wasm', devToolsPage, inspectedPage);
    await extension.evaluate((mappings: LabelMapping[]) => {
      class LocationMappingPlugin {
        private module: undefined|{rawModuleId: string, sourceFileURL: string} = undefined;

        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          if (this.module) {
            throw new Error('Expected only one module');
          }
          const sourceFileURL = new URL('unreachable.wat', rawModule.url || symbols).href;
          this.module = {rawModuleId, sourceFileURL};
          return [sourceFileURL];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation) {
          if (this.module) {
            const {rawModuleId, sourceFileURL} = this.module;
            if (rawModuleId === rawLocation.rawModuleId) {
              const mapping = mappings.find(m => rawLocation.codeOffset === m.bytecode);
              if (mapping) {
                return [{rawModuleId, sourceFileURL, lineNumber: mapping.sourceLine - 1, columnNumber: -1}];
              }
            }
          }
          return [];
        }
      }
      RegisterExtension(
          new LocationMappingPlugin(), 'Location Mapping', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    }, locationLabels.getMappingsForPlugin());

    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);

    await goToWasmResource('unreachable.wasm', {runFunctionAfterLoad: 'Main', autoLoadModule: true}, inspectedPage);
    await addDummyExternalDWARFInfo('unreachable.wasm', devToolsPage);
    await devToolsPage.waitFor('.paused-status');

    const pauseLocation = await locationLabels.checkLocationForLabel('PAUSED(unreachable)');

    await devToolsPage.click(RESUME_BUTTON);
    const error = await devToolsPage.waitForFunction(async () => {
      const messages = await getStructuredConsoleMessages(devToolsPage);
      return messages.find(message => message.message?.startsWith('Uncaught (in promise) RuntimeError: unreachable'));
    });
    const callframes = error.message?.split('\n').slice(1);
    assert.deepEqual(callframes, [
      `    at Main (unreachable.wat:${pauseLocation.sourceLine})`,
      '    at window.loadModule (wasm_module.html?mod…&autorun=Main:24:46)',
    ]);
  });

  // Resolve the location for a breakpoint.
  it('resolve locations for breakpoints correctly', async ({devToolsPage, inspectedPage}) => {
    const locationLabels = WasmLocationLabels.load(
        'extensions/global_variable.wat', 'extensions/global_variable.wasm', devToolsPage, inspectedPage);
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate((mappings: LabelMapping[]) => {
      /**
       * This plugin will emulate a source mapping with a single file and a single corresponding source line and byte
       * code offset pair.
       **/
      class LocationMappingPlugin {
        private module: undefined|{rawModuleId: string, sourceFileURL: string} = undefined;

        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          if (this.module) {
            throw new Error('Expected only one module');
          }
          const sourceFileURL = new URL('global_variable.wat', rawModule.url || symbols).href;
          this.module = {rawModuleId, sourceFileURL};
          return [sourceFileURL];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation) {
          if (this.module) {
            const {rawModuleId, sourceFileURL} = this.module;
            if (rawModuleId === rawLocation.rawModuleId) {
              const mapping = mappings.find(m => rawLocation.codeOffset === m.bytecode);
              if (mapping) {
                return [{rawModuleId, sourceFileURL, lineNumber: mapping.sourceLine - 1, columnNumber: -1}];
              }
            }
          }
          return [];
        }

        async sourceLocationToRawLocation(sourceLocation: Chrome.DevTools.SourceLocation):
            Promise<Chrome.DevTools.RawLocationRange[]> {
          if (this.module) {
            const {rawModuleId, sourceFileURL} = this.module;
            if (rawModuleId === sourceLocation.rawModuleId && sourceFileURL === sourceLocation.sourceFileURL) {
              const mapping = mappings.find(m => sourceLocation.lineNumber === m.sourceLine - 1);
              if (mapping) {
                return [{rawModuleId, startOffset: mapping.bytecode, endOffset: mapping.bytecode + 1}];
              }
            }
          }
          return [];
        }

        async getMappedLines(rawModuleIdArg: string, sourceFileURLArg: string) {
          if (this.module) {
            const {rawModuleId, sourceFileURL} = this.module;
            if (rawModuleId === rawModuleIdArg && sourceFileURL === sourceFileURLArg) {
              return Array.from(new Set(mappings.map(m => m.sourceLine - 1)).values()).sort();
            }
          }
          return undefined;
        }
      }

      RegisterExtension(
          new LocationMappingPlugin(), 'Location Mapping', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    }, locationLabels.getMappingsForPlugin());

    await goToWasmResource(
        '/test/e2e/resources/extensions/global_variable.wasm', {autoLoadModule: true}, inspectedPage);
    await openSourcesPanel(devToolsPage);
    await addDummyExternalDWARFInfo('global_variable.wasm', devToolsPage);
    await openFileInEditor('global_variable.wat', devToolsPage);

    const toolbarLink = await devToolsPage.waitFor('devtools-toolbar .devtools-link');
    const toolbarLinkText = await toolbarLink.evaluate(({textContent}) => textContent);
    assert.strictEqual(toolbarLinkText, 'global_variable.wasm');

    assert.isNotEmpty(await getNonBreakableLines(devToolsPage));

    await locationLabels.setBreakpointInSourceAndRun('BREAK(return)', 'Module.instance.exports.Main();');
  });

  it('shows top-level and nested variables', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluateHandle(() => {
      class VariableListingPlugin {
        private modules = new Map<
            string,
            {rawLocationRange?: Chrome.DevTools.RawLocationRange, sourceLocation?: Chrome.DevTools.SourceLocation}>();

        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
          this.modules.set(rawModuleId, {
            rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
            sourceLocation: {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
          });
          return [sourceFileURL];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange, sourceLocation} = this.modules.get(rawLocation.rawModuleId) || {};
          if (rawLocationRange && sourceLocation && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return [sourceLocation];
          }
          return [];
        }

        async getScopeInfo(type: string) {
          return {type, typeName: type};
        }

        async listVariablesInScope(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange} = this.modules.get(rawLocation.rawModuleId) || {};
          if (rawLocationRange && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return [
              {scope: 'LOCAL', name: 'localX', type: 'int'},
              {scope: 'GLOBAL', name: 'n1::n2::globalY', nestedName: ['n1', 'n2', 'globalY'], type: 'float'},
            ];
          }
          return [];
        }
      }

      RegisterExtension(
          new VariableListingPlugin(), 'Location Mapping', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);
    await inspectedPage.goToResource('sources/wasm/unreachable.html');
    await addDummyExternalDWARFInfo('unreachable.wasm', devToolsPage);
    await devToolsPage.waitFor(RESUME_BUTTON);

    const locals = await getValuesForScope('LOCAL', 0, 1, devToolsPage);
    assert.deepEqual(locals, ['localX: undefined']);
    const globals = await getValuesForScope('GLOBAL', 2, 3, devToolsPage);
    assert.deepEqual(globals, ['n1: namespace', 'n2: namespace', 'globalY: undefined']);
  });

  it('shows inline frames', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      class InliningPlugin {
        private modules = new Map<string, {
          rawLocationRange?: Chrome.DevTools.RawLocationRange,
          sourceLocations?: Chrome.DevTools.SourceLocation[],
        }>();

        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
          this.modules.set(rawModuleId, {
            rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
            sourceLocations: [
              {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
              {rawModuleId, sourceFileURL, lineNumber: 10, columnNumber: 2},
              {rawModuleId, sourceFileURL, lineNumber: 15, columnNumber: 2},
            ],
          });
          return [sourceFileURL];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange, sourceLocations} = this.modules.get(rawLocation.rawModuleId) || {};
          if (rawLocationRange && sourceLocations && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return [sourceLocations[rawLocation.inlineFrameIndex || 0]];
          }
          return [];
        }

        async getFunctionInfo(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange} = this.modules.get(rawLocation.rawModuleId) || {};
          if (rawLocationRange && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return {frames: [{name: 'inner_inline_func'}, {name: 'outer_inline_func'}, {name: 'Main'}]};
          }
          return {frames: []};
        }

        async getScopeInfo(type: string) {
          return {type, typeName: type};
        }

        async listVariablesInScope(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange} = this.modules.get(rawLocation.rawModuleId) || {};
          const frame = rawLocation.inlineFrameIndex || 0;
          if (rawLocationRange && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return [
              {scope: 'LOCAL', name: `localX${frame}`, type: 'int'},
            ];
          }
          return [];
        }
      }

      RegisterExtension(new InliningPlugin(), 'Inlining', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);
    await inspectedPage.goToResource('sources/wasm/unreachable.html');
    await devToolsPage.waitFor(RESUME_BUTTON);
    await addDummyExternalDWARFInfo('unreachable.wasm', devToolsPage);

    // Call stack shows inline function names and source locations.
    let funcNames: string[] = [];
    await devToolsPage.waitForFunction(async () => {
      funcNames = await getCallFrameNames(devToolsPage);
      return funcNames.length === 6;
    });
    assert.deepEqual(funcNames, ['inner_inline_func', 'outer_inline_func', 'Main', 'go', 'await in go', '(anonymous)']);
    const sourceLocations = await getCallFrameLocations(devToolsPage);
    assert.deepEqual(
        sourceLocations,
        ['unreachable.ll:6', 'unreachable.ll:11', 'unreachable.ll:16', 'unreachable.html:27', 'unreachable.html:30']);

    // We see variables for innermost frame.
    assert.deepEqual(await getValuesForScope('LOCAL', 0, 1, devToolsPage), ['localX0: undefined']);

    // Switching frames affects what variables we see.
    await switchToCallFrame(2, devToolsPage);
    assert.deepEqual(await getValuesForScope('LOCAL', 0, 1, devToolsPage), ['localX1: undefined']);

    await switchToCallFrame(3, devToolsPage);
    assert.deepEqual(await getValuesForScope('LOCAL', 0, 1, devToolsPage), ['localX2: undefined']);

    await devToolsPage.click(RESUME_BUTTON);
    await devToolsPage.waitForFunction(async () => {
      const messages = await getStructuredConsoleMessages(devToolsPage);
      if (!messages.length) {
        return false;
      }
      const message = messages[messages.length - 1];
      return message.message === `Uncaught (in promise) RuntimeError: unreachable
    at inner_inline_func (unreachable.ll:6)
    at outer_inline_func (unreachable.ll:11)
    at Main (unreachable.ll:16)
    at go (unreachable.html:27:29)`;
    });
  });

  it('falls back to wasm function names when inline info not present', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      class InliningPlugin {
        private modules = new Map<string, {
          rawLocationRange?: Chrome.DevTools.RawLocationRange,
          sourceLocations?: Chrome.DevTools.SourceLocation[],
        }>();

        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
          this.modules.set(rawModuleId, {
            rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
            sourceLocations: [
              {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
            ],
          });
          return [sourceFileURL];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange, sourceLocations} = this.modules.get(rawLocation.rawModuleId) || {};
          if (rawLocationRange && sourceLocations && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return [sourceLocations[rawLocation.inlineFrameIndex || 0]];
          }
          return [];
        }

        async getFunctionInfo(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange} = this.modules.get(rawLocation.rawModuleId) || {};
          if (rawLocationRange && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return {frames: []};
          }
          return {frames: []};
        }

        async getScopeInfo(type: string) {
          return {type, typeName: type};
        }

        async listVariablesInScope(_rawLocation: Chrome.DevTools.RawLocation) {
          return [];
        }
      }

      RegisterExtension(new InliningPlugin(), 'Inlining', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);
    await inspectedPage.goToResource('sources/wasm/unreachable.html');
    await addDummyExternalDWARFInfo('unreachable.wasm', devToolsPage);
    await devToolsPage.waitFor(RESUME_BUTTON);
    // TODO: it should actually wait for rendering to finish.
    await devToolsPage.drainTaskQueue();

    // Call stack shows inline function names and source locations.
    const funcNames = await getCallFrameNames(devToolsPage);
    assert.deepEqual(funcNames, ['$Main', 'go', 'await in go', '(anonymous)']);
    const sourceLocations = await getCallFrameLocations(devToolsPage);
    assert.deepEqual(sourceLocations, ['unreachable.ll:6', 'unreachable.html:27', 'unreachable.html:30']);
  });

  it('shows a warning when no debug info is present', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      class MissingInfoPlugin {
        async addRawModule() {
          return {missingSymbolFiles: ['test.wasm']};
        }
      }

      RegisterExtension(
          new MissingInfoPlugin(), 'MissingInfo', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);
    await inspectedPage.goToResource('sources/wasm/unreachable.html');
    await devToolsPage.waitFor(RESUME_BUTTON);
    await addDummyExternalDWARFInfo('unreachable.wasm', devToolsPage);

    const incompleteMessage =
        `Failed to load any debug info for ${inspectedPage.getResourcesPath()}/sources/wasm/unreachable.wasm`;
    const infoBar = await devToolsPage.waitFor(`.infobar-error[aria-label="${incompleteMessage}"`);
    const details = await devToolsPage.waitFor('.infobar-details-rows', infoBar);
    const text = await details.evaluate(e => e.textContent);
    assert.deepEqual(text, 'Failed to load debug file "test.wasm".');

    const banners = await devToolsPage.$$('.call-frame-warnings-message');
    const bannerTexts = await Promise.all(banners.map(e => e.evaluate(e => e.textContent)));
    assert.include(bannerTexts, 'Some call frames have warnings');

    const selectedCallFrame = await devToolsPage.waitFor('.call-frame-item[aria-selected="true"]');
    const warning = await devToolsPage.waitFor('.call-frame-warning-icon', selectedCallFrame);
    const title = await warning.evaluate(e => e.getAttribute('title'));
    assert.deepEqual(title, 'No debug information for function "$Main"');
  });

  it('shows warnings when function info not present', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      class MissingInfoPlugin {
        private modules = new Map<string, {
          rawLocationRange?: Chrome.DevTools.RawLocationRange,
          sourceLocations?: Chrome.DevTools.SourceLocation[],
        }>();

        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
          this.modules.set(rawModuleId, {
            rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
            sourceLocations: [
              {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
            ],
          });
          return [sourceFileURL];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange, sourceLocations} = this.modules.get(rawLocation.rawModuleId) || {};
          if (rawLocationRange && sourceLocations && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return [sourceLocations[rawLocation.inlineFrameIndex || 0]];
          }
          return [];
        }

        async getFunctionInfo() {
          return {missingSymbolFiles: ['test.dwo']};
        }

        async getScopeInfo(type: string) {
          return {type, typeName: type};
        }

        async listVariablesInScope(_rawLocation: Chrome.DevTools.RawLocation) {
          return [];
        }
      }

      RegisterExtension(
          new MissingInfoPlugin(), 'MissingInfo', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);
    await inspectedPage.goToResource('sources/wasm/unreachable.html');
    await addDummyExternalDWARFInfo('unreachable.wasm', devToolsPage);
    await devToolsPage.waitFor(RESUME_BUTTON);

    const incompleteMessage = 'The debug information for function $Main is incomplete';
    const infoBar = await devToolsPage.waitFor(`.infobar-error[aria-label="${incompleteMessage}"`);
    const details = await devToolsPage.waitFor('.infobar-details-rows', infoBar);
    const text = await details.evaluate(e => e.textContent);
    assert.deepEqual(text, 'Failed to load debug file "test.dwo".');

    const banners = await devToolsPage.$$('.call-frame-warnings-message');
    const bannerTexts = await Promise.all(banners.map(e => e.evaluate(e => e.textContent)));
    assert.include(bannerTexts, 'Some call frames have warnings');

    const selectedCallFrame = await devToolsPage.waitFor('.call-frame-item[aria-selected="true"]');
    const warning = await devToolsPage.waitFor('.call-frame-warning-icon', selectedCallFrame);
    const title = await warning.evaluate(e => e.getAttribute('title'));
    assert.deepEqual(title, `${incompleteMessage}\n${text}`);
  });

  it('connects warnings to the developer resource panel', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      class MissingInfoPlugin {
        async addRawModule() {
          await chrome.devtools.languageServices.reportResourceLoad(
              'http://test.com/test.dwo', {success: false, errorMessage: '404'});
          return [];
        }

        async getFunctionInfo() {
          return {missingSymbolFiles: ['http://test.com/test.dwo']};
        }
      }

      RegisterExtension(
          new MissingInfoPlugin(), 'MissingInfo', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);
    await inspectedPage.goToResource('sources/wasm/unreachable.html');
    await addDummyExternalDWARFInfo('unreachable.wasm', devToolsPage);
    await devToolsPage.waitFor(RESUME_BUTTON);

    const incompleteMessage = 'The debug information for function $Main is incomplete';
    const infoBar = await devToolsPage.waitFor(`.infobar-error[aria-label="${incompleteMessage}"`);

    await devToolsPage.click('summary', {root: infoBar});
    assert.deepEqual(await devToolsPage.getTextContent('devtools-button', infoBar), 'Show request');
    await devToolsPage.click('devtools-button', {root: infoBar});

    await checkIfTabExistsInDrawer(DEVELOPER_RESOURCES_TAB_SELECTOR, devToolsPage);

    const resourcesGrid = await devToolsPage.waitFor('.developer-resource-view-results');
    const selectedReportedResource = await devToolsPage.waitFor('.data-grid-data-grid-node.selected', resourcesGrid);
    const selectedDetails = await devToolsPage.getAllTextContents('td', selectedReportedResource);

    const dwoUrl = 'http://test.com/test.dwo';
    assert.deepEqual(selectedDetails, [
      'failure',
      dwoUrl,
      inspectedPage.domain('extensions.test'),
      '',
      '',
      '404',
      '',
    ]);
  });

  it('shows variable values with the evaluate API', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      class EvalPlugin {
        private modules = new Map<
            string,
            {rawLocationRange?: Chrome.DevTools.RawLocationRange, sourceLocation?: Chrome.DevTools.SourceLocation}>();

        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
          this.modules.set(rawModuleId, {
            rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
            sourceLocation: {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
          });
          return [sourceFileURL];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange, sourceLocation} = this.modules.get(rawLocation.rawModuleId) || {};
          if (rawLocationRange && sourceLocation && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return [sourceLocation];
          }
          return [];
        }

        async listVariablesInScope(_rawLocation: Chrome.DevTools.RawLocation) {
          return [{scope: 'LOCAL', name: 'local', type: 'TestType'}];
        }

        async getScopeInfo(type: string) {
          return {type, typeName: type};
        }

        async evaluate(expression: string, _context: Chrome.DevTools.RawLocation, _stopId: unknown):
            Promise<Chrome.DevTools.RemoteObject|null> {
          if (expression !== 'local') {
            return null;
          }
          return {
            type: 'object',
            description: 'TestType',
            objectId: 'TestType',
            hasChildren: true,
          };
        }

        async getProperties(objectId: string): Promise<Chrome.DevTools.PropertyDescriptor[]> {
          if (objectId === 'TestType') {
            return [{
              name: 'member',
              value: {
                type: 'object',
                description: 'TestTypeMember',
                objectId: 'TestTypeMember',
                hasChildren: true,
              },
            }];
          }
          if (objectId === 'TestTypeMember') {
            return [{
              name: 'member2',
              value: {
                type: 'object',
                description: 'TestTypeMember2',
                objectId: 'TestTypeMember2',
                hasChildren: true,
              },
            }];
          }
          if (objectId === 'TestTypeMember2') {
            return [
              {
                name: 'recurse',
                value: {
                  type: 'number',
                  description: '27',
                  value: 27,
                  hasChildren: false,
                },
              },
              {
                name: 'value',
                value: {
                  type: 'number',
                  description: '26',
                  value: 26,
                  hasChildren: false,
                },
              },
            ];
          }
          return [];
        }

        async releaseObject(objectId: string): Promise<void> {
          if (objectId !== 'TestType' && objectId !== 'TestTypeMember' && objectId !== 'TestTypeMember2') {
            throw new Error(`Invalid object id ${objectId}`);
          }
        }
      }

      RegisterExtension(new EvalPlugin(), 'Evaluation', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);
    await inspectedPage.goToResource('sources/wasm/unreachable.html');
    await addDummyExternalDWARFInfo('unreachable.wasm', devToolsPage);
    await devToolsPage.waitFor(RESUME_BUTTON);

    const locals = await getValuesForScope('LOCAL', 3, 5, devToolsPage);
    assert.deepEqual(locals, [
      'local: TestType',
      'member: TestTypeMember',
      'member2: TestTypeMember2',
      'recurse: 27',
      'value: 26',
    ]);
  });

  it('shows variable value in popover', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      class VariableListingPlugin {
        private modules = new Map<
            string,
            {rawLocationRange?: Chrome.DevTools.RawLocationRange, sourceLocation?: Chrome.DevTools.SourceLocation}>();

        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
          this.modules.set(rawModuleId, {
            rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
            sourceLocation: {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
          });
          return [sourceFileURL];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange, sourceLocation} = this.modules.get(rawLocation.rawModuleId) || {};
          if (rawLocationRange && sourceLocation && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return [sourceLocation];
          }
          return [];
        }

        async getScopeInfo(type: string) {
          return {type, typeName: type};
        }

        async listVariablesInScope(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange} = this.modules.get(rawLocation.rawModuleId) || {};
          const {codeOffset} = rawLocation;
          if (!rawLocationRange || rawLocationRange.startOffset > codeOffset ||
              rawLocationRange.endOffset <= codeOffset) {
            return [];
          }

          // The source code is LLVM IR so there are no meaningful variable names. Most tokens are however
          // identified as js-variable tokens by codemirror, so we can pretend they're variables. The unreachable
          // instruction is where we pause at, so it's really easy to find in the page and is a great mock variable
          // candidate.
          return [{scope: 'LOCAL', name: 'unreachable', type: 'int'}];
        }

        evaluate(expression: string, _context: Chrome.DevTools.RawLocation, _stopId: unknown):
            Promise<Chrome.DevTools.RemoteObject|null> {
          if (expression === 'unreachable') {
            return Promise.resolve({type: 'number', value: 23, description: '23', hasChildren: false});
          }
          return Promise.resolve(null);
        }
      }

      RegisterExtension(
          new VariableListingPlugin(), 'Location Mapping', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);
    await inspectedPage.goToResource('sources/wasm/unreachable.html');
    await addDummyExternalDWARFInfo('unreachable.wasm', devToolsPage);
    await devToolsPage.waitFor(RESUME_BUTTON);
    await openFileInEditor('unreachable.ll', devToolsPage);

    const pausedPosition = await devToolsPage.waitForFunction(async () => {
      const element = await devToolsPage.$('.cm-executionToken');
      if (element && await element.evaluate(e => e.isConnected)) {
        return element;
      }
      return undefined;
    });
    await pausedPosition.hover();
    const popover = await devToolsPage.waitFor('[data-stable-name-for-test="object-popover-content"]');
    const value =
        await devToolsPage.waitFor('.object-value-number', popover).then(e => e.evaluate(node => node.textContent));
    assert.strictEqual(value, '23');
  });

  it('shows sensible error messages.', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      class FormattingErrorsPlugin {
        private modules = new Map<
            string,
            {rawLocationRange?: Chrome.DevTools.RawLocationRange, sourceLocation?: Chrome.DevTools.SourceLocation}>();

        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          const sourceFileURL = new URL('unreachable.ll', rawModule.url || symbols).href;
          this.modules.set(rawModuleId, {
            rawLocationRange: {rawModuleId, startOffset: 6, endOffset: 7},
            sourceLocation: {rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: 2},
          });
          return [sourceFileURL];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange, sourceLocation} = this.modules.get(rawLocation.rawModuleId) || {};
          if (rawLocationRange && sourceLocation && rawLocationRange.startOffset <= rawLocation.codeOffset &&
              rawLocation.codeOffset < rawLocationRange.endOffset) {
            return [sourceLocation];
          }
          return [];
        }

        async getScopeInfo(type: string) {
          return {type, typeName: type};
        }

        async listVariablesInScope(rawLocation: Chrome.DevTools.RawLocation) {
          const {rawLocationRange} = this.modules.get(rawLocation.rawModuleId) || {};
          const {codeOffset} = rawLocation;
          if (!rawLocationRange || rawLocationRange.startOffset > codeOffset ||
              rawLocationRange.endOffset <= codeOffset) {
            console.error('foobar');
            return [];
          }

          return [{scope: 'LOCAL', name: 'unreachable', type: 'int'}];
        }

        async evaluate(expression: string, _context: Chrome.DevTools.RawLocation, _stopId: unknown):
            Promise<Chrome.DevTools.RemoteObject|null> {
          if (expression === 'foo') {
            return {type: 'number', value: 23, description: '23', hasChildren: false};
          }
          throw new Error(`No typeinfo for ${expression}`);
        }
      }

      RegisterExtension(
          new FormattingErrorsPlugin(), 'Formatter Errors', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(PAUSE_ON_UNCAUGHT_EXCEPTION_SELECTOR);
    await inspectedPage.goToResource('sources/wasm/unreachable.html');
    await addDummyExternalDWARFInfo('unreachable.wasm', devToolsPage);
    await devToolsPage.waitFor(RESUME_BUTTON);
    const locals = await getValuesForScope('LOCAL', 0, 1, devToolsPage);
    assert.deepEqual(locals, ['unreachable: undefined']);

    const watchPane = await devToolsPage.waitFor('[aria-label="Watch"]');
    const isExpanded = await watchPane.evaluate(element => {
      return element.getAttribute('aria-expanded') === 'true';
    });
    if (!isExpanded) {
      await devToolsPage.click('.title-expand-icon', {root: watchPane});
    }

    await devToolsPage.click('[aria-label="Add watch expression"]');
    await devToolsPage.waitFor('.watch-expression-editing');
    await devToolsPage.pasteText('foo');
    await devToolsPage.page.keyboard.press('Enter');
    await devToolsPage.waitForNone('.watch-expression-editing');

    await devToolsPage.click('[aria-label="Add watch expression"]');
    await devToolsPage.waitFor('.watch-expression-editing');
    await devToolsPage.pasteText('bar');
    await devToolsPage.page.keyboard.press('Enter');
    await devToolsPage.waitForNone('.watch-expression-editing');

    const watchResults = await devToolsPage.waitForMany('.watch-expression', 2);
    const watchTexts = await devToolsPage.waitForFunction(async () => {
      const texts = await Promise.all(watchResults.map(async watch => await watch.evaluate(e => e.textContent)));
      return texts.every(t => t?.length) ? texts : null;
    });
    assert.deepEqual(watchTexts, ['foo: 23', 'bar: <not available>']);

    const tooltipText = await watchResults[1].evaluate(e => {
      const errorElement = e.querySelector('.watch-expression-error');
      if (!errorElement) {
        return 'NO ERROR COULD BE FOUND';
      }
      return errorElement.getAttribute('title');
    });
    assert.strictEqual(tooltipText, 'No typeinfo for bar');

    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await devToolsPage.pasteText('bar');
    await devToolsPage.page.keyboard.press('Enter');

    // Wait for the console to be usable again.
    await devToolsPage.page.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    const messages = await getCurrentConsoleMessages(undefined, undefined, undefined, devToolsPage);
    assert.deepEqual(messages.filter(m => !m.startsWith('[Formatter Errors]')), ['Uncaught No typeinfo for bar']);
  });

  it('can access wasm data directly', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      class WasmDataExtension {
        async addRawModule(_rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          const sourceFileURL = new URL('can_access_wasm_data.wat', rawModule.url || symbols).href;
          return [sourceFileURL];
        }
      }

      RegisterExtension(
          new WasmDataExtension(), 'Wasm Data', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await goToWasmResource('can_access_wasm_data.wasm', {autoLoadModule: true}, inspectedPage);
    await openSourcesPanel(devToolsPage);
    await addDummyExternalDWARFInfo('can_access_wasm_data.wasm', devToolsPage);

    await inspectedPage.evaluate(
        () => new Uint8Array((window.Module.instance.exports.memory as WebAssembly.Memory).buffer)
                  .set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 0));

    const locationLabels = WasmLocationLabels.load(
        'extensions/can_access_wasm_data.wat', 'extensions/can_access_wasm_data.wasm', devToolsPage, inspectedPage);
    await locationLabels.setBreakpointInWasmAndRun(
        'BREAK(can_access_wasm_data)', 'window.Module.instance.exports.exported_func(4n)');

    const mem = await extension.evaluate(async () => {
      const buffer = await chrome.devtools.languageServices.getWasmLinearMemory(0, 10, 0n);
      if (buffer instanceof ArrayBuffer) {
        return Array.from(new Uint8Array(buffer));
      }
      throw new Error('Expected an ArrayBuffer');
    });
    assert.deepEqual(mem, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const global = await extension.evaluate(() => chrome.devtools.languageServices.getWasmGlobal(0, 0n));
    assert.deepEqual(global, {type: 'i32', value: 0xdad});

    const local = await extension.evaluate(async () => {
      const {type, value} = (await chrome.devtools.languageServices.getWasmLocal(0, 0n)) as
          Exclude<Chrome.DevTools.WasmValue, Chrome.DevTools.ForeignObject>;
      // Page#evaluate can't return bigint property values.
      return {type, value: `${value}`, valueType: typeof value};
    });

    assert.deepEqual(local, {type: 'i64', value: '4', valueType: 'bigint'});

    const local2 = await extension.evaluate(() => chrome.devtools.languageServices.getWasmLocal(1, 0n));
    assert.deepEqual(local2, {type: 'i32', value: 0});

    await locationLabels.continueAndCheckForLabel('BREAK(can_access_wasm_data)');

    const expectedError = expectError('Extension server error: Invalid argument stopId: Unknown stop id');
    // The stop id is invalid now:
    const fail = await extension.evaluate(() => chrome.devtools.languageServices.getWasmLocal(1, 0n));
    // FIXME is this the error reporting experience we want?
    assert.deepEqual(fail as unknown, {
      code: 'E_BADARG',
      description: 'Invalid argument %s: %s',
      details: [
        'stopId',
        'Unknown stop id',
      ],
      isError: true,
    });
    assert.isOk(expectedError.caught);

    // TODO(crbug.com/1472241): Find a way to stop the flake by determining the stopid
    // const local2Set = await extension.evaluate(() => chrome.devtools.languageServices.getWasmLocal(1, 1n));
    // assert.deepEqual(local2Set, {type: 'i32', value: 4});
  });

  it('lets users manually attach debug info', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    await extension.evaluate(() => {
      /** A simple plugin that resolves to a single source file **/
      class DWARFSymbolsWithSingleFilePlugin {
        async addRawModule(_rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          if (symbols !== 'foobar81') {
            return [];
          }
          const fileUrl = new URL('/source_file.c', rawModule.url || symbols);
          return [fileUrl.href];
        }
      }

      RegisterExtension(
          new DWARFSymbolsWithSingleFilePlugin(), 'Single File',
          {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    });

    await goToWasmResource('/test/e2e/resources/extensions/global_variable.wasm', undefined, inspectedPage);
    await openSourcesPanel(devToolsPage);

    {
      const capturedFileNames = await captureAddedSourceFiles(1, async () => {
        await inspectedPage.evaluate('loadModule();');
      }, devToolsPage);
      assert.deepEqual(capturedFileNames, ['/test/e2e/resources/extensions/global_variable.wasm']);
    }

    {
      const capturedFileNames = await captureAddedSourceFiles(1, async () => {
        await openFileInEditor('global_variable.wasm', devToolsPage);

        await devToolsPage.click('aria/Code editor', {clickOptions: {button: 'right'}});
        await devToolsPage.click('aria/Add DWARF debug info…');
        await devToolsPage.waitFor('.add-source-map');
        await devToolsPage.typeText('foobar81');
        await devToolsPage.pressKey('Enter');
      }, devToolsPage);

      assert.deepEqual(capturedFileNames, ['/source_file.c']);
    }
  });

  it('does not auto-step for modules without a plugin', async ({devToolsPage, inspectedPage}) => {
    const locationLabels =
        WasmLocationLabels.load('extensions/stepping.wat', 'extensions/stepping.wasm', devToolsPage, inspectedPage);

    await goToWasmResource('stepping.wasm', {autoLoadModule: true}, inspectedPage);
    await openSourcesPanel(devToolsPage);

    await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
    await locationLabels.setBreakpointInWasmAndRun('FIRST_PAUSE', 'window.Module.instance.exports.Main(16)');
    await devToolsPage.waitFor('.paused-status');
    await locationLabels.checkLocationForLabel('FIRST_PAUSE');
    const beforeStepCallFrame = (await retrieveTopCallFrameWithoutResuming(devToolsPage))!.split(':');
    const beforeStepFunctionNames = await getCallFrameNames(devToolsPage);

    await stepOver(devToolsPage);
    const afterStepCallFrame = await devToolsPage.waitForFunction(async () => {
      const callFrame = (await retrieveTopCallFrameWithoutResuming(devToolsPage))?.split(':');
      if (callFrame && (callFrame[0] !== beforeStepCallFrame[0] || callFrame[1] !== beforeStepCallFrame[1])) {
        return callFrame;
      }
      return undefined;
    });
    const afterStepFunctionNames = await getCallFrameNames(devToolsPage);
    // still in the same function:
    assert.deepEqual(beforeStepFunctionNames, afterStepFunctionNames);
    // still in the same module:
    assert.deepEqual(beforeStepCallFrame[0], afterStepCallFrame[0]);
    // moved one instruction:
    assert.deepEqual(parseInt(beforeStepCallFrame[1], 16) + 2, parseInt(afterStepCallFrame[1], 16));
  });

  it('auto-steps over unmapped code correctly', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension(
        'TestExtension', `${inspectedPage.getResourcesPath('extensions.test')}/extensions/language_extensions.html`,
        /* allowFileAccess */ true, devToolsPage, inspectedPage);
    const locationLabels =
        WasmLocationLabels.load('extensions/stepping.wat', 'extensions/stepping.wasm', devToolsPage, inspectedPage);

    await goToWasmResource('stepping.wasm', {autoLoadModule: true}, inspectedPage);
    await openSourcesPanel(devToolsPage);
    await addDummyExternalDWARFInfo('stepping.wasm', devToolsPage);

    // Do this after setting the breakpoint, otherwise the helper gets confused
    await locationLabels.setBreakpointInWasmAndRun('FIRST_PAUSE', 'window.Module.instance.exports.Main(16)');
    await extension.evaluate((mappings: LabelMapping[]) => {
      /**
       * This plugin will emulate a source mapping with a single file and a single corresponding source line and byte
       * code offset pair.
       **/
      class LocationMappingPlugin {
        private module: undefined|{rawModuleId: string, sourceFileURL: string} = undefined;

        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          if (this.module) {
            throw new Error('Expected only one module');
          }
          const sourceFileURL = new URL('stepping.wat', rawModule.url || symbols).href;
          this.module = {rawModuleId, sourceFileURL};
          return [sourceFileURL];
        }

        async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation) {
          if (this.module) {
            const {rawModuleId, sourceFileURL} = this.module;
            if (rawModuleId === rawLocation.rawModuleId) {
              const mapping = mappings.find(m => rawLocation.codeOffset === m.bytecode && m.label !== 'THIRD_PAUSE');
              if (mapping) {
                return [{rawModuleId, sourceFileURL, lineNumber: mapping.sourceLine - 1, columnNumber: -1}];
              }
            }
          }
          return [];
        }

        async sourceLocationToRawLocation(sourceLocation: Chrome.DevTools.SourceLocation):
            Promise<Chrome.DevTools.RawLocationRange[]> {
          if (this.module) {
            const {rawModuleId, sourceFileURL} = this.module;
            if (rawModuleId === sourceLocation.rawModuleId && sourceFileURL === sourceLocation.sourceFileURL) {
              const mapping = mappings.find(m => sourceLocation.lineNumber === m.sourceLine - 1);
              if (mapping) {
                return [{rawModuleId, startOffset: mapping.bytecode, endOffset: mapping.bytecode + 1}];
              }
            }
          }
          return [];
        }

        async getMappedLines(rawModuleIdArg: string, sourceFileURLArg: string) {
          if (this.module) {
            const {rawModuleId, sourceFileURL} = this.module;
            if (rawModuleId === rawModuleIdArg && sourceFileURL === sourceFileURLArg) {
              return Array.from(new Set(mappings.map(m => m.sourceLine - 1)).values()).sort();
            }
          }
          return undefined;
        }
      }

      RegisterExtension(
          new LocationMappingPlugin(), 'Location Mapping', {language: 'WebAssembly', symbol_types: ['ExternalDWARF']});
    }, locationLabels.getMappingsForPlugin());

    await devToolsPage.waitFor('.paused-status');
    await locationLabels.checkLocationForLabel('FIRST_PAUSE');
    await devToolsPage.installEventListener(DEBUGGER_PAUSED_EVENT);
    await stepOver(devToolsPage);
    await locationLabels.checkLocationForLabel('SECOND_PAUSE');
    await stepOver(devToolsPage);
    const pausedLocation = await locationLabels.checkLocationForLabel('THIRD_PAUSE');
    // We're paused at the right location, but let's also check that we're paused in wasm, not the source code:
    const pausedFrame = await retrieveTopCallFrameWithoutResuming(devToolsPage);
    assert.deepEqual(pausedFrame, `stepping.wasm:0x${pausedLocation.moduleOffset.toString(16)}`);
  });
});
