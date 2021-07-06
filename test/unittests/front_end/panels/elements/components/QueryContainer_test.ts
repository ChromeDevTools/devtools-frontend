// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ElementsComponents from '../../../../../../front_end/panels/elements/components/components.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

import {assertNodeTextContent} from './ElementsComponentsHelper.js';

const {assert} = chai;

const nodeAttributes = new Map([
  ['id', 'container'],
  ['class', 'class-1 class-2'],
]);

const containerTemplate: ElementsComponents.Helper.DOMNode = {
  parentNode: null,
  nodeType: Node.ELEMENT_NODE,
  id: 1,
  pseudoType: '',
  shadowRootType: '',
  nodeName: 'body',
  nodeNameNicelyCased: 'body',
  legacyDomNode: {},
  highlightNode: () => {},
  clearHighlight: () => {},
  getAttribute: x => nodeAttributes.get(x) || '',
};

const assertContainerContent = (container: HTMLElement, expectedContent: string): void => {
  assertShadowRoot(container.shadowRoot);
  const nodeText =
      container.shadowRoot.querySelector<HTMLElement>(`${ElementsComponents.NodeText.NodeText.litTagName.value}`);
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

    assertContainerContent(component, '#container.class-1.class-2');
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
});
