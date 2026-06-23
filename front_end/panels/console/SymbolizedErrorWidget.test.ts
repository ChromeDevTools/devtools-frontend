// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as StackTrace from '../../models/stack_trace/stack_trace.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {StubStackTrace} from '../../testing/StackTraceHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Console from './console.js';
// eslint-disable-next-line @devtools/es-modules-import
import consoleViewStyles from './consoleView.css.js';
// eslint-disable-next-line @devtools/es-modules-import
import symbolizedErrorWidgetStyles from './symbolizedErrorWidget.css.js';

const {urlString} = Platform.DevToolsPath;

function getRenderedText(widget: Console.SymbolizedErrorWidget.SymbolizedErrorWidget): string {
  return widget.contentElement.innerText.replace(/\s+/g, ' ').trim();
}

describe('SymbolizedErrorWidget', function() {
  setupLocaleHooks();
  setupRuntimeHooks();
  setupSettingsHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  async function createError(stack: string, causeStack?: string) {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);

    let causeRemoteObject;
    if (causeStack) {
      causeRemoteObject = runtimeModel?.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
        description: causeStack,
      });
    }

    const properties: SDK.RemoteObject.RemoteObjectProperty[] = [];
    if (causeRemoteObject) {
      properties.push(new SDK.RemoteObject.RemoteObjectProperty('cause', causeRemoteObject));
    }

    const errorRemoteObject = runtimeModel?.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: stack,
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });
    assert.exists(errorRemoteObject);

    sinon.stub(errorRemoteObject, 'getAllProperties').resolves({
      properties,
      internalProperties: [],
    });

    const error = await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject);
    assert.exists(error);
    return error;
  }

  it('renders an error without a cause', async () => {
    const error = await createError('Error: simple error\n    at foo (http://example.com/a.js:1:1)');

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(
        widget, {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});

    await assertScreenshot('console/symbolized-error-without-cause.png');
  });

  it('renders an error with a cause and various types of frames', async () => {
    const causeStack =
        'Error: cause error\n    at eval (eval at <anonymous> (http://example.com/b.js:2:2), <anonymous>:1:1)\n    at bar (http://example.com/b.js:2:2)\n    at Promise.all (index 2)';
    const errorStack =
        'Error: main error\n    at async asyncFunc (http://example.com/a.js:1:1)\n    at new Constructor (http://example.com/a.js:2:2)\n    at Type.method [as alias] (http://example.com/a.js:3:3)\n    at wasmFunc (http://example.com/a.wasm:wasm-function[12]:0xabc)\n    at Array.map (<anonymous>)';
    const error = await createError(errorStack, causeStack);

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(
        widget, {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});

    await assertScreenshot('console/symbolized-error-with-cause.png');
  });

  it('renders an UnparsableError', async () => {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);

    const description =
        'Error: This is an unparsable error. http://example.com/unparsable.js\n    at foo (http://example.com/a.js:1:1)\n    invalid-line-that-fails';
    const stringRemoteObject = runtimeModel?.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.String,
      value: description,
      description,
    });
    assert.exists(stringRemoteObject);

    const error = await universe.debuggerWorkspaceBinding.createSymbolizedError(stringRemoteObject);
    assert.instanceOf(error, Bindings.SymbolizedError.UnparsableError);

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(widget,
                         {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
    await widget.updateComplete;

    await assertScreenshot('console/symbolized-unparsable-error.png');
  });

  it('renders a SymbolizedErrorObject for a SyntaxError', async () => {
    const uiLocation = {
      uiSourceCode: {
        url: () => 'http://example.com/script.js',
        mimeType: () => 'text/javascript',
      },
      lineNumber: 0,
      columnNumber: 5,
      linkText: () => 'script.js:1:6',
      isIgnoreListed: () => false,
    } as unknown as Workspace.UISourceCode.UILocation;

    const stackTrace = StubStackTrace.create([]) as unknown as StackTrace.StackTrace.ParsedErrorStackTrace;
    const error = new Bindings.SymbolizedError.SymbolizedErrorObject('SyntaxError: Unexpected token', stackTrace, null);
    sinon.stub(error, 'syntaxErrorLocation').get(() => uiLocation);

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(widget,
                         {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
    await widget.updateComplete;

    await assertScreenshot('console/symbolized-syntax-error.png');
  });

  it('triggers a re-render when the SymbolizedError updates', async () => {
    const error = await createError('Error: simple error\n    at foo (http://example.com/a.js:1:1)');
    const view = createViewFunctionStub(Console.SymbolizedErrorWidget.SymbolizedErrorWidget);
    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget(undefined, view);
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;

    renderElementIntoDOM(widget);
    await view.nextInput;  // initial render

    error.dispatchEventToListeners(Bindings.SymbolizedError.Events.UPDATED);

    const input = await view.nextInput;
    assert.strictEqual(input.error, error);
  });

  it('registers and unregisters the listener when the error is set', async () => {
    const error1 = await createError('Error: error 1\n    at foo (http://example.com/a.js:1:1)');
    const error2 = await createError('Error: error 2\n    at bar (http://example.com/b.js:2:2)');

    const addEventListenerSpy1 = sinon.spy(error1, 'addEventListener');
    const removeEventListenerSpy1 = sinon.spy(error1, 'removeEventListener');
    const addEventListenerSpy2 = sinon.spy(error2, 'addEventListener');

    const view = createViewFunctionStub(Console.SymbolizedErrorWidget.SymbolizedErrorWidget);
    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget(undefined, view);
    widget.ignoreListManager = universe.ignoreListManager;

    // Set error before the widget is shown
    widget.error = error1;
    sinon.assert.notCalled(addEventListenerSpy1);

    // Showing the widget should register the listener
    renderElementIntoDOM(widget);
    sinon.assert.calledOnce(addEventListenerSpy1);

    // Setting a new error should unregister from the old and register to the new
    widget.error = error2;
    sinon.assert.calledOnce(removeEventListenerSpy1);
    sinon.assert.calledOnce(addEventListenerSpy2);
  });

  it('unregisters the listener when the widget is hidden', async () => {
    const error = await createError('Error: error\n    at foo (http://example.com/a.js:1:1)');

    const removeEventListenerSpy = sinon.spy(error, 'removeEventListener');

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;

    renderElementIntoDOM(widget);

    widget.hideWidget();
    sinon.assert.calledOnce(removeEventListenerSpy);
  });

  it('triggers a re-render when the ignoreListManager is set', async () => {
    const error = await createError('Error: simple error\n    at foo (http://example.com/a.js:1:1)');
    const view = createViewFunctionStub(Console.SymbolizedErrorWidget.SymbolizedErrorWidget);
    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget(undefined, view);
    widget.error = error;

    renderElementIntoDOM(widget);
    await view.nextInput;  // initial render

    widget.ignoreListManager = universe.ignoreListManager;

    const input = await view.nextInput;
    assert.strictEqual(input.ignoreListManager, universe.ignoreListManager);
  });

  it('correctly renders aliased frames with spaces', async () => {
    const stack = 'Error: alias error\n    at Object.foo [as aliased method] (http://example.com/a.js:1:1)';
    const error = await createError(stack);

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(widget);
    await widget.updateComplete;

    const text = getRenderedText(widget);
    assert.include(text, 'at Object.foo [as aliased method] (');
  });

  it('correctly renders a complex nested eval stack trace', async () => {
    const target = universe.createTarget({});
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(debuggerModel);

    // Create a single script for the outer execution context so `translate` works.
    const executionContextId = 1 as Protocol.Runtime.ExecutionContextId;
    const scriptId = '1' as Protocol.Runtime.ScriptId;
    debuggerModel.parsedScriptSource(scriptId, urlString`http://example.com/index.html`, 0, 0, 0, 0, executionContextId,
                                     '', undefined, false, undefined, false, false, 0, false, null, null, null, null,
                                     null, null);

    const stack = `Error: V8-Stack
    at end (eval at <anonymous> (eval at <anonymous> (eval at evalCaller (http://example.com/index.html:11:45))), <anonymous>:1:23)
    at eval (eval at <anonymous> (eval at <anonymous> (eval at evalCaller (http://example.com/index.html:11:45))), <anonymous>:1:44)
    at eval (eval at <anonymous> (eval at evalCaller (http://example.com/index.html:11:45)), <anonymous>:1:1)
    at eval (eval at evalCaller (http://example.com/index.html:11:45), <anonymous>:1:1)
    at evalCaller (http://example.com/index.html:15:45)`;

    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const errorRemoteObject = runtimeModel.createRemoteObject({
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: stack,
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
    });

    // Augment exception details with a fake protocol stack trace holding scriptIds so `createSymbolizedError` uses our mocked script.
    const exceptionDetails: Protocol.Runtime.ExceptionDetails = {
      exceptionId: 1,
      text: 'Uncaught',
      lineNumber: 10,
      columnNumber: 44,
      stackTrace: {
        callFrames: [
          // The outer most frame in the V8 stack string is `evalCaller`, its URL matches `http://example.com/index.html`.
          {
            functionName: 'evalCaller',
            scriptId,
            url: 'http://example.com/index.html',
            lineNumber: 14,
            columnNumber: 44,
          }
        ],
      },
    };

    const error = await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject, exceptionDetails);
    assert.exists(error);

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(widget);
    await widget.updateComplete;

    const updatedText = getRenderedText(widget);

    assert.include(
        updatedText,
        'at end (eval at <anonymous> (eval at <anonymous> (eval at evalCaller (example.com/index.html:11:45))), <anonymous>:1:23)');
    assert.include(
        updatedText,
        'at eval (eval at <anonymous> (eval at <anonymous> (eval at evalCaller (example.com/index.html:11:45))), <anonymous>:1:44)');
    assert.include(
        updatedText,
        'at eval (eval at <anonymous> (eval at evalCaller (example.com/index.html:11:45)), <anonymous>:1:1)');
    assert.include(updatedText, 'at eval (eval at evalCaller (example.com/index.html:11:45), <anonymous>:1:1)');
    assert.include(updatedText, 'at evalCaller (example.com/index.html:15:45)');
  });

  it('correctly renders a WASM frame inside an eval origin (without uiSourceCode)', async () => {
    const stack =
        'Error: wasm eval error\n    at eval (eval at wasmFunc (http://example.com/a.wasm:wasm-function[12]:0xabc), <anonymous>:1:1)';
    const errorWithoutSource = await createError(stack);

    const widgetWithoutSource = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widgetWithoutSource.ignoreListManager = universe.ignoreListManager;
    widgetWithoutSource.error = errorWithoutSource;
    renderElementIntoDOM(widgetWithoutSource);
    await widgetWithoutSource.updateComplete;

    const textWithoutSource = getRenderedText(widgetWithoutSource);
    assert.include(textWithoutSource, 'at eval (eval at wasmFunc (example.com/a.wasm:0xabc), <anonymous>:1:1)');

    // Verify that it is rendered as a clickable button (tag name is BUTTON)
    const linkElementWithoutSource = widgetWithoutSource.contentElement.querySelector('.devtools-link');
    assert.exists(linkElementWithoutSource);
    assert.strictEqual(linkElementWithoutSource!.tagName, 'BUTTON');
  });

  it('correctly renders a WASM frame inside an eval origin (with uiSourceCode)', async () => {
    // Create a fake uiLocation with uiSourceCode for a WASM file
    const mockUiSourceCode = {
      url: () => 'http://example.com/a.wasm',
      mimeType: () => 'application/wasm',
    } as unknown as Workspace.UISourceCode.UISourceCode;

    const uiLocation = {
      uiSourceCode: mockUiSourceCode,
      lineNumber: 0,
      columnNumber: 2748,  // 0xabc
      linkText: () => 'a.wasm:0xabc',
      isIgnoreListed: () => false,
    } as unknown as Workspace.UISourceCode.UILocation;

    mockUiSourceCode.uiLocation = () => uiLocation;

    const mockLocation = {} as SDK.DebuggerModel.Location;
    sinon.stub(SDK.DebuggerModel.DebuggerModel.prototype, 'createRawLocationByURL').returns(mockLocation);

    // Stub CompilerScriptMapping prototype to return our mocked uiLocation directly
    sinon.stub(Bindings.CompilerScriptMapping.CompilerScriptMapping.prototype, 'rawLocationToUILocation')
        .returns(uiLocation);

    const stack =
        'Error: wasm eval error\n    at eval (eval at wasmFunc (http://example.com/a.wasm:wasm-function[12]:0xabc), <anonymous>:1:1)';
    const errorWithSource = await createError(stack);

    const widgetWithSource = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widgetWithSource.ignoreListManager = universe.ignoreListManager;
    widgetWithSource.error = errorWithSource;
    renderElementIntoDOM(widgetWithSource);
    await widgetWithSource.updateComplete;

    const textWithSource = getRenderedText(widgetWithSource);
    assert.include(textWithSource, 'at eval (eval at wasmFunc (a.wasm:0xabc), a.wasm:0xabc)');

    // Verify that it is rendered as a clickable anchor (tag name is A or behaves as a link)
    const linkElementWithSource = widgetWithSource.contentElement.querySelector('.devtools-link');
    assert.exists(linkElementWithSource);
    assert.strictEqual(linkElementWithSource.tagName, 'BUTTON');
  });

  describe('ignore-listing', () => {
    it('hides ignored frames and shows them when show-hidden-rows is set', async () => {
      const url1 = urlString`http://example.com/a.js`;
      const url2 = 'http://example.com/b.js';
      universe.ignoreListManager.ignoreListURL(url1);

      const error = await createError(`Error: some error\n    at foo (${url1}:1:1)\n    at bar (${url2}:2:2)`);

      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(
          widget, {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});

      await assertScreenshot('console/symbolized-error-with-ignored-frame-hidden.png');

      widget.contentElement.querySelector('.symbolized-error-widget')?.classList.add('show-hidden-rows');
      await assertScreenshot('console/symbolized-error-with-ignored-frame-shown.png');
    });
  });

  it('prefers rawName over name when rendering the function name', async () => {
    const mockFrame = {
      name: 'translatedName',
      rawName: 'originalName',
      line: 0,
      column: 0,
      url: 'http://example.com/a.js',
    } as unknown as StackTrace.StackTrace.ParsedErrorStackFrame;

    const mockStackTrace = {
      syncFragment: {
        frames: [mockFrame],
      },
      asyncFragments: [],
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as StackTrace.StackTrace.ParsedErrorStackTrace;

    const mockError = {
      message: 'Error message',
      stackTrace: mockStackTrace,
      cause: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEventToListeners: () => {},
    } as unknown as Bindings.SymbolizedError.SymbolizedError;

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = mockError;

    renderElementIntoDOM(widget);
    await widget.updateComplete;

    const text = getRenderedText(widget);
    assert.include(text, 'originalName');
    assert.notInclude(text, 'translatedName');
  });

  it('prefers name over rawName when rendering the function name if isInline is true', async () => {
    const mockFrame = {
      name: 'translatedName',
      rawName: 'originalName',
      line: 0,
      column: 0,
      url: 'http://example.com/a.js',
      isInline: true,
    } as unknown as StackTrace.StackTrace.ParsedErrorStackFrame;

    const mockStackTrace = {
      syncFragment: {
        frames: [mockFrame],
      },
      asyncFragments: [],
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as StackTrace.StackTrace.ParsedErrorStackTrace;

    const mockError = {
      message: 'Error message',
      stackTrace: mockStackTrace,
      cause: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEventToListeners: () => {},
    } as unknown as Bindings.SymbolizedError.SymbolizedError;

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = mockError;

    renderElementIntoDOM(widget);
    await widget.updateComplete;

    const text = getRenderedText(widget);
    assert.include(text, 'translatedName');
    assert.notInclude(text, 'originalName');
  });
});
