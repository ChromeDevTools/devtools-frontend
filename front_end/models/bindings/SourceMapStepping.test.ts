// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {encodeSourceMap} from '../../testing/SourceMapEncoder.js';
import * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import * as Formatter from '../formatter/formatter.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

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
const MAPPINGS = [
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
];

function createSourceMap(outlined: boolean, mapped = true): SDK.SourceMap.SourceMapV3 {
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
  const mappings = mapped ? encodeSourceMap(MAPPINGS) : {version: 3, sources: ['index.ts'], mappings: ''};
  return ScopesCodec.encode(builder.build(), mappings as ScopesCodec.SourceMapJson) as SDK.SourceMap.SourceMapV3;
}

type StepMethod = 'Debugger.stepInto'|'Debugger.stepOver'|'Debugger.stepOut';
interface StepRequest {
  method: StepMethod;
  skipList?: Protocol.Debugger.LocationRange[];
  enterRanges?: Protocol.Debugger.LocationRange[];
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
        const {skipList, enterRanges} = (params ?? {}) as Protocol.Debugger.StepOverRequest;
        const request = {method, skipList, enterRanges};
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

  async function addScript({outlined, mapped = true}: {outlined: boolean, mapped?: boolean}):
      Promise<SDK.Script.Script> {
    return await backend.addScript(target, {url: 'http://example.com/index.js', content: GENERATED}, {
      url: 'http://example.com/index.js.map',
      content: createSourceMap(outlined, mapped),
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

  /** Pauses after a step and waits until the next step command, asserting that the pause is not presented. */
  async function pauseAndExpectAutoStep(callFrames: Protocol.Debugger.CallFrame[]): Promise<StepRequest> {
    const presented = sinon.spy();
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerPaused, presented);
    const request = nextRequest();
    backend.cdpConnection.dispatchEvent('Debugger.resumed', undefined, target.sessionId);
    backend.cdpConnection.dispatchEvent(
        'Debugger.paused', {callFrames, reason: Protocol.Debugger.PausedEventReason.Step}, target.sessionId);
    const result = await request;
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerPaused, presented);
    sinon.assert.notCalled(presented);
    return result;
  }

  async function step(method: () => Promise<void>): Promise<StepRequest> {
    const request = nextRequest();
    void method();
    return await request;
  }

  it('steps over functions inlined into the current function', async () => {
    const script = await addScript({outlined: false});
    await pauseAndWait([frame(script, 3, 0)]);

    const {method, skipList, enterRanges} = await step(() => debuggerModel.stepOver());

    assert.strictEqual(method, 'Debugger.stepOver');
    // The inlined `I`, and the rest of the current line.
    assert.deepEqual(skipList, [range(script, 2, 0, 2, 4), range(script, 3, 0, 4, 0)]);
    // No outlined parts: the request is the same as without encoded scopes.
    assert.isUndefined(enterRanges);
  });

  it('steps out of an inlined function by stepping over its body', async () => {
    const script = await addScript({outlined: false});
    await pauseAndWait([frame(script, 2, 0)]);

    const {method, skipList} = await step(() => debuggerModel.stepOut());

    assert.strictEqual(method, 'Debugger.stepOver');
    assert.deepEqual(skipList, [range(script, 2, 0, 2, 4)]);
  });

  it('keeps stepping over unmapped code', async () => {
    const script = await addScript({outlined: false});
    await pauseAndWait([frame(script, 4, 0)]);
    assert.strictEqual((await step(() => debuggerModel.stepOver())).method, 'Debugger.stepOver');

    assert.strictEqual((await pauseAndExpectAutoStep([frame(script, 5, 0)])).method, 'Debugger.stepOver');
    await pauseAndWait([frame(script, 6, 0)], Protocol.Debugger.PausedEventReason.Step);
    assert.lengthOf(requests, 2);
  });

  it('keeps stepping into unmapped code', async () => {
    const script = await addScript({outlined: false});
    await pauseAndWait([frame(script, 4, 0)]);
    assert.strictEqual((await step(() => debuggerModel.stepInto())).method, 'Debugger.stepInto');

    assert.strictEqual((await pauseAndExpectAutoStep([frame(script, 5, 0)])).method, 'Debugger.stepInto');
  });

  it('steps over unmapped code after stepping out', async () => {
    const script = await addScript({outlined: false});
    await pauseAndWait([frame(script, 3, 0), frame(script, 1, 0, '1')]);
    assert.strictEqual((await step(() => debuggerModel.stepOut())).method, 'Debugger.stepOut');

    // Stepping into calls of the unmapped code would present a pause inside the callee.
    assert.strictEqual((await pauseAndExpectAutoStep([frame(script, 5, 0, '1')])).method, 'Debugger.stepOver');
  });

  it('presents pauses that are not caused by the step', async () => {
    const script = await addScript({outlined: false});
    await pauseAndWait([frame(script, 4, 0)]);
    await step(() => debuggerModel.stepOver());

    await pauseAndWait([frame(script, 5, 0)], Protocol.Debugger.PausedEventReason.Other);
    assert.lengthOf(requests, 1);
  });

  it('presents pauses in scripts with scopes but without any mappings', async () => {
    // Otherwise every position would count as unmapped and the step would run to completion.
    const script = await addScript({outlined: false, mapped: false});
    await pauseAndWait([frame(script, 4, 0)]);
    await step(() => debuggerModel.stepOver());

    await pauseAndWait([frame(script, 5, 0)], Protocol.Debugger.PausedEventReason.Step);
    assert.lengthOf(requests, 1);
  });

  it('keeps stepping over code mapped to the same original location', async () => {
    const script = await addScript({outlined: false});
    await pauseAndWait([frame(script, 4, 0)]);
    await step(() => debuggerModel.stepOver());

    // 8:0 maps to the same original location as 4:0.
    assert.strictEqual((await pauseAndExpectAutoStep([frame(script, 8, 0)])).method, 'Debugger.stepOver');
  });

  it('presents pauses on the same original location in a callee', async () => {
    const script = await addScript({outlined: false});
    await pauseAndWait([frame(script, 4, 0)]);
    await step(() => debuggerModel.stepOver());

    await pauseAndWait([frame(script, 8, 0), frame(script, 4, 3, '1')], Protocol.Debugger.PausedEventReason.Step);
    assert.lengthOf(requests, 1);
  });

  it('keeps stepping over the same original location in an outlined part of the current function', async () => {
    const script = await addScript({outlined: true});
    await pauseAndWait([frame(script, 4, 0)]);
    await step(() => debuggerModel.stepOver());

    // Same as above, but `o` is an outlined part of `F`, so the logical depth didn't change.
    assert.strictEqual((await pauseAndExpectAutoStep([frame(script, 8, 12), frame(script, 4, 3, '1')])).method,
                       'Debugger.stepOver');
  });

  it('computes the logical depth without outlined frames on top of the stack', async () => {
    const script = await addScript({outlined: true});
    await pauseAndWait([frame(script, 9, 0), frame(script, 4, 3, '1'), frame(script, 1, 0, '2')]);

    assert.strictEqual(Bindings.SourceMapStepping.logicalDepth(debuggerModel.callFrames ?? []), 2);
  });

  it('computes the outlined parts of the current function to enter when stepping over', async () => {
    const script = await addScript({outlined: true});
    const outlinedParts = (): number[][] => {
      const [top] = debuggerModel.callFrames ?? [];
      assert.exists(top);
      return Bindings.SourceMapStepping.outlinedFunctionRanges(top).map(
          ({start, end}) => [start.lineNumber, start.columnNumber ?? -1, end.lineNumber, end.columnNumber ?? -1]);
    };

    await pauseAndWait([frame(script, 4, 0)]);
    assert.deepEqual(outlinedParts(), [[8, 12, 10, 1]]);
    // From within the outlined part itself, so that calls to other (or the same) outlined parts are entered too.
    await pauseAndWait([frame(script, 9, 0), frame(script, 4, 3, '1')]);
    assert.deepEqual(outlinedParts(), [[8, 12, 10, 1]]);
  });

  it('enters outlined parts of the current function when stepping over', async () => {
    const script = await addScript({outlined: true});
    await pauseAndWait([frame(script, 4, 0)]);

    const {method, skipList, enterRanges} = await step(() => debuggerModel.stepOver());
    assert.strictEqual(method, 'Debugger.stepOver');
    assert.deepEqual(skipList, [range(script, 2, 0, 2, 4), range(script, 4, 0, 5, 0)]);
    assert.deepEqual(enterRanges, [range(script, 8, 12, 10, 1)]);

    // V8 entered the outlined part: present the pause.
    await pauseAndWait([frame(script, 9, 0), frame(script, 4, 3, '1')], Protocol.Debugger.PausedEventReason.Step);
    assert.lengthOf(requests, 1);
  });

  it('steps out of the function that owns an outlined part', async () => {
    const script = await addScript({outlined: true});
    const caller = frame(script, 1, 0, '2');
    await pauseAndWait([frame(script, 9, 0), frame(script, 4, 3, '1'), caller]);

    assert.strictEqual((await step(() => debuggerModel.stepOut())).method, 'Debugger.stepOut');
    const again = await pauseAndExpectAutoStep([frame(script, 4, 4, '1'), caller]);
    assert.strictEqual(again.method, 'Debugger.stepOut');
    await pauseAndWait([frame(script, 1, 4, '2')], Protocol.Debugger.PausedEventReason.Step);
    assert.lengthOf(requests, 2);
  });

  it('steps out of an outlined part without an owner on the stack', async () => {
    const script = await addScript({outlined: true});
    // `o` was invoked from a task, e.g. as a callback.
    await pauseAndWait([frame(script, 9, 0)]);

    assert.strictEqual((await step(() => debuggerModel.stepOut())).method, 'Debugger.stepOut');
    await pauseAndWait([frame(script, 1, 0, '1')], Protocol.Debugger.PausedEventReason.Step);
    assert.lengthOf(requests, 1);
  });

  it('steps out of the inlined function that calls an outlined part', async () => {
    const script = await addScript({outlined: true});
    const caller = frame(script, 1, 0, '2');
    // The outlined part `o` is called from within the inlined `I` (2:0-2:4).
    await pauseAndWait([frame(script, 9, 0), frame(script, 2, 2, '1'), caller]);

    assert.strictEqual((await step(() => debuggerModel.stepOut())).method, 'Debugger.stepOut');
    // Back in `F`, but still in `I`: step over the rest of `I`, but don't leave `F`.
    const rest = await pauseAndExpectAutoStep([frame(script, 2, 3, '1'), caller]);
    assert.strictEqual(rest.method, 'Debugger.stepOver');
    assert.deepEqual(rest.skipList, [range(script, 2, 0, 2, 4)]);
    await pauseAndWait([frame(script, 3, 0, '1'), caller], Protocol.Debugger.PausedEventReason.Step);
    assert.lengthOf(requests, 2);
  });

  function nextBlackboxedRanges(): Promise<Protocol.Debugger.SetBlackboxedRangesRequest> {
    return new Promise(resolve => {
      backend.cdpConnection.setHandler('Debugger.setBlackboxedRanges', params => {
        resolve(params);
        return {result: {}};
      });
    });
  }

  it('blackboxes compiler helpers without original scope', async () => {
    const blackboxed = nextBlackboxedRanges();
    const script = await addScript({outlined: false});

    const {scriptId, positions} = await blackboxed;
    assert.strictEqual(scriptId, script.scriptId);
    assert.deepEqual(positions, [{lineNumber: 11, columnNumber: 0}, {lineNumber: 11, columnNumber: 18}]);
  });

  it('merges the blackboxed compiler helpers with the user ignore-listed ranges', async () => {
    backend.universe.ignoreListManager.ignoreListURL(urlString`http://example.com/index.ts`);
    const blackboxed = nextBlackboxedRanges();
    const script = await addScript({outlined: false});

    const {scriptId, positions} = await blackboxed;
    assert.strictEqual(scriptId, script.scriptId);
    // The mapped code (interrupted by the unmapped `x()` on line 5), and the helper `h` adjoining the second range.
    assert.deepEqual(positions, [
      {lineNumber: 0, columnNumber: 0},
      {lineNumber: 5, columnNumber: 0},
      {lineNumber: 6, columnNumber: 0},
      {lineNumber: 11, columnNumber: 18},
    ]);
  });

  it('keeps the legacy behavior when the feature is disabled', async () => {
    Root.Runtime.hostConfig.devToolsSourceMapScopesInSourcesPanel = {enabled: false};
    const script = await addScript({outlined: true});
    await pauseAndWait([frame(script, 4, 0)]);

    const {method, skipList} = await step(() => debuggerModel.stepOver());
    assert.strictEqual(method, 'Debugger.stepOver');
    assert.notDeepInclude(skipList ?? [], range(script, 2, 0, 2, 4));

    await pauseAndWait([frame(script, 5, 0)], Protocol.Debugger.PausedEventReason.Step);
    assert.lengthOf(requests, 1);
  });
});
