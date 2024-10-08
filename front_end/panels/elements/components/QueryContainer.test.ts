// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import {assertNodeTextContent, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import type * as NodeText from '../../../ui/components/node_text/node_text.js';

import * as ElementsComponents from './components.js';

const nodeAttributes = new Map([
  ['id', 'container'],
  ['class', 'class-1 class-2'],
]);

const FAKE_LEGACY_SDK_DOM_NODE = {} as unknown as SDK.DOMModel.DOMNode;
const containerTemplate: ElementsComponents.Helper.DOMNode = {
  parentNode: null,
  nodeType: Node.ELEMENT_NODE,
  id: 1,
  pseudoType: '',
  shadowRootType: '',
  nodeName: 'body',
  nodeNameNicelyCased: 'body',
  legacyDomNode: FAKE_LEGACY_SDK_DOM_NODE,
  highlightNode: () => {},
  clearHighlight: () => {},
  getAttribute: x => nodeAttributes.get(x) || '',
};

const assertContainerContent = (container: HTMLElement, expectedContent: string) => {
  const nodeText = container.shadowRoot!.querySelector<NodeText.NodeText.NodeText>('devtools-node-text');
  if (!nodeText || !nodeText.shadowRoot) {
    assert.fail('node text element and its shadowRoot should exist');
    return;
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
    const onHighlightNode = sinon.spy();
    const onClearHighlight = sinon.spy();
    component.data = {
      container: {
        ...containerTemplate,
        highlightNode: onHighlightNode,
        clearHighlight: onClearHighlight,
      },
      queryName: 'named-container',
      onContainerLinkClick: clickListener,
    };

    assertContainerContent(component, 'named-container');
    const containerLink = component.shadowRoot?.querySelector('a');
    if (!containerLink) {
      assert.fail('container link element should exist');
      return;
    }

    containerLink.click();
    assert.strictEqual(clickListener.callCount, 1, 'container link click listener should be triggered by clicking');

    containerLink.dispatchEvent(new Event('mouseenter'));
    assert.strictEqual(onHighlightNode.callCount, 1, 'onHighlightNode callback should be triggered by mouseenter');

    containerLink.dispatchEvent(new Event('mouseleave'));
    assert.strictEqual(onHighlightNode.callCount, 1, 'onClearHighlight callback should be triggered by mouseleave');
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
    assert.strictEqual(nonExistentDetailsElement, null, 'query details without any axis should not be rendered');

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
