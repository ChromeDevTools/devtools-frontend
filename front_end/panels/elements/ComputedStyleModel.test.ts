// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Elements from './elements.js';

function createNode(target: SDK.Target.Target, {nodeId}: {nodeId: Protocol.DOM.NodeId}): SDK.DOMModel.DOMNode {
  const domModel = target.model(SDK.DOMModel.DOMModel);
  assert.exists(domModel);

  const node = SDK.DOMModel.DOMNode.create(domModel, null, false, {
    nodeId,
    backendNodeId: 2 as Protocol.DOM.BackendNodeId,
    nodeType: Node.ELEMENT_NODE,
    nodeName: 'div',
    localName: 'div',
    nodeValue: '',
  });

  return node;
}

describeWithMockConnection('ComputedStyleModel', () => {
  let target: SDK.Target.Target;
  let computedStyleModel: Elements.ComputedStyleModel.ComputedStyleModel;
  let domNode1: SDK.DOMModel.DOMNode;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    domNode1 = createNode(target, {nodeId: 1 as Protocol.DOM.NodeId});
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    sinon.stub(Elements.ComputedStyleModel.ComputedStyleModel.prototype, 'cssModel').returns(cssModel);
    computedStyleModel = new Elements.ComputedStyleModel.ComputedStyleModel();
  });

  afterEach(() => {});

  it('listens to events on the CSS Model when there is a node given', async () => {
    const cssModel = domNode1.domModel().cssModel();
    assert.isOk(cssModel);
    const listenerSpy = sinon.spy(cssModel, 'addEventListener');
    computedStyleModel.node = domNode1;

    // Feels silly to assert each individual call; but assert 1 to verify that
    // code path was executed as expected.
    sinon.assert.calledWith(listenerSpy, SDK.CSSModel.Events.StyleSheetAdded);
  });

  it('does not listen to events when there is no node given', async () => {
    const cssModel = domNode1.domModel().cssModel();
    assert.isOk(cssModel);
    const listenerSpy = sinon.spy(SDK.CSSModel.CSSModel.prototype, 'addEventListener');
    computedStyleModel.node = null;
    sinon.assert.callCount(listenerSpy, 0);
  });

  it('emits the CSS_MODEL_CHANGED event when there is a change', async () => {
    const cssModel = domNode1.domModel().cssModel();
    assert.isOk(cssModel);
    computedStyleModel.node = domNode1;

    const modelChangedListener = sinon.spy();
    computedStyleModel.addEventListener(
        Elements.ComputedStyleModel.Events.CSS_MODEL_CHANGED, event => modelChangedListener(event.data));

    const FAKE_CSS_STYLESHEET_HEADER = {} as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader;
    cssModel.dispatchEventToListeners(SDK.CSSModel.Events.StyleSheetAdded, FAKE_CSS_STYLESHEET_HEADER);

    sinon.assert.calledOnceWithExactly(modelChangedListener, FAKE_CSS_STYLESHEET_HEADER);
  });

  it('emits the COMPUTED_STYLE_CHANGED event when the node ID matches', async () => {
    const cssModel = domNode1.domModel().cssModel();
    assert.isOk(cssModel);
    computedStyleModel.node = domNode1;

    const computedStyleListener = sinon.spy();
    computedStyleModel.addEventListener(
        Elements.ComputedStyleModel.Events.COMPUTED_STYLE_CHANGED, computedStyleListener);
    cssModel.dispatchEventToListeners(SDK.CSSModel.Events.ComputedStyleUpdated, {nodeId: domNode1.id});

    sinon.assert.callCount(computedStyleListener, 1);
  });

  it('does not emit the COMPUTED_STYLE_CHANGED event if the Node ID is different', async () => {
    const cssModel = domNode1.domModel().cssModel();
    assert.isOk(cssModel);
    computedStyleModel.node = domNode1;

    const computedStyleListener = sinon.spy();
    computedStyleModel.addEventListener(
        Elements.ComputedStyleModel.Events.COMPUTED_STYLE_CHANGED, computedStyleListener);

    cssModel.dispatchEventToListeners(
        SDK.CSSModel.Events.ComputedStyleUpdated, {nodeId: (domNode1.id + 1) as Protocol.DOM.NodeId});
    sinon.assert.callCount(computedStyleListener, 0);
  });
});
