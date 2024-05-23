// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';
import {createEmbindPool} from '../src/DWARFSymbols.js';

import {Debugger} from './RealBackend.js';
import {createWorkerPlugin, makeURL, nonNull} from './TestUtils.js';

const wasmUrl = makeURL('/build/tests/inputs/externref.s.wasm');

describe('Externref', () => {
  it('externref test', async () => {
    const debug = await Debugger.create();
    const page = debug.page('./externref.js');
    await page.open();

    const rawModuleId = await debug.waitForScript(wasmUrl);
    const plugin = await createWorkerPlugin(debug);

    const sources = await plugin.addRawModule(rawModuleId, '', {url: wasmUrl});

    if ('missingSymbolFiles' in sources) {
      throw new Error('Unexpected missing symbol files');
    }
    const sourceFileURL = sources.find(s => s.endsWith('externref.c'));
    if (!sourceFileURL) {
      throw new Error('externref.c source not found');
    }
    const {lineNumber} = await debug.setBreakpoint(1, new URL(sourceFileURL), plugin, rawModuleId);

    const goPromise = page.go();
    const pauseOrExitcode = await Promise.race([debug.waitForPause(), goPromise]);
    if (typeof pauseOrExitcode === 'number') {
      throw new Error('Program terminated before all breakpoints were hit.');
    }

    const {callFrame, rawLocation} = pauseOrExitcode;

    const variables = await plugin.listVariablesInScope(rawLocation);

    expect(variables.map(v => v.name).sort()).to.deep.equal(['x', 'y']);

    {
      const value = nonNull(await plugin.evaluate('x', rawLocation, debug.stopIdForCallFrame(callFrame)));
      assert(value.type === 'reftype');
      const {subtype, description, preview} = await debug.getRemoteObject(callFrame, value);
      expect(subtype).to.eql('wasmvalue');
      expect(description).to.eql('externref');
      expect(preview?.properties).to.eql([{'name': 'value', 'type': 'object', 'value': 'Object'}]);
    }

    {
      const value = nonNull(await plugin.evaluate('y', rawLocation, debug.stopIdForCallFrame(callFrame)));
      assert(value.type === 'reftype');
      const {subtype, description, preview} = await debug.getRemoteObject(callFrame, value);
      expect(subtype).to.eql('wasmvalue');
      expect(description).to.eql('externref');
      expect(preview?.properties).to.eql([{'name': 'value', 'type': 'string', 'value': 'test'}]);
    }

    await debug.resume();
    await debug.close();
  });
});
