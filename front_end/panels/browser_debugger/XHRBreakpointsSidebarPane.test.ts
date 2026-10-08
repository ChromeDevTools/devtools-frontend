// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as BrowserDebugger from './browser_debugger.js';

describe('XHRBreakpointsSidebarPane', () => {
  setupLocaleHooks();
  setupRuntimeHooks();
  setupSettingsHooks();

  beforeEach(() => {
    BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.removeInstance();
    UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.DebuggerPausedDetails, null);
    for (const url of SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().keys()) {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().removeXHRBreakpoint(url);
    }
    sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
  });

  afterEach(() => {
    BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.removeInstance();
  });

  it('renders correctly with no breakpoints', async () => {
    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    renderElementIntoDOM(pane, {includeCommonStyles: true, width: 300});
    await assertScreenshot('browser_debugger/xhr_breakpoints_sidebar_pane_empty.png');
  });

  it('renders correctly with some breakpoints', async () => {
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('example.com', false);
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('', true);

    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    renderElementIntoDOM(pane, {includeCommonStyles: true, width: 300});
    // Focus highlighting can interfere with row highlighting, causing flakiness
    // in tests.
    const row = pane.element.shadowRoot?.querySelector('.breakpoint-entry');
    if (row instanceof HTMLElement) {
      row.focus();
    }
    await assertScreenshot('browser_debugger/xhr_breakpoints_sidebar_pane_list.png');
  });

  it('renders correctly when a breakpoint is hit', async () => {
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('example.com', true);

    const target = createTarget();
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, target);
    const model = target.model(SDK.DebuggerModel.DebuggerModel);
    assert.exists(model);
    const details = sinon.createStubInstance(SDK.DebuggerModel.DebuggerPausedDetails);
    details.reason = Protocol.Debugger.PausedEventReason.XHR;
    details.auxData = {breakpointURL: 'api/v1'};
    sinon.stub(model, 'debuggerPausedDetails').returns(details);
    UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.DebuggerPausedDetails, details);

    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    renderElementIntoDOM(pane, {includeCommonStyles: true, width: 300});
    await assertScreenshot('browser_debugger/xhr_breakpoints_sidebar_pane_hit.png');
  });

  it('renders correctly when adding a new breakpoint', async () => {
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    renderElementIntoDOM(pane, {includeCommonStyles: true, width: 300});
    const addButton = pane.addButtonForTest.element;
    assert.exists(addButton);
    addButton.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    await assertScreenshot('browser_debugger/xhr_breakpoints_sidebar_pane_adding.png');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  it('toggles breakpoint enabled state when checkbox is clicked', () => {
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    assert.isTrue(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/v1'));

    const entry = pane.contentElement.querySelector('.breakpoint-entry');
    assert.exists(entry);
    const checkbox = entry.querySelector('.checkbox-label') || entry.querySelector('devtools-checkbox');
    assert.exists(checkbox);
    if (checkbox instanceof HTMLElement) {
      checkbox.click();
    }
    checkbox.dispatchEvent(new Event('change'));
    assert.isFalse(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/v1'));
  });

  it('toggles breakpoint when Space key is pressed on breakpoint entry', () => {
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    assert.isTrue(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/v1'));

    const entry = pane.contentElement.querySelector('.breakpoint-entry');
    assert.exists(entry);
    entry.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true}));
    assert.isFalse(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/v1'));
  });

  it('calls removeXHRBreakpoint when remove option is selected from context menu', () => {
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    const entry = pane.contentElement.querySelector('.breakpoint-entry');
    assert.exists(entry);

    const removeStub = sinon.stub(SDK.DOMDebuggerModel.DOMDebuggerManager.instance(), 'removeXHRBreakpoint');
    sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    const appendItemStub = sinon.stub(UI.ContextMenu.Section.prototype, 'appendItem');

    entry.dispatchEvent(new MouseEvent('contextmenu'));

    const removeCallback = appendItemStub.args.find(args => args[0] === 'Remove breakpoint')?.[1];
    assert.exists(removeCallback);
    removeCallback();

    sinon.assert.calledWith(removeStub, 'api/v1');
  });

  it('calls removeXHRBreakpoint for all breakpoints when remove all option is selected from context menu', () => {
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('example.com', true);
    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    const entry = pane.contentElement.querySelector('.breakpoint-entry');
    assert.exists(entry);

    const removeStub = sinon.stub(SDK.DOMDebuggerModel.DOMDebuggerManager.instance(), 'removeXHRBreakpoint');
    sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    const appendItemStub = sinon.stub(UI.ContextMenu.Section.prototype, 'appendItem');

    entry.dispatchEvent(new MouseEvent('contextmenu'));

    const removeAllCallback = appendItemStub.args.find(args => args[0] === 'Remove all breakpoints')?.[1];
    assert.exists(removeAllCallback);
    removeAllCallback();

    sinon.assert.calledWith(removeStub, 'api/v1');
    sinon.assert.calledWith(removeStub, 'example.com');
  });

  it('adds a breakpoint when commit occurs in editor after clicking add button', async () => {
    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    const addButton = pane.addButtonForTest.element;
    assert.exists(addButton);
    addButton.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    const inputElement = pane.contentElement.querySelector('.breakpoint-condition-input') ||
        pane.contentElement.querySelector('devtools-prompt');
    assert.exists(inputElement);
    if (inputElement.tagName.toLowerCase() === 'devtools-prompt') {
      inputElement.dispatchEvent(new CustomEvent('commit', {detail: 'api/newEndpoint'}));
    } else {
      inputElement.textContent = 'api/newEndpoint';
      inputElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    }

    assert.isTrue(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/newEndpoint'));
  });

  it('edits an existing breakpoint when committed after double clicking', () => {
    SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/oldEndpoint', true);
    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    assert.isTrue(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/oldEndpoint'));

    const entry = pane.contentElement.querySelector('.breakpoint-entry');
    assert.exists(entry);
    const checkboxLabel = entry.querySelector('.checkbox-label') || entry.querySelector('devtools-checkbox') || entry;
    checkboxLabel.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));

    const inputElement = pane.contentElement.querySelector('.breakpoint-condition') ||
        pane.contentElement.querySelector('devtools-prompt');
    assert.exists(inputElement);
    if (inputElement.tagName.toLowerCase() === 'devtools-prompt') {
      inputElement.dispatchEvent(new CustomEvent('commit', {detail: 'api/editedEndpoint'}));
    } else {
      inputElement.textContent = 'api/editedEndpoint';
      inputElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    }

    assert.isFalse(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().has('api/oldEndpoint'));
    assert.isTrue(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/editedEndpoint'));
  });

  it('cancels adding a breakpoint when escape is pressed in editor', async () => {
    const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
    const addButton = pane.addButtonForTest.element;
    assert.exists(addButton);
    addButton.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    const inputElement = pane.contentElement.querySelector('.breakpoint-condition-input') ||
        pane.contentElement.querySelector('devtools-prompt');
    assert.exists(inputElement);
    if (inputElement.tagName.toLowerCase() === 'devtools-prompt') {
      inputElement.dispatchEvent(new CustomEvent('cancel'));
    } else {
      inputElement.textContent = 'api/newEndpoint';
      inputElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    }

    assert.isFalse(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().has('api/newEndpoint'));
    assert.isNull(pane.contentElement.querySelector('.breakpoint-condition-input'));
  });
});
