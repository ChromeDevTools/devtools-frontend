// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {assertNodeTextContent, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';

import * as ElementsComponents from './components.js';

const nodeAttributes = new Map([
  ['id', 'container'],
  ['class', 'class-1 class-2'],
]);

const containerTemplate = {
  id: 1 as Protocol.DOM.NodeId,
  nodeType: () => Node.ELEMENT_NODE,
  pseudoType: () => '',
  shadowRootType: () => '',
  nodeName: () => 'body',
  nodeNameInCorrectCase: () => 'body',
  getAttribute: (x: string) => nodeAttributes.get(x) || '',
  highlight: () => {},
} as unknown as SDK.DOMModel.DOMNode;

const assertContainerContent = (container: HTMLElement, expectedContent: string) => {
  const nodeText = container.shadowRoot!.querySelector('devtools-node-text');
  if (!nodeText?.shadowRoot) {
    assert.fail('node text element and its shadowRoot should exist');
  }

  assertNodeTextContent(nodeText, expectedContent);
};

describe('QueryContainer', () => {
  it('renders an unnamed query container correctly', () => {
    const component = new ElementsComponents.QueryContainer.QueryContainer();
    renderElementIntoDOM(component);

    const clickListener = sinon.spy();
    component.data = {
      container: containerTemplate,
      onContainerLinkClick: clickListener,
    };

    assertContainerContent(component, 'body#container.class-1.class-2');
    component.shadowRoot?.querySelector('a')?.click();
    assert.strictEqual(clickListener.callCount, 1, 'container link click listener should be triggered by clicking');
  });

  it('renders a named query container correctly', () => {
    const component = new ElementsComponents.QueryContainer.QueryContainer();
    renderElementIntoDOM(component);

    const clickListener = sinon.spy();
    const onHighlight = sinon.spy();
    const hideHighlightStub = sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');
    component.data = {
      container: {
        ...containerTemplate,
        highlight: onHighlight,
      } as unknown as SDK.DOMModel.DOMNode,
      queryName: 'named-container',
      onContainerLinkClick: clickListener,
    };

    assertContainerContent(component, 'named-container');
    const containerLink = component.shadowRoot?.querySelector('a');
    assert.exists(containerLink, 'container link element should exist');

    containerLink.click();
    assert.strictEqual(clickListener.callCount, 1, 'container link click listener should be triggered by clicking');

    containerLink.dispatchEvent(new Event('mouseenter'));
    assert.strictEqual(onHighlight.callCount, 1, 'onHighlight callback should be triggered by mouseenter');

    containerLink.dispatchEvent(new Event('mouseleave'));
    assert.strictEqual(hideHighlightStub.callCount, 1, 'hideDOMNodeHighlight stub should be triggered by mouseleave');
  });

  it('dispatches QueriedSizeRequestedEvent when hovered correctly', () => {
    const component = new ElementsComponents.QueryContainer.QueryContainer();
    renderElementIntoDOM(component);

    const queriedSizeRequestedListener = sinon.spy();
    component.data = {
      container: containerTemplate,
      onContainerLinkClick: () => {},
    };
    component.addEventListener('queriedsizerequested', queriedSizeRequestedListener);

    component.shadowRoot!.querySelector('a')?.dispatchEvent(new Event('mouseenter'));
    assert.strictEqual(
        queriedSizeRequestedListener.callCount, 1, 'queried size requested listener should be triggered by hovering');
  });

  it('renders queried size details correctly', () => {
    const component = new ElementsComponents.QueryContainer.QueryContainer();
    renderElementIntoDOM(component);

    component.data = {
      container: containerTemplate,
      onContainerLinkClick: () => {},
    };

    component.shadowRoot!.querySelector('a')?.dispatchEvent(new Event('mouseenter'));

    component.updateContainerQueriedSizeDetails({
      physicalAxis: SDK.CSSContainerQuery.PhysicalAxis.NONE,
      queryAxis: SDK.CSSContainerQuery.QueryAxis.NONE,
      width: '500px',
      height: '300px',
    });
    const nonExistentDetailsElement = component.shadowRoot!.querySelector<HTMLElement>('.queried-size-details');
    assert.isNull(nonExistentDetailsElement, 'query details without any axis should not be rendered');

    component.updateContainerQueriedSizeDetails({
      physicalAxis: SDK.CSSContainerQuery.PhysicalAxis.HORIZONTAL,
      queryAxis: SDK.CSSContainerQuery.QueryAxis.INLINE,
      width: '500px',
    });
    const detailsElement = component.shadowRoot!.querySelector<HTMLElement>('.queried-size-details');
    assert.strictEqual(detailsElement?.innerText, '(inline-size) 500px', 'queried size details are not correct');

    component.updateContainerQueriedSizeDetails({
      physicalAxis: SDK.CSSContainerQuery.PhysicalAxis.HORIZONTAL,
      queryAxis: SDK.CSSContainerQuery.QueryAxis.BLOCK,
      width: '200px',
    });
    assert.strictEqual(detailsElement?.innerText, '(block-size) 200px', 'queried size details are not correct');

    component.updateContainerQueriedSizeDetails({
      physicalAxis: SDK.CSSContainerQuery.PhysicalAxis.BOTH,
      queryAxis: SDK.CSSContainerQuery.QueryAxis.BOTH,
      width: '500px',
      height: '300px',
    });
    assert.strictEqual(
        detailsElement?.innerText, '(size) width: 500px height: 300px', 'queried size details are not correct');
  });
});
