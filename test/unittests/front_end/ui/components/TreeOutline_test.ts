// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Coordinator from '../../../../../front_end/render_coordinator/render_coordinator.js';
import * as UIComponents from '../../../../../front_end/ui/components/components.js';
import {assertElement, assertShadowRoot, dispatchClickEvent, dispatchKeyDownEvent, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
const {assert} = chai;

function renderTreeOutline(data: UIComponents.TreeOutline.TreeOutlineData): {
  component: UIComponents.TreeOutline.TreeOutline,
  shadowRoot: ShadowRoot,
} {
  const component = new UIComponents.TreeOutline.TreeOutline();
  component.data = data;
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  return {
    component,
    shadowRoot: component.shadowRoot,
  };
}

function getFocusableTreeNode(shadowRoot: ShadowRoot): HTMLLIElement {
  const focusableNode = shadowRoot.querySelector<HTMLLIElement>('li[role="treeitem"][tabindex="0"]');
  if (!focusableNode) {
    throw new Error('Could not find focused node in Tree shadow root');
  }
  return focusableNode;
}

/*
The structure represented by basicTreeData is:

- Offices
  - Europe
    - UK
      - LON
        - 6PS
        - CSG
        - BEL
    - Germany
      - MUC
      - BER
- Products
  - Chrome
  - YouTube
  - Drive
  - Calendar
*/
const basicTreeData: UIComponents.TreeOutlineUtils.TreeNode[] = [
  {
    key: 'Offices',
    children: [
      {
        key: 'Europe',
        children: [
          {
            key: 'UK',
            children: [
              {key: 'LON', children: [{key: '6PS'}, {key: 'CSG'}, {key: 'BEL'}]},
            ],
          },
          {
            key: 'Germany',
            children: [
              {key: 'MUC'},
              {key: 'BER'},
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'Products',
    children: [
      {
        key: 'Chrome',
      },
      {
        key: 'YouTube',
      },
      {
        key: 'Drive',
      },
      {
        key: 'Calendar',
      },
    ],

  },
];

interface VisibleTreeNodeFromDOM {
  key: string;
  children?: VisibleTreeNodeFromDOM[];
}
/**
 * Converts the nodes into a tree structure that we can assert against.
 */
function visibleNodesToTree(shadowRoot: ShadowRoot): VisibleTreeNodeFromDOM[] {
  const tree: VisibleTreeNodeFromDOM[] = [];

  function buildTreeNode(node: HTMLLIElement): VisibleTreeNodeFromDOM {
    const item: VisibleTreeNodeFromDOM = {
      key: treeNodeKeyText(node),
    };

    if (node.getAttribute('aria-expanded') && node.getAttribute('aria-expanded') === 'true') {
      item.children = [];
      const childNodes = node.querySelectorAll<HTMLLIElement>(':scope > ul[role="group"]>li');
      for (const child of childNodes) {
        item.children.push(buildTreeNode(child));
      }
    }

    return item;
  }
  const rootNodes = shadowRoot.querySelectorAll<HTMLLIElement>('ul[role="tree"]>li');
  for (const root of rootNodes) {
    tree.push(buildTreeNode(root));
  }
  return tree;
}

function treeNodeKeyText(node: HTMLLIElement) {
  const keyNode = node.querySelector('[data-node-key]');
  if (!keyNode) {
    throw new Error('Found tree node without a key within it.');
  }
  // Trim to remove whitespace that made it into the DOM that we don't care about.
  return (keyNode.textContent || '').trim();
}

function getVisibleTreeNodeByText(shadowRoot: ShadowRoot, text: string): HTMLLIElement {
  const nodes = shadowRoot.querySelectorAll<HTMLLIElement>('li[role="treeitem"]');
  const matchingNode = Array.from(nodes).find(node => {
    return treeNodeKeyText(node) === text;
  });

  if (!matchingNode) {
    throw new Error(`Could not find tree item with text ${text}.`);
  }
  return matchingNode;
}

describe('TreeOutline', () => {
  it('renders with all non-root nodes hidden by default', async () => {
    const {shadowRoot} = renderTreeOutline({
      tree: basicTreeData,
    });
    const visibleItems = shadowRoot.querySelectorAll<HTMLLIElement>('li[role="treeitem"]');
    assert.lengthOf(visibleItems, 2);
    const itemText1 = treeNodeKeyText(visibleItems[0]);
    const itemText2 = treeNodeKeyText(visibleItems[1]);
    assert.strictEqual(itemText1, 'Offices');
    assert.strictEqual(itemText2, 'Products');
  });

  it('expands a node when the arrow icon is clicked', () => {
    const {shadowRoot} = renderTreeOutline({
      tree: basicTreeData,
    });
    const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
    const arrowIcon = rootNode.querySelector<HTMLSpanElement>('.arrow-icon');
    assertElement(arrowIcon, HTMLSpanElement);
    dispatchClickEvent(arrowIcon);
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {key: 'Offices', children: [{key: 'Europe'}]},
      {key: 'Products'},
    ]);
  });

  it('can recursively expand the tree, going 3 levels deep by default', () => {
    const {component, shadowRoot} = renderTreeOutline({
      tree: basicTreeData,
    });
    component.expandRecursively();
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {
        key: 'Offices',
        children: [{
          key: 'Europe',
          children: [
            {key: 'UK', children: [{key: 'LON'}]},
            {key: 'Germany', children: [{key: 'MUC'}, {key: 'BER'}]},
          ],
        }],
      },
      {
        key: 'Products',
        children: [
          {
            key: 'Chrome',
          },
          {
            key: 'YouTube',
          },
          {
            key: 'Drive',
          },
          {
            key: 'Calendar',
          },
        ],
      },
    ]);
  });

  it('can recursively collapse all children of a node', () => {
    const {component, shadowRoot} = renderTreeOutline({
      tree: basicTreeData,
    });
    component.expandRecursively(Number.POSITIVE_INFINITY);
    const europeNode = getVisibleTreeNodeByText(shadowRoot, 'Europe');
    component.collapseChildrenOfNode(europeNode);
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {
        key: 'Offices',
        children: [{
          key: 'Europe',
        }],
      },
      {
        key: 'Products',
        children: [
          {
            key: 'Chrome',
          },
          {
            key: 'YouTube',
          },
          {
            key: 'Drive',
          },
          {
            key: 'Calendar',
          },
        ],
      },
    ]);
  });

  describe('navigating with keyboard', () => {
    it('defaults to the first root node as active', () => {
      const {shadowRoot} = renderTreeOutline({
        tree: basicTreeData,
      });
      assert.strictEqual(
          getFocusableTreeNode(shadowRoot),
          getVisibleTreeNodeByText(shadowRoot, 'Offices'),
      );
    });

    describe('pressing the ENTER key', () => {
      it('expands the node if it is closed', () => {
        const {shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        dispatchKeyDownEvent(officeNode, {key: 'Enter', bubbles: true});
        assert.strictEqual(officeNode.getAttribute('aria-expanded'), 'true');
      });

      it('closes the node if it is open', () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively();
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        dispatchKeyDownEvent(officeNode, {key: 'Enter', bubbles: true});
        assert.strictEqual(officeNode.getAttribute('aria-expanded'), 'false');
      });
    });

    describe('pressing the SPACE key', () => {
      it('expands the node if it is closed', () => {
        const {shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        dispatchKeyDownEvent(officeNode, {key: ' ', bubbles: true});
        assert.strictEqual(officeNode.getAttribute('aria-expanded'), 'true');
      });

      it('closes the node if it is open', () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively();
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        dispatchKeyDownEvent(officeNode, {key: ' ', bubbles: true});
        assert.strictEqual(officeNode.getAttribute('aria-expanded'), 'false');
      });
    });

    describe('pressing the HOME key', () => {
      it('takes the user to the top most root node', () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively(Number.POSITIVE_INFINITY);
        const berlinNode = getVisibleTreeNodeByText(shadowRoot, 'BER');
        dispatchClickEvent(berlinNode);
        dispatchKeyDownEvent(berlinNode, {key: 'Home', bubbles: true});
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Offices'),
        );
      });
    });

    describe('pressing the END key', () => {
      it('takes the user to the last visible node if they are all expanded', async () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively(Number.POSITIVE_INFINITY);
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        dispatchKeyDownEvent(officeNode, {key: 'End', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            // Calendar is the very last node in the tree
            getVisibleTreeNodeByText(shadowRoot, 'Calendar'),
        );
      });

      it('does not expand any closed nodes and focuses the last visible node', async () => {
        const {shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        // Expand the Offices part of the tree
        const arrowIcon = officeNode.querySelector<HTMLSpanElement>('.arrow-icon');
        assertElement(arrowIcon, HTMLSpanElement);
        dispatchClickEvent(arrowIcon);
        await coordinator.done();

        // Focus the "Europe" node.
        const europeNode = getVisibleTreeNodeByText(shadowRoot, 'Europe');
        dispatchClickEvent(europeNode);
        dispatchKeyDownEvent(officeNode, {key: 'End', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            // Products is the last node in the tree, as its children are not expanded
            getVisibleTreeNodeByText(shadowRoot, 'Products'),
        );
      });
    });

    describe('pressing the UP arrow', () => {
      it('does nothing if on the root node', async () => {
        const {shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        dispatchKeyDownEvent(officeNode, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();

        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            officeNode,
        );
      });

      it('moves focus to the previous sibling', async () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively();
        const berlinNode = getVisibleTreeNodeByText(shadowRoot, 'BER');
        dispatchClickEvent(berlinNode);
        dispatchKeyDownEvent(berlinNode, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'MUC'),
        );
      });

      it('moves focus to the parent if there are no previous siblings', async () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively();
        const ukNode = getVisibleTreeNodeByText(shadowRoot, 'UK');
        dispatchClickEvent(ukNode);
        dispatchKeyDownEvent(ukNode, {key: 'ArrowUp', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Europe'),
        );
      });

      it('moves focus to the parent\'s last child if there are no previous siblings and the parent is expanded',
         async () => {
           const {component, shadowRoot} = renderTreeOutline({
             tree: basicTreeData,
           });
           component.expandRecursively();
           const germanyNode = getVisibleTreeNodeByText(shadowRoot, 'Germany');
           dispatchClickEvent(germanyNode);
           dispatchKeyDownEvent(germanyNode, {key: 'ArrowUp', bubbles: true});
           await coordinator.done();
           assert.strictEqual(
               getFocusableTreeNode(shadowRoot),
               getVisibleTreeNodeByText(shadowRoot, 'LON'),
           );
         });

      it('moves focus to the parent\'s deeply nested last child if there are no previous siblings and the parent has children that are expanded',
         async () => {
           const {component, shadowRoot} = renderTreeOutline({
             tree: basicTreeData,
           });
           component.expandRecursively(Number.POSITIVE_INFINITY);
           const germanyNode = getVisibleTreeNodeByText(shadowRoot, 'Germany');
           dispatchClickEvent(germanyNode);
           dispatchKeyDownEvent(germanyNode, {key: 'ArrowUp', bubbles: true});
           await coordinator.done();
           assert.strictEqual(
               getFocusableTreeNode(shadowRoot),
               getVisibleTreeNodeByText(shadowRoot, 'BEL'),
           );
         });
    });

    describe('pressing the RIGHT arrow', () => {
      it('does nothing if it is on a node that cannot be expanded', async () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively(Number.POSITIVE_INFINITY);
        const chromeNode = getVisibleTreeNodeByText(shadowRoot, 'Chrome');
        dispatchClickEvent(chromeNode);
        dispatchKeyDownEvent(chromeNode, {key: 'ArrowRight', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            chromeNode,
        );
      });

      it('expands the node if on an expandable node that is closed and does not move focus', async () => {
        const {shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        dispatchKeyDownEvent(officeNode, {key: 'ArrowRight', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            officeNode,
        );
        assert.strictEqual(officeNode.getAttribute('aria-expanded'), 'true');
      });

      it('moves focus into the child if pressed on an expanded node', async () => {
        const {shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        // Press once to expand, twice to navigate in to the first child
        dispatchKeyDownEvent(officeNode, {key: 'ArrowRight', bubbles: true});
        await coordinator.done();
        dispatchKeyDownEvent(officeNode, {key: 'ArrowRight', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Europe'),
        );
      });
    });

    describe('pressing the LEFT arrow', () => {
      it('closes the node if the focused node is expanded', async () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively(Number.POSITIVE_INFINITY);
        const europeNode = getVisibleTreeNodeByText(shadowRoot, 'Europe');
        dispatchClickEvent(europeNode);
        dispatchKeyDownEvent(europeNode, {key: 'ArrowLeft', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Europe'),
        );
        const visibleTree = visibleNodesToTree(shadowRoot);
        // The tree below "Europe" is hidden as the left arrow press closed that node.
        assert.deepEqual(visibleTree, [
          {
            key: 'Offices',
            children: [{
              key: 'Europe',
            }],
          },
          {
            key: 'Products',
            children: [
              {
                key: 'Chrome',
              },
              {
                key: 'YouTube',
              },
              {
                key: 'Drive',
              },
              {
                key: 'Calendar',
              },
            ],
          },
        ]);
      });

      it('moves to the parent node if the current node is not expanded or unexpandable', async () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively(Number.POSITIVE_INFINITY);
        const berlinNode = getVisibleTreeNodeByText(shadowRoot, 'BER');
        dispatchClickEvent(berlinNode);
        dispatchKeyDownEvent(berlinNode, {key: 'ArrowLeft', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Germany'),
        );
      });
      it('does nothing when called on a root node', async () => {
        const {shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        const productsNode = getVisibleTreeNodeByText(shadowRoot, 'Products');
        dispatchClickEvent(productsNode);
        dispatchKeyDownEvent(productsNode, {key: 'ArrowLeft', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Products'),
        );
      });
    });
    describe('pressing the DOWN arrow', () => {
      it('moves down to the next sibling if the node is not expanded', async () => {
        const {shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        dispatchKeyDownEvent(officeNode, {key: 'ArrowDown', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Products'),
        );
      });

      it('does not move if it is the last sibling and there are no parent siblings', async () => {
        const {shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        const productsNode = getVisibleTreeNodeByText(shadowRoot, 'Products');
        dispatchClickEvent(productsNode);
        dispatchKeyDownEvent(productsNode, {key: 'ArrowDown', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Products'),
        );
      });

      it('moves down to the first child of the node if it is expanded', async () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively();
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        dispatchKeyDownEvent(officeNode, {key: 'ArrowDown', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Europe'),
        );
      });

      it('moves to its parent\'s sibling if it is the last child', async () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively();
        const lonNode = getVisibleTreeNodeByText(shadowRoot, 'LON');
        dispatchClickEvent(lonNode);
        dispatchKeyDownEvent(lonNode, {key: 'ArrowDown', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Germany'),
        );
      });

      it('is able to navigate high up the tree to the correct next parent\'s sibling', async () => {
        const {component, shadowRoot} = renderTreeOutline({
          tree: basicTreeData,
        });
        component.expandRecursively(Number.POSITIVE_INFINITY);
        const berNode = getVisibleTreeNodeByText(shadowRoot, 'BER');
        dispatchClickEvent(berNode);
        dispatchKeyDownEvent(berNode, {key: 'ArrowDown', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Products'),
        );
      });
    });
  });

  // Note: all aria-* positional labels are 1 indexed, not 0 indexed.
  describe('aria-* labels', () => {
    it('adds correct aria-level labels', () => {
      const {component, shadowRoot} = renderTreeOutline({
        tree: basicTreeData,
      });
      component.expandRecursively(Infinity);
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
      assert.strictEqual(rootNode.getAttribute('aria-level'), '1');

      const europeNode = getVisibleTreeNodeByText(shadowRoot, 'Europe');
      assert.strictEqual(europeNode.getAttribute('aria-level'), '2');

      const germanyNode = getVisibleTreeNodeByText(shadowRoot, 'Germany');
      assert.strictEqual(germanyNode.getAttribute('aria-level'), '3');

      const berlinNode = getVisibleTreeNodeByText(shadowRoot, 'BER');
      assert.strictEqual(berlinNode.getAttribute('aria-level'), '4');
    });

    it('adds the correct setsize label to the root node', () => {
      const {shadowRoot} = renderTreeOutline({
        tree: basicTreeData,
      });
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Products');
      assert.strictEqual(rootNode.getAttribute('aria-setsize'), '2');
    });

    it('adds the correct setsize label to a deeply nested node', () => {
      const {component, shadowRoot} = renderTreeOutline({
        tree: basicTreeData,
      });
      component.expandRecursively(Infinity);
      const europeKey = getVisibleTreeNodeByText(shadowRoot, 'Europe');
      assert.strictEqual(europeKey.getAttribute('aria-setsize'), '1');
      const germanyKey = getVisibleTreeNodeByText(shadowRoot, 'Germany');
      // 2 because there are two keys at this level in the tree: UK & Germany
      assert.strictEqual(germanyKey.getAttribute('aria-setsize'), '2');
    });

    it('adds the posinset label to nodes correctly', () => {
      const {component, shadowRoot} = renderTreeOutline({
        tree: basicTreeData,
      });
      component.expandRecursively(Infinity);
      const europeKey = getVisibleTreeNodeByText(shadowRoot, 'Europe');
      assert.strictEqual(europeKey.getAttribute('aria-posinset'), '1');
      const csgOfficeKey = getVisibleTreeNodeByText(shadowRoot, 'CSG');
      // CSG is 2nd in the LON office list: 6PS, CSG, BEL
      assert.strictEqual(csgOfficeKey.getAttribute('aria-posinset'), '2');
    });

    it('sets aria-expanded to false on non-expanded nodes', () => {
      const {shadowRoot} = renderTreeOutline({
        tree: basicTreeData,
      });
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
      assert.strictEqual(rootNode.getAttribute('aria-expanded'), 'false');
    });

    it('sets aria-expanded to true on expanded nodes', () => {
      const {shadowRoot} = renderTreeOutline({
        tree: basicTreeData,
      });
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
      const arrowIcon = rootNode.querySelector<HTMLSpanElement>('.arrow-icon');
      assertElement(arrowIcon, HTMLSpanElement);
      dispatchClickEvent(arrowIcon);
      assert.strictEqual(rootNode.getAttribute('aria-expanded'), 'true');
    });

    it('does not set aria-expanded at all on leaf nodes', () => {
      const {component, shadowRoot} = renderTreeOutline({
        tree: basicTreeData,
      });
      component.expandRecursively(Infinity);
      const leafNodeCSGOffice = getVisibleTreeNodeByText(shadowRoot, 'CSG');
      assert.strictEqual(leafNodeCSGOffice.getAttribute('aria-expanded'), null);
    });
  });
});
