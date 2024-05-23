// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';
import {createEmbindPool} from '../src/DWARFSymbols.js';

import type * as LLDBEvalTests from './LLDBEvalTests.js';
import loadModule from './LLDBEvalTests.js';
import {Debugger} from './RealBackend.js';
import {createWorkerPlugin, makeURL, remoteObject} from './TestUtils.js';

const WASM_URL = makeURL('/build/tests/inputs/lldb_eval_inputs.wasm');
class LLDBEvalDebugger implements LLDBEvalTests.Debugger {
  #debugger: Debugger;
  #plugin: Chrome.DevTools.LanguageExtensionPlugin;
  constructor(dbg: Debugger, plugin: Chrome.DevTools.LanguageExtensionPlugin) {
    this.#debugger = dbg;
    this.#plugin = plugin;
  }

  static async create(): Promise<LLDBEvalDebugger> {
    const dbg = await Debugger.create();
    const plugin = await createWorkerPlugin(dbg);
    return new LLDBEvalDebugger(dbg, plugin);
  }

  private async stringify(result: Chrome.DevTools.RemoteObject|Chrome.DevTools.ForeignObject): Promise<string> {
    if (!this.#plugin.getProperties) {
      throw new Error('getProperties not implemented');
    }
    if (result.type === 'reftype') {
      return 'reftype';
    }
    if (result.objectId) {
      const properties = await this.#plugin.getProperties(result.objectId);
      if (properties.length === 1) {
        const [{name}] = properties;
        if (name.startsWith('0x')) {
          return `0x${name.substring(2).padStart(8, '0')}`;
        }
      }
    }
    if (result.description === 'std::nullptr_t') {
      return '0x00000000';
    }
    if (Object.is(result.value, -0)) {
      return '-0';
    }
    if (result.value === -Infinity) {
      return '-Inf';
    }
    if (result.value === Infinity) {
      return '+Inf';
    }

    return result.description ?? `${result.value}`;
  }

  async evaluate(expr: string): Promise<LLDBEvalTests.EvalResult> {
    const {callFrame, rawLocation} = await this.#debugger.waitForPause();
    if (!this.#plugin.evaluate) {
      throw Error('not implemented');
    }
    try {
      const resultObject = await this.#plugin.evaluate(expr, rawLocation, this.#debugger.stopIdForCallFrame(callFrame));
      if (!resultObject) {
        return {error: `Could not evaluate expression '${expr}'`};
      }
      const result = await this.stringify(resultObject);
      return {result};

    } catch (e) {
      return {error: `${e}`};
    }
  }

  async exit(): Promise<void> {
    if (this.#debugger.isPaused()) {
      await this.#debugger.clearBreakpoints();
      await this.#debugger.resume();
      const rawModuleId = await this.#debugger.waitForScript(WASM_URL);
      await this.#plugin.removeRawModule(rawModuleId);
    }
  }

