// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  dispatchClickEvent,
  dispatchKeyDownEvent,
  dispatchMouseOutEvent,
  dispatchMouseOverEvent,
  getEventPromise,
  renderElementIntoDOM,
  stripLitHtmlCommentNodes,
} from '../../../testing/DOMHelpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as TreeOutline from './tree_outline.js';

const {html} = LitHtml;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderTreeOutline<TreeNodeDataType>({
  tree,
  defaultRenderer,
  filter,
}: {
  tree: TreeOutline.TreeOutline.TreeOutlineData<TreeNodeDataType>['tree'],
  // defaultRenderer is required usually but here we make it optinal and provide a default one as part of renderTreeOutline, to save duplication in every single test where we want to use a simple string renderer.
  defaultRenderer?: TreeOutline.TreeOutline.TreeOutlineData<TreeNodeDataType>['defaultRenderer'],
  filter?: TreeOutline.TreeOutline.TreeOutlineData<TreeNodeDataType>['filter'],
}): Promise<{
  component: TreeOutline.TreeOutline.TreeOutline<TreeNodeDataType>,
  shadowRoot: ShadowRoot,
}> {
  const component = new TreeOutline.TreeOutline.TreeOutline<TreeNodeDataType>();
  const data: TreeOutline.TreeOutline.TreeOutlineData<TreeNodeDataType> = {
    tree,
    defaultRenderer: defaultRenderer ||
        ((node: TreeOutline.TreeOutlineUtils.TreeNode<TreeNodeDataType>) => html`${node.treeNodeData}`),
    filter,
  };
  component.data = data;
  renderElementIntoDOM(component);
  assert.isNotNull(component.shadowRoot);
  await coordinator.done();
  return {
    component,
    shadowRoot: component.shadowRoot,
  };
}

/**
 * Wait for a certain number of children are rendered. We need this as the
 * component uses LitHtml's until directive, which is async and not within the
 * render coordinator's control.
 */
