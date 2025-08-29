// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {protocolCallFrame, stringifyStackTrace} from '../../testing/StackTraceHelpers.js';

import * as StackTrace from './stack_trace.js';
import * as StackTraceImpl from './stack_trace_impl.js';

describeWithMockConnection('StackTraceModel', () => {
  const identityTranslateFn: StackTraceImpl.StackTraceModel.TranslateRawFrames = (frames, _target) =>
      Promise.resolve(frames.map(f => [{
                                   url: f.url,
                                   name: f.functionName,
                                   line: f.lineNumber,
                                   column: f.columnNumber,
                                 }]));

  function setup() {
    const target = createTarget();
    return {
      model: target.model(StackTraceImpl.StackTraceModel.StackTraceModel)!,
      translateSpy: sinon.spy(identityTranslateFn),
    };
  }

  describe('createFromProtocolRuntime', () => {
    it('correctly handles a stack trace with only a sync fragment', async () => {
      const {model} = setup();

      const stackTrace = await model.createFromProtocolRuntime(
          {
            callFrames: [
              'foo.js:1:foo:1:10',
              'bar.js:2:bar:2:20',
              'baz.js:3:baz:3:30',
            ].map(protocolCallFrame)
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

      const stackTrace = await model.createFromProtocolRuntime(
          {
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
              }
            }
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
      {
        let index = 0;
        setMockConnectionResponseHandler('Debugger.enable', () => ({debuggerId: `target${index++}`}));
        sinon.stub(SDK.DebuggerModel.DebuggerModel, 'resyncDebuggerIdForModels');
      }
      const {model} = setup();
      const [model1, model2] = [
        createTarget().model(SDK.DebuggerModel.DebuggerModel)!, createTarget().model(SDK.DebuggerModel.DebuggerModel)!
      ];

      await Promise.all([
        model1.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause),
        model2.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause)
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

    it('calls the translate function with the correct raw frames', async () => {
      const {model, translateSpy} = setup();
      const callFrames = [
        'foo.js:1:foo:1:10',
        'bar.js:2:bar:2:20',
        'baz.js:3:baz:3:30',
      ].map(protocolCallFrame);

      await model.createFromProtocolRuntime({callFrames}, translateSpy);

      sinon.assert.calledOnceWithMatch(translateSpy, callFrames, model.target());
    });

    it('throws if the translation function returns the wrong number of frames', async () => {
      const {model} = setup();

      try {
        await model.createFromProtocolRuntime(
            {
              callFrames: [protocolCallFrame('foo.js:1:foo:1:10')],
            },
            () => Promise.resolve([]));
        assert.fail('Expected translateFragment to throw');
      } catch {
      }
    });
  });

  describe('scriptInfoChanged', () => {
    const createUpdatedSpy = (stackTrace: StackTrace.StackTrace.StackTrace) => {
      const updatedSpy = sinon.spy();
      stackTrace.addEventListener(StackTrace.StackTrace.Events.UPDATED, updatedSpy);
      return updatedSpy;
    };

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
      sinon.assert.calledOnceWithMatch(translateSpy, callFrames, model.target());
    });

    it('only re-translates affected fragments and notifies affected stack traces', async () => {
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

      sinon.assert.calledOnceWithMatch(translateSpy, callFrames1, model.target());
      sinon.assert.calledOnce(updatedSpy1);
      sinon.assert.notCalled(updatedSpy2);
    });

    it('notifies a stack trace once, even when multiple fragments are affected', async () => {
      const {model, translateSpy} = setup();
      const stackTrace = await model.createFromProtocolRuntime(
          {
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
            }
          },
          identityTranslateFn);
      const updatedSpy = createUpdatedSpy(stackTrace);
      const script = {scriptId: 'id1', sourceURL: 'foo.js'} as SDK.Script.Script;

      await model.scriptInfoChanged(script, translateSpy);

      sinon.assert.calledTwice(translateSpy);
      sinon.assert.calledOnce(updatedSpy);
    });

    it('matches fragments based on URL if scriptId is missing', async () => {
      const {model, translateSpy} = setup();
      const callFrames = [protocolCallFrame('foo.js::foo:1:10')];
      const stackTrace = await model.createFromProtocolRuntime({callFrames}, identityTranslateFn);
      const updatedSpy = createUpdatedSpy(stackTrace);
      const script = {scriptId: 'scriptId1', sourceURL: 'foo.js'} as SDK.Script.Script;

      await model.scriptInfoChanged(script, translateSpy);

      sinon.assert.calledOnceWithMatch(translateSpy, callFrames);
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

         sinon.assert.calledOnceWithMatch(translateSpy, fullCallFrames, model.target());
         sinon.assert.calledOnce(updatedSpyFull);
         sinon.assert.calledOnce(updatedSpySubSet);
       });
  });
});
