// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import {
  $,
  $$,
  click,
  enableExperiment,
  getBrowserAndPages,
  getResourcesPath,
  goToResource,
  pasteText,
  waitFor,
  waitForFunction,
  waitForMany,
  waitForNone,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getResourcesPathWithDevToolsHostname, loadExtension} from '../helpers/extension-helpers.js';
import {
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  getCurrentConsoleMessages,
  getStructuredConsoleMessages,
} from '../helpers/console-helpers.js';
import type {LabelMapping} from '../helpers/sources-helpers.js';
import {
  getCallFrameLocations,
  getCallFrameNames,
  getNonBreakableLines,
  getValuesForScope,
  listenForSourceFilesAdded,
  openFileInEditor,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  PAUSE_ON_EXCEPTION_BUTTON,
  RESUME_BUTTON,
  retrieveSourceFilesAdded,
  switchToCallFrame,
  waitForAdditionalSourceFiles,
  WasmLocationLabels,
} from '../helpers/sources-helpers.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
declare function RegisterExtension(
    pluginImpl: Partial<Chrome.DevTools.LanguageExtensionPlugin>, name: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    supportedScriptTypes: {language: string, symbol_types: string[]}): void;

// This testcase reaches into DevTools internals to install the extension plugin. At this point, there is no sensible
// alternative, because loading a real extension is not supported in our test setup.
describe('The Debugger Language Plugins', async () => {
  beforeEach(async () => {
    await enableExperiment('wasmDWARFDebugging');
  });

  // Load a simple wasm file and verify that the source file shows up in the file tree.
  it('can show C filenames after loading the module', async () => {
    const {target, frontend} = getBrowserAndPages();
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluate(() => {
      // A simple plugin that resolves to a single source file
      class SingleFilePlugin {
        async addRawModule(rawModuleId: string, symbols: string, rawModule: Chrome.DevTools.RawModule) {
          const fileUrl = new URL('/source_file.c', rawModule.url || symbols);
          return [fileUrl.href];
        }
      }

      RegisterExtension(new SingleFilePlugin(), 'Single File', {language: 'WebAssembly', symbol_types: ['None']});
    });

    await goToResource(
        'extensions/wasm_module.html?module=/test/e2e/resources/extensions/global_variable.wasm&defer=1');
    await openSourcesPanel();
    await listenForSourceFilesAdded(frontend);
    const additionalFilesPromise = waitForAdditionalSourceFiles(frontend);
    await target.evaluate('loadModule();');
    await additionalFilesPromise;

    const capturedFileNames = await retrieveSourceFilesAdded(frontend);
    assert.deepEqual(capturedFileNames, ['/test/e2e/resources/extensions/global_variable.wasm', '/source_file.c']);
  });

  // Resolve a single code offset to a source line to test the correctness of offset computations.
  it('use correct code offsets to interpret raw locations', async () => {
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluate(() => {
      class LocationMappingPlugin {
        private modules:
            Map<string,
                {rawLocationRange?: Chrome.DevTools.RawLocationRange, sourceLocation?: Chrome.DevTools.SourceLocation}>;
        constructor() {
          this.modules = new Map();
        }

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
      }
      RegisterExtension(
          new LocationMappingPlugin(), 'Location Mapping', {language: 'WebAssembly', symbol_types: ['None']});
    });

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor('.paused-status');

    const callFrameLoc = await waitFor('.call-frame-location');
    const scriptLocation = await callFrameLoc.evaluate(location => location.textContent);
    assert.deepEqual(scriptLocation, 'unreachable.ll:6');

    await click(RESUME_BUTTON);
    const error = await waitForFunction(async () => {
      const messages = await getStructuredConsoleMessages();
      return messages.find(message => message.message.startsWith('Uncaught (in promise) RuntimeError: unreachable'));
    });
    const callframes = error.message.split('\n').slice(1);
    assert.deepEqual(callframes, ['    at Main (unreachable.ll:6:3)', '    at go (unreachable.html:27:29)']);
  });

  // Resolve the location for a breakpoint.
  it('resolve locations for breakpoints correctly', async () => {
    const locationLabels = WasmLocationLabels.load('extensions/global_variable.wat', 'extensions/global_variable.wasm');
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluate((mappings: LabelMapping[]) => {
      // This plugin will emulate a source mapping with a single file and a single corresponding source line and byte
      // code offset pair.
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
          new LocationMappingPlugin(), 'Location Mapping', {language: 'WebAssembly', symbol_types: ['None']});
    }, locationLabels.getMappingsForPlugin());

    await goToResource('extensions/wasm_module.html?module=/test/e2e/resources/extensions/global_variable.wasm');
    await openSourcesPanel();
    await openFileInEditor('global_variable.wat');

    const toolbar = await waitFor('.sources-toolbar');
    const itemElements = await waitForMany('.toolbar-item', 2, toolbar);
    const items = await Promise.all(itemElements.map(e => e.evaluate(e => e.textContent)));
    assert.isAtLeast(
        items.indexOf('(provided via debug info by global_variable.wasm)'), 0, 'Toolbar debug info hint not found');

    assert.isNotEmpty(await getNonBreakableLines());

    await locationLabels.setBreakpointInSourceAndRun('BREAK(return)', 'Module.instance.exports.Main();');

    // FIXME(pfaffe) what was the point of this check?
    // await waitForFunction(async () => !(await isBreakpointSet(4)));
  });

  it('shows top-level and nested variables', async () => {
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluateHandle(() => {
      class VariableListingPlugin {
        private modules:
            Map<string,
                {rawLocationRange?: Chrome.DevTools.RawLocationRange, sourceLocation?: Chrome.DevTools.SourceLocation}>;
        constructor() {
          this.modules = new Map();
        }

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
          new VariableListingPlugin(), 'Location Mapping', {language: 'WebAssembly', symbol_types: ['None']});
    });

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    const locals = await getValuesForScope('LOCAL', 0, 1);
    assert.deepEqual(locals, ['localX: undefined']);
    const globals = await getValuesForScope('GLOBAL', 2, 3);
    assert.deepEqual(globals, ['n1: namespace', 'n2: namespace', 'globalY: undefined']);
  });

  it('shows inline frames', async () => {
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluate(() => {
      class InliningPlugin {
        private modules: Map<string, {
          rawLocationRange?: Chrome.DevTools.RawLocationRange,
          sourceLocations?: Chrome.DevTools.SourceLocation[],
        }>;
        constructor() {
          this.modules = new Map();
        }

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

      RegisterExtension(new InliningPlugin(), 'Inlining', {language: 'WebAssembly', symbol_types: ['None']});
    });

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    // Call stack shows inline function names and source locations.
    const funcNames = await getCallFrameNames();
    assert.deepEqual(
        funcNames, ['inner_inline_func', 'outer_inline_func', 'Main', 'go', 'await in go (async)', '(anonymous)']);
    const sourceLocations = await getCallFrameLocations();
    assert.deepEqual(
        sourceLocations,
        ['unreachable.ll:6', 'unreachable.ll:11', 'unreachable.ll:16', 'unreachable.html:27', 'unreachable.html:30']);

    // We see variables for innermost frame.
    assert.deepEqual(await getValuesForScope('LOCAL', 0, 1), ['localX0: undefined']);

    // Switching frames affects what variables we see.
    await switchToCallFrame(2);
    assert.deepEqual(await getValuesForScope('LOCAL', 0, 1), ['localX1: undefined']);

    await switchToCallFrame(3);
    assert.deepEqual(await getValuesForScope('LOCAL', 0, 1), ['localX2: undefined']);

    await click(RESUME_BUTTON);
    await waitForFunction(async () => {
      const messages = await getStructuredConsoleMessages();
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

  it('falls back to wasm function names when inline info not present', async () => {
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluate(() => {
      class InliningPlugin {
        private modules: Map<string, {
          rawLocationRange?: Chrome.DevTools.RawLocationRange,
          sourceLocations?: Chrome.DevTools.SourceLocation[],
        }>;
        constructor() {
          this.modules = new Map();
        }

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

      RegisterExtension(new InliningPlugin(), 'Inlining', {language: 'WebAssembly', symbol_types: ['None']});
    });

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    // Call stack shows inline function names and source locations.
    const funcNames = await getCallFrameNames();
    assert.deepEqual(funcNames, ['$Main', 'go', 'await in go (async)', '(anonymous)']);
    const sourceLocations = await getCallFrameLocations();
    assert.deepEqual(sourceLocations, ['unreachable.ll:6', 'unreachable.html:27', 'unreachable.html:30']);
  });

  it('shows a warning when no debug info is present', async () => {
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluate(() => {
      class MissingInfoPlugin {
        private modules: Map<string, {
          rawLocationRange?: Chrome.DevTools.RawLocationRange,
          sourceLocations?: Chrome.DevTools.SourceLocation[],
        }>;
        constructor() {
          this.modules = new Map();
        }

        async addRawModule() {
          return {missingSymbolFiles: ['test.wasm']};
        }
      }

      RegisterExtension(new MissingInfoPlugin(), 'MissingInfo', {language: 'WebAssembly', symbol_types: ['None']});
    });

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    const incompleteMessage = `Failed to load any debug info for ${getResourcesPath()}/sources/wasm/unreachable.wasm.`;
    const infoBar = await waitFor(`.infobar-error[aria-label="${incompleteMessage}"`);
    const details = await waitFor('.infobar-details-rows', infoBar);
    const text = await details.evaluate(e => e.textContent);
    assert.deepEqual(text, 'Failed to load debug file "test.wasm".');

    const banners = await $$('.ignore-listed-message');
    const bannerTexts = await Promise.all(banners.map(e => e.evaluate(e => e.textContent)));
    assert.include(bannerTexts, 'Some call frames have warnings');

    const selectedCallFrame = await waitFor('.call-frame-item[aria-selected="true"]');
    const warning = await waitFor('.call-frame-warning-icon', selectedCallFrame);
    const title = await warning.evaluate(e => e.getAttribute('title'));
    assert.deepEqual(title, 'No debug information for function "$Main"');
  });

  it('shows warnings when function info not present', async () => {
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluate(() => {
      class MissingInfoPlugin {
        private modules: Map<string, {
          rawLocationRange?: Chrome.DevTools.RawLocationRange,
          sourceLocations?: Chrome.DevTools.SourceLocation[],
        }>;
        constructor() {
          this.modules = new Map();
        }

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

      RegisterExtension(new MissingInfoPlugin(), 'MissingInfo', {language: 'WebAssembly', symbol_types: ['None']});
    });

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    const incompleteMessage = 'The debug information for function $Main is incomplete';
    const infoBar = await waitFor(`.infobar-error[aria-label="${incompleteMessage}"`);
    const details = await waitFor('.infobar-details-rows', infoBar);
    const text = await details.evaluate(e => e.textContent);
    assert.deepEqual(text, 'Failed to load debug file "test.dwo".');

    const banners = await $$('.ignore-listed-message');
    const bannerTexts = await Promise.all(banners.map(e => e.evaluate(e => e.textContent)));
    assert.include(bannerTexts, 'Some call frames have warnings');

    const selectedCallFrame = await waitFor('.call-frame-item[aria-selected="true"]');
    const warning = await waitFor('.call-frame-warning-icon', selectedCallFrame);
    const title = await warning.evaluate(e => e.getAttribute('title'));
    assert.deepEqual(title, `${incompleteMessage}\n${text}`);
  });

  it('shows variable values with JS formatters', async () => {
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluate(() => {
      class VariableListingPlugin {
        private modules:
            Map<string,
                {rawLocationRange?: Chrome.DevTools.RawLocationRange, sourceLocation?: Chrome.DevTools.SourceLocation}>;
        constructor() {
          this.modules = new Map();
        }

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

        async getTypeInfo(expression: string, _context: Chrome.DevTools.RawLocation):
            Promise<{typeInfos: Chrome.DevTools.TypeInfo[], base: Chrome.DevTools.EvalBase}|null> {
          if (expression === 'local') {
            const typeInfos = [
              {
                typeNames: ['TestType'],
                typeId: 'TestType',
                members: [{name: 'member', offset: 1, typeId: 'TestTypeMember'}],
                alignment: 0,
                arraySize: 0,
                size: 4,
                canExpand: true,
                hasValue: false,
              },
              {
                typeNames: ['TestTypeMember'],
                typeId: 'TestTypeMember',
                members: [{name: 'member2', offset: 1, typeId: 'TestTypeMember2'}],
                alignment: 0,
                arraySize: 0,
                size: 3,
                canExpand: true,
                hasValue: false,
              },
              {
                typeNames: ['TestTypeMember2'],
                typeId: 'TestTypeMember2',
                members: [],
                alignment: 0,
                arraySize: 0,
                size: 2,
                canExpand: false,
                hasValue: true,
              },
              {
                typeNames: ['int'],
                typeId: 'int',
                members: [],
                alignment: 0,
                arraySize: 0,
                size: 4,
                canExpand: false,
                hasValue: true,
              },
            ];
            const base = {rootType: typeInfos[0], payload: 28};

            return {typeInfos, base};
          }
          return null;
        }

        async getFormatter(
            expressionOrField: string|{base: Chrome.DevTools.EvalBase, field: Chrome.DevTools.FieldInfo[]},
            _context: Chrome.DevTools.RawLocation): Promise<{js: string}|null> {
          function formatWithDescription(description: string) {
            const sym = Symbol('sym');
            const tag = {className: '$tag', symbol: sym};
            return {tag, value: 27, description};
          }
          function format(description?: string) {
            const sym = Symbol('sym');
            const tag = {className: '$tag', symbol: sym};

            class $tag {
              [sym]: Chrome.DevTools.EvalBase;
              constructor(value: number) {
                const rootType = {
                  typeNames: ['int'],
                  typeId: 'int',
                  members: [],
                  alignment: 0,
                  arraySize: 0,
                  size: 4,
                  canExpand: false,
                  hasValue: true,
                };
                this[sym] = {payload: {value}, rootType};
              }
            }

            const value = {value: 26, recurse: new $tag(19), describe: new $tag(20)};
            Object.setPrototypeOf(value, null);
            return {tag, value, description};
          }

          if (typeof expressionOrField === 'string') {
            return null;
          }

          const {base, field} = expressionOrField;
          if (base.payload === 28 && field.length === 2 && field[0].name === 'member' && field[0].offset === 1 &&
              field[0].typeId === 'TestTypeMember' && field[1].name === 'member2' && field[1].offset === 1 &&
              field[1].typeId === 'TestTypeMember2') {
            return {js: `(${format})()`};
          }
          if ((base.payload as {value: number}).value === 19 && field.length === 0) {
            return {js: '27'};
          }
          if ((base.payload as {value: number}).value === 20 && field.length === 0) {
            return {js: `(${formatWithDescription})('CustomLabel')`};
          }
          return null;
        }
      }

      RegisterExtension(
          new VariableListingPlugin(), 'Location Mapping', {language: 'WebAssembly', symbol_types: ['None']});
    });

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    const locals = await getValuesForScope('LOCAL', 3, 6);
    assert.deepEqual(locals, [
      'local: TestType',
      'member: TestTypeMember',
      'member2: TestTypeMember2',
      'describe: CustomLabel',
      'recurse: 27',
      'value: 26',
    ]);
  });

  it('shows variable value in popover', async () => {
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluate(() => {
      class VariableListingPlugin {
        private modules:
            Map<string,
                {rawLocationRange?: Chrome.DevTools.RawLocationRange, sourceLocation?: Chrome.DevTools.SourceLocation}>;
        constructor() {
          this.modules = new Map();
        }

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

        async getTypeInfo(expression: string, _context: Chrome.DevTools.RawLocation):
            Promise<{typeInfos: Chrome.DevTools.TypeInfo[], base: Chrome.DevTools.EvalBase}|null> {
          if (expression === 'unreachable') {
            const typeInfos = [{
              typeNames: ['int'],
              typeId: 'int',
              members: [],
              alignment: 0,
              arraySize: 0,
              size: 4,
              canExpand: false,
              hasValue: true,
            }];
            const base = {rootType: typeInfos[0], payload: 28};

            return {typeInfos, base};
          }
          return null;
        }

        async getFormatter(
            _expressionOrField: string|{base: Chrome.DevTools.EvalBase, field: Chrome.DevTools.FieldInfo[]},
            _context: Chrome.DevTools.RawLocation): Promise<{js: string}|null> {
          return {js: '23'};
        }
      }

      RegisterExtension(
          new VariableListingPlugin(), 'Location Mapping', {language: 'WebAssembly', symbol_types: ['None']});
    });

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await openSourceCodeEditorForFile('unreachable.ll', 'wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);

    const pausedPosition = await waitForFunction(async () => {
      const element = await $('.cm-executionToken');
      if (element && await element.evaluate(e => e.isConnected)) {
        return element;
      }
      return undefined;
    });
    await pausedPosition.hover();
    const popover = await waitFor('[data-stable-name-for-test="object-popover-content"]');
    const value = await waitFor('.object-value-number', popover).then(e => e.evaluate(node => node.textContent));
    assert.strictEqual(value, '23');
  });

  it('shows sensible error messages.', async () => {
    const {frontend} = getBrowserAndPages();
    const extension = await loadExtension(
        'TestExtension', `${getResourcesPathWithDevToolsHostname()}/extensions/language_extensions.html`);
    await extension.evaluate(() => {
      class FormattingErrorsPlugin {
        private modules:
            Map<string,
                {rawLocationRange?: Chrome.DevTools.RawLocationRange, sourceLocation?: Chrome.DevTools.SourceLocation}>;
        constructor() {
          this.modules = new Map();
        }

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

          return [{scope: 'LOCAL', name: 'unreachable', type: 'int'}];
        }

        async getTypeInfo(expression: string, _context: Chrome.DevTools.RawLocation):
            Promise<{typeInfos: Chrome.DevTools.TypeInfo[], base: Chrome.DevTools.EvalBase}|null> {
          if (expression === 'foo') {
            const typeInfos = [{
              typeNames: ['int'],
              typeId: 'int',
              members: [],
              alignment: 0,
              arraySize: 0,
              size: 4,
              canExpand: false,
              hasValue: true,
            }];
            const base = {rootType: typeInfos[0], payload: 28};

            return {typeInfos, base};
          }
          throw new Error(`No typeinfo for ${expression}`);
        }

        async getFormatter(
            expressionOrField: string|{base: Chrome.DevTools.EvalBase, field: Chrome.DevTools.FieldInfo[]},
            _context: Chrome.DevTools.RawLocation): Promise<{js: string}|null> {
          if (typeof expressionOrField !== 'string' && expressionOrField.base.payload as number === 28 &&
              expressionOrField.field.length === 0) {
            return {js: '23'};
          }
          throw new Error(`cannot format ${expressionOrField}`);
        }
      }

      RegisterExtension(
          new FormattingErrorsPlugin(), 'Formatter Errors', {language: 'WebAssembly', symbol_types: ['None']});
    });

    await openSourcesPanel();
    await click(PAUSE_ON_EXCEPTION_BUTTON);
    await goToResource('sources/wasm/unreachable.html');
    await waitFor(RESUME_BUTTON);
    const locals = await getValuesForScope('LOCAL', 0, 1);
    assert.deepStrictEqual(locals, ['unreachable: undefined']);

    const watchPane = await waitFor('[aria-label="Watch"]');
    const isExpanded = await watchPane.evaluate(element => {
      return element.getAttribute('aria-expanded') === 'true';
    });
    if (!isExpanded) {
      await click('.title-expand-icon', {root: watchPane});
    }

    await click('[aria-label="Add watch expression"]');
    await waitFor('.watch-expression-editing');
    await pasteText('foo');
    await frontend.keyboard.press('Enter');
    await waitForNone('.watch-expression-editing');

    await click('[aria-label="Add watch expression"]');
    await waitFor('.watch-expression-editing');
    await pasteText('bar');
    await frontend.keyboard.press('Enter');
    await waitForNone('.watch-expression-editing');

    const watchResults = await waitForMany('.watch-expression', 2);
    const watchTexts = await Promise.all(watchResults.map(async watch => await watch.evaluate(e => e.textContent)));
    assert.deepStrictEqual(watchTexts, ['foo: 23', 'bar: <not available>']);

    const tooltipText = await watchResults[1].evaluate(e => {
      const errorElement = e.querySelector('.watch-expression-error');
      if (!errorElement) {
        return 'NO ERROR COULD BE FOUND';
      }
      return errorElement.getAttribute('title');
    });
    assert.strictEqual(tooltipText, 'No typeinfo for bar');

    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

    await pasteText('bar');
    await frontend.keyboard.press('Enter');

    // Wait for the console to be usable again.
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    const messages = await getCurrentConsoleMessages();
    assert.deepStrictEqual(messages.filter(m => !m.startsWith('[Formatter Errors]')), ['Uncaught No typeinfo for bar']);
  });
});
