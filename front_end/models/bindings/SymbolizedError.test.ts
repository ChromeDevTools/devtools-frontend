// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {StubStackTrace} from '../../testing/StackTraceHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
import type * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

describe('SymbolizedError', () => {
  setupRuntimeHooks();
  setupSettingsHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  async function createSymbolizedErrorWithCause() {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const errorStack = 'Error: some error\n    at http://example.com/script.js:1:1';
    const causeStack = 'Error: cause error\n    at http://example.com/script.js:2:2';

    const causeRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: causeStack,
    });

    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: errorStack,
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({
      properties: [new SDK.RemoteObject.RemoteObjectProperty('cause', causeRemoteObject)],
      internalProperties: [],
    });

    return await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject);
  }

  it('can create a SymbolizedError from a RemoteObject', async () => {
    const symbolizedError = await createSymbolizedErrorWithCause();

    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.SymbolizedErrorObject);
    assert.strictEqual(symbolizedError.message, 'Error: some error');
    assert.strictEqual(symbolizedError.stackTrace.syncFragment.frames[0].url, 'http://example.com/script.js');

    const cause = symbolizedError.cause;
    assert.instanceOf(cause, Bindings.SymbolizedError.SymbolizedErrorObject);
    assert.strictEqual(cause.message, 'Error: cause error');
    assert.strictEqual(cause.stackTrace.syncFragment.frames[0].url, 'http://example.com/script.js');
    assert.strictEqual(cause.stackTrace.syncFragment.frames[0].line, 1);  // 0-based in frames
  });

  it('returns null if the RemoteObject is not an error', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const nonErrorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Null,
    });

    const result = await universe.debuggerWorkspaceBinding.createSymbolizedError(nonErrorRemoteObject);
    assert.isNull(result);
  });

  it('returns an UnparsableError if the error stack cannot be parsed', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: 'Error: message\n    at http://example.com/script.js:1:1\ninvalid line',
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({
      properties: [],
      internalProperties: [],
    });

    const result = await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject);
    assert.instanceOf(result, Bindings.SymbolizedError.UnparsableError);
    assert.strictEqual(result.errorStack, errorRemoteObject.description);
    assert.isNull(result.cause);
  });

  it('can create an UnparsableError with a parsable cause', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const causeStack = 'Error: cause error\n    at http://example.com/script.js:2:2';
    const causeRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: causeStack,
    });

    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: 'Error: message\n    at http://example.com/script.js:1:1\ninvalid line',
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({
      properties: [new SDK.RemoteObject.RemoteObjectProperty('cause', causeRemoteObject)],
      internalProperties: [],
    });

    const result = await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject);
    assert.instanceOf(result, Bindings.SymbolizedError.UnparsableError);
    assert.strictEqual(result.errorStack, errorRemoteObject.description);
    assert.instanceOf(result.cause, Bindings.SymbolizedError.SymbolizedErrorObject);
    assert.strictEqual(result.cause.message, 'Error: cause error');
    assert.strictEqual(result.cause.stackTrace.syncFragment.frames[0].url, 'http://example.com/script.js');
  });

  it('can create a SymbolizedError from a string RemoteObject', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const stringRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.String,
      value: 'Error: string error\n    at http://example.com/script.js:1:1',
      description: 'Error: string error\n    at http://example.com/script.js:1:1',
    });

    const symbolizedError = await universe.debuggerWorkspaceBinding.createSymbolizedError(stringRemoteObject);

    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.SymbolizedErrorObject);
    assert.strictEqual(symbolizedError.message, 'Error: string error');
    assert.strictEqual(symbolizedError.stackTrace.syncFragment.frames[0].url, 'http://example.com/script.js');
    assert.isNull(symbolizedError.cause);
  });

  it('can create a SymbolizedSyntaxError from a SyntaxError RemoteObject', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);

    const scriptId = '1' as Protocol.Runtime.ScriptId;
    const exceptionDetails = {
      exception: {
        subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
        className: 'SyntaxError',
        description: 'SyntaxError: Unexpected token',
      },
      scriptId,
      lineNumber: 1,
      columnNumber: 1,
    } as Protocol.Runtime.ExceptionDetails;

    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      className: 'SyntaxError',
      description: 'SyntaxError: Unexpected token',
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({properties: [], internalProperties: []});

    sinon.stub(debuggerModel, 'scriptForId').withArgs(scriptId).returns({} as SDK.Script.Script);

    const uiLocation = {} as Workspace.UISourceCode.UILocation;
    const liveLocation = {
      uiLocation: async () => uiLocation,
      dispose: () => {},
    } as Bindings.LiveLocation.LiveLocation;

    sinon.stub(universe.debuggerWorkspaceBinding, 'createLiveLocation')
        .callsFake(async (_rawLocation, updateDelegate, _pool) => {
          await updateDelegate(liveLocation);
          return liveLocation as unknown as Bindings.DebuggerWorkspaceBinding.Location;
        });

    const symbolizedError =
        await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject, exceptionDetails);

    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.SymbolizedErrorObject);
    assert.strictEqual(symbolizedError.message, 'SyntaxError: Unexpected token');
  });

  it('returns null for a basic string RemoteObject', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const stringRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.String,
      value: 'just a regular string',
      description: 'just a regular string',
    });

    const result = await universe.debuggerWorkspaceBinding.createSymbolizedError(stringRemoteObject);
    assert.isNull(result);
  });

  it('returns an UnparsableError for a string RemoteObject if the stack trace cannot be parsed', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const description = 'Error: string error\n    at http://example.com/script.js:1:1\ninvalid line';
    const stringRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.String,
      value: description,
      description,
    });

    const result = await universe.debuggerWorkspaceBinding.createSymbolizedError(stringRemoteObject);
    assert.instanceOf(result, Bindings.SymbolizedError.UnparsableError);
    assert.strictEqual(result.errorStack, stringRemoteObject.description);
    assert.isNull(result.cause);
  });

  it('uses the provided exceptionDetails preferentially', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: 'Error: error\n    at http://example.com/script.js:1:1',
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({properties: [], internalProperties: []});

    const exceptionDetails = {
      exceptionId: 1,
      text: 'Uncaught',
      lineNumber: 0,
      columnNumber: 0,
    } as Protocol.Runtime.ExceptionDetails;

    const invokeGetExceptionDetailsSpy = sinon.spy(target.runtimeAgent(), 'invoke_getExceptionDetails');

    const symbolizedError =
        await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject, exceptionDetails);

    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.SymbolizedErrorObject);
    assert.strictEqual(symbolizedError.message, 'Error: error');
    sinon.assert.notCalled(invokeGetExceptionDetailsSpy);
  });

  it('includes issueSummary in the message if provided in exceptionDetails', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: 'Error: error\n    at http://example.com/script.js:1:1',
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({properties: [], internalProperties: []});

    const exceptionDetails = {
      exceptionId: 1,
      text: 'Uncaught',
      lineNumber: 0,
      columnNumber: 0,
      exceptionMetaData: {
        issueSummary: 'This is an issue summary',
      },
    } as Protocol.Runtime.ExceptionDetails;

    const symbolizedError =
        await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject, exceptionDetails);

    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.SymbolizedErrorObject);
    assert.strictEqual(symbolizedError.message, 'Error: error. This is an issue summary');
    assert.strictEqual(symbolizedError.stackTrace.syncFragment.frames[0].url, 'http://example.com/script.js');
    assert.strictEqual(symbolizedError.stackTrace.syncFragment.frames[0].line, 0);
  });

  it('includes issueSummary in the errorStack for an UnparsableError', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: 'Error: message\n    at http://example.com/script.js:1:1\ninvalid line',
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({properties: [], internalProperties: []});

    const exceptionDetails = {
      exceptionId: 1,
      text: 'Uncaught',
      lineNumber: 0,
      columnNumber: 0,
      exceptionMetaData: {
        issueSummary: 'This is an issue summary',
      },
    } as Protocol.Runtime.ExceptionDetails;

    const symbolizedError =
        await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject, exceptionDetails);

    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.UnparsableError);
    assert.strictEqual(
        symbolizedError.errorStack,
        'Error: message. This is an issue summary\n    at http://example.com/script.js:1:1\ninvalid line');
  });

  it('emits UPDATED when stackTrace or cause updates', async () => {
    const symbolizedError = await createSymbolizedErrorWithCause();
    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.SymbolizedErrorObject);

    const listener = sinon.stub();
    symbolizedError.addEventListener(Bindings.SymbolizedError.Events.UPDATED, listener);

    // Trigger update on the main error's stackTrace
    symbolizedError.stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    sinon.assert.callCount(listener, 1);

    // Trigger update on the cause error's stackTrace
    const cause = symbolizedError.cause;
    assert.instanceOf(cause, Bindings.SymbolizedError.SymbolizedErrorObject);
    cause.stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    sinon.assert.callCount(listener, 2);

    // Trigger update on the cause error directly
    symbolizedError.cause?.dispatchEventToListeners(Bindings.SymbolizedError.Events.UPDATED);
    sinon.assert.callCount(listener, 3);
  });

  it('removes listeners when dispose is called', async () => {
    const symbolizedError = await createSymbolizedErrorWithCause();
    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.SymbolizedErrorObject);

    const listener = sinon.stub();
    symbolizedError.addEventListener(Bindings.SymbolizedError.Events.UPDATED, listener);

    symbolizedError.dispose();

    // Trigger update on the main error's stackTrace
    symbolizedError.stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    sinon.assert.notCalled(listener);

    // Trigger update on the cause error's stackTrace
    const cause = symbolizedError.cause;
    assert.instanceOf(cause, Bindings.SymbolizedError.SymbolizedErrorObject);
    cause.stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    sinon.assert.notCalled(listener);

    // Trigger update on the cause error directly
    symbolizedError.cause?.dispatchEventToListeners(Bindings.SymbolizedError.Events.UPDATED);
    sinon.assert.notCalled(listener);
  });

  it('UnparsableError emits UPDATED when its cause updates', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const causeStack = 'Error: cause error\n    at http://example.com/script.js:2:2';
    const causeRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: causeStack,
    });

    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: 'Error: message\n    at http://example.com/script.js:1:1\ninvalid line',
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({
      properties: [new SDK.RemoteObject.RemoteObjectProperty('cause', causeRemoteObject)],
      internalProperties: [],
    });

    const symbolizedError = await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject);
    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.UnparsableError);

    const listener = sinon.stub();
    symbolizedError.addEventListener(Bindings.SymbolizedError.Events.UPDATED, listener);

    // Trigger update on the cause error's stackTrace
    const cause = symbolizedError.cause;
    assert.instanceOf(cause, Bindings.SymbolizedError.SymbolizedErrorObject);
    cause.stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    sinon.assert.callCount(listener, 1);

    // Trigger update on the cause error directly
    symbolizedError.cause?.dispatchEventToListeners(Bindings.SymbolizedError.Events.UPDATED);
    sinon.assert.callCount(listener, 2);
  });

  it('UnparsableError removes listeners when dispose is called', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const causeStack = 'Error: cause error\n    at http://example.com/script.js:2:2';
    const causeRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: causeStack,
    });

    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: 'Error: message\n    at http://example.com/script.js:1:1\ninvalid line',
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({
      properties: [new SDK.RemoteObject.RemoteObjectProperty('cause', causeRemoteObject)],
      internalProperties: [],
    });

    const symbolizedError = await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject);
    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.UnparsableError);

    const listener = sinon.stub();
    symbolizedError.addEventListener(Bindings.SymbolizedError.Events.UPDATED, listener);

    symbolizedError.dispose();

    // Trigger update on the cause error's stackTrace
    const cause = symbolizedError.cause;
    assert.instanceOf(cause, Bindings.SymbolizedError.SymbolizedErrorObject);
    cause.stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    sinon.assert.notCalled(listener);

    // Trigger update on the cause error directly
    symbolizedError.cause?.dispatchEventToListeners(Bindings.SymbolizedError.Events.UPDATED);
    sinon.assert.notCalled(listener);
  });

  describe('SymbolizedErrorObject.createForSyntaxError', () => {
    it('can create a SymbolizedErrorObject with syntaxErrorLocation from exception details', async () => {
      const target = universe.createTarget({});
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);

      const scriptId = '1' as Protocol.Runtime.ScriptId;
      const exceptionDetails = {
        exception: {
          subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
          className: 'SyntaxError',
          description: 'SyntaxError: Unexpected token',
        },
        scriptId,
        lineNumber: 1,
        columnNumber: 1,
      } as Protocol.Runtime.ExceptionDetails;

      sinon.stub(debuggerModel, 'scriptForId').withArgs(scriptId).returns({} as SDK.Script.Script);

      const uiLocation = {} as Workspace.UISourceCode.UILocation;
      const liveLocation = {
        uiLocation: async () => uiLocation,
        dispose: () => {},
      } as Bindings.LiveLocation.LiveLocation;

      const createLiveLocationStub = sinon.stub(universe.debuggerWorkspaceBinding, 'createLiveLocation')
                                         .callsFake(async (_rawLocation, updateDelegate, _pool) => {
                                           await updateDelegate(liveLocation);
                                           return liveLocation as unknown as Bindings.DebuggerWorkspaceBinding.Location;
                                         });

      const stackTrace = StubStackTrace.create([]) as unknown as StackTrace.StackTrace.ParsedErrorStackTrace;
      const message = 'SyntaxError: Unexpected token';
      const cause = null;

      const symbolizedError = await Bindings.SymbolizedError.SymbolizedErrorObject.createForSyntaxError(
          target, universe.debuggerWorkspaceBinding, message, exceptionDetails, stackTrace, cause);

      assert.strictEqual(symbolizedError.message, 'SyntaxError: Unexpected token');
      assert.strictEqual(symbolizedError.syntaxErrorLocation, uiLocation);

      sinon.assert.calledOnce(createLiveLocationStub);
    });

    it('throws if the exception is not a SyntaxError', async () => {
      const target = universe.createTarget({});
      const exceptionDetails = {
        exception: {
          subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
          className: 'TypeError',
        },
      } as Protocol.Runtime.ExceptionDetails;

      const stackTrace = StubStackTrace.create([]) as unknown as StackTrace.StackTrace.ParsedErrorStackTrace;

      let error: Error|null = null;
      try {
        await Bindings.SymbolizedError.SymbolizedErrorObject.createForSyntaxError(
            target, universe.debuggerWorkspaceBinding, '', exceptionDetails, stackTrace, null);
      } catch (e) {
        error = e as Error;
      }
      assert.exists(error);
      assert.strictEqual(error?.message, 'SymbolizedErrorObject.createForSyntaxError expects a SyntaxError');
    });

    it('does not create live location if scriptId is missing', async () => {
      const target = universe.createTarget({});
      const exceptionDetails = {
        exception: {
          subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
          className: 'SyntaxError',
        },
      } as Protocol.Runtime.ExceptionDetails;

      const stackTrace = StubStackTrace.create([]) as unknown as StackTrace.StackTrace.ParsedErrorStackTrace;

      const createLiveLocationSpy = sinon.spy(universe.debuggerWorkspaceBinding, 'createLiveLocation');

      const result = await Bindings.SymbolizedError.SymbolizedErrorObject.createForSyntaxError(
          target, universe.debuggerWorkspaceBinding, '', exceptionDetails, stackTrace, null);
      assert.isNull(result.syntaxErrorLocation);
      sinon.assert.notCalled(createLiveLocationSpy);
    });

    it('emits UPDATED when the live location updates', async () => {
      const target = universe.createTarget({});
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);

      const scriptId = '1' as Protocol.Runtime.ScriptId;
      const exceptionDetails = {
        exception: {
          subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
          className: 'SyntaxError',
          description: 'SyntaxError: Unexpected token',
        },
        scriptId,
        lineNumber: 1,
        columnNumber: 1,
      } as Protocol.Runtime.ExceptionDetails;

      sinon.stub(debuggerModel, 'scriptForId').withArgs(scriptId).returns({} as SDK.Script.Script);

      let updateDelegateCallback: ((liveLocation: Bindings.LiveLocation.LiveLocation) => Promise<void>)|null = null;
      const liveLocation = {
        uiLocation: sinon.stub(),
        dispose: () => {},
      } as unknown as Bindings.LiveLocation.LiveLocation;

      sinon.stub(universe.debuggerWorkspaceBinding, 'createLiveLocation')
          .callsFake(async (_rawLocation, updateDelegate, _pool) => {
            updateDelegateCallback = updateDelegate;
            await updateDelegate(liveLocation);
            return liveLocation as unknown as Bindings.DebuggerWorkspaceBinding.Location;
          });

      const stackTrace = StubStackTrace.create([]) as unknown as StackTrace.StackTrace.ParsedErrorStackTrace;
      const message = 'SyntaxError: Unexpected token';

      const symbolizedError = await Bindings.SymbolizedError.SymbolizedErrorObject.createForSyntaxError(
          target, universe.debuggerWorkspaceBinding, message, exceptionDetails, stackTrace, null);

      const updatedListener = sinon.stub();
      symbolizedError.addEventListener(Bindings.SymbolizedError.Events.UPDATED, updatedListener);

      assert.exists(updateDelegateCallback);
      await (updateDelegateCallback as (liveLocation: Bindings.LiveLocation.LiveLocation) =>
                 Promise<void>)(liveLocation);

      sinon.assert.calledOnce(updatedListener);
    });
  });

  it('returns a SymbolizedErrorObject for a programmatic SyntaxError without exceptionDetails', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      className: 'SyntaxError',
      description: 'SyntaxError: programmatic error\n    at http://example.com/script.js:10:5',
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({properties: [], internalProperties: []});

    const symbolizedError = await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject);

    assert.instanceOf(symbolizedError, Bindings.SymbolizedError.SymbolizedErrorObject);
    assert.strictEqual(symbolizedError.message, 'SyntaxError: programmatic error');
  });
});
