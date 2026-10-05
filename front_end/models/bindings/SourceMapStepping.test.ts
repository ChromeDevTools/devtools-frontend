// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {encodeSourceMap} from '../../testing/SourceMapEncoder.js';
import * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import * as Formatter from '../formatter/formatter.js';

//    original index.ts          generated index.js
//
//  0: function F() {            function F(){
//  1:   a();                    a();
//  2:   I();                    b();                <- inlined I
//  3:   c();                    c();
//  4:   {                       o();                <- calls the outlined block
//  5:     d();                  x();                <- unmapped
//  6:   }                       e();
//  7:   e();                    }
//  8: }                         function o(){       <- outlined block of F (hidden), unless `outlined` is false
//  9: function I() {            d();
// 10:   b();                    }
// 11: }                         function h(){x();}  <- helper without original scope
const GENERATED = 'function F(){\na();\nb();\nc();\no();\nx();\ne();\n}\nfunction o(){\nd();\n}\nfunction h(){x();}\n';

function createSourceMap(outlined: boolean): SDK.SourceMap.SourceMapV3 {
  const builder = new ScopesCodec.ScopeInfoBuilder();
  builder.startSource()
      .startScope(0, 0, {kind: 'global', key: 'global'})
      .startScope(0, 12, {kind: 'function', name: 'F', key: 'F', isStackFrame: true})
      .startScope(4, 2, {kind: 'block', key: 'block'})
      .endScope(6, 3)
      .endScope(8, 1)
      .startScope(9, 12, {kind: 'function', name: 'I', key: 'I', isStackFrame: true})
      .endScope(11, 1)
      .endScope(12, 0)
      .endSource();
  builder.startRange(0, 0, {scopeKey: 'global'})
      .startRange(0, 12, {scopeKey: 'F', isStackFrame: true})
      .startRange(2, 0, {scopeKey: 'I', callSite: {sourceIndex: 0, line: 2, column: 2}})
      .endRange(2, 4)
      .endRange(7, 1)
      .startRange(8, 12, {scopeKey: 'block', isStackFrame: true, isHidden: outlined})
      .endRange(10, 1)
      .startRange(11, 0, {isStackFrame: true})
      .endRange(11, 18)
      .endRange(12, 0);
  const mappings = encodeSourceMap([
    '0:0 => index.ts:0:0',
    '1:0 => index.ts:1:2',
    '2:0 => index.ts:10:2',
    '3:0 => index.ts:3:2',
    '4:0 => index.ts:4:2',
    '5:0',
    '6:0 => index.ts:7:2',
    '7:0 => index.ts:8:0',
    '8:0 => index.ts:4:2',
    '9:0 => index.ts:5:4',
    '10:0 => index.ts:6:2',
    '11:0',
  ]);
  return ScopesCodec.encode(builder.build(), mappings as ScopesCodec.SourceMapJson) as SDK.SourceMap.SourceMapV3;
}

type StepMethod = 'Debugger.stepInto'|'Debugger.stepOver'|'Debugger.stepOut';
interface StepRequest {
  method: StepMethod;
  skipList?: Protocol.Debugger.LocationRange[];
}

describe('SourceMapStepping', () => {
  setupRuntimeHooks();
  setupSettingsHooks();

  let backend: MockDebuggerBackend;
  let target: SDK.Target.Target;
  let debuggerModel: SDK.DebuggerModel.DebuggerModel;
  let requests: StepRequest[];
  let onRequest: ((request: StepRequest) => void)|null;

  beforeEach(() => {
    Root.Runtime.hostConfig.devToolsSourceMapScopesInSourcesPanel = {enabled: true};
    backend = new MockDebuggerBackend();
    // Instantiate the binding (lazily created by the universe), so that it installs the stepping hooks.
    assert.exists(backend.universe.debuggerWorkspaceBinding);
    target = backend.createTarget();
    const model = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(model);
    debuggerModel = model;
    requests = [];
    onRequest = null;
    for (const method of ['Debugger.stepInto', 'Debugger.stepOver', 'Debugger.stepOut'] as const) {
      backend.cdpConnection.setHandler(method, params => {
        const request = {method, skipList: (params as Protocol.Debugger.StepOverRequest | undefined)?.skipList};
        requests.push(request);
        onRequest?.(request);
        return {result: {}};
      });
    }
  });

  afterEach(async () => {
    await debuggerModel.sourceMapManager().waitForSourceMapsProcessedForTest();
    Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
  });

  async function addScript({outlined}: {outlined: boolean}): Promise<SDK.Script.Script> {
    return await backend.addScript(target, {url: 'http://example.com/index.js', content: GENERATED}, {
      url: 'http://example.com/index.js.map',
      content: createSourceMap(outlined),
    });
  }

  function frame(script: SDK.Script.Script, lineNumber: number, columnNumber: number,
                 id = '0'): Protocol.Debugger.CallFrame {
    return {
      callFrameId: id as Protocol.Debugger.CallFrameId,
      functionName: '',
      url: script.sourceURL,
      scopeChain: [],
      location: {scriptId: script.scriptId, lineNumber, columnNumber},
      this: {type: Protocol.Runtime.RemoteObjectType.Object},
    };
  }

  function range(script: SDK.Script.Script, startLine: number, startColumn: number, endLine: number,
                 endColumn: number): Protocol.Debugger.LocationRange {
    return {
      scriptId: script.scriptId,
      start: {lineNumber: startLine, columnNumber: startColumn},
      end: {lineNumber: endLine, columnNumber: endColumn},
    };
  }

  function nextRequest(): Promise<StepRequest> {
    return new Promise(resolve => {
      onRequest = request => {
        onRequest = null;
        resolve(request);
      };
    });
  }

  /** Pauses (initially, or after a step) and waits until the pause is presented. */
  async function pauseAndWait(callFrames: Protocol.Debugger.CallFrame[],
                              reason = Protocol.Debugger.PausedEventReason.Other): Promise<void> {
    const paused = debuggerModel.once(SDK.DebuggerModel.Events.DebuggerPaused);
    backend.cdpConnection.dispatchEvent('Debugger.resumed', undefined, target.sessionId);
    backend.cdpConnection.dispatchEvent('Debugger.paused', {callFrames, reason}, target.sessionId);
    await paused;
  }

  async function step(method: () => Promise<void>): Promise<StepRequest> {
    const request = nextRequest();
    void method();
    return await request;
  }

  it('steps out of an inlined function by stepping over its body', async () => {
    const script = await addScript({outlined: false});
    await pauseAndWait([frame(script, 2, 0)]);

    const {method, skipList} = await step(() => debuggerModel.stepOut());

    assert.strictEqual(method, 'Debugger.stepOver');
    assert.deepEqual(skipList, [range(script, 2, 0, 2, 4)]);
  });
});
