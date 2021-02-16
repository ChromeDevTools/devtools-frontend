// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../front_end/elements/elements.js';
import {assertShadowRoot, dispatchMouseOverEvent, dispatchMouseLeaveEvent, renderElementIntoDOM} from '../helpers/DOMHelpers.js';
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
    axTree: null,
    hasChildren: () => false,
    children: async () => [],
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
      const node = makeAXNode({role: 'WebArea', axTree: new Elements.AccessibilityTree.AccessibilityTree()});
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };
      assertAXNodeContent(component, 'WebArea');
    });

    it('returns the node role and name', () => {
      const node =
          makeAXNode({role: 'button', name: 'Click Me', axTree: new Elements.AccessibilityTree.AccessibilityTree()});
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };
      assertAXNodeContent(component, 'button\xA0"Click Me"');
    });

    it('ignored node displays as Ignored', () => {
      const node =
          makeAXNode({role: 'presentation', ignored: true, axTree: new Elements.AccessibilityTree.AccessibilityTree()});
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
      const node = makeAXNode({
        role: 'paragraph',
        name: 'text',
        axTree: new Elements.AccessibilityTree.AccessibilityTree(),
      });
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };
      assert.isFalse(component.classList.contains('expanded'));
    });

    it('returns no children', () => {
      const node = makeAXNode({
        role: 'paragraph',
        name: 'text',
        axTree: new Elements.AccessibilityTree.AccessibilityTree(),
      });
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };
      assert.strictEqual(node.hasChildren(), false);
      assert.lengthOf(component.children, 0);
    });
  });

  describe('ancestor chain of a parent with one child', () => {
    it('parent button has one text child', () => {
      const childNode =
          makeAXNode({role: 'text', name: 'me', axTree: new Elements.AccessibilityTree.AccessibilityTree()});
      const parentNode = makeAXNode({
        role: 'button',
        name: 'click',
        children: async () => [childNode],
        hasChildren: () => true,
        axTree: new Elements.AccessibilityTree.AccessibilityTree(),
      });
      childNode.parent = parentNode;

      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: parentNode,
      };

      assert.isTrue(component.classList.contains('parent'));
    });
  });

  describe('click behaviour of accessibility nodes', () => {
    it('expanded class is toggled on expand/collapse for a node with children', async () => {
      const childNode =
          makeAXNode({role: 'text', name: 'me', axTree: new Elements.AccessibilityTree.AccessibilityTree()});
      const node = makeAXNode({
        role: 'paragraph',
        name: 'text',
        children: async () => [childNode],
        hasChildren: () => true,
        axTree: new Elements.AccessibilityTree.AccessibilityTree(),
      });
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };

      assert.isFalse(component.classList.contains('expanded'));

      await component.expand();
      assert.isTrue(component.classList.contains('expanded'));

      component.collapse();
      assert.isFalse(component.classList.contains('expanded'));
    });

    it('expanded class is not present for a node without children', async () => {
      const node = makeAXNode({
        role: 'paragraph',
        name: 'text',
        children: async () => [],
        hasChildren: () => false,
        axTree: new Elements.AccessibilityTree.AccessibilityTree(),
      });
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };

      assert.isFalse(component.classList.contains('expanded'));

      await component.expand();
      assert.isFalse(component.classList.contains('expanded'));

      component.collapse();
      assert.isFalse(component.classList.contains('expanded'));
    });
  });

  describe('mouse behaviour of accessibility nodes', () => {
    it('node is highlighted on mouse hover', async () => {
      let highlightCalls = 0;
      let clearHightlightCalls = 0;
      const node = makeAXNode({
        role: 'paragraph',
        name: 'text',
        axTree: new Elements.AccessibilityTree.AccessibilityTree(),
        highlightNode: () => {
          highlightCalls++;
        },
        clearHighlight: () => {
          clearHightlightCalls++;
        },
      });
      const component = new Elements.AccessibilityNode.AccessibilityNode();
      renderElementIntoDOM(component);
      component.data = {
        axNode: node,
      };

      assert.strictEqual(highlightCalls, 0);
      assert.strictEqual(clearHightlightCalls, 0);
      assertShadowRoot(component.shadowRoot);
      await withNoMutations(component.shadowRoot, () => {
        dispatchMouseOverEvent(component);
        dispatchMouseLeaveEvent(component);
      });
      assert.strictEqual(highlightCalls, 1);
      assert.strictEqual(clearHightlightCalls, 1);
    });
  });
});
