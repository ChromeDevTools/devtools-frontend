// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import {render} from '../../ui/lit/lit.js';

import * as BrowserDebugger from './browser_debugger.js';

function getAddButton(pane: BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane): HTMLElement {
  const container = document.createElement('div');
  render(pane.toolbarItems(), container);
  const button = container.querySelector('devtools-button');
  assert.exists(button);
  return button;
}

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
    const addButton = getAddButton(pane);
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
    const addButton = getAddButton(pane);
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
    const addButton = getAddButton(pane);
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

  describe('View and Presenter interactions', () => {
    it('creates empty view input when no breakpoints exist', () => {
      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);
      assert.deepEqual(view.input.breakpoints, []);
      assert.isFalse(view.input.isAdding);
    });

    it('maps breakpoints and hit status to view input', () => {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('example.com', false);

      const target = createTarget();
      UI.Context.Context.instance().setFlavor(SDK.Target.Target, target);
      const model = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(model);
      const details = sinon.createStubInstance(SDK.DebuggerModel.DebuggerPausedDetails);
      details.reason = Protocol.Debugger.PausedEventReason.XHR;
      details.auxData = {breakpointURL: 'api/v1'};
      sinon.stub(model, 'debuggerPausedDetails').returns(details);
      UI.Context.Context.instance().setFlavor(SDK.DebuggerModel.DebuggerPausedDetails, details);

      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);

      assert.lengthOf(view.input.breakpoints, 2);
      const hitItem = view.input.breakpoints.find(b => b.url === 'api/v1');
      assert.exists(hitItem);
      assert.isTrue(hitItem.isHit);
      assert.isTrue(hitItem.enabled);

      const otherItem = view.input.breakpoints.find(b => b.url === 'example.com');
      assert.exists(otherItem);
      assert.isFalse(otherItem.isHit);
      assert.isFalse(otherItem.enabled);
    });

    it('toggles breakpoint enabled state via onBreakpointCheckboxChange', () => {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);
      assert.isTrue(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/v1'));

      view.input.onBreakpointCheckboxChange('api/v1');
      assert.isFalse(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/v1'));

      view.input.onBreakpointCheckboxChange('api/v1');
      assert.isTrue(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/v1'));
    });

    it('handles add lifecycle via onAddCommit and onAddCancel', async () => {
      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);

      await pane.addButtonClicked();
      assert.isTrue(view.input.isAdding);

      view.input.onAddCancel();
      assert.isFalse(view.input.isAdding);

      await pane.addButtonClicked();
      assert.isTrue(view.input.isAdding);
      view.input.onAddCommit('api/test');
      assert.isFalse(view.input.isAdding);
      assert.isTrue(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/test'));
    });

    it('handles edit lifecycle via onStartEditing, onEditCommit, and onEditCancel', () => {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/old', true);
      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);

      view.input.onStartEditing('api/old');
      assert.isTrue(view.input.breakpoints.find(b => b.url === 'api/old')?.isEditing);

      view.input.onEditCancel('api/old');
      assert.isFalse(view.input.breakpoints.find(b => b.url === 'api/old')?.isEditing);

      view.input.onStartEditing('api/old');
      view.input.onEditCommit('api/old', 'api/new');
      assert.isFalse(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().has('api/old'));
      assert.isTrue(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/new'));
    });

    it('calls removeXHRBreakpoint when remove option is selected from context menu', () => {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);

      const removeStub = sinon.stub(SDK.DOMDebuggerModel.DOMDebuggerManager.instance(), 'removeXHRBreakpoint');
      sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      const appendItemStub = sinon.stub(UI.ContextMenu.Section.prototype, 'appendItem');

      view.input.onBreakpointContextMenu('api/v1', new MouseEvent('contextmenu'));
      const removeCallback = appendItemStub.args.find(args => args[0] === 'Remove breakpoint')?.[1];
      assert.exists(removeCallback);
      removeCallback();
      sinon.assert.calledWith(removeStub, 'api/v1');
    });

    it('calls removeXHRBreakpoint for all breakpoints when remove all option is selected from context menu', () => {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v2', true);
      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);

      const removeStub = sinon.stub(SDK.DOMDebuggerModel.DOMDebuggerManager.instance(), 'removeXHRBreakpoint');
      sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      const appendItemStub = sinon.stub(UI.ContextMenu.Section.prototype, 'appendItem');

      view.input.onBreakpointContextMenu('api/v1', new MouseEvent('contextmenu'));
      const removeAllCallback = appendItemStub.args.find(args => args[0] === 'Remove all breakpoints')?.[1];
      assert.exists(removeAllCallback);
      removeAllCallback();
      sinon.assert.calledWith(removeStub, 'api/v1');
      sinon.assert.calledWith(removeStub, 'api/v2');
    });

    it('handles keyboard navigation across breakpoints', () => {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v2', true);
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v3', true);
      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);

      // Initially, the first item is focused
      assert.isTrue(view.input.breakpoints[0].isFocused);

      // ArrowDown navigates to next item
      view.input.onBreakpointNavigate('api/v1', 'ArrowDown');
      assert.strictEqual(pane.focusedBreakpoint, 'api/v2');

      // End key navigates to last item
      view.input.onBreakpointNavigate('api/v2', 'End');
      assert.strictEqual(pane.focusedBreakpoint, 'api/v3');

      // ArrowUp navigates to previous item
      view.input.onBreakpointNavigate('api/v3', 'ArrowUp');
      assert.strictEqual(pane.focusedBreakpoint, 'api/v2');

      // Home key navigates to first item
      view.input.onBreakpointNavigate('api/v2', 'Home');
      assert.strictEqual(pane.focusedBreakpoint, 'api/v1');
    });

    it('toggles breakpoint enable state when checkbox changed in list', () => {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);

      view.input.onBreakpointCheckboxChange('api/v1');
      assert.isFalse(SDK.DOMDebuggerModel.DOMDebuggerManager.instance().xhrBreakpoints().get('api/v1'));
    });

    it('triggers editing when onStartEditing is called', () => {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);

      view.input.onStartEditing('api/v1');
      assert.isTrue(view.input.breakpoints.find(b => b.url === 'api/v1')?.isEditing);
    });

    it('DEFAULT_VIEW handles keyboard events on breakpoint entry', () => {
      const onBreakpointNavigate = sinon.stub();
      const onBreakpointCheckboxChange = sinon.stub();
      const onStartEditing = sinon.stub();
      const container = document.createElement('div');
      const input: BrowserDebugger.XHRBreakpointsSidebarPane.ViewInput = {
        isAdding: false,
        breakpoints: [{
          url: 'api/v1',
          enabled: true,
          title: 'URL contains "api/v1"',
          isHit: false,
          isFocused: true,
          isEditing: false,
        }],
        onAddCommit: sinon.stub(),
        onAddCancel: sinon.stub(),
        onBreakpointClick: sinon.stub(),
        onBreakpointCheckboxChange,
        onBreakpointContextMenu: sinon.stub(),
        onBreakpointNavigate,
        onStartEditing,
        onEditCommit: sinon.stub(),
        onEditCancel: sinon.stub(),
        onEmptyContextMenu: sinon.stub(),
      };

      BrowserDebugger.XHRBreakpointsSidebarPane.DEFAULT_VIEW(input, undefined, container);
      const entry = container.querySelector<HTMLElement>('.breakpoint-entry');
      assert.exists(entry);

      // Space key toggles breakpoint
      entry.dispatchEvent(new KeyboardEvent('keydown', {key: ' '}));
      sinon.assert.calledOnceWithExactly(onBreakpointCheckboxChange, 'api/v1');

      // Enter key starts editing
      entry.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
      sinon.assert.calledOnceWithExactly(onStartEditing, 'api/v1');

      // F2 key starts editing
      entry.dispatchEvent(new KeyboardEvent('keydown', {key: 'F2'}));
      sinon.assert.calledTwice(onStartEditing);

      // ArrowDown key navigates
      entry.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown'}));
      sinon.assert.calledOnceWithExactly(onBreakpointNavigate, 'api/v1', 'ArrowDown');
    });

    it('manages focus and roving tabindex on click and hit', () => {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v2', true);

      const view = createViewFunctionStub(BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane);
      const pane = new BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane(view);
      assert.exists(pane);

      // Default focused item is the first breakpoint
      assert.isTrue(view.input.breakpoints.find(b => b.url === 'api/v1')?.isFocused);
      assert.isFalse(view.input.breakpoints.find(b => b.url === 'api/v2')?.isFocused);

      // Clicking an item sets it as focused
      view.input.onBreakpointClick('api/v2');
      assert.strictEqual(pane.focusedBreakpoint, 'api/v2');
      assert.isTrue(view.input.breakpoints.find(b => b.url === 'api/v2')?.isFocused);
      assert.isFalse(view.input.breakpoints.find(b => b.url === 'api/v1')?.isFocused);
    });

    it('moves DOM focus and roving tabindex to newly focused item on ArrowDown', async () => {
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v1', true);
      SDK.DOMDebuggerModel.DOMDebuggerManager.instance().addXHRBreakpoint('api/v2', true);

      const pane = BrowserDebugger.XHRBreakpointsSidebarPane.XHRBreakpointsSidebarPane.instance();
      renderElementIntoDOM(pane);

      const entries = pane.contentElement.querySelectorAll<HTMLElement>('.breakpoint-entry');
      assert.lengthOf(entries, 2);

      // Initially, the first item has roving tabindex="0" and the second has "-1"
      assert.strictEqual(entries[0].getAttribute('tabindex'), '0');
      assert.strictEqual(entries[1].getAttribute('tabindex'), '-1');

      // Dispatch ArrowDown on the first entry
      entries[0].focus();
      const shadowRoot = pane.element.shadowRoot;
      assert.exists(shadowRoot);
      assert.strictEqual(shadowRoot.activeElement, entries[0]);
      entries[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

      // Wait for updateComplete so the async render and post-render focus settle
      await pane.updateComplete;

      // Focus moves to the second entry and roving tabindex is updated
      assert.strictEqual(shadowRoot.activeElement, entries[1]);
      assert.strictEqual(pane.focusedBreakpoint, 'api/v2');
      assert.strictEqual(entries[0].getAttribute('tabindex'), '-1');
      assert.strictEqual(entries[1].getAttribute('tabindex'), '0');
    });
  });
});
