// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../front_end/elements/elements.js';
import {assertShadowRoot, dispatchClickEvent, dispatchMouseMoveEvent, dispatchMouseLeaveEvent, renderElementIntoDOM, assertElement} from '../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';
import {withNoMutations} from '../helpers/MutationHelpers.js';

const {assert} = chai;

const makeAXNode = (overrides: Partial<ElementsModule.AccessibilityTreeUtils.AXNode> = {}) => {
  const axNode: ElementsModule.AccessibilityTreeUtils.AXNode = {
    id: '',
    role: '',
    name: '',
    ignored: false,
    parent: null,
    children: [],
    numChildren: 0,
    hasOnlyUnloadedChildren: false,
    loadChildren: async () => {},
    highlightNode: () => {},
    clearHighlight: () => {},
    ...overrides,
  };
  return axNode;
};

describeWithEnvironment('AccessibilityTree', () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../front_end/elements/elements.js');
  });

  function assertAXNodeContent(component: HTMLElement, expected: string): void {
    assertShadowRoot(component.shadowRoot);
    const content = Array.from(component.shadowRoot.querySelectorAll('span')).map(span => span.textContent).join('');
    assert.strictEqual(content, expected);
  }

  describe('render node text', () => {
    it('returns WebArea for root node', async () => {
      const node = makeAXNode({role: 'WebArea'});
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };
      assertAXNodeContent(component, 'WebArea');
    });

    it('returns the node role and name', () => {
      const node = makeAXNode({role: 'button', name: 'Click Me'});
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };
      assertAXNodeContent(component, 'button\xA0"Click Me"');
    });

    it('ignored node displays as Ignored', () => {
      const node = makeAXNode({role: 'presentation', ignored: true});
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };
      assertAXNodeContent(component, 'Ignored');
    });
  });

  describe('unloaded children', () => {
    it('returns expanded = false', () => {
      const node = makeAXNode({role: 'paragraph', name: 'text', hasOnlyUnloadedChildren: true});
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };
      assert.isFalse(component.classList.contains('expanded'));
    });

    it('returns no children', () => {
      const node = makeAXNode({role: 'paragraph', name: 'text', hasOnlyUnloadedChildren: true});
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };
      assert.strictEqual(node.numChildren, 0);
      assert.lengthOf(component.children, 0);
    });
  });

  describe('ancestor chain of a parent with one child', () => {
    it('parent button has one text child', () => {
      const childNode = makeAXNode({role: 'text', name: 'me'});
      const parentNode = makeAXNode({
        role: 'button',
        name: 'click',
        children: [childNode],
        numChildren: 1,
      });
      childNode.parent = parentNode;

      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: parentNode,
      };

      assert.strictEqual(parentNode.children.length, 1);
      assert.isTrue(component.classList.contains('parent'));
    });
  });

  describe('click behaviour of accessibility nodes', () => {
    it('expanded class is toggled on click', () => {
      const node = makeAXNode({role: 'paragraph', name: 'text', numChildren: 1});
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };

      assert.isTrue(component.classList.contains('expanded'));

      dispatchClickEvent(component);
      assert.isFalse(component.classList.contains('expanded'));

      dispatchClickEvent(component);
      assert.isTrue(component.classList.contains('expanded'));
    });
  });

  describe('mouse behaviour of accessibility nodes', () => {
    it('node is highlighted on mouse hover', () => {
      const node = makeAXNode({role: 'paragraph', name: 'text'});
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };

      assertShadowRoot(component.shadowRoot);
      withNoMutations(component.shadowRoot, shadowRoot => {
        const nodeWrapper = shadowRoot.querySelector('.wrapper');
        assertElement(nodeWrapper, HTMLDivElement);

        assert.isUndefined(window.getComputedStyle(nodeWrapper, ':hover'));

        dispatchMouseMoveEvent(component);
        assert.isDefined(window.getComputedStyle(nodeWrapper, ':hover'));

        dispatchMouseLeaveEvent(component);
        assert.isUndefined(window.getComputedStyle(nodeWrapper, ':hover'));
      });
    });
  });
});
