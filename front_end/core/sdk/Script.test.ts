// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

describeWithMockConnection('Script', () => {
  describe('originalContentProvider', () => {
    it('doesn\'t strip //# sourceURL annotations', async () => {
      const target = createTarget();
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
      const url = 'webpack:///src/foo.js';
      const scriptId = '1';
      const scriptSource = `
console.log("foo");
//# sourceURL=${url}
`;
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId,
        url,
        startLine: 2,
        startColumn: 14,
        endLine: 5,
        endColumn: 0,
        executionContextId: 1,
        hash: '',
        hasSourceURL: true,
      });
      setMockConnectionResponseHandler('Debugger.getScriptSource', () => {
        return {
          scriptSource,
          getError() {
            return undefined;
          },
        };
      });
      const script = debuggerModel.scriptForId(scriptId) as SDK.Script.Script;
      const content = await script.originalContentProvider().requestContentData();
      assert.instanceOf(content, TextUtils.ContentData.ContentData);
      assert.strictEqual(content.text, scriptSource);
    });
  });

  describe('editSource', () => {
    function setupEditTest(scriptId: string, scriptSource: string = '') {
      const target = createTarget();
      const model = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId,
        url: 'https://example.com/test.js',
        startLine: 0,
        startColumn: 0,
        endLine: 2,
        endColumn: 0,
        executionContextId: 1,
        hash: '',
        hasSourceURL: false,
      });
      setMockConnectionResponseHandler('Debugger.getScriptSource', () => {
        return {
          scriptSource,
          getError: () => undefined,
        };
      });

      const script = model.scriptForId(scriptId) as SDK.Script.Script;
      return {script, target, model};
    }

    it('does not invoke the backend when new content and old content match', async () => {
      const {script} = setupEditTest('1', 'console.log("foo")');
      setMockConnectionResponseHandler('Debugger.setScriptSource', () => {
        throw new Error('Debugger.setScriptSource must not be called');
      });

      const {status} = await script.editSource('console.log("foo")');

      assert.strictEqual(status, Protocol.Debugger.SetScriptSourceResponseStatus.Ok);
    });

    it('updates the source content when the live edit succeeds', async () => {
      const {script} = setupEditTest('1', 'console.log("foo")');
      setMockConnectionResponseHandler('Debugger.setScriptSource', () => {
        return {
          status: Protocol.Debugger.SetScriptSourceResponseStatus.Ok,
        };
      });
      const newContent = 'console.log("bar")';

      const {status} = await script.editSource(newContent);

      assert.strictEqual(status, Protocol.Debugger.SetScriptSourceResponseStatus.Ok);
      const contentData = await script.requestContentData();
      assert.instanceOf(contentData, TextUtils.ContentData.ContentData);
      assert.strictEqual(contentData.text, newContent);
    });

    it('does not update the source content when the live edit fails', async () => {
      const scriptContent = 'console.log("foo")';
      const {script} = setupEditTest('1', scriptContent);
      setMockConnectionResponseHandler('Debugger.setScriptSource', () => {
        return {
          status: Protocol.Debugger.SetScriptSourceResponseStatus.CompileError,
        };
      });

      const {status} = await script.editSource('console.log("bar")');

      assert.strictEqual(status, Protocol.Debugger.SetScriptSourceResponseStatus.CompileError);
      const contentData = await script.requestContentData();
      assert.instanceOf(contentData, TextUtils.ContentData.ContentData);
      assert.strictEqual(contentData.text, scriptContent);
    });

    it('throws an error for protocol failures', done => {
      const {script, target} = setupEditTest('1', 'console.log("foo")');
      sinon.stub(target.debuggerAgent(), 'invoke_setScriptSource').returns(Promise.resolve({
        status: undefined as unknown as Protocol.Debugger.SetScriptSourceResponseStatus,  // Make TS happy.
        getError: () => 'setScriptSource failed for some reason',
      }));

      script.editSource('console.log("bar")')
          .then(() => {
            assert.fail('expected "editSource" to throw an exception!');
          })
          .catch(() => done());
    });

    it('fires an event on the DebuggerModel after returning from the backend', async () => {
      const {script, model} = setupEditTest('1', 'console.log("foo")');
      setMockConnectionResponseHandler('Debugger.setScriptSource', () => {
        return {
          status: Protocol.Debugger.SetScriptSourceResponseStatus.Ok,
        };
      });
      const newContent = 'console.log("bar")';
      const eventPromise = model.once(SDK.DebuggerModel.Events.ScriptSourceWasEdited);

      void script.editSource(newContent);

      const {script: eventScript, status} = await eventPromise;
      assert.strictEqual(eventScript, script);
      assert.strictEqual(status, Protocol.Debugger.SetScriptSourceResponseStatus.Ok);
    });
  });
});