  async runToLine(line: string): Promise<void> {
    const page = this.#debugger.page('./lldb_eval_inputs.js');
    await page.open();

    const rawModuleId = await this.#debugger.waitForScript(WASM_URL);

    const url = makeURL('/build/tests/inputs/lldb_eval_inputs.wasm.debug.wasm');
    const sources = await this.#plugin.addRawModule(rawModuleId, '', {url});
    if ('missingSymbolFiles' in sources) {
      throw new Error('Unexpected missing symbol files');
    }
    const sourceFileURL = sources.find(s => s.endsWith('test_binary.cc'));
    if (!sourceFileURL) {
      throw new Error('test_binary.cc source not found');
    }

    const breakpoint =
        await this.#debugger.setBreakpointOnSourceLine(line, new URL(sourceFileURL), this.#plugin, rawModuleId);

    const goPromise = page.go();
    const pauseOrExitcode = await Promise.race([goPromise, this.#debugger.waitForPause()]);
    if (typeof pauseOrExitcode === 'number') {
      throw new Error('Program terminated before all breakpoints were hit.');
    }

    const {rawLocation} = pauseOrExitcode;
    const [sourceLocation] = await this.#plugin.rawLocationToSourceLocation(rawLocation);
    if (sourceLocation?.lineNumber !== breakpoint.lineNumber) {
      throw new Error(
          `Paused on unexpected line ${sourceLocation?.lineNumber}. Breakpoint was set on ${breakpoint.lineNumber}.`);
    }
  }

  close(): Promise<void> {
    return this.#debugger.close();
  }
}

describe('Interpreter', () => {
  it('passes the lldb-eval test suite.', async () => {
    const lldbEval = await loadModule();
    const debug = await LLDBEvalDebugger.create();

    const {manage, flush} = createEmbindPool();
    try {
      const argv = manage(new lldbEval.StringArray());

      const skippedTests = [
        'EvalTest.TestTemplateTypes',
        'EvalTest.TestUnscopedEnumNegation',
        'EvalTest.TestUniquePtrDeref',
        'EvalTest.TestUniquePtrCompare',
      ];
      argv.push_back(`--gtest_filter=-${skippedTests.join(':')}`);

      const exitCode = await lldbEval.runTests(debug, argv);
      assert.strictEqual(exitCode, 0, 'gtest test suite failed');
    } finally {
      flush();
    }
  });

  it('can do basic arithmetic.', async () => {
    const debug = await Debugger.create();
    const page = debug.page('./addresses_main.js');
    await page.open();

    const wasmUrl = makeURL('/build/tests/inputs/addresses_main.wasm');
    const rawModuleId = await debug.waitForScript(wasmUrl);
    const plugin = await createWorkerPlugin(debug);

    const url = makeURL('/build/tests/inputs/addresses_main.wasm.debug.wasm');
    const sources = await plugin.addRawModule(rawModuleId, '', {url});
    if ('missingSymbolFiles' in sources) {
      throw new Error('Unexpected missing symbol files');
    }
    const sourceFileURL = sources.find(s => s.endsWith('addresses.cc'));
    if (!sourceFileURL) {
      throw new Error('addresses.cc source not found');
    }

    const {lineNumber} = await debug.setBreakpointOnSourceLine(
        '// BREAK(ArrayMembersTest)', new URL(sourceFileURL), plugin, rawModuleId);

    const goPromise = page.go();
    const pauseOrExitcode = await Promise.race([debug.waitForPause(), goPromise]);
    if (typeof pauseOrExitcode === 'number') {
      throw new Error('Program terminated before all breakpoints were hit.');
    }

    const {callFrame, rawLocation} = pauseOrExitcode;

    const [sourceLocation] = await plugin.rawLocationToSourceLocation(rawLocation);
    if (sourceLocation?.lineNumber !== lineNumber) {
      throw new Error('Paused at an unexpected location. Have not set a breakpoint here.');
    }

    const variables = await plugin.listVariablesInScope(rawLocation);
    expect(variables.map(v => v.name).sort()).to.deep.equal(['n', 'sum', 'x']);

    if (!plugin.evaluate) {
      throw new Error('evaluate is undefined');
    }

    {
      const {value} = remoteObject(await plugin.evaluate('n + sum', rawLocation, debug.stopIdForCallFrame(callFrame)));
      expect(value).to.eql(55);
    }
    {
      const {value} =
          remoteObject(await plugin.evaluate('(wchar_t)0x41414141', rawLocation, debug.stopIdForCallFrame(callFrame)));
      expect(value).to.eql('U+41414141');
    }
    {
      const {value} =
          remoteObject(await plugin.evaluate('(char16_t)0x4141', rawLocation, debug.stopIdForCallFrame(callFrame)));
      expect(value).to.eql('䅁');
    }
    {
      const {value} =
          remoteObject(await plugin.evaluate('(char32_t)0x41414141', rawLocation, debug.stopIdForCallFrame(callFrame)));
      expect(value).to.eql('U+41414141');
    }
    {
      const {value} =
          remoteObject(await plugin.evaluate('(char32_t)0x4141', rawLocation, debug.stopIdForCallFrame(callFrame)));
      expect(value).to.eql('䅁');
    }

    await debug.resume();
    await debug.close();
  });
});
