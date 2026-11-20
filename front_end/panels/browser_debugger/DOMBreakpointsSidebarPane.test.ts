// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {getAxeViolations} from '../../testing/AxeHelpers.js';
import {assertScreenshot, renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
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

  it('renders correctly with no breakpoints (Sources)', async () => {
    const container = document.createElement('div');
    container.classList.add('sources', 'panel');
    container.style.width = '300px';
    container.style.position = 'relative';
    renderElementIntoDOM(container, {includeCommonStyles: true});

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
    container.style.position = 'relative';
    renderElementIntoDOM(container, {includeCommonStyles: true});

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
    renderElementIntoDOM(container, {includeCommonStyles: true});

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
            },
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
    sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    const appendItemStub = sinon.stub(UI.ContextMenu.Section.prototype, 'appendItem');

    pane.performUpdate();
    const input = await view.nextInput;
    input.onBreakpointContextMenu(breakpoint, new MouseEvent('contextmenu'));

    // Find the "Remove breakpoint" item and call its callback.
    const removeCallback = appendItemStub.args.find(args => args[0] === 'Remove breakpoint')?.[1];
    assert.exists(removeCallback);
    removeCallback();

    sinon.assert.calledWith(removeStub, node, Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified);
  });

  it('calls removeAllDOMBreakpoints when remove all option is selected from context menu', async () => {
    const view = createViewFunctionStub(BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane);
    const pane = new BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane(view);

    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    const breakpoint = new SDK.DOMDebuggerModel.DOMBreakpoint(
        domDebuggerModel, node, Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified, true);

    const removeAllStub = sinon.stub(domDebuggerModel, 'removeAllDOMBreakpoints');
    sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    const appendItemStub = sinon.stub(UI.ContextMenu.Section.prototype, 'appendItem');

    pane.performUpdate();
    const input = await view.nextInput;
    input.onBreakpointContextMenu(breakpoint, new MouseEvent('contextmenu'));

    // Find the "Remove all DOM breakpoints" item and call its callback.
    const removeAllCallback = appendItemStub.args.find(args => args[0] === 'Remove all DOM breakpoints')?.[1];
    assert.exists(removeAllCallback);
    removeAllCallback();

    sinon.assert.calledOnce(removeAllStub);
  });
});

function getDeepAriaDescriptions(root: Node): string[] {
  const descriptions: string[] = [];
  const collect = (node: Node): void => {
    if (node instanceof Element) {
      const description = node.getAttribute('aria-description');
      if (description !== null) {
        descriptions.push(description);
      }
      if (node.shadowRoot) {
        collect(node.shadowRoot);
      }
    }
    for (const child of node.childNodes) {
      collect(child);
    }
  };
  collect(root);
  return descriptions;
}

describe('DOMBreakpointsSidebarPane accessibility', () => {
  setupLocaleHooks();
  setupRuntimeHooks();
  setupSettingsHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
  });

  afterEach(() => {
    universe.dispose();
  });

  it('renders enabled and disabled DOM breakpoints with no axe-core violations', async () => {
    const setDOMBreakpointCalls: Protocol.DOMDebugger.SetDOMBreakpointRequest[] = [];
    const removeDOMBreakpointCalls: Protocol.DOMDebugger.RemoveDOMBreakpointRequest[] = [];

    const rootElementPayload: Protocol.DOM.Node = {
      nodeId: 4 as Protocol.DOM.NodeId,
      parentId: 3 as Protocol.DOM.NodeId,
      backendNodeId: 4 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      attributes: ['id', 'rootElement', 'style', 'color: red'],
      childNodeCount: 1,
      children: [
        {
          nodeId: 5 as Protocol.DOM.NodeId,
          parentId: 4 as Protocol.DOM.NodeId,
          backendNodeId: 5 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'DIV',
          localName: 'div',
          nodeValue: '',
          attributes: ['id', 'elementToRemove'],
          childNodeCount: 0,
        },
      ],
    };
    const hostElementPayload: Protocol.DOM.Node = {
      nodeId: 6 as Protocol.DOM.NodeId,
      parentId: 3 as Protocol.DOM.NodeId,
      backendNodeId: 6 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      attributes: ['id', 'hostElement'],
      childNodeCount: 0,
    };
    const documentPayload: Protocol.DOM.Node = {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      localName: '',
      nodeValue: '',
      documentURL: 'https://example.com/dom-breakpoints.html',
      childNodeCount: 1,
      children: [
        {
          nodeId: 2 as Protocol.DOM.NodeId,
          parentId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'HTML',
          localName: 'html',
          nodeValue: '',
          childNodeCount: 1,
          children: [
            {
              nodeId: 3 as Protocol.DOM.NodeId,
              parentId: 2 as Protocol.DOM.NodeId,
              backendNodeId: 3 as Protocol.DOM.BackendNodeId,
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'BODY',
              localName: 'body',
              nodeValue: '',
              childNodeCount: 2,
              children: [rootElementPayload, hostElementPayload],
            },
          ],
        },
      ],
    };

    const connection = new MockCDPConnection();
    connection.setSuccessHandler('DOM.getDocument', () => ({root: documentPayload}));
    connection.setSuccessHandler('DOMDebugger.setDOMBreakpoint', params => {
      setDOMBreakpointCalls.push(params);
      return {};
    });
    connection.setSuccessHandler('DOMDebugger.removeDOMBreakpoint', params => {
      removeDOMBreakpointCalls.push(params);
      return {};
    });

    const target = universe.createTarget({connection});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    const domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    assert.exists(domModel);
    assert.exists(domDebuggerModel);

    const pane = new BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane();
    renderElementIntoDOM(pane, {includeCommonStyles: true, width: 300});

    const domDocument = await domModel.requestDocument();
    assert.exists(domDocument);
    const bodyChildren = domDocument.body?.children() ?? [];
    assert.lengthOf(bodyChildren, 2);
    const [rootElement, hostElement] = bodyChildren;
    assert.strictEqual(rootElement.getAttribute('id'), 'rootElement');
    assert.strictEqual(hostElement.getAttribute('id'), 'hostElement');

    domDebuggerModel.setDOMBreakpoint(rootElement, Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified);
    const hostBreakpoint =
        domDebuggerModel.setDOMBreakpoint(hostElement, Protocol.DOMDebugger.DOMBreakpointType.NodeRemoved);
    domDebuggerModel.toggleDOMBreakpoint(hostBreakpoint, false);

    await pane.updateComplete;
    await UI.Widget.Widget.allUpdatesComplete;

    assert.deepEqual(setDOMBreakpointCalls, [
      {nodeId: 4 as Protocol.DOM.NodeId, type: Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified},
      {nodeId: 6 as Protocol.DOM.NodeId, type: Protocol.DOMDebugger.DOMBreakpointType.NodeRemoved},
    ]);
    assert.deepEqual(removeDOMBreakpointCalls, [
      {nodeId: 6 as Protocol.DOM.NodeId, type: Protocol.DOMDebugger.DOMBreakpointType.NodeRemoved},
    ]);

    assert.strictEqual(pane.contentElement.deepTextContent(),
                       'div#rootElementSubtree modifieddiv#hostElementNode removed');
    assert.deepEqual(getDeepAriaDescriptions(pane.contentElement), ['checked', 'unchecked']);

    const violations = await getAxeViolations(pane.contentElement);
    assert.isEmpty(violations);
  });
});
