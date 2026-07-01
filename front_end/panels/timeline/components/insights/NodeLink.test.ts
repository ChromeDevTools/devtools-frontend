// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import {raf, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../../../testing/MockCDPConnection.js';
import {html} from '../../../../ui/lit/lit.js';
import * as PanelsCommon from '../../../common/common.js';

import * as Insights from './insights.js';

function nodeId<T extends Protocol.DOM.BackendNodeId|Protocol.DOM.NodeId>(x: number): T {
  return x as T;
}

describeWithEnvironment('NodeLink', () => {
  let target: SDK.Target.Target;

  it('renders a node link', async () => {
    const linkifyStub = sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify').callsFake(() => {
      return html`<div class="fake-linkify-node"></div>`;
    });

    const connection = new MockCDPConnection();
    // Create a mock target, dom model, document and node.
    target = createTarget({connection});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const documentNode = {nodeId: nodeId(1)};
    const domNode = new SDK.DOMModel.DOMNode(domModel);
    domNode.id = nodeId(2);
    // Set related CDP methods responses to return our mock document and node.
    connection.setSuccessHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNode.id]}));
    connection.setSuccessHandler('DOM.getDocument', () => ({root: documentNode} as Protocol.DOM.GetDocumentResponse));

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

    // Check that linkify was called with the right Node and we rendered the linkified node.
    sinon.assert.calledWith(linkifyStub, domNode);
    assert.instanceOf(component.element.shadowRoot?.querySelector('.fake-linkify-node'), Element);
  });

  it('falls back to an HTML snippet if one is passed in', async () => {
    const connection = new MockCDPConnection();
    // Create a mock target, dom model, document and node.
    target = createTarget({connection});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const documentNode = {nodeId: nodeId(1)};
    const domNode = new SDK.DOMModel.DOMNode(domModel);
    domNode.id = nodeId(2);
    // Return an empty array of NodeIds so that the frontend resolution fails.
    connection.setSuccessHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: []}));
    connection.setSuccessHandler('DOM.getDocument', () => ({root: documentNode} as Protocol.DOM.GetDocumentResponse));
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
    const fallback = component.element.shadowRoot?.querySelector('pre');
    assert.isOk(fallback);
    assert.strictEqual(fallback.innerText, '<p class=\"fallback\">fallback html</p>');
  });

  it('falls back to text if that is supplied', async () => {
    const connection = new MockCDPConnection();
    // Create a mock target, dom model, document and node.
    target = createTarget({connection});
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const documentNode = {nodeId: nodeId(1)};
    const domNode = new SDK.DOMModel.DOMNode(domModel);
    domNode.id = nodeId(2);
    // Return an empty array of NodeIds so that the frontend resolution fails.
    connection.setSuccessHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: []}));
    connection.setSuccessHandler('DOM.getDocument', () => ({root: documentNode} as Protocol.DOM.GetDocumentResponse));
    await domModel.requestDocument();
    domModel.registerNode(domNode);

    const component = new Insights.NodeLink.NodeLink();
    component.data = {backendNodeId: nodeId(2), frame: domNode.frameId() as string, fallbackText: 'Fallback text'};
    renderElementIntoDOM(component);
    await raf();
    const fallback = component.element.shadowRoot?.querySelector('span');
    assert.isOk(fallback);
    assert.strictEqual(fallback.innerText, 'Fallback text');
  });
});
