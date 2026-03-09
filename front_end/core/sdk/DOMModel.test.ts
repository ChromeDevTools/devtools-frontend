// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProtocolModule from '../../generated/protocol.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

describeWithMockConnection('DOMModel', () => {
  it('updates the document on an documentUpdate event if there already is a previous document', async () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    assert.exists(domModel.agent);

    domModel.setDocumentForTest({nodeId: 0} as Protocol.DOM.Node);
    const spy = sinon.spy(domModel.agent, 'invoke_getDocument');

    sinon.assert.notCalled(spy);
    assert.isNotNull(domModel.existingDocument());

    domModel.documentUpdated();
    sinon.assert.calledOnce(spy);
  });

  it('does not request document if there is not a previous document', async () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    assert.exists(domModel.agent);

    domModel.setDocumentForTest(null);
    const spy = sinon.spy(domModel.agent, 'invoke_getDocument');

    sinon.assert.notCalled(spy);
    assert.isNull(domModel.existingDocument());

    domModel.documentUpdated();
    sinon.assert.notCalled(spy);
  });

  it('updates top layer elements correctly', async () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);

    const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
    const TOP_LAYER_NODE_ID = 2 as Protocol.DOM.NodeId;
    const NOT_TOP_LAYER_NODE_ID = 3 as Protocol.DOM.NodeId;

    domModel.setDocumentForTest({
      nodeId: DOCUMENT_NODE_ID,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      childNodeCount: 2,
      children: [
        {
          nodeId: TOP_LAYER_NODE_ID,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'div',
          localName: 'div',
          nodeValue: '',
        },
        {
          nodeId: NOT_TOP_LAYER_NODE_ID,
          backendNodeId: 3 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'div',
          localName: 'div',
          nodeValue: '',
        },
      ],
    } as Protocol.DOM.Node);

    const topLayerNode = domModel.nodeForId(TOP_LAYER_NODE_ID);
    const notTopLayerNode = domModel.nodeForId(NOT_TOP_LAYER_NODE_ID);
    assert.exists(topLayerNode);
    assert.exists(notTopLayerNode);

    sinon.stub(domModel.agent, 'invoke_getTopLayerElements').resolves({
      nodeIds: [TOP_LAYER_NODE_ID],
      getError: () => undefined,
    });

    const topLayerChangePromise = domModel.once(SDK.DOMModel.Events.TopLayerElementsChanged);
    domModel.topLayerElementsUpdated();
    await topLayerChangePromise;

    assert.notStrictEqual(topLayerNode?.topLayerIndex(), -1);
    assert.strictEqual(notTopLayerNode?.topLayerIndex(), -1);
  });

  it('updates top layer elements correctly with backdrop', async () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);

    const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
    const BACKDROP_NODE_ID = 2 as Protocol.DOM.NodeId;
    const TOP_LAYER_NODE_ID = 3 as Protocol.DOM.NodeId;

    domModel.setDocumentForTest({
      nodeId: DOCUMENT_NODE_ID,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      childNodeCount: 2,
      children: [
        {
          nodeId: BACKDROP_NODE_ID,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: '::backdrop',
          localName: '::backdrop',
          nodeValue: '',
        },
        {
          nodeId: TOP_LAYER_NODE_ID,
          backendNodeId: 3 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'div',
          localName: 'div',
          nodeValue: '',
        },
      ],
    } as Protocol.DOM.Node);

    const topLayerNode = domModel.nodeForId(TOP_LAYER_NODE_ID);
    assert.exists(topLayerNode);

    sinon.stub(domModel.agent, 'invoke_getTopLayerElements').resolves({
      nodeIds: [BACKDROP_NODE_ID, TOP_LAYER_NODE_ID],
      getError: () => undefined,
    });

    const topLayerChangePromise = domModel.once(SDK.DOMModel.Events.TopLayerElementsChanged);
    domModel.topLayerElementsUpdated();
    const data = await topLayerChangePromise;
    const topLayerShortcuts = data.documentShortcuts;
    assert.lengthOf(topLayerShortcuts, 1);
    assert.strictEqual(topLayerShortcuts[0].deferredNode.backendNodeId(), 3 as Protocol.DOM.BackendNodeId);
    assert.lengthOf(topLayerShortcuts[0].childShortcuts, 1);
    assert.strictEqual(
        topLayerShortcuts[0].childShortcuts[0].deferredNode.backendNodeId(), 2 as Protocol.DOM.BackendNodeId);
  });

  it('updates top layer elements correctly with multiple documents', async () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);

    const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
    const IFRAME_NODE_ID = 2 as Protocol.DOM.NodeId;
    const CONTENT_DOCUMENT_NODE_ID = 3 as Protocol.DOM.NodeId;
    const TOP_LAYER_NODE_1_ID = 4 as Protocol.DOM.NodeId;
    const TOP_LAYER_NODE_2_ID = 5 as Protocol.DOM.NodeId;

    domModel.setDocumentForTest({
      nodeId: DOCUMENT_NODE_ID,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      childNodeCount: 2,
      children: [
        {
          nodeId: TOP_LAYER_NODE_1_ID,
          backendNodeId: 4 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'div',
          localName: 'div',
          nodeValue: '',
        },
        {
          nodeId: IFRAME_NODE_ID,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'iframe',
          localName: 'iframe',
          nodeValue: '',
          contentDocument: {
            nodeId: CONTENT_DOCUMENT_NODE_ID,
            backendNodeId: 3 as Protocol.DOM.BackendNodeId,
            nodeType: Node.DOCUMENT_NODE,
            nodeName: '#document',
            childNodeCount: 1,
            children: [
              {
                nodeId: TOP_LAYER_NODE_2_ID,
                backendNodeId: 5 as Protocol.DOM.BackendNodeId,
                nodeType: Node.ELEMENT_NODE,
                nodeName: 'div',
                localName: 'div',
                nodeValue: '',
              },
            ],
          },
        },
      ],
    } as Protocol.DOM.Node);

    const topLayerNode1 = domModel.nodeForId(TOP_LAYER_NODE_1_ID);
    const topLayerNode2 = domModel.nodeForId(TOP_LAYER_NODE_2_ID);
    assert.exists(topLayerNode1);
    assert.exists(topLayerNode2);

    sinon.stub(domModel.agent, 'invoke_getTopLayerElements').resolves({
      nodeIds: [TOP_LAYER_NODE_1_ID, TOP_LAYER_NODE_2_ID],
      getError: () => undefined,
    });

    const events: Array<{document: SDK.DOMModel.DOMDocument, documentShortcuts: SDK.DOMModel.DOMNodeShortcut[]}> = [];
    domModel.addEventListener(SDK.DOMModel.Events.TopLayerElementsChanged, event => {
      events.push(event.data);
    });

    const topLayerChangePromise = domModel.once(SDK.DOMModel.Events.TopLayerElementsChanged);
    domModel.topLayerElementsUpdated();
    await topLayerChangePromise;

    // Wait for the second event if it hasn't arrived yet.
    if (events.length < 2) {
      await domModel.once(SDK.DOMModel.Events.TopLayerElementsChanged);
    }

    assert.lengthOf(events, 2);
    // Sort events by document ID to ensure deterministic order for assertions
    events.sort((a, b) => a.document.id - b.document.id);

    assert.strictEqual(events[0].document.id, DOCUMENT_NODE_ID);
    assert.lengthOf(events[0].documentShortcuts, 1);
    assert.strictEqual(events[0].documentShortcuts[0].deferredNode.backendNodeId(), 4 as Protocol.DOM.BackendNodeId);

    assert.strictEqual(events[1].document.id, CONTENT_DOCUMENT_NODE_ID);
    assert.lengthOf(events[1].documentShortcuts, 1);
    assert.strictEqual(events[1].documentShortcuts[0].deferredNode.backendNodeId(), 5 as Protocol.DOM.BackendNodeId);
  });

  describe('DOMNode', () => {
    describe('simpleSelector', () => {
      let target: SDK.Target.Target;
      let model: SDK.DOMModel.DOMModel;
      beforeEach(() => {
        target = createTarget();

        const modelBeforeAssertion = target.model(SDK.DOMModel.DOMModel);
        assert.exists(modelBeforeAssertion);
        model = modelBeforeAssertion;
      });

      afterEach(() => {
        target.dispose('NO_REASON');
      });

      it('should return localName when it\'s not an input, it does not have an idea and does not contain any classes',
         () => {
           const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
             nodeId: 1 as Protocol.DOM.NodeId,
             backendNodeId: 2 as Protocol.DOM.BackendNodeId,
             nodeType: Node.ELEMENT_NODE,
             nodeName: 'div',
             localName: 'div',
             nodeValue: '',
           });
           assert.strictEqual(domNode.simpleSelector(), 'div');
         });

      it('should return localName with input type if it is an input and does not contain any idea or classes', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'input',
          attributes: [
            'type',
            'text',
          ],
          localName: 'input',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), 'input[type="text"]');
      });

      it('should return localName with id if it has an id', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'input',
          attributes: [
            'type',
            'text',
            'id',
            'input-with-id',
          ],
          localName: 'input',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), 'input#input-with-id');
      });

      it('should return localName with classes appended for an input', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'input',
          attributes: [
            'type',
            'text',
            'class',
            'first-class second-class',
          ],
          localName: 'input',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), 'input.first-class.second-class');
      });

      it('should return localName with classes appended for a div without mentioning div', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'div',
          attributes: [
            'type',
            'text',
            'class',
            'first-class second-class',
          ],
          localName: 'div',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), '.first-class.second-class');
      });

      it('should return localName for a pseudo class without pseudo identifier', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: '::before',
          localName: '::before',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), '::before');
      });

      it('should return localName for a pseudo class with a pseudo identifier', () => {
        const domNode = SDK.DOMModel.DOMNode.create(model, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          pseudoIdentifier: 'root',
          nodeName: '::view-transition-new',
          localName: '::view-transition-new',
          nodeValue: '',
        });
        assert.strictEqual(domNode.simpleSelector(), '::view-transition-new(root)');
      });
    });
  });

  describe('document.open() URL update (crbug.com/370690261)', () => {
    it('updates iframe contentDocument URL and dispatches DocumentURLChanged event', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const IFRAME_NODE_ID = 2 as Protocol.DOM.NodeId;
      const CONTENT_DOCUMENT_NODE_ID = 3 as Protocol.DOM.NodeId;
      const IFRAME_FRAME_ID = 'iframe-frame-id' as Protocol.Page.FrameId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        localName: '',
        nodeValue: '',
        documentURL: 'https://example.com/',
        baseURL: 'https://example.com/',
        childNodeCount: 1,
        children: [
          {
            nodeId: IFRAME_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'IFRAME',
            localName: 'iframe',
            nodeValue: '',
            frameId: IFRAME_FRAME_ID,
            contentDocument: {
              nodeId: CONTENT_DOCUMENT_NODE_ID,
              backendNodeId: 3 as Protocol.DOM.BackendNodeId,
              nodeType: Node.DOCUMENT_NODE,
              nodeName: '#document',
              localName: '',
              nodeValue: '',
              documentURL: 'about:blank',
              baseURL: 'about:blank',
              childNodeCount: 0,
              children: [],
            },
          },
        ],
      } as Protocol.DOM.Node);

      const iframeNode = domModel.nodeForId(IFRAME_NODE_ID);
      assert.exists(iframeNode);
      const contentDocument = iframeNode.contentDocument();
      assert.exists(contentDocument);

      assert.strictEqual(contentDocument.documentURL, 'about:blank');

      const documentURLChangedPromise = domModel.once(SDK.DOMModel.Events.DocumentURLChanged);
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);

      resourceTreeModel.documentOpened({
        id: IFRAME_FRAME_ID,
        loaderId: 'loader-1' as Protocol.Network.LoaderId,
        url: 'https://example.com/',
        domainAndRegistry: 'example.com',
        securityOrigin: 'https://example.com',
        mimeType: 'text/html',
        secureContextType: ProtocolModule.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: ProtocolModule.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      });

      const changedDocument = await documentURLChangedPromise;
      assert.strictEqual(changedDocument, contentDocument);
      assert.strictEqual(contentDocument.documentURL, 'https://example.com/');
    });

    it('does not dispatch event when URL has not changed', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const IFRAME_NODE_ID = 2 as Protocol.DOM.NodeId;
      const CONTENT_DOCUMENT_NODE_ID = 3 as Protocol.DOM.NodeId;
      const IFRAME_FRAME_ID = 'iframe-frame-id' as Protocol.Page.FrameId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        localName: '',
        nodeValue: '',
        documentURL: 'https://example.com/',
        baseURL: 'https://example.com/',
        childNodeCount: 1,
        children: [
          {
            nodeId: IFRAME_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'IFRAME',
            localName: 'iframe',
            nodeValue: '',
            frameId: IFRAME_FRAME_ID,
            contentDocument: {
              nodeId: CONTENT_DOCUMENT_NODE_ID,
              backendNodeId: 3 as Protocol.DOM.BackendNodeId,
              nodeType: Node.DOCUMENT_NODE,
              nodeName: '#document',
              localName: '',
              nodeValue: '',
              documentURL: 'https://example.com/',
              baseURL: 'https://example.com/',
              childNodeCount: 0,
              children: [],
            },
          },
        ],
      } as Protocol.DOM.Node);

      let eventDispatched = false;
      domModel.addEventListener(SDK.DOMModel.Events.DocumentURLChanged, () => {
        eventDispatched = true;
      });

      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);

      resourceTreeModel.documentOpened({
        id: IFRAME_FRAME_ID,
        loaderId: 'loader-1' as Protocol.Network.LoaderId,
        url: 'https://example.com/',
        domainAndRegistry: 'example.com',
        securityOrigin: 'https://example.com',
        mimeType: 'text/html',
        secureContextType: ProtocolModule.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: ProtocolModule.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      });

      assert.isFalse(eventDispatched);
    });
  });

  describe('DOMNodeSnapshot', () => {
    it('snapshots a clean DOMNode with children and attributes', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const PARENT_NODE_ID = 2 as Protocol.DOM.NodeId;
      const CHILD_NODE_ID = 3 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [
          {
            nodeId: PARENT_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            nodeValue: '',
            attributes: ['class', 'container', 'id', 'parent'],
            childNodeCount: 1,
            children: [
              {
                nodeId: CHILD_NODE_ID,
                backendNodeId: 3 as Protocol.DOM.BackendNodeId,
                nodeType: Node.ELEMENT_NODE,
                nodeName: 'span',
                localName: 'span',
                nodeValue: '',
                attributes: ['class', 'child'],
              },
            ],
          },
        ],
      } as Protocol.DOM.Node);

      const parentNode = domModel.nodeForId(PARENT_NODE_ID);
      assert.exists(parentNode);

      const snapshot = await parentNode.takeSnapshot();
      assert.instanceOf(snapshot, SDK.DOMModel.DOMNodeSnapshot);
      assert.strictEqual(snapshot.id, PARENT_NODE_ID);
      assert.strictEqual(snapshot.nodeName(), 'div');
      assert.strictEqual(snapshot.getAttribute('class'), 'container');
      assert.strictEqual(snapshot.getAttribute('id'), 'parent');

      const children = snapshot.children();
      assert.isNotNull(children);
      assert.lengthOf(children, 1);
      assert.strictEqual(children[0].id, CHILD_NODE_ID);
      assert.strictEqual(children[0].nodeName(), 'span');
      assert.strictEqual(children[0].getAttribute('class'), 'child');
      assert.strictEqual(children[0].parentNode, snapshot);
    });

    it('snapshots shadow roots', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const HOST_NODE_ID = 2 as Protocol.DOM.NodeId;
      const SHADOW_ROOT_ID = 3 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [
          {
            nodeId: HOST_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            nodeValue: '',
            shadowRoots: [
              {
                nodeId: SHADOW_ROOT_ID,
                backendNodeId: 3 as Protocol.DOM.BackendNodeId,
                nodeType: Node.DOCUMENT_FRAGMENT_NODE,
                nodeName: '#shadow-root',
                localName: '',
                nodeValue: '',
                shadowRootType: ProtocolModule.DOM.ShadowRootType.Open,
              },
            ],
          },
        ],
      } as Protocol.DOM.Node);

      const hostNode = domModel.nodeForId(HOST_NODE_ID);
      assert.exists(hostNode);

      const snapshot = await hostNode.takeSnapshot();
      assert.strictEqual(snapshot.id, HOST_NODE_ID);

      const shadowRoots = snapshot.shadowRoots();
      assert.lengthOf(shadowRoots, 1);
      assert.strictEqual(shadowRoots[0].id, SHADOW_ROOT_ID);
      assert.strictEqual(shadowRoots[0].shadowRootType(), ProtocolModule.DOM.ShadowRootType.Open);
      assert.strictEqual(shadowRoots[0].parentNode, snapshot);
    });

    it('takes snapshot with adoptedStyleSheets', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const ELEMENT_NODE_ID = 2 as Protocol.DOM.NodeId;
      const STYLESHEET_ID = 'stylesheet-id' as Protocol.DOM.StyleSheetId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [
          {
            nodeId: ELEMENT_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            nodeValue: '',
            adoptedStyleSheets: [STYLESHEET_ID],
          },
        ],
      } as Protocol.DOM.Node);

      const elementNode = domModel.nodeForId(ELEMENT_NODE_ID);
      assert.exists(elementNode);
      assert.lengthOf(elementNode.adoptedStyleSheetsForNode, 1);

      const snapshot = await elementNode.takeSnapshot();
      assert.lengthOf(snapshot.adoptedStyleSheetsForNode, 1);
      assert.strictEqual(snapshot.adoptedStyleSheetsForNode[0].id, STYLESHEET_ID);
    });

    it('snapshots pseudo elements', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const ELEMENT_NODE_ID = 2 as Protocol.DOM.NodeId;
      const PSEUDO_NODE_ID = 3 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [
          {
            nodeId: ELEMENT_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            nodeValue: '',
            pseudoElements: [
              {
                nodeId: PSEUDO_NODE_ID,
                backendNodeId: 3 as Protocol.DOM.BackendNodeId,
                nodeType: Node.ELEMENT_NODE,
                nodeName: '::before',
                localName: '::before',
                nodeValue: '',
                pseudoType: ProtocolModule.DOM.PseudoType.Before,
              },
            ],
          },
        ],
      } as Protocol.DOM.Node);

      const elementNode = domModel.nodeForId(ELEMENT_NODE_ID);
      assert.exists(elementNode);

      const snapshot = await elementNode.takeSnapshot();
      assert.strictEqual(snapshot.id, ELEMENT_NODE_ID);

      const beforePseudo = snapshot.beforePseudoElement();
      assert.exists(beforePseudo);
      assert.strictEqual(beforePseudo?.id, PSEUDO_NODE_ID);
      assert.strictEqual(beforePseudo?.parentNode, snapshot);
    });

    it('snapshots template content', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const TEMPLATE_NODE_ID = 2 as Protocol.DOM.NodeId;
      const CONTENT_NODE_ID = 3 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [
          {
            nodeId: TEMPLATE_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'template',
            localName: 'template',
            nodeValue: '',
            templateContent: {
              nodeId: CONTENT_NODE_ID,
              backendNodeId: 3 as Protocol.DOM.BackendNodeId,
              nodeType: Node.DOCUMENT_FRAGMENT_NODE,
              nodeName: '#document-fragment',
              localName: '',
              nodeValue: '',
            },
          },
        ],
      } as Protocol.DOM.Node);

      const templateNode = domModel.nodeForId(TEMPLATE_NODE_ID);
      assert.exists(templateNode);

      const snapshot = await templateNode.takeSnapshot();
      assert.strictEqual(snapshot.id, TEMPLATE_NODE_ID);

      const content = snapshot.templateContent();
      assert.exists(content);
      assert.strictEqual(content?.id, CONTENT_NODE_ID);
      assert.strictEqual(content?.parentNode, snapshot);
    });

    it('snapshots iframe content document', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const IFRAME_NODE_ID = 2 as Protocol.DOM.NodeId;
      const CONTENT_DOCUMENT_NODE_ID = 3 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [
          {
            nodeId: IFRAME_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'iframe',
            localName: 'iframe',
            nodeValue: '',
            contentDocument: {
              nodeId: CONTENT_DOCUMENT_NODE_ID,
              backendNodeId: 3 as Protocol.DOM.BackendNodeId,
              nodeType: Node.DOCUMENT_NODE,
              nodeName: '#document',
              localName: '',
              nodeValue: '',
            },
          },
        ],
      } as Protocol.DOM.Node);

      const iframeNode = domModel.nodeForId(IFRAME_NODE_ID);
      assert.exists(iframeNode);

      const snapshot = await iframeNode.takeSnapshot();
      assert.strictEqual(snapshot.id, IFRAME_NODE_ID);

      const contentDocument = snapshot.contentDocument();
      assert.exists(contentDocument);
      assert.strictEqual(contentDocument?.id, CONTENT_DOCUMENT_NODE_ID);
      assert.strictEqual(contentDocument?.parentNode, snapshot);
    });

    it('snapshots DOMDocument properties', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const HTML_NODE_ID = 2 as Protocol.DOM.NodeId;
      const BODY_NODE_ID = 3 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        documentURL: 'https://example.com/',
        baseURL: 'https://example.com/',
        childNodeCount: 1,
        children: [
          {
            nodeId: HTML_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'HTML',
            localName: 'html',
            nodeValue: '',
            childNodeCount: 1,
            children: [
              {
                nodeId: BODY_NODE_ID,
                backendNodeId: 3 as Protocol.DOM.BackendNodeId,
                nodeType: Node.ELEMENT_NODE,
                nodeName: 'BODY',
                localName: 'body',
                nodeValue: '',
              },
            ],
          },
        ],
      } as Protocol.DOM.Node);

      const documentNode = domModel.existingDocument();
      assert.exists(documentNode);

      const snapshot = await documentNode.takeSnapshot();
      assert.instanceOf(snapshot, SDK.DOMModel.DOMDocumentSnapshot);
      const documentSnapshot = snapshot as SDK.DOMModel.DOMDocument;
      assert.strictEqual(documentSnapshot.documentURL, 'https://example.com/');
      assert.strictEqual(documentSnapshot.baseURL, 'https://example.com/');
      assert.exists(documentSnapshot.documentElement);
      assert.strictEqual(documentSnapshot.documentElement?.id, HTML_NODE_ID);
      assert.exists(documentSnapshot.body);
      assert.strictEqual(documentSnapshot.body?.id, BODY_NODE_ID);
      assert.strictEqual(documentSnapshot.documentElement?.ownerDocument, documentSnapshot);
      assert.strictEqual(documentSnapshot.body?.ownerDocument, documentSnapshot);
    });

    it('snapshots assigned slot', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const ELEMENT_NODE_ID = 2 as Protocol.DOM.NodeId;
      const SLOT_ID = 3 as Protocol.DOM.BackendNodeId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [
          {
            nodeId: ELEMENT_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            nodeValue: '',
            assignedSlot: {
              backendNodeId: SLOT_ID,
              nodeType: Node.ELEMENT_NODE,
              nodeName: 'slot',
            },
          },
        ],
      } as Protocol.DOM.Node);

      const elementNode = domModel.nodeForId(ELEMENT_NODE_ID);
      assert.exists(elementNode);

      const snapshot = await elementNode.takeSnapshot();
      assert.strictEqual(snapshot.id, ELEMENT_NODE_ID);
      assert.exists(snapshot.assignedSlot);
      assert.strictEqual(snapshot.assignedSlot.deferredNode.backendNodeId(), SLOT_ID);
    });

    it('is immutable', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const ELEMENT_NODE_ID = 2 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [
          {
            nodeId: ELEMENT_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            nodeValue: '',
            attributes: ['id', 'test'],
          },
        ],
      } as Protocol.DOM.Node);

      const elementNode = domModel.nodeForId(ELEMENT_NODE_ID);
      assert.exists(elementNode);

      const snapshot = await elementNode.takeSnapshot();
      assert.strictEqual(snapshot.getAttribute('id'), 'test');

      snapshot.setAttribute('id', 'new-id');
      assert.strictEqual(snapshot.getAttribute('id'), 'test');

      await snapshot.removeAttribute('id');
      assert.strictEqual(snapshot.getAttribute('id'), 'test');

      snapshot.setNodeName('span');
      assert.strictEqual(snapshot.nodeName(), 'div');

      snapshot.setNodeValue('new value');
      assert.strictEqual(snapshot.nodeValue(), '');
    });

    it('does not reflect live DOM updates', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const ELEMENT_NODE_ID = 2 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [
          {
            nodeId: ELEMENT_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            nodeValue: '',
            attributes: ['id', 'test'],
          },
        ],
      } as Protocol.DOM.Node);

      const elementNode = domModel.nodeForId(ELEMENT_NODE_ID);
      assert.exists(elementNode);

      const snapshot = await elementNode.takeSnapshot();
      assert.strictEqual(snapshot.getAttribute('id'), 'test');

      domModel.attributeModified(ELEMENT_NODE_ID, 'id', 'updated-id');
      assert.strictEqual(elementNode.getAttribute('id'), 'updated-id');

      assert.strictEqual(snapshot.getAttribute('id'), 'test');
    });

    it('does not reflect child insertion in live DOM', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);

      const DOCUMENT_NODE_ID = 1 as Protocol.DOM.NodeId;
      const PARENT_NODE_ID = 2 as Protocol.DOM.NodeId;
      const CHILD_NODE_ID = 3 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: DOCUMENT_NODE_ID,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        childNodeCount: 1,
        children: [
          {
            nodeId: PARENT_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            nodeValue: '',
            childNodeCount: 0,
            children: [] as Protocol.DOM.Node[],
          },
        ],
      } as Protocol.DOM.Node);

      const parentNode = domModel.nodeForId(PARENT_NODE_ID);
      assert.exists(parentNode);

      const snapshot = await parentNode.takeSnapshot();
      assert.lengthOf(snapshot.children() || [], 0);

      domModel.childNodeInserted(PARENT_NODE_ID, 0 as Protocol.DOM.NodeId, {
        nodeId: CHILD_NODE_ID,
        backendNodeId: 3 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'span',
        localName: 'span',
        nodeValue: '',
      });

      assert.lengthOf(parentNode.children() || [], 1);

      assert.lengthOf(snapshot.children() || [], 0);
    });
  });
});
