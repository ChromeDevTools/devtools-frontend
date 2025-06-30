// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import {raf, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {createTarget} from '../../../../testing/EnvironmentHelpers.js';
import {
  clearAllMockConnectionResponseHandlers,
  describeWithMockConnection,
  setMockConnectionResponseHandler
} from '../../../../testing/MockConnection.js';

import * as Insights from './insights.js';

function nodeId<T extends Protocol.DOM.BackendNodeId|Protocol.DOM.NodeId>(x: number): T {
  return x as T;
}

describeWithMockConnection('NodeLink', () => {
  beforeEach(async () => {
    clearAllMockConnectionResponseHandlers();
  });

  it('renders a node link', async () => {
    const linkifyStub = sinon.stub(Common.Linkifier.Linkifier, 'linkify').callsFake(() => {
      const elem = document.createElement('div');
      elem.classList.add('fake-linkify-node');
      return Promise.resolve(elem);
    });

    // Create a mock target, dom model, document and node.
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const documentNode = {nodeId: nodeId(1)};
    const domNode = new SDK.DOMModel.DOMNode(domModel);
    domNode.id = nodeId(2);
    // Set related CDP methods responses to return our mock document and node.
    setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNode.id]}));
    setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));

    // Register the mock document and node in DOMModel, these use the mock responses set above.
    await domModel.requestDocument();
    domModel.registerNode(domNode);

    const component = new Insights.NodeLink.NodeLink();
    component.data = {
      backendNodeId: nodeId(2),
      frame: domNode.frameId() as string,
    };
    renderElementIntoDOM(component);
    // await new Promise(r => setTimeout(r, 1000));
    await raf();
    assert.isOk(component.shadowRoot);

    // Check that linkify was called with the right Node and we rendered the linkified node.
    sinon.assert.calledWith(linkifyStub, domNode);
    assert.instanceOf(component.shadowRoot.querySelector('.fake-linkify-node'), Element);
  });

  it('falls back to an HTML snippet if one is passed in', async () => {
    // Create a mock target, dom model, document and node.
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const documentNode = {nodeId: nodeId(1)};
    const domNode = new SDK.DOMModel.DOMNode(domModel);
    domNode.id = nodeId(2);
    // Return an empty array of NodeIds so that the frontend resolution fails.
    setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: []}));
    setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));
    await domModel.requestDocument();
    domModel.registerNode(domNode);

    const component = new Insights.NodeLink.NodeLink();
    component.data = {
      backendNodeId: nodeId(2),
      frame: domNode.frameId() as string,
      fallbackHtmlSnippet: '<p class="fallback">fallback html</p>'
    };
    renderElementIntoDOM(component);
    await raf();
    const fallback = component.shadowRoot?.querySelector('pre');
    assert.isOk(fallback);
    assert.strictEqual(fallback.innerText, '<p class=\"fallback\">fallback html</p>');
  });

  it('falls back to text if that is supplied', async () => {
    // Create a mock target, dom model, document and node.
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const documentNode = {nodeId: nodeId(1)};
    const domNode = new SDK.DOMModel.DOMNode(domModel);
    domNode.id = nodeId(2);
    // Return an empty array of NodeIds so that the frontend resolution fails.
    setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: []}));
    setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));
    await domModel.requestDocument();
    domModel.registerNode(domNode);

    const component = new Insights.NodeLink.NodeLink();
    component.data = {backendNodeId: nodeId(2), frame: domNode.frameId() as string, fallbackText: 'Fallback text'};
    renderElementIntoDOM(component);
    await raf();
    const fallback = component.shadowRoot?.querySelector('span');
    assert.isOk(fallback);
    assert.strictEqual(fallback.innerText, 'Fallback text');
  });
});
