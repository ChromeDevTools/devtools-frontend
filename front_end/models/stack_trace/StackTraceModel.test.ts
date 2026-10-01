// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {debuggerCallFrame, protocolCallFrame, stringifyStackTrace} from '../../testing/StackTraceHelpers.js';

import * as StackTrace from './stack_trace.js';
// TODO(crbug.com/444191656): Expose a `testing` bundle.
// eslint-disable-next-line @devtools/es-modules-import
import * as StackTraceImpl from './stack_trace_impl.js';

const {urlString} = Platform.DevToolsPath;

describe('StackTraceModel', () => {
  setupSettingsHooks();
  setupRuntimeHooks();

  const visible =
      (frames: StackTraceImpl.StackTraceModel.TranslatedUIFrame[]): StackTraceImpl.StackTraceModel.TranslatedRawFrame =>
          ({kind: StackTraceImpl.Trie.FrameKind.VISIBLE, frames});

  const identityTranslateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = (frames, _target) =>
      Promise.resolve(frames.map(f => visible([{
                                   url: f.url || undefined,
                                   name: f.functionName || undefined,
                                   line: f.lineNumber,
                                   column: f.columnNumber,
                                 }])));

  function setup() {
    const connection = new MockCDPConnection();
    const target = createTarget({connection});
    sinon.stub(target, 'inspectedURL').returns(urlString`http://example.com`);
    return {
      model: target.model(StackTraceImpl.StackTraceModel.StackTraceModel)!,
      connection,
      translateSpy: sinon.spy(identityTranslateFn),
      debuggerModel: target.model(SDK.DebuggerModel.DebuggerModel)!,
    };
  }

  describe('createFromProtocolRuntime', () => {
    it('correctly handles a stack trace with only a sync fragment', async () => {
      const {model} = setup();

      const stackTrace = await model.createFromProtocolRuntime({
        callFrames: [
          'foo.js:1:foo:1:10',
          'bar.js:2:bar:2:20',
          'baz.js:3:baz:3:30',
        ].map(protocolCallFrame),
      },
                                                               identityTranslateFn);

      assert.strictEqual(stringifyStackTrace(stackTrace), [
        'at foo (foo.js:1:10)',
        'at bar (bar.js:2:20)',
        'at baz (baz.js:3:30)',
      ].join('\n'));
    });

    it('correctly handles async fragments from the same target', async () => {
      const {model} = setup();

      const stackTrace = await model.createFromProtocolRuntime({
        callFrames: [
          'foo.js:1:foo:1:10',
          'foo.js:1:bar:2:20',
        ].map(protocolCallFrame),
        parent: {
          description: 'setTimeout',
          callFrames: [
            'bar.js:2:barFnX:1:10',
            'bar.js:2:barFnY:2:20',
          ].map(protocolCallFrame),
          parent: {
            description: 'await',
            callFrames: [
              'baz.js:3:bazFnY:1:10',
              'baz.js:3:bazFnY:2:20',
            ].map(protocolCallFrame),
          },
        },
      },
                                                               identityTranslateFn);

      assert.strictEqual(stringifyStackTrace(stackTrace), [
        'at foo (foo.js:1:10)',
        'at bar (foo.js:2:20)',
        '--- setTimeout -------------------------',
        'at barFnX (bar.js:1:10)',
        'at barFnY (bar.js:2:20)',
        '--- await ------------------------------',
        'at bazFnY (baz.js:1:10)',
        'at bazFnY (baz.js:2:20)',
      ].join('\n'));
    });

    it('correctly handles a async fragments from different targets', async () => {
      const {model, connection} = setup();
      {
        let index = 0;
        connection.setSuccessHandler(
            'Debugger.enable', () => ({debuggerId: `target${index++}` as Protocol.Runtime.UniqueDebuggerId}));
        sinon.stub(SDK.DebuggerModel.DebuggerModel, 'resyncDebuggerIdForModels');
      }
      const [model1, model2] = [
        createTarget({connection}).model(SDK.DebuggerModel.DebuggerModel)!,
        createTarget({connection}).model(SDK.DebuggerModel.DebuggerModel)!,
      ];

      await Promise.all([
        model1.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause),
        model2.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause),
      ]);

      sinon.stub(model1, 'fetchAsyncStackTrace').returns(Promise.resolve({
        description: 'setTimeout',
        callFrames: [
          'bar.js:2:barFnX:1:10',
          'bar.js:2:barFnY:2:20',
        ].map(protocolCallFrame),
        parentId: {id: 'async-fragment-2', debuggerId: model2.debuggerId() as Protocol.Runtime.UniqueDebuggerId},
      }));
      sinon.stub(model2, 'fetchAsyncStackTrace').returns(Promise.resolve({
        description: 'await',
        callFrames: [
          'baz.js:3:bazFnY:1:10',
          'baz.js:3:bazFnY:2:20',
        ].map(protocolCallFrame),
      }));

      const stackTrace = await model.createFromProtocolRuntime(
          {
            callFrames: [
              'foo.js:1:foo:1:10',
              'foo.js:1:bar:2:20',
            ].map(protocolCallFrame),
            parentId: {id: 'async-fragment-1', debuggerId: model1.debuggerId() as Protocol.Runtime.UniqueDebuggerId},
          },
          identityTranslateFn);

      assert.strictEqual(stringifyStackTrace(stackTrace), [
        'at foo (foo.js:1:10)',
        'at bar (foo.js:2:20)',
        '--- setTimeout -------------------------',
        'at barFnX (bar.js:1:10)',
        'at barFnY (bar.js:2:20)',
        '--- await ------------------------------',
        'at bazFnY (baz.js:1:10)',
        'at bazFnY (baz.js:2:20)',
      ].join('\n'));
    });

    it('ignores empty async fragments', async () => {
      const {model} = setup();

      const stackTrace = await model.createFromProtocolRuntime({
        callFrames: [
          'foo.js:1:foo:1:10',
          'foo.js:1:bar:2:20',
        ].map(protocolCallFrame),
        parent: {
          description: 'setTimeout',
          callFrames: [],
          parent: {
            description: 'await',
            callFrames: [
              'baz.js:3:bazFnY:1:10',
              'baz.js:3:bazFnY:2:20',
            ].map(protocolCallFrame),
          },
        },
      },
                                                               identityTranslateFn);

      assert.strictEqual(stringifyStackTrace(stackTrace), [
        'at foo (foo.js:1:10)',
        'at bar (foo.js:2:20)',
        '--- await ------------------------------',
        'at bazFnY (baz.js:1:10)',
        'at bazFnY (baz.js:2:20)',
      ].join('\n'));
    });

    it('allows empty sync fragments', async () => {
      const {model} = setup();

      const stackTrace = await model.createFromProtocolRuntime({callFrames: []}, identityTranslateFn);

      assert.lengthOf(stackTrace.syncFragment.frames, 0);
      assert.lengthOf(stackTrace.asyncFragments, 0);
    });

    it('calls the translate function with the correct raw frames', async () => {
      const {model, translateSpy} = setup();
      const callFrames = [
        'foo.js:1:foo:1:10',
        'bar.js:2:bar:2:20',
        'baz.js:3:baz:3:30',
      ].map(protocolCallFrame);

      await model.createFromProtocolRuntime({callFrames}, translateSpy);

      sinon.assert.calledOnceWithMatch(translateSpy, callFrames.map(f => ({...f, isWasm: false})), model.target());
    });

    it('translates identical stack traces only once', async () => {
      const {model, translateSpy} = setup();
      const callFrames = [
        'foo.js:1:foo:1:10',
        'bar.js:2:bar:2:20',
        'baz.js:3:baz:3:30',
      ].map(protocolCallFrame);

      await model.createFromProtocolRuntime({callFrames}, translateSpy);
      await model.createFromProtocolRuntime({callFrames}, translateSpy);

      sinon.assert.calledOnce(translateSpy);
    });

    it('only translates the new frames of a stack trace that shares frames with a previous one', async () => {
      const {model, translateSpy} = setup();
      const base = ['bar.js:2:bar:2:20', 'baz.js:3:baz:3:30'];

      await model.createFromProtocolRuntime({callFrames: ['foo.js:1:foo:1:10', ...base].map(protocolCallFrame)},
                                            translateSpy);
      const stackTrace = await model.createFromProtocolRuntime(
          {callFrames: ['qux.js:4:qux:4:40', ...base].map(protocolCallFrame)}, translateSpy);

      sinon.assert.calledTwice(translateSpy);
      sinon.assert.calledWithMatch(translateSpy.secondCall,
                                   [{...protocolCallFrame('qux.js:4:qux:4:40'), isWasm: false}], model.target());
      assert.strictEqual(stringifyStackTrace(stackTrace), [
        'at qux (qux.js:4:40)',
        'at bar (bar.js:2:20)',
        'at baz (baz.js:3:30)',
      ].join('\n'));
    });

    it('retries the translation of frames whose translation threw', async () => {
      const {model} = setup();
      const callFrames = ['foo.js:1:foo:1:10', 'bar.js:2:bar:2:20'].map(protocolCallFrame);
      type TranslateRawFrames = StackTraceImpl.StackTraceModel.TranslateRawFrames;
      const translateFn = sinon.stub<Parameters<TranslateRawFrames>, ReturnType<TranslateRawFrames>>();
      translateFn.onFirstCall().rejects(new Error('translation failed'));
      translateFn.callsFake(identityTranslateFn);

      let error: unknown;
      try {
        await model.createFromProtocolRuntime({callFrames}, translateFn);
      } catch (e) {
        error = e;
      }
      const stackTrace = await model.createFromProtocolRuntime({callFrames}, translateFn);

      assert.instanceOf(error, Error);
      sinon.assert.calledTwice(translateFn);
      assert.strictEqual(stringifyStackTrace(stackTrace), [
        'at foo (foo.js:1:10)',
        'at bar (bar.js:2:20)',
      ].join('\n'));
    });

    it('translates the evalOrigin of a frame that was first seen without one', async () => {
      const {model, translateSpy} = setup();
      await model.createFromProtocolRuntime({callFrames: [protocolCallFrame('<anonymous>::eval:0:0')]}, translateSpy);

      const stackTrace = await model.createFromErrorStackLikeString(`Error: foo
              at eval (eval at outerEval (foo.js:10:5), <anonymous>:1:1)`,
                                                                    translateSpy);

      assert.exists(stackTrace);
      sinon.assert.calledTwice(translateSpy);
      sinon.assert.calledWithMatch(translateSpy.secondCall, [sinon.match({functionName: 'outerEval'})]);
      assert.strictEqual(stackTrace.syncFragment.frames[0].evalOrigin?.name, 'outerEval');
    });

    it('throws if the translation function returns the wrong number of frames', async () => {
      const {model} = setup();

      let error: unknown;
      try {
        await model.createFromProtocolRuntime(
            {
              callFrames: [protocolCallFrame('foo.js:1:foo:1:10')],
            },
            () => Promise.resolve([]));
      } catch (e) {
        error = e;
      }
      assert.instanceOf(error, Error);
    });

    it('stores the kind and function keys of each translated frame on the trie nodes', async () => {
      const {model} = setup();
      const keys = {top: 'outer', bottom: 'outer'};
      const translateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = frames =>
          Promise.resolve(frames.map(({url, functionName: name, lineNumber: line, columnNumber: column}) => {
            if (name === 'outlined') {
              return {
                kind: StackTraceImpl.Trie.FrameKind.OUTLINED,
                frames: [{url, name, line, column}],
                functionKeys: keys,
              };
            }
            if (name === 'helper') {
              return {kind: StackTraceImpl.Trie.FrameKind.HIDDEN, frames: []};
            }
            return {
              kind: StackTraceImpl.Trie.FrameKind.VISIBLE,
              frames: [{url, name, line, column}],
              functionKeys: keys,
            };
          }));

      const stackTrace = await model.createFromProtocolRuntime({
        callFrames: ['foo.js:1:outlined:1:10', 'foo.js:1:helper:2:20', 'foo.js:1:outer:3:30'].map(protocolCallFrame),
      },
                                                               translateFn);

      const nodes = [...(stackTrace.syncFragment as StackTraceImpl.StackTraceImpl.FragmentImpl).node!.getCallStack()];
      assert.deepEqual(nodes.map(n => n.kind), [
        StackTraceImpl.Trie.FrameKind.OUTLINED,
        StackTraceImpl.Trie.FrameKind.HIDDEN,
        StackTraceImpl.Trie.FrameKind.VISIBLE,
      ]);
      assert.deepEqual(nodes.map(n => n.functionKeys), [keys, undefined, keys]);
      assert.deepEqual(nodes.map(n => n.frames.map(f => f.name)), [['outlined'], [], ['outer']]);
    });

    it('turns a VISIBLE translation without frames into a HIDDEN one', async () => {
      const {model} = setup();
      const assertStub = sinon.stub(console, 'assert');
      const translateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = frames => Promise.resolve(frames.map(
          () => ({kind: StackTraceImpl.Trie.FrameKind.VISIBLE, frames: [], functionKeys: {top: 'a', bottom: 'a'}})));

      const stackTrace = await model.createFromProtocolRuntime({
        callFrames: [protocolCallFrame('foo.js:1:visibleWithoutFrames:2:20')],
      },
                                                               translateFn);

      const [node] = (stackTrace.syncFragment as StackTraceImpl.StackTraceImpl.FragmentImpl).node!.getCallStack();
      assert.strictEqual(node.kind, StackTraceImpl.Trie.FrameKind.HIDDEN);
      assert.isUndefined(node.functionKeys);
      sinon.assert.calledOnceWithExactly(assertStub, false, 'Non-HIDDEN translation without frames');
    });

    it('does not change the frames of a stack trace that shares its caller with an outlined frame', async () => {
      const {model} = setup();
      const translations: Record<string, StackTraceImpl.StackTraceModel.TranslatedRawFrame> = {
        '_loop@1:17': {
          kind: StackTraceImpl.Trie.FrameKind.OUTLINED,
          frames: [{url: 'index.ts', name: 'outer', line: 2, column: 4}],
          functionKeys: {top: 'outer', bottom: 'outer'},
        },
        'outer@0:17': {
          kind: StackTraceImpl.Trie.FrameKind.VISIBLE,
          frames: [{url: 'index.ts', name: 'outer', line: 1, column: 2}],
          functionKeys: {top: 'outer', bottom: 'outer'},
        },
        'main@2:16': {
          kind: StackTraceImpl.Trie.FrameKind.VISIBLE,
          frames: [{url: 'index.ts', name: 'main', line: 6, column: 2}],
          functionKeys: {top: 'main', bottom: 'main'},
        },
      };
      const translateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = frames =>
          Promise.resolve(frames.map(f => translations[`${f.functionName}@${f.lineNumber}:${f.columnNumber}`]));
      const callFramesX = ['index.js:1:outer:0:17', 'index.js:1:main:2:16'].map(protocolCallFrame);
      const callFramesY = [protocolCallFrame('index.js:1:_loop:1:17'), ...callFramesX];
      const expectedX = ['at outer (index.ts:1:2)', 'at main (index.ts:6:2)'].join('\n');

      const stackTraceX = await model.createFromProtocolRuntime({callFrames: callFramesX}, translateFn);
      const stackTraceY = await model.createFromProtocolRuntime({callFrames: callFramesY}, translateFn);

      assert.strictEqual(stringifyStackTrace(stackTraceX), expectedX);
      assert.strictEqual(stringifyStackTrace(stackTraceY),
                         ['at outer (index.ts:2:4)', 'at main (index.ts:6:2)'].join('\n'));
      assert.strictEqual(
          stringifyStackTrace(await model.createFromProtocolRuntime({callFrames: callFramesX}, translateFn)),
          expectedX);
    });

    it('stores whether a translation is unmapped on the trie nodes', async () => {
      const {model} = setup();
      const translateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = frames =>
          Promise.resolve(frames.map(({url, functionName: name, lineNumber: line, columnNumber: column}) => {
            if (name === 'helper') {
              return {kind: StackTraceImpl.Trie.FrameKind.HIDDEN, frames: []};
            }
            return {
              kind: StackTraceImpl.Trie.FrameKind.VISIBLE,
              frames: [{url, name, line, column}],
              unmapped: name === 'generated',
            };
          }));

      const stackTrace = await model.createFromProtocolRuntime({
        callFrames: ['foo.js:1:generated:1:10', 'foo.js:1:helper:2:20', 'foo.js:1:mapped:3:30'].map(protocolCallFrame),
      },
                                                               translateFn);

      const nodes = [...(stackTrace.syncFragment as StackTraceImpl.StackTraceImpl.FragmentImpl).node!.getCallStack()];
      assert.deepEqual(nodes.map(n => n.isUnmapped), [true, false, false]);
    });

    it('forwards missing debug info', async () => {
      const {model} = setup();
      const translateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = (frames, _target) =>
          Promise.resolve(frames.map(f => visible([{
                                       url: f.url,
                                       name: f.functionName,
                                       line: f.lineNumber,
                                       column: f.columnNumber,
                                       missingDebugInfo: {type: StackTrace.StackTrace.MissingDebugInfoType.NO_INFO},
                                     }])));

      const stackTrace =
          await model.createFromProtocolRuntime({callFrames: [protocolCallFrame('foo.js:1:foo:1:10')]}, translateFn);

      assert.strictEqual(
          stackTrace.syncFragment.frames[0].missingDebugInfo?.type, StackTrace.StackTrace.MissingDebugInfoType.NO_INFO);
    });

    it('translates different stack traces sequentially', async () => {
      const {model} = setup();
      const callFrames1 = ['foo.js:1:foo:1:10', 'bar.js:2:bar:2:20', 'baz.js:3:baz:3:30'].map(protocolCallFrame);
      const callFrames2 = ['foo.js:1:foo:1:10', 'bar.js:2:bar:2:20', 'baz.js:4:baz:4:40'].map(protocolCallFrame);

      let resolveTranslate: () => void = () => {};
      const translatePromise = new Promise<void>(resolve => {
        resolveTranslate = resolve;
      });
      const delayedTranslateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = async (frames, target) => {
        await translatePromise;
        return await identityTranslateFn(frames, target);
      };
      const translateSpy = sinon.spy(delayedTranslateFn);
      const stackTracePromise1 = model.createFromProtocolRuntime({callFrames: callFrames1}, translateSpy);
      const stackTracePromise2 = model.createFromProtocolRuntime({callFrames: callFrames2}, translateSpy);

      await new Promise(r => setTimeout(r, 0));  // Run microtask queue as far as possible.
      sinon.assert.calledOnceWithExactly(translateSpy, callFrames1.map(f => ({...f, isWasm: false})), model.target());

      resolveTranslate();
      await stackTracePromise1;

      // Now the second call should have happened.
      await new Promise(r => setTimeout(r, 0));  // Run microtask queue as far as possible.
      sinon.assert.calledTwice(translateSpy);
      sinon.assert.calledWith(translateSpy, callFrames2.map(f => ({...f, isWasm: false})), model.target());

      await stackTracePromise2;
    });
  });

  describe('scriptInfoChanged', () => {
    const createUpdatedSpy = (stackTrace: StackTrace.StackTrace.StackTrace) => {
      const updatedSpy = sinon.spy();
      stackTrace.addEventListener(StackTrace.StackTrace.Events.UPDATED, updatedSpy);
      return updatedSpy;
    };

    /** @returns the function names of the raw frames passed to each call of `spy`. */
    const translatedNames = (spy: sinon.SinonSpy<Parameters<StackTraceImpl.StackTraceModel.TranslateRawFrames>>) =>
        spy.getCalls().map(call => call.args[0].map(f => f.functionName));

    it('re-translates and notifies a single stack trace', async () => {
      const {model, translateSpy} = setup();
      const callFrames = [
        'foo.js:id1:foo:1:10',
        'bar.js:id2:bar:2:20',
      ].map(protocolCallFrame);
      const stackTrace = await model.createFromProtocolRuntime({callFrames}, identityTranslateFn);
      const updatedSpy = createUpdatedSpy(stackTrace);
      const script = {scriptId: 'id1', sourceURL: 'foo.js'} as SDK.Script.Script;

      await model.scriptInfoChanged(script, translateSpy);

      sinon.assert.calledOnce(updatedSpy);
      assert.deepEqual(translatedNames(translateSpy), [['foo']]);
    });

    it('only re-translates affected frames and notifies affected stack traces', async () => {
      const {model, translateSpy} = setup();
      const callFrames1 = [
        'foo.js:id1:foo:1:10',
        'bar.js:id2:bar:2:20',
      ].map(protocolCallFrame);
      const callFrames2 = [
        'foo.js:id1:foo:1:10',
        'baz.js:id3:bar:3:30',
      ].map(protocolCallFrame);
      const stackTrace1 = await model.createFromProtocolRuntime({callFrames: callFrames1}, identityTranslateFn);
      const stackTrace2 = await model.createFromProtocolRuntime({callFrames: callFrames2}, identityTranslateFn);
      const [updatedSpy1, updatedSpy2] = [createUpdatedSpy(stackTrace1), createUpdatedSpy(stackTrace2)];
      const script = {scriptId: 'id2', sourceURL: 'bar.js'} as SDK.Script.Script;

      await model.scriptInfoChanged(script, translateSpy);

      assert.deepEqual(translatedNames(translateSpy), [['bar']]);
      sinon.assert.calledOnce(updatedSpy1);
      sinon.assert.notCalled(updatedSpy2);
    });

    it('notifies a stack trace once, even when multiple fragments are affected', async () => {
      const {model, translateSpy} = setup();
      const stackTrace = await model.createFromProtocolRuntime({
        callFrames: [
          'foo.js:id1:foo:1:10',
          'bar.js:id2:bar:2:20',
        ].map(protocolCallFrame),
        parent: {
          description: 'setTimeout',
          callFrames: [
            'foo.js:id1:someFn:3:30',
            'baz.js:id3:bar:4:40',
          ].map(protocolCallFrame),
        },
      },
                                                               identityTranslateFn);
      const updatedSpy = createUpdatedSpy(stackTrace);
      const script = {scriptId: 'id1', sourceURL: 'foo.js'} as SDK.Script.Script;

      await model.scriptInfoChanged(script, translateSpy);

      sinon.assert.calledOnce(translateSpy);
      assert.sameMembers(translatedNames(translateSpy)[0], ['foo', 'someFn']);
      sinon.assert.calledOnce(updatedSpy);
    });

    it('re-translates all frames of a script that appears multiple times in a stack trace', async () => {
      const {model, translateSpy} = setup();
      const stackTrace = await model.createFromProtocolRuntime({
        callFrames: [
          'foo.js:id1:foo:1:10',
          'bar.js:id2:bar:2:20',
          'foo.js:id1:baz:3:30',
        ].map(protocolCallFrame),
      },
                                                               identityTranslateFn);
      const updatedSpy = createUpdatedSpy(stackTrace);
      const script = {scriptId: 'id1', sourceURL: 'foo.js'} as SDK.Script.Script;

      await model.scriptInfoChanged(script, translateSpy);

      sinon.assert.calledOnce(translateSpy);
      assert.sameMembers(translatedNames(translateSpy)[0], ['foo', 'baz']);
      sinon.assert.calledOnce(updatedSpy);
    });

    it('re-translates eval origins whose chain references the script', async () => {
      const {model, translateSpy} = setup();
      const stackTrace = await model.createFromErrorStackLikeString(`Error: foo
              at end (eval at inner (eval at outer (foo.js:10:5)), <anonymous>:1:1)`,
                                                                    identityTranslateFn);
      assert.exists(stackTrace);
      const updatedSpy = createUpdatedSpy(stackTrace);
      const script = {scriptId: 'id1', sourceURL: 'http://example.com/foo.js'} as SDK.Script.Script;

      await model.scriptInfoChanged(script, translateSpy);

      // Only the eval origin chain is re-translated, not the raw frame of `end` itself.
      assert.deepEqual(translatedNames(translateSpy), [['inner'], ['outer']]);
      sinon.assert.calledOnce(updatedSpy);
    });

    it('matches fragments based on URL if scriptId is missing', async () => {
      const {model, translateSpy} = setup();
      const callFrames = [protocolCallFrame('foo.js::foo:1:10')];
      const stackTrace = await model.createFromProtocolRuntime({callFrames}, identityTranslateFn);
      const updatedSpy = createUpdatedSpy(stackTrace);
      const script = {scriptId: 'scriptId1', sourceURL: 'foo.js'} as SDK.Script.Script;

      await model.scriptInfoChanged(script, translateSpy);

      sinon.assert.calledOnceWithMatch(translateSpy, callFrames.map(f => ({...f, isWasm: false})));
      sinon.assert.calledOnce(updatedSpy);
    });

    it('does nothing if no fragments are affected', async () => {
      const {model, translateSpy} = setup();
      const callFrames = [protocolCallFrame('foo.js:1:foo:1:10')];
      const stackTrace = await model.createFromProtocolRuntime({callFrames}, identityTranslateFn);
      const updatedSpy = createUpdatedSpy(stackTrace);
      const script = {scriptId: 'otherScriptId', sourceURL: 'bar.js'} as SDK.Script.Script;

      await model.scriptInfoChanged(script, translateSpy);

      sinon.assert.notCalled(translateSpy);
      sinon.assert.notCalled(updatedSpy);
    });

    it('does not re-translate fragments that are a complete sub-set of another fragment (but notifies stack traces)',
       async () => {
         const {model, translateSpy} = setup();
         const fullCallFrames = [
           'foo.js:id1:foo:1:10',
           'bar.js:id2:bar:2:20',
           'baz.js:id3:bar:3:30',
         ].map(protocolCallFrame);
         const subSetFrames = [
           'bar.js:id2:bar:2:20',
           'baz.js:id3:bar:3:30',
         ].map(protocolCallFrame);
         const fullStackTrace =
             await model.createFromProtocolRuntime({callFrames: fullCallFrames}, identityTranslateFn);
         const subSetStackTrace =
             await model.createFromProtocolRuntime({callFrames: subSetFrames}, identityTranslateFn);
         const [updatedSpyFull, updatedSpySubSet] =
             [createUpdatedSpy(fullStackTrace), createUpdatedSpy(subSetStackTrace)];
         const script = {scriptId: 'id2', sourceURL: 'bar.js'} as SDK.Script.Script;

         await model.scriptInfoChanged(script, translateSpy);

         assert.deepEqual(translatedNames(translateSpy), [['bar']]);
         sinon.assert.calledOnce(updatedSpyFull);
         sinon.assert.calledOnce(updatedSpySubSet);
       });

    it('forwards missing debug info', async () => {
      const {model} = setup();
      const translateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = (frames, _target) =>
          Promise.resolve(frames.map(f => visible([{
                                       url: f.url,
                                       name: f.functionName,
                                       line: f.lineNumber,
                                       column: f.columnNumber,
                                       missingDebugInfo: {type: StackTrace.StackTrace.MissingDebugInfoType.NO_INFO},
                                     }])));
      const stackTrace = await model.createFromProtocolRuntime(
          {callFrames: [protocolCallFrame('foo.js:1:foo:1:10')]}, identityTranslateFn);
      assert.isUndefined(stackTrace.syncFragment.frames[0].missingDebugInfo);
      const script = {scriptId: '1', sourceURL: 'bar.js'} as SDK.Script.Script;

      await model.scriptInfoChanged(script, translateFn);

      const frame = stackTrace.syncFragment.frames[0];
      assert.strictEqual(frame.missingDebugInfo?.type, StackTrace.StackTrace.MissingDebugInfoType.NO_INFO);
    });

    it('resolves isWasm using DebuggerModel for protocol stack trace frames', async () => {
      const {model, debuggerModel} = setup();
      sinon.stub(debuggerModel, 'scriptForId').callsFake(scriptId => {
        return {
          isWasm: () => scriptId === 'wasmScriptId',
        } as SDK.Script.Script;
      });

      const stackTrace = await model.createFromProtocolRuntime(
          {
            callFrames: [
              'foo.js:jsScriptId:foo:10:20',
              'bar.wasm:wasmScriptId:bar:0:30',
            ].map(protocolCallFrame),
          },
          identityTranslateFn);

      assert.isFalse(Boolean(stackTrace.syncFragment.frames[0].isWasm));
      assert.isTrue(stackTrace.syncFragment.frames[1].isWasm);
    });
  });

  describe('createFromDebuggerPaused', () => {
    it('assigns the right DebuggerModel.CallFrame to the right StackTrace.Frame', async () => {
      const {model, debuggerModel} = setup();
      sinon.stub(debuggerModel, 'scriptForId').returns({isWasm: () => false} as unknown as SDK.Script.Script);

      const details = new SDK.DebuggerModel.DebuggerPausedDetails(
          debuggerModel,
          [
            'foo.js:id1:foo:1:10',
            'bar.js:id2:bar:2:20',
          ].map(debuggerCallFrame),
          Protocol.Debugger.PausedEventReason.Other, undefined, []);

      const stackTrace = await model.createFromDebuggerPaused(details, identityTranslateFn);

      assert.strictEqual(stackTrace.syncFragment.frames[0].sdkFrame, details.callFrames[0]);
      assert.strictEqual(stackTrace.syncFragment.frames[1].sdkFrame, details.callFrames[1]);
    });

    it('assigns the same DebuggerModel.CallFrame to inlined StackTrace.Frame', async () => {
      const {model, debuggerModel} = setup();
      sinon.stub(debuggerModel, 'scriptForId').returns({isWasm: () => false} as unknown as SDK.Script.Script);

      const details = new SDK.DebuggerModel.DebuggerPausedDetails(
          debuggerModel, [debuggerCallFrame('foo.js:id1:foo:1:10')], Protocol.Debugger.PausedEventReason.Other,
          undefined, []);

      const stackTrace = await model.createFromDebuggerPaused(details, () => Promise.resolve([visible([
        {url: 'foo.ts', name: 'foo', line: 10, column: 20},
        {url: 'bar.ts', name: 'bar', line: 20, column: 30},
        {url: 'baz.ts', name: 'baz', line: 40, column: 50},
      ])]));

      assert.strictEqual(stackTrace.syncFragment.frames[0].sdkFrame, details.callFrames[0]);

      assert.strictEqual(stackTrace.syncFragment.frames[1].sdkFrame.inlineFrameIndex, 1);
      assert.strictEqual(stackTrace.syncFragment.frames[1].sdkFrame.functionName, 'bar');

      assert.strictEqual(stackTrace.syncFragment.frames[2].sdkFrame.inlineFrameIndex, 2);
      assert.strictEqual(stackTrace.syncFragment.frames[2].sdkFrame.functionName, 'baz');
    });

    it('returns the same virtual DebuggerModel.CallFrame for inlined frames on repeated reads', async () => {
      const {model, debuggerModel} = setup();
      const script = {scriptId: 'id1', sourceURL: 'foo.js', isWasm: () => false} as unknown as SDK.Script.Script;
      sinon.stub(debuggerModel, 'scriptForId').returns(script);
      const details =
          new SDK.DebuggerModel.DebuggerPausedDetails(debuggerModel, [debuggerCallFrame('foo.js:id1:foo:1:10')],
                                                      Protocol.Debugger.PausedEventReason.Other, undefined, []);
      const translateFn = (inlinedName: string): StackTraceImpl.StackTraceModel.TranslateRawFrames => () =>
          Promise.resolve([visible([
            {url: 'foo.ts', name: 'foo', line: 10, column: 20},
            {url: 'bar.ts', name: inlinedName, line: 20, column: 30},
          ])]);

      const stackTrace = await model.createFromDebuggerPaused(details, translateFn('bar'));
      const [, inlined] = stackTrace.syncFragment.frames;

      assert.strictEqual(stackTrace.syncFragment.frames[1].sdkFrame, inlined.sdkFrame);
      assert.strictEqual(StackTrace.StackTrace.DebuggableFrameFlavor.for(stackTrace.syncFragment.frames[1]),
                         StackTrace.StackTrace.DebuggableFrameFlavor.for(inlined));

      // A re-translation that changes the name of the inlined frame gets a new virtual CallFrame.
      await model.scriptInfoChanged(script, translateFn('renamed'));
      const renamed = stackTrace.syncFragment.frames[1].sdkFrame;
      assert.notStrictEqual(renamed, inlined.sdkFrame);
      assert.strictEqual(renamed.functionName, 'renamed');
      assert.strictEqual(stackTrace.syncFragment.frames[1].sdkFrame, renamed);
    });

    it('assigns the CallFrame of the terminator to inlined callers of a merged outlined frame', async () => {
      const {model, debuggerModel} = setup();
      sinon.stub(debuggerModel, 'scriptForId').returns({isWasm: () => false} as unknown as SDK.Script.Script);
      const details = new SDK.DebuggerModel.DebuggerPausedDetails(
          debuggerModel, ['bundle.js:id1:_o:1:10', 'bundle.js:id1:main:2:20'].map(debuggerCallFrame),
          Protocol.Debugger.PausedEventReason.Other, undefined, []);

      const stackTrace =
          await model.createFromDebuggerPaused(details, frames => Promise.resolve(frames.map(({functionName}) => {
            if (functionName === '_o') {
              return {
                kind: StackTraceImpl.Trie.FrameKind.OUTLINED,
                frames: [{url: 'app.ts', name: 'outer', line: 2, column: 4}],
                functionKeys: {top: 'outer', bottom: 'outer'},
              };
            }
            return {
              kind: StackTraceImpl.Trie.FrameKind.VISIBLE,
              frames: [
                {url: 'app.ts', name: 'outer', line: 5, column: 2},
                {url: 'app.ts', name: 'main', line: 9, column: 2},
              ],
              functionKeys: {top: 'outer', bottom: 'main'},
            };
          })));

      const {frames} = stackTrace.syncFragment;
      assert.lengthOf(frames, 2);
      assert.strictEqual(frames[0].sdkFrame, details.callFrames[0]);
      assert.strictEqual(frames[1].sdkFrame.inlineFrameIndex, 1);
      assert.strictEqual(frames[1].sdkFrame.payload, details.callFrames[1].payload);
      assert.strictEqual(frames[1].sdkFrame.functionName, 'main');
    });

    it('assigns the CallFrame of the caller when the top frame is HIDDEN', async () => {
      const {model, debuggerModel} = setup();
      sinon.stub(debuggerModel, 'scriptForId').returns({isWasm: () => false} as unknown as SDK.Script.Script);
      const details = new SDK.DebuggerModel.DebuggerPausedDetails(
          debuggerModel, ['bundle.js:id1:helper:1:10', 'bundle.js:id1:main:2:20'].map(debuggerCallFrame),
          Protocol.Debugger.PausedEventReason.Other, undefined, []);

      const stackTrace = await model.createFromDebuggerPaused(
          details,
          frames => Promise.resolve(frames.map(({functionName}) => functionName === 'helper' ?
                                                   {kind: StackTraceImpl.Trie.FrameKind.HIDDEN, frames: []} :
                                                   visible([{url: 'app.ts', name: 'main', line: 9, column: 2}]))));

      const {frames} = stackTrace.syncFragment;
      assert.lengthOf(frames, 1);
      assert.strictEqual(frames[0].sdkFrame, details.callFrames[1]);
    });

    it('sets isWasm on StackTrace.Frame when paused in Wasm', async () => {
      const {model, debuggerModel} = setup();
      sinon.stub(debuggerModel, 'scriptForId').returns({isWasm: () => true} as unknown as SDK.Script.Script);

      const details = new SDK.DebuggerModel.DebuggerPausedDetails(
          debuggerModel, [debuggerCallFrame('foo.wasm:id1:wasmFunc:1:10')], Protocol.Debugger.PausedEventReason.Other,
          undefined, []);

      const stackTrace = await model.createFromDebuggerPaused(details, identityTranslateFn);

      assert.isTrue(stackTrace.syncFragment.frames[0].isWasm);
    });

    it('preserves the raw function name', async () => {
      const {model} = setup();
      const details = [
        'foo.js:id1:foo:1:10',
        'bar.js:id2:bar:2:20',
      ].map(protocolCallFrame);

      const stackTrace = await model.createFromProtocolRuntime({callFrames: details}, identityTranslateFn);

      assert.strictEqual(stackTrace.syncFragment.frames[0].rawName, 'foo');
      assert.strictEqual(stackTrace.syncFragment.frames[1].rawName, 'bar');
    });

    it('preserves the raw function name for inlined frames', async () => {
      const {model} = setup();
      const details = [protocolCallFrame('foo.js:id1:foo:1:10')];

      const stackTrace = await model.createFromProtocolRuntime({callFrames: details}, () => Promise.resolve([visible([
        {url: 'foo.ts', name: 'foo', line: 10, column: 20},
        {url: 'bar.ts', name: 'bar', line: 20, column: 30},
        {url: 'baz.ts', name: 'baz', line: 40, column: 50},
      ])]));

      assert.strictEqual(stackTrace.syncFragment.frames[0].rawName, 'foo');
      assert.isTrue(stackTrace.syncFragment.frames[0].isInline);
      assert.strictEqual(stackTrace.syncFragment.frames[1].rawName, 'foo');
      assert.isTrue(stackTrace.syncFragment.frames[1].isInline);
      assert.strictEqual(stackTrace.syncFragment.frames[2].rawName, 'foo');
      assert.isFalse(stackTrace.syncFragment.frames[2].isInline);
    });
  });

  describe('createFromErrorStackLikeString', () => {
    it('correctly translates builtin frames resulting in no url and -1 for line/column', async () => {
      const {model} = setup();

      const stackTrace = await model.createFromErrorStackLikeString(
          `Error: foo
              at Array.map (<anonymous>)`,
          identityTranslateFn);

      assert.exists(stackTrace);
      assert.lengthOf(stackTrace.syncFragment.frames, 1);
      const frame = stackTrace.syncFragment.frames[0];
      assert.isUndefined(frame.url);
      assert.isUndefined(frame.uiSourceCode);
      assert.strictEqual(frame.line, -1);
      assert.strictEqual(frame.column, -1);
      assert.strictEqual(frame.name, 'Array.map');
    });

    it('correctly handles a stack trace with sync and async fragments', async () => {
      const {model} = setup();

      const stackTrace = await model.createFromErrorStackLikeString(
          `Error: foo
              at foo (foo.js:1:10)
              at bar (foo.js:2:20)`,
          identityTranslateFn, {
            exceptionId: 1,
            text: 'Uncaught Error: foo',
            lineNumber: 0,
            columnNumber: 0,
            stackTrace: {
              callFrames: [
                {
                  functionName: 'foo',
                  url: 'foo.js',
                  scriptId: 'id1' as Protocol.Runtime.ScriptId,
                  lineNumber: 0,
                  columnNumber: 9,
                },
                {
                  functionName: 'bar',
                  url: 'foo.js',
                  scriptId: 'id1' as Protocol.Runtime.ScriptId,
                  lineNumber: 1,
                  columnNumber: 19,
                },
              ],
              parent: {
                description: 'setTimeout',
                callFrames: [
                  {
                    functionName: 'barFnX',
                    url: 'bar.js',
                    scriptId: 'id2' as Protocol.Runtime.ScriptId,
                    lineNumber: 0,
                    columnNumber: 9,
                  },
                ],
              },
            },
          });

      assert.exists(stackTrace);
      assert.strictEqual(stringifyStackTrace(stackTrace), [
        'at foo (http://example.com/foo.js:0:9)',
        'at bar (http://example.com/foo.js:1:19)',
        '--- setTimeout -------------------------',
        'at barFnX (bar.js:0:9)',
      ].join('\n'));
    });

    it('correctly translates evalOrigin frames', async () => {
      const {model} = setup();

      const translateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = (frames, _target) => {
        // Expand the evalOrigin into 2 frames to simulate inlining.
        return Promise.resolve(frames.map(f => {
          if (f.functionName === 'outerEval') {  // the evalOrigin frame
            return visible([
              {url: 'inlined.js', name: 'inlinedFn', line: 5, column: 5},
              {url: f.url, name: f.functionName, line: f.lineNumber, column: f.columnNumber},
            ]);
          }
          return visible([{
            url: f.url,
            name: f.functionName,
            line: f.lineNumber,
            column: f.columnNumber,
          }]);
        }));
      };

      const stackTrace = await model.createFromErrorStackLikeString(
          `Error: foo
              at eval (eval at outerEval (foo.js:10:5), <anonymous>:1:1)`,
          translateFn);

      assert.exists(stackTrace);
      const frames = stackTrace.syncFragment.frames as StackTrace.StackTrace.ParsedErrorStackFrame[];
      assert.lengthOf(frames, 1);
      assert.strictEqual(frames[0].url, '<anonymous>');
      assert.strictEqual(frames[0].line, 0);

      assert.exists(frames[0].evalOrigin);
      // The evalOrigin is represented as a single ParsedErrorStackFrame that points to the top-most inlined frame
      assert.strictEqual(frames[0].evalOrigin?.url, 'inlined.js');
      assert.strictEqual(frames[0].evalOrigin?.name, 'inlinedFn');
      assert.strictEqual(frames[0].evalOrigin?.line, 5);

      // NOTE: Because evalOrigin only surfaces a single ParsedErrorStackFrame,
      // the remaining inlined frames ('outerEval' at 'foo.js:10:5') are technically dropped in the public API!
      // This is a known limitation of having evalOrigin as a single frame rather than an array.
    });

    it('shows the raw location of an evalOrigin frame that translates to a HIDDEN frame', async () => {
      const {model} = setup();

      const translateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = frames => Promise.resolve(frames.map(f => {
        if (f.functionName === 'helper') {
          return {kind: StackTraceImpl.Trie.FrameKind.HIDDEN, frames: []};
        }
        return visible([{url: f.url, name: f.functionName, line: f.lineNumber, column: f.columnNumber}]);
      }));

      const stackTrace = await model.createFromErrorStackLikeString(`Error: foo
              at eval (eval at helper (foo.js:10:5), <anonymous>:1:1)`,
                                                                    translateFn);

      assert.exists(stackTrace);
      const evalOrigin = stackTrace.syncFragment.frames[0].evalOrigin;
      assert.exists(evalOrigin);
      assert.strictEqual(evalOrigin.name, 'helper');
      assert.strictEqual(evalOrigin.rawName, 'helper');
      assert.isTrue(evalOrigin.url?.endsWith('foo.js'));
      assert.strictEqual(evalOrigin.line, 9);
      assert.strictEqual(evalOrigin.column, 4);
    });

    it('correctly translates complex recursive nested evalOrigin frames', async () => {
      const {model} = setup();

      const translateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = (frames, _target) => {
        // Expand baseCaller into 2 frames to simulate inlining.
        return Promise.resolve(frames.map(f => {
          if (f.functionName === 'baseCaller') {
            return visible([
              {url: 'inlined_base.js', name: 'inlinedBaseFn', line: 12, column: 12},
              {url: f.url, name: f.functionName, line: f.lineNumber, column: f.columnNumber},
            ]);
          }
          if (f.functionName === 'intermediate1') {
            return visible([{url: 'inter1.js', name: 'inter1Fn', line: 20, column: 20}]);
          }
          if (f.functionName === 'intermediate2') {
            return visible([{url: 'inter2.js', name: 'inter2Fn', line: 30, column: 30}]);
          }
          return visible([{
            url: f.url,
            name: f.functionName,
            line: f.lineNumber,
            column: f.columnNumber,
          }]);
        }));
      };

      const stackTrace = await model.createFromErrorStackLikeString(
          `Error: foo
              at end (eval at intermediate2 (eval at intermediate1 (eval at baseCaller (foo.js:10:5))), <anonymous>:1:1)`,
          translateFn);

      assert.exists(stackTrace);
      const {frames} = stackTrace.syncFragment;
      assert.lengthOf(frames, 1);
      assert.strictEqual(frames[0].url, '<anonymous>');
      assert.strictEqual(frames[0].line, 0);

      // Level 1: intermediate2
      const origin1 = frames[0].evalOrigin;
      assert.exists(origin1);
      assert.strictEqual(origin1?.url, 'inter2.js');
      assert.strictEqual(origin1?.name, 'inter2Fn');
      assert.strictEqual(origin1?.line, 30);

      // Level 2: intermediate1
      const origin2 = origin1?.evalOrigin;
      assert.exists(origin2);
      assert.strictEqual(origin2?.url, 'inter1.js');
      assert.strictEqual(origin2?.name, 'inter1Fn');
      assert.strictEqual(origin2?.line, 20);

      // Level 3: baseCaller
      const origin3 = origin2?.evalOrigin;
      assert.exists(origin3);
      assert.strictEqual(origin3?.url, 'inlined_base.js');
      assert.strictEqual(origin3?.name, 'inlinedBaseFn');
      assert.strictEqual(origin3?.line, 12);

      // Level 4 (Outermost): undefined
      assert.isUndefined(origin3?.evalOrigin);
    });

    it('uses resolveURL callback to match scripts and complete relative URLs', async () => {
      const {model, connection} = setup();

      // Register a script with a relative path on the DebuggerModel
      connection.dispatchEvent('Debugger.scriptParsed', {
        scriptId: 'script-id-1' as Protocol.Runtime.ScriptId,
        url: 'registered-relative.js',
        startLine: 0,
        startColumn: 0,
        endLine: 10,
        endColumn: 10,
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
        sourceMapURL: undefined,
        hasSourceURL: false,
        length: 100,
      },
                               model.target().sessionId);

      // 1. A relative URL that is registered as a script should be accepted and resolved
      const stack1 = `Error: test
          at foo (registered-relative.js:5:1)`;
      const stackTrace1 = await model.createFromErrorStackLikeString(stack1, identityTranslateFn);
      assert.exists(stackTrace1);
      assert.strictEqual(stringifyStackTrace(stackTrace1), 'at foo (registered-relative.js:4:0)');

      // 2. A relative URL that is NOT registered as a script, but can be completed against the page inspectedURL (http://example.com) should be accepted and completed
      const stack2 = `Error: test
          at foo (not-registered.js:5:1)`;
      const stackTrace2 = await model.createFromErrorStackLikeString(stack2, identityTranslateFn);
      assert.exists(stackTrace2);
      assert.strictEqual(stringifyStackTrace(stackTrace2), 'at foo (http://example.com/not-registered.js:4:0)');

      // 3. If target has no inspected URL, and the relative URL is not registered, it should fail parsing and return null
      (model.target().inspectedURL as sinon.SinonStub).returns(Platform.DevToolsPath.EmptyUrlString);
      const stack3 = `Error: test
          at foo (not-registered.js:5:1)`;
      const stackTrace3 = await model.createFromErrorStackLikeString(stack3, identityTranslateFn);
      assert.isNull(stackTrace3);
    });
  });
});
