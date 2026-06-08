// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
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
    const causeStack = 'Error: cause error\n    at bar (http://example.com/b.js:2:2)\n    at Promise.all (index 2)';
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
});
