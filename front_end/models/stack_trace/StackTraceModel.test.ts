// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {protocolCallFrame, stringifyStackTrace} from '../../testing/StackTraceHelpers.js';

import * as StackTraceImpl from './stack_trace_impl.js';

describeWithMockConnection('StackTraceModel', () => {
  describe('createFromProtocolRuntime', () => {
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
      };
    }

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
      const {model} = setup();
      const callFrames = [
        'foo.js:1:foo:1:10',
        'bar.js:2:bar:2:20',
        'baz.js:3:baz:3:30',
      ].map(protocolCallFrame);
      const translateSpy = sinon.spy(identityTranslateFn);

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
});
