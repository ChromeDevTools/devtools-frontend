// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelsCommon from '../common/common.js';

import * as BrowserDebugger from './browser_debugger.js';

describe('DOMBreakpointsSidebarPane', () => {
  setupLocaleHooks();
  let linkifierStub: sinon.SinonStub;

  beforeEach(() => {
    linkifierStub = sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify');
  });

  afterEach(() => {
    linkifierStub.restore();
  });

  it('renders correctly with no breakpoints (Sources)', async () => {
    const container = document.createElement('div');
    container.classList.add('sources', 'panel');
    container.style.width = '300px';
    renderElementIntoDOM(container);

    const shadowHost = container.createChild('div');
    const shadowRoot = shadowHost.attachShadow({mode: 'open'});
    const target = shadowRoot.createChild('div');

    BrowserDebugger.DOMBreakpointsSidebarPane.DEFAULT_VIEW(
        {
          breakpoints: [],
          onBreakpointClick: () => {},
          onBreakpointCheckboxClick: () => {},
          onBreakpointContextMenu: () => {},
          onBreakpointKeyDown: () => {},
        },
        undefined,
        target,
    );
    await assertScreenshot('browser_debugger/dom-breakpoints-empty-sources.png');
  });

  it('renders correctly with no breakpoints (Elements)', async () => {
    const container = document.createElement('div');
    container.classList.add('elements', 'panel');
    container.style.width = '300px';
    renderElementIntoDOM(container);

    const shadowHost = container.createChild('div');
    const shadowRoot = shadowHost.attachShadow({mode: 'open'});
    const target = shadowRoot.createChild('div');

    BrowserDebugger.DOMBreakpointsSidebarPane.DEFAULT_VIEW(
        {
          breakpoints: [],
          onBreakpointClick: () => {},
          onBreakpointCheckboxClick: () => {},
          onBreakpointContextMenu: () => {},
          onBreakpointKeyDown: () => {},
        },
        undefined,
        target,
    );
    await assertScreenshot('browser_debugger/dom-breakpoints-empty-elements.png');
  });

  it('renders correctly with some breakpoints', async () => {
    const container = document.createElement('div');
    container.style.width = '300px';
    renderElementIntoDOM(container);

    const shadowHost = container.createChild('div');
    const shadowRoot = shadowHost.attachShadow({mode: 'open'});
    const target = shadowRoot.createChild('div');

    const node1 = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    node1.nodeName.returns('div');
    node1.getAttribute.withArgs('id').returns('my-id');

    const node2 = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    node2.nodeName.returns('span');
    node2.getAttribute.withArgs('class').returns('my-class');

    linkifierStub.onCall(0).returns(document.createTextNode('div#my-id'));
    linkifierStub.onCall(1).returns(document.createTextNode('span.my-class'));

    const breakpoint1 = {
      node: node1,
      type: Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified,
      enabled: true,
      domDebuggerModel: {
        toggleDOMBreakpoint: () => {},
      },
    } as unknown as SDK.DOMDebuggerModel.DOMBreakpoint;

    const breakpoint2 = {
      node: node2,
      type: Protocol.DOMDebugger.DOMBreakpointType.AttributeModified,
      enabled: false,
      domDebuggerModel: {
        toggleDOMBreakpoint: () => {},
      },
    } as unknown as SDK.DOMDebuggerModel.DOMBreakpoint;

    BrowserDebugger.DOMBreakpointsSidebarPane.DEFAULT_VIEW(
        {
          breakpoints: [
            {
              breakpoint: breakpoint1,
              label: 'Subtree Modified',
              isHighlighted: true,
              isFocused: true,
            },
            {
              breakpoint: breakpoint2,
              label: 'Attribute Modified',
              isHighlighted: false,
              isFocused: false,
            }
          ],
          onBreakpointClick: () => {},
          onBreakpointCheckboxClick: () => {},
          onBreakpointContextMenu: () => {},
          onBreakpointKeyDown: () => {},
        },
        undefined,
        target,
    );
    await assertScreenshot('browser_debugger/dom-breakpoints-list.png');
  });
});

describe('DOMBreakpointsSidebarPane', () => {
  setupRuntimeHooks();
  setupSettingsHooks();
  setupLocaleHooks();
  let target: SDK.Target.Target;
  let domDebuggerModel: SDK.DOMDebuggerModel.DOMDebuggerModel;

  beforeEach(() => {
    target = createTarget();
    domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel) as SDK.DOMDebuggerModel.DOMDebuggerModel;
  });

  it('calls toggleDOMBreakpoint when onBreakpointCheckboxClick is called', async () => {
    const view = createViewFunctionStub(BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane);
    const pane = new BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane(view);

    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    const breakpoint = new SDK.DOMDebuggerModel.DOMBreakpoint(
        domDebuggerModel, node, Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified, true);

    const toggleStub = sinon.stub(domDebuggerModel, 'toggleDOMBreakpoint');

    pane.performUpdate();
    const input = await view.nextInput;
    input.onBreakpointCheckboxClick(breakpoint);

    sinon.assert.calledWith(toggleStub, breakpoint, false);
  });

  it('calls removeDOMBreakpoint when remove option is selected from context menu', async () => {
    const view = createViewFunctionStub(BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane);
    const pane = new BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane(view);

    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    const breakpoint = new SDK.DOMDebuggerModel.DOMBreakpoint(
        domDebuggerModel, node, Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified, true);

    const removeStub = sinon.stub(domDebuggerModel, 'removeDOMBreakpoint');
    const contextMenuStub = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    const appendItemStub = sinon.stub(UI.ContextMenu.Section.prototype, 'appendItem');

    pane.performUpdate();
    const input = await view.nextInput;
    input.onBreakpointContextMenu(breakpoint, new MouseEvent('contextmenu'));

    // Find the "Remove breakpoint" item and call its callback.
    const removeCallback = appendItemStub.args.find(args => args[0] === 'Remove breakpoint')?.[1];
    assert.exists(removeCallback);
    removeCallback();

    sinon.assert.calledWith(removeStub, node, Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified);

    contextMenuStub.restore();
    appendItemStub.restore();
  });

  it('calls removeAllDOMBreakpoints when remove all option is selected from context menu', async () => {
    const view = createViewFunctionStub(BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane);
    const pane = new BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane(view);

    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    const breakpoint = new SDK.DOMDebuggerModel.DOMBreakpoint(
        domDebuggerModel, node, Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified, true);

    const removeAllStub = sinon.stub(domDebuggerModel, 'removeAllDOMBreakpoints');
    const contextMenuStub = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    const appendItemStub = sinon.stub(UI.ContextMenu.Section.prototype, 'appendItem');

    pane.performUpdate();
    const input = await view.nextInput;
    input.onBreakpointContextMenu(breakpoint, new MouseEvent('contextmenu'));

    // Find the "Remove all DOM breakpoints" item and call its callback.
    const removeAllCallback = appendItemStub.args.find(args => args[0] === 'Remove all DOM breakpoints')?.[1];
    assert.exists(removeAllCallback);
    removeAllCallback();

    sinon.assert.calledOnce(removeAllStub);

    contextMenuStub.restore();
    appendItemStub.restore();
  });
});
