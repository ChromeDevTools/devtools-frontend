// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {StubParsedErrorStackTrace} from '../../testing/StackTraceHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Console from './console.js';
import consoleViewStyles from './consoleView.css.js';
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
    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(universe.workspace);
  });

  function stubSymbolizedError(
      message: string, frames: Array<Partial<StackTrace.StackTrace.ParsedErrorStackFrame>>,
      cause: Bindings.SymbolizedError.SymbolizedError|null = null): Bindings.SymbolizedError.SymbolizedErrorObject {
    const stackTrace = StubParsedErrorStackTrace.create(frames);
    return new Bindings.SymbolizedError.SymbolizedErrorObject(message, stackTrace, cause);
  }

  function getCleanText(widget: Console.SymbolizedErrorWidget.SymbolizedErrorWidget): string {
    return widget.contentElement.innerText.replace(/\n+/g, '\n')
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .trim();
  }

  function getLinkTexts(widget: Console.SymbolizedErrorWidget.SymbolizedErrorWidget): string[] {
    return widget.linkElements.map(el => el.textContent || '');
  }

  it('renders an error without a cause', async () => {
    const error = stubSymbolizedError('Error: simple error', [
      {name: 'foo', url: 'http://example.com/a.js', line: 0, column: 0},
    ]);

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(
        widget, {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
    await widget.updateComplete;

    const actualText = getCleanText(widget);
    const expectedText = `Error: simple error
    at foo (example.com/a.js:1:1)`;
    assert.strictEqual(actualText, expectedText);
    assert.deepEqual(getLinkTexts(widget), ['example.com/a.js:1:1']);
  });

  it('renders an error with a cause and various types of frames', async () => {
    const evalOrigin = {name: '<anonymous>', url: 'http://example.com/b.js', line: 1, column: 1};
    const cause = stubSymbolizedError('Error: cause error', [
      {name: 'eval', url: '<anonymous>', line: 0, column: 0, isEval: true, evalOrigin},
      {name: 'bar', url: 'http://example.com/b.js', line: 1, column: 1},
      {name: 'Promise.all', promiseIndex: 2},
    ]);
    const error = stubSymbolizedError(
        'Error: main error',
        [
          {name: 'asyncFunc', url: 'http://example.com/a.js', line: 0, column: 0, isAsync: true},
          {name: 'Constructor', url: 'http://example.com/a.js', line: 1, column: 1, isConstructor: true},
          {name: 'Type.method', methodName: 'alias', url: 'http://example.com/a.js', line: 2, column: 2},
          {name: 'wasmFunc', url: 'http://example.com/a.wasm', line: 0, column: 0xabc, isWasm: true},
          {name: 'Array.map', url: ''},  // Empty URL for builtin
        ],
        cause);

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(
        widget, {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
    await widget.updateComplete;

    const actualText = getCleanText(widget);
    const expectedText = `Error: main error
    at async asyncFunc (example.com/a.js:1:1)
    at new Constructor (example.com/a.js:2:2)
    at Type.method [as alias] (example.com/a.js:3:3)
    at wasmFunc (example.com/a.wasm:0xabc)
    at Array.map (<anonymous>)
Caused by: Error: cause error
    at eval (eval at <anonymous> (example.com/b.js:2:2), <anonymous>:1:1)
    at bar (example.com/b.js:2:2)
    at Promise.all (index 2)`;
    assert.strictEqual(actualText, expectedText);
    assert.deepEqual(getLinkTexts(widget), [
      'example.com/a.js:1:1',
      'example.com/a.js:2:2',
      'example.com/a.js:3:3',
      'example.com/a.wasm:0xabc',
      'example.com/b.js:2:2',
      '<anonymous>:1:1',
      'example.com/b.js:2:2',
    ]);
  });

  it('renders an UnparsableError', async () => {
    const description =
        'Error: This is an unparsable error. http://example.com/unparsable.js\n    at foo (http://example.com/a.js:1:1)\n    invalid-line-that-fails';
    const error = new Bindings.SymbolizedError.UnparsableError(description, null);

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(widget,
                         {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
    await widget.updateComplete;

    const actualText = getCleanText(widget);
    const expectedText = `Error: This is an unparsable error. http://example.com/unparsable.js
    at foo (http://example.com/a.js:1:1)
    invalid-line-that-fails`;
    assert.strictEqual(actualText, expectedText);
    assert.deepEqual(getLinkTexts(widget), [
      'http://example.com/unparsable.js',
      'http://example.com/a.js:1:1',
    ]);
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

    const stackTrace = StubParsedErrorStackTrace.create([]);
    const error = new Bindings.SymbolizedError.SymbolizedErrorObject('SyntaxError: Unexpected token', stackTrace, null);
    sinon.stub(error, 'syntaxErrorLocation').get(() => uiLocation);

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(widget,
                         {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
    await widget.updateComplete;

    const actualText = getCleanText(widget);
    const expectedText = 'SyntaxError: Unexpected token (at script.js:1:6)';
    assert.strictEqual(actualText, expectedText);
    assert.deepEqual(getLinkTexts(widget), ['script.js:1:6']);
  });

  it('triggers a re-render when the SymbolizedError updates', async () => {
    const error = stubSymbolizedError('Error: simple error', [
      {name: 'foo', url: 'http://example.com/a.js', line: 0, column: 0},
    ]);
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
    const error1 = stubSymbolizedError('Error: error 1', [
      {name: 'foo', url: 'http://example.com/a.js', line: 0, column: 0},
    ]);
    const error2 = stubSymbolizedError('Error: error 2', [
      {name: 'bar', url: 'http://example.com/b.js', line: 1, column: 1},
    ]);

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
    const error = stubSymbolizedError('Error: error', [
      {name: 'foo', url: 'http://example.com/a.js', line: 0, column: 0},
    ]);

    const removeEventListenerSpy = sinon.spy(error, 'removeEventListener');

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;

    renderElementIntoDOM(widget);

    widget.hideWidget();
    sinon.assert.calledOnce(removeEventListenerSpy);
  });

  it('triggers a re-render when the ignoreListManager is set', async () => {
    const error = stubSymbolizedError('Error: simple error', [
      {name: 'foo', url: 'http://example.com/a.js', line: 0, column: 0},
    ]);
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
    const error = stubSymbolizedError('Error: alias error', [
      {name: 'Object.foo', methodName: 'aliased method', url: 'http://example.com/a.js', line: 0, column: 0},
    ]);

    const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widget.ignoreListManager = universe.ignoreListManager;
    widget.error = error;
    renderElementIntoDOM(widget);
    await widget.updateComplete;

    const text = getRenderedText(widget);
    assert.include(text, 'at Object.foo [as aliased method] (');
  });

  it('correctly renders a complex nested eval stack trace', async () => {
    const evalCallerOrigin = {name: 'evalCaller', url: 'http://example.com/index.html', line: 10, column: 44};
    const level1Eval =
        {name: '<anonymous>', url: '<anonymous>', line: 0, column: 0, isEval: true, evalOrigin: evalCallerOrigin};
    const level2Eval =
        {name: '<anonymous>', url: '<anonymous>', line: 0, column: 0, isEval: true, evalOrigin: level1Eval};

    const frame1 = {name: 'end', url: '<anonymous>', line: 0, column: 22, isEval: true, evalOrigin: level2Eval};
    const frame2 = {name: 'eval', url: '<anonymous>', line: 0, column: 43, isEval: true, evalOrigin: level2Eval};
    const frame3 = {name: 'eval', url: '<anonymous>', line: 0, column: 0, isEval: true, evalOrigin: level1Eval};
    const frame4 = {name: 'eval', url: '<anonymous>', line: 0, column: 0, isEval: true, evalOrigin: evalCallerOrigin};
    const frame5 = {name: 'evalCaller', url: 'http://example.com/index.html', line: 14, column: 44};

    const error = stubSymbolizedError('Error: V8-Stack', [frame1, frame2, frame3, frame4, frame5]);

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
    const wasmOrigin = {name: 'wasmFunc', url: 'http://example.com/a.wasm', line: 0, column: 0xabc, isWasm: true};
    const errorWithoutSource = stubSymbolizedError('Error: wasm eval error', [
      {name: 'eval', url: '<anonymous>', line: 0, column: 0, isEval: true, evalOrigin: wasmOrigin},
    ]);

    const widgetWithoutSource = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widgetWithoutSource.ignoreListManager = universe.ignoreListManager;
    widgetWithoutSource.error = errorWithoutSource;
    renderElementIntoDOM(widgetWithoutSource);
    await widgetWithoutSource.updateComplete;

    const textWithoutSource = getRenderedText(widgetWithoutSource);
    assert.include(textWithoutSource, 'at eval (eval at wasmFunc (example.com/a.wasm:0xabc), <anonymous>:1:1)');
    assert.deepEqual(getLinkTexts(widgetWithoutSource), ['example.com/a.wasm:0xabc', '<anonymous>:1:1']);

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
      displayName: () => 'a.wasm',
    } as unknown as Workspace.UISourceCode.UISourceCode;

    const uiLocation = {
      uiSourceCode: mockUiSourceCode,
      lineNumber: 0,
      columnNumber: 2748,  // 0xabc
      linkText: () => 'a.wasm:0xabc',
      isIgnoreListed: () => false,
    } as unknown as Workspace.UISourceCode.UILocation;

    mockUiSourceCode.uiLocation = () => uiLocation;

    const wasmOrigin = {
      name: 'wasmFunc',
      url: 'http://example.com/a.wasm',
      line: 0,
      column: 0xabc,
      isWasm: true,
      uiSourceCode: mockUiSourceCode,
    };
    const errorWithSource = stubSymbolizedError('Error: wasm eval error', [
      {name: 'eval', url: '<anonymous>', line: 0, column: 0, isEval: true, evalOrigin: wasmOrigin},
    ]);

    const widgetWithSource = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
    widgetWithSource.ignoreListManager = universe.ignoreListManager;
    widgetWithSource.error = errorWithSource;
    renderElementIntoDOM(widgetWithSource);
    await widgetWithSource.updateComplete;

    const textWithSource = getRenderedText(widgetWithSource);
    assert.include(textWithSource, 'at eval (eval at wasmFunc (a.wasm:0xabc), <anonymous>:1:1)');
    assert.deepEqual(getLinkTexts(widgetWithSource), ['a.wasm:0xabc', '<anonymous>:1:1']);

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

      const error = stubSymbolizedError('Error: some error', [
        {name: 'foo', url: url1, line: 0, column: 0},
        {name: 'bar', url: url2, line: 1, column: 1},
      ]);

      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(
          widget, {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const expectedTextHidden = `Error: some error
    at bar (example.com/b.js:2:2)`;
      assert.strictEqual(getCleanText(widget), expectedTextHidden);

      const links = widget.linkElements;
      assert.lengthOf(links, 2);
      assert.strictEqual(links[0].textContent, 'example.com/a.js:1:1');
      assert.isTrue(links[0].classList.contains('ignore-list-link'));
      assert.strictEqual(links[1].textContent, 'example.com/b.js:2:2');
      assert.isFalse(links[1].classList.contains('ignore-list-link'));

      widget.contentElement.querySelector('.symbolized-error-widget')?.classList.add('show-hidden-rows');
      await widget.updateComplete;

      const expectedTextShown = `Error: some error
    at foo (example.com/a.js:1:1)
    at bar (example.com/b.js:2:2)`;
      assert.strictEqual(getCleanText(widget), expectedTextShown);
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
    assert.deepEqual(getLinkTexts(widget), ['example.com/a.js:1:1']);
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
    assert.deepEqual(getLinkTexts(widget), ['example.com/a.js:1:1']);
  });

  describe('migrated e2e tests', () => {
    it('Case 1: Standard Error', async () => {
      const error = stubSymbolizedError('Error: Standard Error occurred', [
        {name: 'nested3', url: 'http://example.com/error-demo.html', line: 36, column: 33},
        {name: 'nested2', url: 'http://example.com/error-demo.html', line: 37, column: 27},
        {name: 'nested1', url: 'http://example.com/error-demo.html', line: 38, column: 27},
        {name: 'standardErrorDemo', url: 'http://example.com/error-demo.html', line: 39, column: 6},
        {name: '', url: 'http://example.com/error-demo.html', line: 40, column: 6},
        {name: '', url: 'http://example.com/error-demo.html', line: 221, column: 2},
      ]);
      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `Error: Standard Error occurred
    at nested3 (example.com/error-demo.html:37:34)
    at nested2 (example.com/error-demo.html:38:28)
    at nested1 (example.com/error-demo.html:39:28)
    at standardErrorDemo (example.com/error-demo.html:40:7)
    at example.com/error-demo.html:41:7
    at example.com/error-demo.html:222:3`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), [
        'example.com/error-demo.html:37:34',
        'example.com/error-demo.html:38:28',
        'example.com/error-demo.html:39:28',
        'example.com/error-demo.html:40:7',
        'example.com/error-demo.html:41:7',
        'example.com/error-demo.html:222:3',
      ]);
    });

    it('Case 2: Error from ignore-listed library', async () => {
      universe.ignoreListManager.ignoreListURL(urlString`http://example.com/node_modules/my-lib/index.js`);
      const error = stubSymbolizedError('Error: Error from ignore-listed library', [
        {name: 'ignoredFunc', url: 'http://example.com/node_modules/my-lib/index.js', line: 3, column: 14},
        {name: 'middleFunc', url: 'http://example.com/node_modules/my-lib/index.js', line: 6, column: 8},
        {
          name: 'window.triggerIgnoredError',
          url: 'http://example.com/node_modules/my-lib/index.js',
          line: 8,
          column: 6,
        },
        {name: '', url: 'http://example.com/error-demo.html', line: 59, column: 11},
        {name: '', url: 'http://example.com/error-demo.html', line: 221, column: 2},
      ]);
      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `Error: Error from ignore-listed library
    at example.com/error-demo.html:60:12
    at example.com/error-demo.html:222:3`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), [
        'example.com/node_mod…y-lib/index.js:4:15',
        'example.com/node_mod…my-lib/index.js:7:9',
        'example.com/node_mod…my-lib/index.js:9:7',
        'example.com/error-demo.html:60:12',
        'example.com/error-demo.html:222:3',
      ]);
      const links = widget.linkElements;
      assert.isTrue(links[0].classList.contains('ignore-list-link'));
      assert.isTrue(links[1].classList.contains('ignore-list-link'));
      assert.isTrue(links[2].classList.contains('ignore-list-link'));
      assert.isFalse(links[3].classList.contains('ignore-list-link'));
      assert.isFalse(links[4].classList.contains('ignore-list-link'));
    });

    it('Case 3: Error from nested eval', async () => {
      const error = stubSymbolizedError('Error: Error from nested eval', [
        {name: 'evalLevel2', url: 'http://example.com/internal/eval_level2.js', line: 2, column: 18},
        {name: 'eval', url: 'http://example.com/internal/eval_level2.js', line: 4, column: 10},
        {name: 'evalLevel1', url: 'http://example.com/internal/eval_level1.js', line: 2, column: 8},
        {name: 'eval', url: 'http://example.com/internal/eval_level1.js', line: 10, column: 6},
        {name: '', url: 'http://example.com/error-demo.html', line: 68, column: 4},
        {name: '', url: 'http://example.com/error-demo.html', line: 221, column: 2},
      ]);
      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `Error: Error from nested eval
    at evalLevel2 (example.com/internal/eval_level2.js:3:19)
    at eval (example.com/internal/eval_level2.js:5:11)
    at evalLevel1 (example.com/internal/eval_level1.js:3:9)
    at eval (example.com/internal/eval_level1.js:11:7)
    at example.com/error-demo.html:69:5
    at example.com/error-demo.html:222:3`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), [
        'example.com/internal/eval_level2.js:3:19',
        'example.com/internal/eval_level2.js:5:11',
        'example.com/internal/eval_level1.js:3:9',
        'example.com/internal/eval_level1.js:11:7',
        'example.com/error-demo.html:69:5',
        'example.com/error-demo.html:222:3',
      ]);
    });

    it('Case 4: The main error that the user saw (Error.cause)', async () => {
      const rootCause = stubSymbolizedError('Error: The absolute root cause', [
        {name: '', url: 'http://example.com/error-demo.html', line: 88, column: 25},
        {name: '', url: 'http://example.com/error-demo.html', line: 221, column: 2},
      ]);
      const intermediateCause =
          stubSymbolizedError('Error: The intermediate cause',
                              [
                                {name: '', url: 'http://example.com/error-demo.html', line: 89, column: 18},
                                {name: '', url: 'http://example.com/error-demo.html', line: 221, column: 2},
                              ],
                              rootCause);
      const error = stubSymbolizedError('Error: The main error that the user saw',
                                        [
                                          {name: '', url: 'http://example.com/error-demo.html', line: 90, column: 10},
                                          {name: '', url: 'http://example.com/error-demo.html', line: 221, column: 2},
                                        ],
                                        intermediateCause);
      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `Error: The main error that the user saw
    at example.com/error-demo.html:91:11
    at example.com/error-demo.html:222:3
Caused by: Error: The intermediate cause
    at example.com/error-demo.html:90:19
    at example.com/error-demo.html:222:3
Caused by: Error: The absolute root cause
    at example.com/error-demo.html:89:26
    at example.com/error-demo.html:222:3`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), [
        'example.com/error-demo.html:91:11',
        'example.com/error-demo.html:222:3',
        'example.com/error-demo.html:90:19',
        'example.com/error-demo.html:222:3',
        'example.com/error-demo.html:89:26',
        'example.com/error-demo.html:222:3',
      ]);
    });

    it('Case 5: buggy-script.js (SyntaxError)', async () => {
      const error = stubSymbolizedError('SyntaxError: Unexpected token \'class\'', [
        {name: '', url: 'http://example.com/error-demo.html', line: 99, column: 4},
        {name: '', url: 'http://example.com/error-demo.html', line: 221, column: 2},
      ]);
      // Stub syntaxErrorLocation
      const uiLocation = {
        uiSourceCode: {
          url: () => 'http://example.com/buggy-script.js',
          mimeType: () => 'text/javascript',
        },
        lineNumber: 0,
        columnNumber: 35,
        linkText: () => 'buggy-script.js:1:36',
        isIgnoreListed: () => false,
      } as unknown as Workspace.UISourceCode.UILocation;
      sinon.stub(error, 'syntaxErrorLocation').get(() => uiLocation);

      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `SyntaxError: Unexpected token 'class' (at buggy-script.js:1:36)
    at example.com/error-demo.html:100:5
    at example.com/error-demo.html:222:3`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), [
        'buggy-script.js:1:36',
        'example.com/error-demo.html:100:5',
        'example.com/error-demo.html:222:3',
      ]);
    });

    it('Case 6: Unparsable Error Demo', async () => {
      const stack = `StrangeError: Something weird happened
   [custom protocol] -> raw_action_3948
   at weird-location-without-parens http://example.com/weird:99:99
   !!! random debug dump !!!`;
      const error = new Bindings.SymbolizedError.UnparsableError(stack, null);
      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `StrangeError: Something weird happened
   [custom protocol] -> raw_action_3948
   at weird-location-without-parens http://example.com/weird:99:99
   !!! random debug dump !!!`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), ['http://example.com/weird:99:99']);
    });

    it('Case 7: JS error called from Wasm', async () => {
      const error = stubSymbolizedError('Error: JS error called from Wasm', [
        {name: 'throwJS', url: 'http://example.com/error-demo.html', line: 128, column: 16},
        {name: '', url: 'http://example.com/wasm-module.wasm', line: 0, column: 0x33, isWasm: true},
        {name: '', url: 'http://example.com/error-demo.html', line: 133, column: 21},
      ]);
      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `Error: JS error called from Wasm
    at throwJS (example.com/error-demo.html:129:17)
    at example.com/wasm-module.wasm:0x33
    at example.com/error-demo.html:134:22`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), [
        'example.com/error-demo.html:129:17',
        'example.com/wasm-module.wasm:0x33',
        'example.com/error-demo.html:134:22',
      ]);
    });

    it('Case 8: Top-level application error (Mixed Constellation)', async () => {
      universe.ignoreListManager.ignoreListURL(urlString`http://example.com/node_modules/third-party/eval.js`);
      const rootCause = stubSymbolizedError('Error: Root cause inside eval in third-party', [
        {name: 'evalInThirdParty', url: 'http://example.com/node_modules/third-party/eval.js', line: 4, column: 18},
        {name: '', url: 'http://example.com/error-demo.html', line: 157, column: 11},
      ]);
      const intermediateCause = stubSymbolizedError(
          'Error: Intermediate error inside eval in third-party',
          [
            {name: 'evalInThirdParty', url: 'http://example.com/node_modules/third-party/eval.js', line: 4, column: 18},
            {name: '', url: 'http://example.com/error-demo.html', line: 157, column: 11},
          ],
          rootCause);
      const error = stubSymbolizedError('Error: Top-level application error',
                                        [
                                          {name: '', url: 'http://example.com/error-demo.html', line: 159, column: 18},
                                        ],
                                        intermediateCause);
      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `Error: Top-level application error
    at example.com/error-demo.html:160:19
Caused by: Error: Intermediate error inside eval in third-party
    at example.com/error-demo.html:158:12
Caused by: Error: Root cause inside eval in third-party
    at example.com/error-demo.html:158:12`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), [
        'example.com/error-demo.html:160:19',
        'example.com/node_mod…-party/eval.js:5:19',
        'example.com/error-demo.html:158:12',
        'example.com/node_mod…-party/eval.js:5:19',
        'example.com/error-demo.html:158:12',
      ]);
      const links = widget.linkElements;
      assert.isFalse(links[0].classList.contains('ignore-list-link'));
      assert.isTrue(links[1].classList.contains('ignore-list-link'));
      assert.isFalse(links[2].classList.contains('ignore-list-link'));
      assert.isTrue(links[3].classList.contains('ignore-list-link'));
      assert.isFalse(links[4].classList.contains('ignore-list-link'));
    });

    it('Case 9: Class and Method Error', async () => {
      const error = stubSymbolizedError('Error: Class and Method Error', [
        {name: 'get #staticPrivateAccessor', url: 'http://example.com/error-demo.html', line: 168, column: 14},
        {name: 'get staticPublicAccessor', url: 'http://example.com/error-demo.html', line: 171, column: 25},
        {name: '#staticPrivateMethod', url: 'http://example.com/error-demo.html', line: 174, column: 25},
        {name: 'StackTest.staticPublicMethod', url: 'http://example.com/error-demo.html', line: 177, column: 45},
        {name: 'get #privateAccessor', url: 'http://example.com/error-demo.html', line: 181, column: 25},
        {name: 'get publicAccessor', url: 'http://example.com/error-demo.html', line: 184, column: 20},
        {name: '#privateMethod', url: 'http://example.com/error-demo.html', line: 187, column: 20},
        {name: 'StackTest.publicMethod', url: 'http://example.com/error-demo.html', line: 190, column: 27},
        {name: '', url: 'http://example.com/error-demo.html', line: 194, column: 17},
      ]);
      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `Error: Class and Method Error
    at get #staticPrivateAccessor (example.com/error-demo.html:169:15)
    at get staticPublicAccessor (example.com/error-demo.html:172:26)
    at #staticPrivateMethod (example.com/error-demo.html:175:26)
    at StackTest.staticPublicMethod (example.com/error-demo.html:178:46)
    at get #privateAccessor (example.com/error-demo.html:182:26)
    at get publicAccessor (example.com/error-demo.html:185:21)
    at #privateMethod (example.com/error-demo.html:188:21)
    at StackTest.publicMethod (example.com/error-demo.html:191:28)
    at example.com/error-demo.html:195:18`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), [
        'example.com/error-demo.html:169:15',
        'example.com/error-demo.html:172:26',
        'example.com/error-demo.html:175:26',
        'example.com/error-demo.html:178:46',
        'example.com/error-demo.html:182:26',
        'example.com/error-demo.html:185:21',
        'example.com/error-demo.html:188:21',
        'example.com/error-demo.html:191:28',
        'example.com/error-demo.html:195:18',
      ]);
    });

    it('Case 10: Direct stack log error', async () => {
      const error = stubSymbolizedError('Error: Direct stack log error', [
        {name: 'step3', url: 'http://example.com/error-demo.html', line: 203, column: 31},
        {name: 'step2', url: 'http://example.com/error-demo.html', line: 204, column: 25},
        {name: 'step1', url: 'http://example.com/error-demo.html', line: 205, column: 25},
        {name: 'directStackLogDemo', url: 'http://example.com/error-demo.html', line: 206, column: 6},
        {name: '', url: 'http://example.com/error-demo.html', line: 207, column: 6},
      ]);
      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `Error: Direct stack log error
    at step3 (example.com/error-demo.html:204:32)
    at step2 (example.com/error-demo.html:205:26)
    at step1 (example.com/error-demo.html:206:26)
    at directStackLogDemo (example.com/error-demo.html:207:7)
    at example.com/error-demo.html:208:7`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), [
        'example.com/error-demo.html:204:32',
        'example.com/error-demo.html:205:26',
        'example.com/error-demo.html:206:26',
        'example.com/error-demo.html:207:7',
        'example.com/error-demo.html:208:7',
      ]);
    });

    it('Case 11: Source map Class & Method (eval)', async () => {
      // Add source-mapped file to workspace so Linkifier strips domain
      const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
          universe.workspace, 'project', Workspace.Workspace.projectTypes.Network, '', false);
      project.addContentProvider(
          urlString`http://example.com/class_method_source_map.js`,
          TextUtils.StaticContentProvider.StaticContentProvider.fromString(
              urlString`http://example.com/class_method_source_map.js`, Common.ResourceType.resourceTypes.Script, ''),
          'text/javascript');

      const error = stubSymbolizedError('Error: Source map Class and Method Error', [
        {name: 'get #t', url: 'http://example.com/class_method_source_map.js', line: 2, column: 10},
        {name: 'get staticPublicAccessor', url: 'http://example.com/class_method_source_map.js', line: 5, column: 21},
        {name: '#s', url: 'http://example.com/class_method_source_map.js', line: 8, column: 21},
        {
          name: 'StackTest.staticPublicMethod',
          url: 'http://example.com/class_method_source_map.js',
          line: 11,
          column: 21,
        },
        {name: 'get #c', url: 'http://example.com/class_method_source_map.js', line: 15, column: 21},
        {name: 'get publicAccessor', url: 'http://example.com/class_method_source_map.js', line: 18, column: 16},
        {name: '#e', url: 'http://example.com/class_method_source_map.js', line: 21, column: 16},
        {name: 'StackTest.publicMethod', url: 'http://example.com/class_method_source_map.js', line: 24, column: 9},
        {name: 'startClassChain', url: 'http://example.com/class_method_source_map.js', line: 30, column: 15},
        {name: 'eval', url: 'http://example.com/class_method_source_map.js', line: 33, column: 0},
      ]);
      const widget = new Console.SymbolizedErrorWidget.SymbolizedErrorWidget();
      widget.ignoreListManager = universe.ignoreListManager;
      widget.error = error;
      renderElementIntoDOM(widget,
                           {includeCommonStyles: true, extraStyles: [consoleViewStyles, symbolizedErrorWidgetStyles]});
      await widget.updateComplete;

      const actualText = getCleanText(widget);
      const expectedText = `Error: Source map Class and Method Error
    at get #t (class_method_source_map.js:3:11)
    at get staticPublicAccessor (class_method_source_map.js:6:22)
    at #s (class_method_source_map.js:9:22)
    at StackTest.staticPublicMethod (class_method_source_map.js:12:22)
    at get #c (class_method_source_map.js:16:22)
    at get publicAccessor (class_method_source_map.js:19:17)
    at #e (class_method_source_map.js:22:17)
    at StackTest.publicMethod (class_method_source_map.js:25:10)
    at startClassChain (class_method_source_map.js:31:16)
    at eval (class_method_source_map.js:34:1)`;
      assert.strictEqual(actualText, expectedText);
      assert.deepEqual(getLinkTexts(widget), [
        'class_method_source_map.js:3:11',
        'class_method_source_map.js:6:22',
        'class_method_source_map.js:9:22',
        'class_method_source_map.js:12:22',
        'class_method_source_map.js:16:22',
        'class_method_source_map.js:19:17',
        'class_method_source_map.js:22:17',
        'class_method_source_map.js:25:10',
        'class_method_source_map.js:31:16',
        'class_method_source_map.js:34:1',
      ]);
    });
  });
});
