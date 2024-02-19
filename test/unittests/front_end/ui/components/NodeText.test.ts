// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as NodeText from '../../../../../front_end/ui/components/node_text/node_text.js';
import {
  assertElement,
  assertNodeTextContent,
  assertShadowRoot,
  renderElementIntoDOM,
} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

describe('NodeText', async () => {
  const NodeTextComponent = NodeText.NodeText.NodeText;

  it('renders element with a title', async () => {
    const component = new NodeTextComponent();
    renderElementIntoDOM(component);
    component.data = {
      nodeTitle: 'test',
    };
    assertNodeTextContent(component, 'test');
  });

  it('renders element with a title and id', async () => {
    const component = new NodeTextComponent();
    renderElementIntoDOM(component);
    component.data = {
      nodeTitle: 'test',
      nodeId: 'id',
    };
    assertNodeTextContent(component, 'test#id');
  });

  it('renders element with a title, id and classes', async () => {
    const component = new NodeTextComponent();
    renderElementIntoDOM(component);
    component.data = {
      nodeTitle: 'test',
      nodeId: 'id',
      nodeClasses: ['class1', 'class2'],
    };
    assertNodeTextContent(component, 'test#id.class1.class2');
  });

  it('renders element with a title, id and empty classes', async () => {
    const component = new NodeTextComponent();
    renderElementIntoDOM(component);
    component.data = {
      nodeTitle: 'test',
      nodeId: 'id',
      nodeClasses: [],
    };
    assertNodeTextContent(component, 'test#id');
  });

  it('applies the multiple descriptors class when a node has both an ID and some classes', () => {
    const component = new NodeTextComponent();
    renderElementIntoDOM(component);
    component.data = {
      nodeTitle: 'test',
      nodeId: 'id',
      nodeClasses: ['foo'],
    };
    assertShadowRoot(component.shadowRoot);
    const idLabel = component.shadowRoot.querySelector('.node-label-id');
    const classLabel = component.shadowRoot.querySelector('.node-label-class');
    assertElement(idLabel, HTMLSpanElement);
    assertElement(classLabel, HTMLSpanElement);
    assert.isTrue(idLabel.classList.contains('node-multiple-descriptors'));
    assert.isTrue(classLabel.classList.contains('node-multiple-descriptors'));
  });

  it('does not apply the multiple descriptors class when the node has only an ID', () => {
    const component = new NodeTextComponent();
    renderElementIntoDOM(component);
    component.data = {
      nodeTitle: 'test',
      nodeId: 'id',
      nodeClasses: [],
    };
    assertShadowRoot(component.shadowRoot);
    const idLabel = component.shadowRoot.querySelector('.node-label-id');
    assertElement(idLabel, HTMLSpanElement);
    assert.isFalse(idLabel.classList.contains('node-multiple-descriptors'));
  });
});