async function waitForRenderedTreeNodeCount(shadowRoot: ShadowRoot, expectedNodeCount: number): Promise<void> {
  const actualNodeCount = shadowRoot.querySelectorAll('li[role="treeitem"]').length;
  if (actualNodeCount === expectedNodeCount) {
    return;
  }

  await new Promise<void>(resolve => {
    requestAnimationFrame(async () => {
      await waitForRenderedTreeNodeCount(shadowRoot, expectedNodeCount);
      resolve();
    });
  });
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

// These node is pulled out as we test expandAndSelectTreeNode and getPathToTreeNode with them.
const nodeBelgraveHouse = {
  treeNodeData: 'BEL',
  id: 'BEL',
};

const nodeLondon = {
  treeNodeData: 'LON',
  id: 'LON',
  children: async () => [{treeNodeData: '6PS', id: '6PS'}, {treeNodeData: 'CSG', id: 'CSG'}, nodeBelgraveHouse],
};

const nodeUK = {
  treeNodeData: 'UK',
  id: 'UK',
  children: async () => [nodeLondon],
};

const nodeEurope = {
  treeNodeData: 'Europe',
  id: 'Europe',
  children: async () => [nodeUK, {
    treeNodeData: 'Germany',
    id: 'Germany',
    children: async () => [{treeNodeData: 'MUC', id: 'MUC'}, {treeNodeData: 'BER', id: 'BER'}],
  }],
};

const nodeOffices = {
  treeNodeData: 'Offices',
  id: 'Offices',
  children: async () => [nodeEurope],
};

const basicTreeData: TreeOutline.TreeOutlineUtils.TreeNode<string>[] = [
  nodeOffices,
  {
    treeNodeData: 'Products',
    id: '1',
    children: async () =>
        [{
          treeNodeData: 'Chrome',
          id: '2',
        },
         {
           treeNodeData: 'YouTube',
           id: '3',
         },
         {
           treeNodeData: 'Drive',
           id: '4',
         },
         {
           treeNodeData: 'Calendar',
           id: '5',
         }],
  },
];

/*
The structure represented by nodeAustralia is:

- Australia
  - SA
    - Adelaide
      - Toorak Gardens
      - Woodville South
      - Gawler
  - NSW
    - Glebe
    - Newtown
    - Camperdown
*/

const nodeAustralia = {
  treeNodeData: 'Australia',
  id: 'australia',
  children: async () =>
      [{
        treeNodeData: 'SA',
        id: 'sa',
        children: async () =>
            [{
              treeNodeData: 'Adelaide',
              id: 'adelaide',
              children: async () =>
                  [{treeNodeData: 'Toorak Gardens', id: 'toorak'},
                   {treeNodeData: 'Woodville South', id: 'woodville'},
                   {treeNodeData: 'Gawler', id: 'gawler'},
],
            },
],
      },
       {
         treeNodeData: 'NSW',
         id: 'nsw',
         children: async () =>
             [{treeNodeData: 'Glebe', id: 'glebe'},
              {treeNodeData: 'Newtown', id: 'newtown'},
              {treeNodeData: 'Camperdown', id: 'camperdown'},
],
       },
],
};

const NODE_COUNT_BASIC_DATA_FULLY_EXPANDED = 15;
const NODE_COUNT_BASIC_DATA_DEFAULT_EXPANDED = 12;

interface VisibleTreeNodeFromDOM {
  renderedKey: string;
  children?: VisibleTreeNodeFromDOM[];
}

/**
 * Converts the nodes into a tree structure that we can assert against.
 */
function visibleNodesToTree(shadowRoot: ShadowRoot): VisibleTreeNodeFromDOM[] {
  const tree: VisibleTreeNodeFromDOM[] = [];

  function buildTreeNode(node: HTMLLIElement): VisibleTreeNodeFromDOM {
    const item: VisibleTreeNodeFromDOM = {
      renderedKey: nodeKeyInnerHTML(node),
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
  return keyNode.getAttribute('data-node-key') || '';
}

function nodeKeyInnerHTML(node: HTMLLIElement) {
  const keyNode = node.querySelector('[data-node-key]');
  if (!keyNode) {
    throw new Error('Found tree node without a key within it.');
  }
  return stripLitHtmlCommentNodes(keyNode.innerHTML);
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
    const {shadowRoot} = await renderTreeOutline({
      tree: basicTreeData,
    });
    const visibleItems = shadowRoot.querySelectorAll<HTMLLIElement>('li[role="treeitem"]');
    assert.lengthOf(visibleItems, 2);
    const itemText1 = treeNodeKeyText(visibleItems[0]);
    const itemText2 = treeNodeKeyText(visibleItems[1]);
    assert.strictEqual(itemText1, 'Offices');
    assert.strictEqual(itemText2, 'Products');
  });

  it('expands a node when the arrow icon is clicked', async () => {
    const {shadowRoot} = await renderTreeOutline({
      tree: basicTreeData,
    });
    const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
    const arrowIcon = rootNode.querySelector<HTMLSpanElement>('.arrow-icon');
    assert.instanceOf(arrowIcon, HTMLSpanElement);
    dispatchClickEvent(arrowIcon);
    await waitForRenderedTreeNodeCount(shadowRoot, 3);
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {renderedKey: 'Offices', children: [{renderedKey: 'Europe'}]},
      {renderedKey: 'Products'},
    ]);
  });

  it('does not expand nodes when clicking outside of the arrow by default', async () => {
    const {shadowRoot} = await renderTreeOutline({
      tree: basicTreeData,
    });
    const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
    dispatchClickEvent(rootNode);
    await waitForRenderedTreeNodeCount(shadowRoot, 2);
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {renderedKey: 'Offices'},
      {renderedKey: 'Products'},
    ]);
  });

  it('can be configured to expand nodes when any part of the node is clicked', async () => {
    const {component, shadowRoot} = await renderTreeOutline({
      tree: basicTreeData,
    });
    component.setAttribute('clickabletitle', '');
    const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
    dispatchClickEvent(rootNode);
    await waitForRenderedTreeNodeCount(shadowRoot, 3);
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {renderedKey: 'Offices', children: [{renderedKey: 'Europe'}]},
      {renderedKey: 'Products'},
    ]);
  });

  describe('nowrap attribute', () => {
    it('sets the white-space to initial by default', async () => {
      const {shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
      const key = rootNode.querySelector('[data-node-key]');
      assert.instanceOf(key, HTMLElement);
      const whiteSpaceValue = window.getComputedStyle(key).getPropertyValue('white-space');
      assert.strictEqual(whiteSpaceValue, 'normal');
    });

    it('will set white-space: nowrap if the attribute is set', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      component.setAttribute('nowrap', '');
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
      const key = rootNode.querySelector('[data-node-key]');
      assert.instanceOf(key, HTMLElement);
      const whiteSpaceValue = window.getComputedStyle(key).getPropertyValue('white-space');
      assert.strictEqual(whiteSpaceValue, 'nowrap');
    });
  });

  describe('toplevelbordercolor attribute', () => {
    it('by default the nodes are not given a border', async () => {
      const {shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
      const borderTopValue = window.getComputedStyle(rootNode).getPropertyValue('border-top');
      // Odd assertion: this is the default borderTop the browser "applies" if none is set.
      assert.strictEqual(borderTopValue, '0px none rgb(0, 0, 0)');
    });

    it('gives the nodes a border if the attribute is set', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      component.setAttribute('toplevelbordercolor', 'rgb(255, 0, 0)');
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
      const borderTopValue = window.getComputedStyle(rootNode).getPropertyValue('border-top');
      assert.strictEqual(borderTopValue, '1px solid rgb(255, 0, 0)');
    });
  });

  it('can take nodes with a custom key type', async () => {
    interface CustomTreeKeyType {
      property: string;
      value: string;
    }
    const customRenderer = (node: TreeOutline.TreeOutlineUtils.TreeNode<CustomTreeKeyType>) => {
      return html`<h2 class="item">${node.treeNodeData.property.toUpperCase()}:</h2>${node.treeNodeData.value}`;
    };
    const tinyTree: TreeOutline.TreeOutlineUtils.TreeNode<CustomTreeKeyType>[] = [{
      treeNodeData: {property: 'name', value: 'jack'},
      id: '0',
      renderer: customRenderer,
      children: async () =>
          [{
            renderer: customRenderer,
            id: '1',
            treeNodeData: {property: 'locationGroupName', value: 'EMEA'},
          },
           {
             renderer: customRenderer,
             id: '2',
             treeNodeData: {property: 'locationGroupName', value: 'USA'},
           },
           {
             renderer: customRenderer,
             id: '3',
             treeNodeData: {property: 'locationGroupName', value: 'APAC'},
           }],
    }];
    const {component, shadowRoot} = await renderTreeOutline({
      tree: tinyTree,
    });

    await component.expandRecursively();
    await waitForRenderedTreeNodeCount(shadowRoot, 4);
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {
        renderedKey: '<h2 class="item">NAME:</h2>jack',
        children: [
          {
            renderedKey: '<h2 class="item">LOCATIONGROUPNAME:</h2>EMEA',
          },
          {
            renderedKey: '<h2 class="item">LOCATIONGROUPNAME:</h2>USA',
          },
          {
            renderedKey: '<h2 class="item">LOCATIONGROUPNAME:</h2>APAC',
          },
        ],
      },
    ]);
  });

  it('can recursively expand the tree, going 3 levels deep by default', async () => {
    const {component, shadowRoot} = await renderTreeOutline({
      tree: basicTreeData,
    });
    await component.expandRecursively();
    await waitForRenderedTreeNodeCount(shadowRoot, 12);
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {
        renderedKey: 'Offices',
        children: [{
          renderedKey: 'Europe',
          children: [
            {renderedKey: 'UK', children: [{renderedKey: 'LON'}]},
            {renderedKey: 'Germany', children: [{renderedKey: 'MUC'}, {renderedKey: 'BER'}]},
          ],
        }],
      },
      {
        renderedKey: 'Products',
        children: [
          {
            renderedKey: 'Chrome',
          },
          {
            renderedKey: 'YouTube',
          },
          {
            renderedKey: 'Drive',
          },
          {
            renderedKey: 'Calendar',
          },
        ],
      },
    ]);
  });

  describe('expandToAndSelectTreeNode', () => {
    it('expands the relevant part of the tree to reveal the given node', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      await component.expandToAndSelectTreeNode(nodeBelgraveHouse);
      await waitForRenderedTreeNodeCount(shadowRoot, 9);
      const visibleTree = visibleNodesToTree(shadowRoot);
      // The tree is expanded down to include "BEL" but the rest of the tree is still collapsed.
      assert.deepEqual(visibleTree, [
        {
          renderedKey: 'Offices',
          children: [{
            renderedKey: 'Europe',
            children: [
              {
                renderedKey: 'UK',
                children: [
                  {renderedKey: 'LON', children: [{renderedKey: '6PS'}, {renderedKey: 'CSG'}, {renderedKey: 'BEL'}]},
                ],
              },
              {renderedKey: 'Germany'},
            ],
          }],
        },
        {
          renderedKey: 'Products',
        },
      ]);
    });

    it('selects the given node once the tree has been expanded', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      await component.expandToAndSelectTreeNode(nodeBelgraveHouse);
      // Wait for the tree to be expanded
      await waitForRenderedTreeNodeCount(shadowRoot, 9);
      // Wait for the coordinator to have called focus() on the right node
      await coordinator.done();

      assert.strictEqual(
          getFocusableTreeNode(shadowRoot),
          getVisibleTreeNodeByText(shadowRoot, 'BEL'),
      );
    });
  });

  it('can recursively collapse all children of a node', async () => {
    const {component, shadowRoot} = await renderTreeOutline({
      tree: basicTreeData,
    });
    await component.expandRecursively(Number.POSITIVE_INFINITY);
    await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
    const europeNode = getVisibleTreeNodeByText(shadowRoot, 'Europe');
    await component.collapseChildrenOfNode(europeNode);
    await waitForRenderedTreeNodeCount(shadowRoot, 7);
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {
        renderedKey: 'Offices',
        children: [{
          renderedKey: 'Europe',
        }],
      },
      {
        renderedKey: 'Products',
        children: [
          {
            renderedKey: 'Chrome',
          },
          {
            renderedKey: 'YouTube',
          },
          {
            renderedKey: 'Drive',
          },
          {
            renderedKey: 'Calendar',
          },
        ],
      },
    ]);
  });

  it('can collapse all nodes', async () => {
    const {component, shadowRoot} = await renderTreeOutline({
      tree: basicTreeData,
    });
    await component.expandRecursively(Number.POSITIVE_INFINITY);
    await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
    await component.collapseAllNodes();
    await waitForRenderedTreeNodeCount(shadowRoot, 2);
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {
        renderedKey: 'Offices',
      },
      {
        renderedKey: 'Products',
      },
    ]);
  });

  it('caches async child nodes and only fetches them once', async () => {
    const fetchChildrenSpy = sinon.spy<() => Promise<TreeOutline.TreeOutlineUtils.TreeNode<string>[]>>(async () => {
      return [
        {
          treeNodeData: 'EMEA',
          id: '1',
        },
        {
          treeNodeData: 'USA',
          id: '2',
        },
        {
          treeNodeData: 'APAC',
          id: '3',
        },
      ];
    });
    const tinyTree: TreeOutline.TreeOutlineUtils.TreeNode<string>[] = [
      {
        treeNodeData: 'Offices',
        id: '0',
        children: fetchChildrenSpy,
      },
    ];

    const {component, shadowRoot} = await renderTreeOutline({
      tree: tinyTree,
    });

    // Expand it, then collapse it, then expand it again
    await component.expandRecursively(Number.POSITIVE_INFINITY);
    await waitForRenderedTreeNodeCount(shadowRoot, 4);
    assert.strictEqual(fetchChildrenSpy.callCount, 1);
    const officesNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
    await component.collapseChildrenOfNode(officesNode);
    await waitForRenderedTreeNodeCount(shadowRoot, 1);
    await component.expandRecursively(Number.POSITIVE_INFINITY);
    await waitForRenderedTreeNodeCount(shadowRoot, 4);
    // Make sure that we only fetched the children once despite expanding the
    // Tree twice.
    assert.strictEqual(fetchChildrenSpy.callCount, 1);
    const visibleTree = visibleNodesToTree(shadowRoot);
    assert.deepEqual(visibleTree, [
      {
        renderedKey: 'Offices',
        children: [
          {
            renderedKey: 'EMEA',
          },
          {renderedKey: 'USA'},
          {renderedKey: 'APAC'},
        ],
      },
    ]);
  });

  it('allows a node to have a custom renderer', async () => {
    const tinyTree: TreeOutline.TreeOutlineUtils.TreeNode<string>[] = [{
      treeNodeData: 'Offices',
      id: 'Offices',
      renderer: node => html`<h2 class="top-node">${node.treeNodeData.toUpperCase()}</h2>`,
      children: async () =>
          [{
            treeNodeData: 'EMEA',
            id: 'EMEA',
          },
           {
             treeNodeData: 'USA',
             id: 'USA',
           },
           {
             treeNodeData: 'APAC',
             id: 'APAC',
           }],
    }];

    const {component, shadowRoot} = await renderTreeOutline({
      tree: tinyTree,
    });

    await component.expandRecursively(Number.POSITIVE_INFINITY);
    await waitForRenderedTreeNodeCount(shadowRoot, 4);
    const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
    const key = officeNode.querySelector('[data-node-key]');
    assert.instanceOf(key, HTMLElement);
    const renderedKey = stripLitHtmlCommentNodes(key.innerHTML);
    assert.strictEqual(renderedKey, '<h2 class="top-node">OFFICES</h2>');
  });

  it('passes the custom renderer the expanded state', async () => {
    const tinyTree: TreeOutline.TreeOutlineUtils.TreeNode<string>[] = [{
      treeNodeData: 'Offices',
      id: 'Offices',
      renderer: (node, {isExpanded}) => {
        return html`<h2 class="top-node">${node.treeNodeData.toUpperCase()}. Expanded: ${isExpanded}</h2>`;
      },
      children: async () =>
          [{
            treeNodeData: 'EMEA',
            id: 'EMEA',
          },
           {
             treeNodeData: 'USA',
             id: 'USA',
           },
           {
             treeNodeData: 'APAC',
             id: 'APAC',
           }],
    }];

    const {component, shadowRoot} = await renderTreeOutline({
      tree: tinyTree,
    });

    const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
    const key = officeNode.querySelector('[data-node-key]');
    assert.instanceOf(key, HTMLElement);
    let renderedKey = stripLitHtmlCommentNodes(key.innerHTML);
    assert.strictEqual(renderedKey, '<h2 class="top-node">OFFICES. Expanded: false</h2>');
    await component.expandRecursively(Number.POSITIVE_INFINITY);
    await waitForRenderedTreeNodeCount(shadowRoot, 4);
    renderedKey = stripLitHtmlCommentNodes(key.innerHTML);
    assert.strictEqual(renderedKey, '<h2 class="top-node">OFFICES. Expanded: true</h2>');
  });

  describe('navigating with keyboard', () => {
    it('defaults to the first root node as active', async () => {
      const {shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      assert.strictEqual(
          getFocusableTreeNode(shadowRoot),
          getVisibleTreeNodeByText(shadowRoot, 'Offices'),
      );
    });

    describe('pressing the ENTER key', () => {
      it('expands the node if it is closed', async () => {
        const {shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        await coordinator.done();
        dispatchKeyDownEvent(officeNode, {key: 'Enter', bubbles: true});
        await waitForRenderedTreeNodeCount(shadowRoot, 3);
        assert.strictEqual(officeNode.getAttribute('aria-expanded'), 'true');
      });

      it('closes the node if it is open', async () => {
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        void component.expandRecursively();
        await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_DEFAULT_EXPANDED);
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        await coordinator.done();
        dispatchKeyDownEvent(officeNode, {key: 'Enter', bubbles: true});
        await waitForRenderedTreeNodeCount(shadowRoot, 6);
        assert.strictEqual(officeNode.getAttribute('aria-expanded'), 'false');
      });
    });

    describe('pressing the SPACE key', () => {
      it('expands the node if it is closed', async () => {
        const {shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        await coordinator.done();
        dispatchKeyDownEvent(officeNode, {key: ' ', bubbles: true});
        await waitForRenderedTreeNodeCount(shadowRoot, 3);
        assert.strictEqual(officeNode.getAttribute('aria-expanded'), 'true');
      });

      it('closes the node if it is open', async () => {
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively();
        await waitForRenderedTreeNodeCount(shadowRoot, 12);
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        await coordinator.done();
        dispatchKeyDownEvent(officeNode, {key: ' ', bubbles: true});
        await waitForRenderedTreeNodeCount(shadowRoot, 6);
        assert.strictEqual(officeNode.getAttribute('aria-expanded'), 'false');
      });
    });

    describe('pressing the HOME key', () => {
      it('takes the user to the top most root node', async () => {
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively(Number.POSITIVE_INFINITY);
        await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
        const berlinNode = getVisibleTreeNodeByText(shadowRoot, 'BER');
        dispatchClickEvent(berlinNode);
        await coordinator.done();
        dispatchKeyDownEvent(berlinNode, {key: 'Home', bubbles: true});
        await coordinator.done();
        assert.strictEqual(
            getFocusableTreeNode(shadowRoot),
            getVisibleTreeNodeByText(shadowRoot, 'Offices'),
        );
      });
    });

    describe('pressing the END key', () => {
      it('takes the user to the last visible node if they are all expanded', async () => {
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively(Number.POSITIVE_INFINITY);
        await coordinator.done();
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
        const {shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        // Expand the Offices part of the tree
        const arrowIcon = officeNode.querySelector<HTMLSpanElement>('.arrow-icon');
        assert.instanceOf(arrowIcon, HTMLSpanElement);
        dispatchClickEvent(arrowIcon);
        await waitForRenderedTreeNodeCount(shadowRoot, 3);

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
        const {shadowRoot} = await renderTreeOutline({
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
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively();
        await waitForRenderedTreeNodeCount(shadowRoot, 12);
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
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively();
        await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_DEFAULT_EXPANDED);
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
           const {component, shadowRoot} = await renderTreeOutline({
             tree: basicTreeData,
           });
           await component.expandRecursively();
           await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_DEFAULT_EXPANDED);
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
           const {component, shadowRoot} = await renderTreeOutline({
             tree: basicTreeData,
           });
           await component.expandRecursively(Number.POSITIVE_INFINITY);
           await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
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
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively(Number.POSITIVE_INFINITY);
        await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
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
        const {shadowRoot} = await renderTreeOutline({
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
        const {shadowRoot} = await renderTreeOutline({
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
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively(Number.POSITIVE_INFINITY);
        await coordinator.done();
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
            renderedKey: 'Offices',
            children: [{
              renderedKey: 'Europe',
            }],
          },
          {
            renderedKey: 'Products',
            children: [
              {
                renderedKey: 'Chrome',
              },
              {
                renderedKey: 'YouTube',
              },
              {
                renderedKey: 'Drive',
              },
              {
                renderedKey: 'Calendar',
              },
            ],
          },
        ]);
      });

      it('moves to the parent node if the current node is not expanded or unexpandable', async () => {
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively(Number.POSITIVE_INFINITY);
        await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
        await coordinator.done();
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
        const {shadowRoot} = await renderTreeOutline({
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
        const {shadowRoot} = await renderTreeOutline({
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
        const {shadowRoot} = await renderTreeOutline({
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
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively();
        await coordinator.done();
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
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively();
        await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_DEFAULT_EXPANDED);
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
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await component.expandRecursively(Number.POSITIVE_INFINITY);
        await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
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
    it('adds correct aria-level labels', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      await component.expandRecursively(Number.POSITIVE_INFINITY);
      await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
      await coordinator.done();
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
      assert.strictEqual(rootNode.getAttribute('aria-level'), '1');

      const europeNode = getVisibleTreeNodeByText(shadowRoot, 'Europe');
      assert.strictEqual(europeNode.getAttribute('aria-level'), '2');

      const germanyNode = getVisibleTreeNodeByText(shadowRoot, 'Germany');
      assert.strictEqual(germanyNode.getAttribute('aria-level'), '3');

      const berlinNode = getVisibleTreeNodeByText(shadowRoot, 'BER');
      assert.strictEqual(berlinNode.getAttribute('aria-level'), '4');
    });

    it('adds the correct setsize label to the root node', async () => {
      const {shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Products');
      assert.strictEqual(rootNode.getAttribute('aria-setsize'), '2');
    });

    it('adds the correct setsize label to a deeply nested node', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      await component.expandRecursively(Number.POSITIVE_INFINITY);
      await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
      const europeKey = getVisibleTreeNodeByText(shadowRoot, 'Europe');
      assert.strictEqual(europeKey.getAttribute('aria-setsize'), '1');
      const germanyKey = getVisibleTreeNodeByText(shadowRoot, 'Germany');
      // 2 because there are two keys at this level in the tree: UK & Germany
      assert.strictEqual(germanyKey.getAttribute('aria-setsize'), '2');
    });

    it('adds the posinset label to nodes correctly', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      await component.expandRecursively(Number.POSITIVE_INFINITY);
      await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
      const europeKey = getVisibleTreeNodeByText(shadowRoot, 'Europe');
      assert.strictEqual(europeKey.getAttribute('aria-posinset'), '1');
      const csgOfficeKey = getVisibleTreeNodeByText(shadowRoot, 'CSG');
      // CSG is 2nd in the LON office list: 6PS, CSG, BEL
      assert.strictEqual(csgOfficeKey.getAttribute('aria-posinset'), '2');
    });

    it('sets aria-expanded to false on non-expanded nodes', async () => {
      const {shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
      assert.strictEqual(rootNode.getAttribute('aria-expanded'), 'false');
    });

    it('sets aria-expanded to true on expanded nodes', async () => {
      const {shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      const rootNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
      const arrowIcon = rootNode.querySelector<HTMLSpanElement>('.arrow-icon');
      assert.instanceOf(arrowIcon, HTMLSpanElement);
      dispatchClickEvent(arrowIcon);
      await coordinator.done();
      assert.strictEqual(rootNode.getAttribute('aria-expanded'), 'true');
    });

    it('does not set aria-expanded at all on leaf nodes', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: basicTreeData,
      });
      await component.expandRecursively(Number.POSITIVE_INFINITY);
      await waitForRenderedTreeNodeCount(shadowRoot, NODE_COUNT_BASIC_DATA_FULLY_EXPANDED);
      const leafNodeCSGOffice = getVisibleTreeNodeByText(shadowRoot, 'CSG');
      assert.strictEqual(leafNodeCSGOffice.getAttribute('aria-expanded'), null);
    });
  });

  describe('emitting events', () => {
    describe('itemselected event', () => {
      it('emits an event when the user clicks on the node', async () => {
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await coordinator.done();
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        const treeItemSelectedEvent =
            getEventPromise<TreeOutline.TreeOutline.ItemSelectedEvent<string>>(component, 'itemselected');
        dispatchClickEvent(officeNode);
        const event = await treeItemSelectedEvent;
        assert.deepEqual(event.data, {node: basicTreeData[0]});
      });

      it('emits an event when the user navigates to the node with their keyboard', async () => {
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await coordinator.done();
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices');
        dispatchClickEvent(officeNode);
        await coordinator.done();
        dispatchKeyDownEvent(officeNode, {key: 'ArrowDown', bubbles: true});
        const treeItemSelectedEvent =
            getEventPromise<TreeOutline.TreeOutline.ItemSelectedEvent<string>>(component, 'itemselected');
        await coordinator.done();
        const event = await treeItemSelectedEvent;
        assert.deepEqual(event.data, {node: basicTreeData[1]});
      });
    });

    describe('itemmouseover', () => {
      it('emits an event when the user mouses over the element', async () => {
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await coordinator.done();
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices').querySelector('.arrow-and-key-wrapper');
        assert.instanceOf(officeNode, HTMLSpanElement);
        const itemMouseOverEvent =
            getEventPromise<TreeOutline.TreeOutline.ItemMouseOverEvent<string>>(component, 'itemmouseover');
        dispatchMouseOverEvent(officeNode);
        const event = await itemMouseOverEvent;
        assert.deepEqual(event.data, {node: basicTreeData[0]});
      });
    });

    describe('itemmouseout', () => {
      it('emits an event when the user mouses out of the element', async () => {
        const {component, shadowRoot} = await renderTreeOutline({
          tree: basicTreeData,
        });
        await coordinator.done();
        const officeNode = getVisibleTreeNodeByText(shadowRoot, 'Offices').querySelector('.arrow-and-key-wrapper');
        assert.instanceOf(officeNode, HTMLSpanElement);
        dispatchMouseOverEvent(officeNode);
        const itemMouseOutEvent =
            getEventPromise<TreeOutline.TreeOutline.ItemMouseOutEvent<string>>(component, 'itemmouseout');
        dispatchMouseOutEvent(officeNode);
        const event = await itemMouseOutEvent;
        assert.deepEqual(event.data, {node: basicTreeData[0]});
      });
    });
  });

  describe('matching on id parameter', () => {
    it('expands the relevant part of the tree to reveal the given node', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: [nodeAustralia],
      });

      // Expand to the node with the given ID, the actual data doesn't matter in this case.
      // This means you can search the tree, without having a reference to the specific tree data,
      // just as long as you know the id for whatever thing you are looking for.
      await component.expandToAndSelectTreeNode({treeNodeData: 'something else', id: 'gawler'});
      await waitForRenderedTreeNodeCount(shadowRoot, 7);
      const visibleTree = visibleNodesToTree(shadowRoot);

      // The tree is expanded down to include "Gawler" but the rest of the tree is still collapsed.
      assert.deepEqual(visibleTree, [{
                         renderedKey: 'Australia',
                         children: [
                           {
                             renderedKey: 'SA',
                             children: [
                               {
                                 renderedKey: 'Adelaide',
                                 children: [
                                   {renderedKey: 'Toorak Gardens'},
                                   {renderedKey: 'Woodville South'},
                                   {renderedKey: 'Gawler'},
                                 ],
                               },
                             ],
                           },
                           {renderedKey: 'NSW'},
                         ],
                       }]);
    });

    it('remembers nodes expanded state across node updates', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: [nodeAustralia],
      });

      await component.expandToAndSelectTreeNode({treeNodeData: 'something else', id: 'gawler'});

      // Update the node by replacing the root node.
      const newNodeAustralia = {
        treeNodeData: 'New Australia',
        id: 'australia',
        children: async () =>
            [{
              treeNodeData: 'Different SA',
              id: 'sa',
              children: async () =>
                  [{
                    treeNodeData: 'Phantom Adelaide',
                    id: 'adelaide',
                    children: async () =>
                        [{treeNodeData: 'Totally not Gawler', id: 'gawler'},
      ],
                  },
      ],
            },
      ],
      };

      component.data = {
        tree: [newNodeAustralia],
        defaultRenderer: (node => html`${node.treeNodeData}`),
      };
      await waitForRenderedTreeNodeCount(shadowRoot, 4);
      await coordinator.done();
      const visibleTree = visibleNodesToTree(shadowRoot);

      // The tree should still be expanded down to the node with key `gawler`.
      assert.deepEqual(visibleTree, [{
                         renderedKey: 'New Australia',
                         children: [
                           {
                             renderedKey: 'Different SA',
                             children: [
                               {
                                 renderedKey: 'Phantom Adelaide',
                                 children: [
                                   {renderedKey: 'Totally not Gawler'},
                                 ],
                               },
                             ],
                           },
                         ],
                       }]);
    });

    it('focuses the given node with an id once the tree has been expanded', async () => {
      const {component, shadowRoot} = await renderTreeOutline({
        tree: [nodeAustralia],
      });

      await component.expandToAndSelectTreeNode({treeNodeData: 'literally anything', id: 'gawler'});
      await waitForRenderedTreeNodeCount(shadowRoot, 7);
      await coordinator.done();

      // The tree is expanded down to include "Gawler" but the rest of the tree is still collapsed.
      assert.strictEqual(
          getFocusableTreeNode(shadowRoot),
          getVisibleTreeNodeByText(shadowRoot, 'Gawler'),
      );
    });
  });
});

describe('TreeOutlineUtils', () => {
  describe('getPathToTreeNode', () => {
    it('can find the path to the given node', async () => {
      const path = await TreeOutline.TreeOutlineUtils.getPathToTreeNode(basicTreeData, nodeBelgraveHouse.id);
      assert.deepEqual(path, [nodeOffices, nodeEurope, nodeUK, nodeLondon, nodeBelgraveHouse]);
    });

    it('returns null if no path is found', async () => {
      const path = await TreeOutline.TreeOutlineUtils.getPathToTreeNode(basicTreeData, '-1');
      assert.strictEqual(path, null);
    });
  });
});

describe('TreeOutlineFiltering', () => {
  it('can flatten nodes', async () => {
    const {component, shadowRoot} = await renderTreeOutline({
      tree: [nodeAustralia],
      filter: node => node === 'SA' || node === 'NSW' || node === 'Adelaide' ?
          TreeOutline.TreeOutline.FilterOption.FLATTEN :
          TreeOutline.TreeOutline.FilterOption.SHOW,
    });

    await component.expandRecursively();
    await coordinator.done();
    await waitForRenderedTreeNodeCount(shadowRoot, 7);
    const visibleTree = visibleNodesToTree(shadowRoot);

    assert.deepEqual(visibleTree, [{
                       renderedKey: 'Australia',
                       children: [
                         {renderedKey: 'Toorak Gardens'},
                         {renderedKey: 'Woodville South'},
                         {renderedKey: 'Gawler'},
                         {renderedKey: 'Glebe'},
                         {renderedKey: 'Newtown'},
                         {renderedKey: 'Camperdown'},
                       ],
                     }]);
  });

  it('should not flatten an already expanded node', async () => {
    const {component, shadowRoot} = await renderTreeOutline({
      tree: [nodeAustralia],
    });

    await component.expandNodeIds(['australia', 'sa', 'adelaide']);
    await coordinator.done();
    await waitForRenderedTreeNodeCount(shadowRoot, 7);
    const visibleTree = visibleNodesToTree(shadowRoot);

    assert.deepEqual(visibleTree, [{
                       renderedKey: 'Australia',
                       children: [
                         {
                           renderedKey: 'SA',
                           children: [
                             {
                               renderedKey: 'Adelaide',
                               children: [
                                 {renderedKey: 'Toorak Gardens'},
                                 {renderedKey: 'Woodville South'},
                                 {renderedKey: 'Gawler'},
                               ],
                             },
                           ],
                         },
                         {
                           renderedKey: 'NSW',
                         },
                       ],
                     }]);

    component.data = {
      tree: [nodeAustralia],
      filter: node => node === 'SA' || node === 'NSW' ? TreeOutline.TreeOutline.FilterOption.FLATTEN :
                                                        TreeOutline.TreeOutline.FilterOption.SHOW,
      defaultRenderer: (node => html`${node.treeNodeData}`),
    };
    await waitForRenderedTreeNodeCount(shadowRoot, 9);
    const visibleTreeAfterFilter = visibleNodesToTree(shadowRoot);

    assert.deepEqual(visibleTreeAfterFilter, [{
                       renderedKey: 'Australia',
                       children: [
                         {
                           renderedKey: 'SA',
                           children: [
                             {
                               renderedKey: 'Adelaide',
                               children: [
                                 {renderedKey: 'Toorak Gardens'},
                                 {renderedKey: 'Woodville South'},
                                 {renderedKey: 'Gawler'},
                               ],
                             },
                           ],
                         },
                         {renderedKey: 'Glebe'},
                         {renderedKey: 'Newtown'},
                         {renderedKey: 'Camperdown'},
                       ],
                     }]);
  });
});
