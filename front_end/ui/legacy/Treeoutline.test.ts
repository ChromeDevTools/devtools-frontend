// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import {dispatchKeyDownEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import * as Lit from '../../ui/lit/lit.js';

import * as UI from './legacy.js';

describe('TreeOutline', () => {
  describe('correctly reacts to Enter key', () => {
    it('by expanding collapsed parent nodes', () => {
      const tree = new UI.TreeOutline.TreeOutlineInShadow();
      renderElementIntoDOM(tree.element);

      const parent = new UI.TreeOutline.TreeElement('parent', true);
      parent.appendChild(new UI.TreeOutline.TreeElement('child', false));
      tree.appendChild(parent);
      parent.select();

      dispatchKeyDownEvent(tree.contentElement, {bubbles: true, key: 'Enter'});
      assert.isTrue(parent.expanded, 'Enter key was supposed to expand the parent node');
    });

    it('by collapsing expanded parent nodes', () => {
      const tree = new UI.TreeOutline.TreeOutlineInShadow();
      renderElementIntoDOM(tree.element);

      const parent = new UI.TreeOutline.TreeElement('parent', true);
      parent.appendChild(new UI.TreeOutline.TreeElement('child', false));
      tree.appendChild(parent);
      parent.select();
      parent.expand();

      dispatchKeyDownEvent(tree.contentElement, {bubbles: true, key: 'Enter'});
      assert.isFalse(parent.expanded, 'Enter key was supposed to collapse the parent node');
    });
  });

  it('responds correctly to navigation keys', () => {
    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    renderElementIntoDOM(treeOutline.element);

    for (let i = 0; i < 10; i++) {
      const treeElement = new UI.TreeOutline.TreeElement(String(i), true);
      treeElement.appendChild(new UI.TreeOutline.TreeElement(String(i) + ' child'));
      treeOutline.appendChild(treeElement);
    }

    let selectedTitles: string[] = [];
    treeOutline.addEventListener(UI.TreeOutline.Events.ElementSelected, event => {
      selectedTitles.push(String(event.data.title));
    });

    treeOutline.firstChild()!.select(false, true);

    const distance = 25;

    assert.deepEqual(selectedTitles, ['0']);
    selectedTitles = [];

    function sendKeyMultipleTimes(key: string, n: number) {
      for (let i = 0; i < n; i++) {
        sendKey(key);
      }
    }

    sendKeyMultipleTimes('ArrowDown', distance);
    assert.deepEqual(selectedTitles, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    selectedTitles = [];

    sendKeyMultipleTimes('ArrowUp', distance);
    assert.deepEqual(selectedTitles, ['8', '7', '6', '5', '4', '3', '2', '1', '0']);
    selectedTitles = [];

    sendKey('End');
    assert.deepEqual(selectedTitles, ['9']);
    selectedTitles = [];

    sendKey('Home');
    assert.deepEqual(selectedTitles, ['0']);
    selectedTitles = [];

    sendKeyMultipleTimes('ArrowRight', distance);
    assert.deepEqual(selectedTitles, ['0 child']);
    selectedTitles = [];

    sendKeyMultipleTimes('ArrowLeft', distance);
    assert.deepEqual(selectedTitles, ['0']);
    selectedTitles = [];

    const innerTreeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    const firstInnerChild = new UI.TreeOutline.TreeElement('First inner child');
    const firstInnerGrandChild = new UI.TreeOutline.TreeElement('First inner grandchild');
    innerTreeOutline.appendChild(firstInnerChild);
    firstInnerChild.appendChild(firstInnerGrandChild);

    const treeElementForNestedTree = new UI.TreeOutline.TreeElement(innerTreeOutline.element);
    treeOutline.appendChild(treeElementForNestedTree);

    innerTreeOutline.firstChild()!.select(false, true);

    sendKey('ArrowRight');

    assert.isTrue(innerTreeOutline.firstChild()!.expanded, 'child is not expanded');

    function sendKey(key: string) {
      const deepActiveElement = Platform.DOMUtilities.deepActiveElement(document);
      deepActiveElement!.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key}));
    }
  });
});

describe('TreeViewElement', () => {
  const {html, render} = Lit;
  async function makeTree(template: Lit.LitTemplate) {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    render(template, container);
    const component = container.querySelector('devtools-tree');
    assert.isNotNull(component);

    // Tick to let mutation observers fire
    await new Promise(resolve => setTimeout(resolve, 0));
    return component;
  }

  it('renders the tree structure based on the template', async () => {
    const component = await makeTree(html`<devtools-tree .template=${html`
      <ul role="tree">
         <li role="treeitem">
           Tree Node Text
           <ul role="group">
             <li role="treeitem">
               Node with subtree
               <ul role="group">
                 <li role="treeitem">Tree Node Text in collapsed subtree 1</li>
                 <li role="treeitem">Tree Node Text in collapsed subtree 2</li>
               </ul>
            </li>
            <li role="treeitem">Tree Node Text in a selected-by-default node</li>
          </ul>
        </li>
      </ul>
    `}></devtools-tree>`);
    const treeOutline = component.getInternalTreeOutlineForTest();
    const rootChildren = treeOutline.rootElement().children();
    assert.lengthOf(rootChildren, 1);
    assert.strictEqual(rootChildren[0].titleElement.textContent?.trim(), 'Tree Node Text');

    const firstLevel = rootChildren[0].children();
    assert.lengthOf(firstLevel, 2);
    assert.strictEqual(firstLevel[0].titleElement.textContent?.trim(), 'Node with subtree');
    assert.strictEqual(firstLevel[1].titleElement.textContent?.trim(), 'Tree Node Text in a selected-by-default node');

    const secondLevel = firstLevel[0].children();
    assert.lengthOf(secondLevel, 2);
    assert.strictEqual(secondLevel[0].titleElement.textContent?.trim(), 'Tree Node Text in collapsed subtree 1');
    assert.strictEqual(secondLevel[1].titleElement.textContent?.trim(), 'Tree Node Text in collapsed subtree 2');
  });

  it('selects `selected` config elements', async () => {
    const component = await makeTree(html`<devtools-tree .template=${html`
      <ul role="tree">
        <li role="treeitem">first node</li>
        <li role="treeitem" selected>second node</li>
      </ul>`}></devtools-tree>`);

    const nodes = component.getInternalTreeOutlineForTest().rootElement().children();
    assert.lengthOf(nodes, 2);
    assert.isFalse(nodes[0].selected);
    assert.isTrue(nodes[1].selected);
  });

  it('expands subtrees based on the `hidden` attribute', async () => {
    const component = await makeTree(html`<devtools-tree .template=${html`
      <ul role="tree">
        <li role="treeitem">first subtree
          <ul role="group" hidden>
            <li role="treeitem">in first subtree</li>
          </ul>
        </li>
        <li role="treeitem">second subtree
          <ul role="group">
            <li role="treeitem">in second subtree</li>
          </ul>
        </li>
      </ul>`}></devtools-tree>`);

    const nodes = component.getInternalTreeOutlineForTest().rootElement().children();
    assert.lengthOf(nodes, 2);
    assert.isFalse(nodes[0].expanded);
    assert.isTrue(nodes[1].expanded);
  });

  it('sends a `select` event when a node is selected', async () => {
    const onSelect = sinon.stub<[UI.TreeOutline.TreeViewElement.SelectEvent]>();
    let firstConfigElement, secondConfigElement;
    const component = await makeTree(
        html`<devtools-tree @select=${onSelect as (e: UI.TreeOutline.TreeViewElement.SelectEvent) => void} .template=${
            html`
      <ul role="tree">
        <li ${Lit.Directives.ref(e => {
              firstConfigElement = e;
            })} role="treeitem">first node</li>
        <li ${Lit.Directives.ref(e => {
              secondConfigElement = e;
            })} role="treeitem">second node</li>
      </ul>`}></devtools-tree>`);

    assert.exists(firstConfigElement);
    assert.exists(secondConfigElement);
    component.getInternalTreeOutlineForTest().rootElement().lastChild()?.select();

    sinon.assert.calledOnce(onSelect);
    assert.strictEqual(onSelect.args[0][0].detail, secondConfigElement);
  });

  it('sends an `expand` event when a node is expanded or collapsed', async () => {
    const onExpand1 = sinon.stub<[UI.TreeOutline.TreeViewElement.ExpandEvent]>();
    const onExpand2 = sinon.stub<[UI.TreeOutline.TreeViewElement.ExpandEvent]>();
    const component = await makeTree(html`
     <devtools-tree
       .template=${html`
         <ul role="tree">
           <li @expand=${onExpand1} role="treeitem">first subtree
             <ul role="group" hidden>
               <li role="treeitem">in first subtree</li>
             </ul>
           </li>
           <li @expand=${onExpand2} role="treeitem">second subtree
             <ul role="group" hidden>
               <li role="treeitem">in second subtree</li>
             </ul>
           </li>
         </ul>`}></devtools-tree>`);

    component.getInternalTreeOutlineForTest().rootElement().lastChild()?.expand();
    sinon.assert.calledOnce(onExpand2);
    assert.deepEqual(onExpand2.args[0][0].detail, {expanded: true});

    component.getInternalTreeOutlineForTest().rootElement().lastChild()?.collapse();
    sinon.assert.calledTwice(onExpand2);
    assert.deepEqual(onExpand2.args[1][0].detail, {expanded: false});
    sinon.assert.notCalled(onExpand1);
  });

  it('applies jslog contexts to tree elements', async () => {
    const component = await makeTree(html`
      <devtools-tree
        .template=${html`
          <ul role="tree">
            <li role="treeitem" jslog-context="first">first node</li>
            <li role="treeitem" jslog-context="second">second node</li>
          </ul>
        `}></devtools-tree>`);
    assert.deepEqual(
        component.getInternalTreeOutlineForTest().rootElement().children().map(
            element => element.listItemElement.getAttribute('jslog')),
        [
          'TreeItem; parent: parentTreeItem; context: first; track: click, keydown: ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space|Home|End',
          'TreeItem; parent: parentTreeItem; context: second; track: click, keydown: ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space|Home|End'
        ]);
  });

  it('applies aria attributes to tree eleemnts', async () => {
    function attributes(element: UI.TreeOutline.TreeElement): Record<string, string> {
      const attributes: Record<string, string> = {};
      for (let i = 0; i < element.listItemElement.attributes.length; ++i) {
        const attributeNode = element.listItemElement.attributes.item(i);
        if (attributeNode && attributeNode.name !== 'jslog') {
          attributes[attributeNode.name] = attributeNode.value;
        }
      }
      return attributes;
    }
    const component = await makeTree(html`
      <devtools-tree
        .template=${html`
          <ul role="tree">
            <li role="treeitem" aria-checked="true" aria-live="off" aria-bogus="false">first node</li>
            <li role="treeitem" aria-modal="true" aria-unknown="true">second node</li>
          </ul>
        `}></devtools-tree>`);
    assert.deepEqual(component.getInternalTreeOutlineForTest().rootElement().children().map(attributes), [
      {
        'aria-checked': 'true',
        'aria-live': 'off',
        role: 'treeitem',
      },
      {
        'aria-modal': 'true',
        role: 'treeitem',
      }
    ]);
  });

  it('applies classes to tree elements', async () => {
    const component = await makeTree(html`
      <devtools-tree
        .template=${html`
          <ul role="tree">
            <li role="treeitem" class="first">first node</li>
            <li role="treeitem" class="second">second node</li>
          </ul>
        `}></devtools-tree>`);
    assert.deepEqual(
        component.getInternalTreeOutlineForTest().rootElement().children().map(
            element => [...element.listItemElement.classList]),
        [
          ['first'],
          ['second'],
        ]);
  });

  it('applies event listeners to tree elements', async () => {
    const onClick = sinon.stub();
    const component = await makeTree(html`
      <devtools-tree
        .template=${html`
          <ul role="tree">
            <li role="treeitem">
              <button @click=${onClick}>click me</button>
            </li>
          </ul>
        `}></devtools-tree>`);
    component.getInternalTreeOutlineForTest()
        .rootElement()
        .children()[0]
        .listItemElement.querySelector('button')
        ?.click();
    sinon.assert.calledOnce(onClick);
  });

  it('handles adding tree elements in the moddile', async () => {
    const makeTemplate = (items: string[]): Lit.TemplateResult => {
      return html`
        <ul role="tree">
          <li role="treeitem">node
            <ul role="group">
              ${items.map(item => html`<li role="treeitem">${item}</li>`)}
              <li role="treeitem">extra node</li>
            </ul>
          </li>
        </ul>
      `;
    };
    const component = await makeTree(html`<devtools-tree .template=${makeTemplate(['second child'])}></devtools-tree>`);
    component.template = makeTemplate(['first child', 'second child']);
    await new Promise(resolve => setTimeout(resolve, 0));
    const treeOutline = component.getInternalTreeOutlineForTest();
    const children = treeOutline.rootElement().childAt(0)!.children();
    assert.lengthOf(children, 3);
    assert.strictEqual(children[0].titleElement.textContent?.trim(), 'first child');
    assert.strictEqual(children[1].titleElement.textContent?.trim(), 'second child');
    assert.strictEqual(children[2].titleElement.textContent?.trim(), 'extra node');
  });

  it('marks a node as expandable even if it has empty subtree', async () => {
    const component = await makeTree(html`<devtools-tree .template=${html`
      <ul role="tree">
        <li role="treeitem">node
          <ul role="group">
          </ul>
        </li>
      </ul>
    `}></devtools-tree>`);
    const treeOutline = component.getInternalTreeOutlineForTest();
    assert.isTrue(treeOutline.rootElement().childAt(0)!.isExpandable());
  });
});

type NodeSpec = {
  [key: string]: NodeSpec,
}|string;

class TestTreeNode {
  #children: TestTreeNode[] = [];

  constructor(readonly contents: string, private readonly contentsMap: Map<string, TestTreeNode>) {
    assert.isUndefined(contentsMap.get(contents), 'Test expects contents to be unique');
    contentsMap.set(contents, this);
  }

  get(contents: string): TestTreeNode|undefined {
    return this.contentsMap.get(contents);
  }

  static make(spec: NodeSpec, root = new TestTreeNode('', new Map())): TestTreeNode {
    if (typeof spec === 'string') {
      root.children().push(new TestTreeNode(spec, root.contentsMap));
      return root;
    }
    for (const key of Object.keys(spec)) {
      const child = new TestTreeNode(key, root.contentsMap);
      root.children().push(child);
      TestTreeNode.make(spec[key], child);
    }
    return root;
  }

  children() {
    return this.#children;
  }

  match(regex: RegExp) {
    const matches = this.contents.matchAll(regex);
    return matches
        .map((match, matchIndexInNode) => ({
               node: this,
               matchIndexInNode,
               isPostOrderMatch: false,
             }))
        .toArray();
  }
}

describe('TreeSearch', () => {
  const tree = TestTreeNode.make({
    level1_child1: {
      level2_child1_1: 'foo bar baz',
      level2_child1_2: 'match 0',
    },
    level1_child2: {
      'match 1': 'level2_child2_1',
      level2_child2_2: 'bar',
    },
    level1_child3: 'match 2',
  });

  it('collects search results', () => {
    const search = new UI.TreeOutline.TreeSearch<TestTreeNode>();
    assert.isNotOk(search.currentMatch());
    search.search(tree, false, (node, isPostOrder) => (isPostOrder && []) || node.match(/match/gi));

    const viewStub = sinon.createStubInstance(UI.SearchableView.SearchableView);
    search.updateSearchableView(viewStub);
    sinon.assert.calledOnceWithExactly(viewStub.updateSearchMatchesCount, 3);
    sinon.assert.calledOnceWithExactly(viewStub.updateCurrentMatchIndex, 0);
    assert.strictEqual(search.currentMatch()?.node?.contents, 'match 0');

    search.reset();
    search.updateSearchableView(viewStub);
    sinon.assert.calledTwice(viewStub.updateSearchMatchesCount);
    sinon.assert.calledTwice(viewStub.updateCurrentMatchIndex);
    assert.deepEqual(viewStub.updateSearchMatchesCount.args, [[3], [0]]);
    assert.deepEqual(viewStub.updateCurrentMatchIndex.args, [[0], [0]]);
    assert.notExists(search.currentMatch());
  });

  it('supports multiple matches per node', () => {
    const search = new UI.TreeOutline.TreeSearch<TestTreeNode>();
    search.search(tree, false, (node, isPostOrder) => (isPostOrder && []) || node.match(/ba/gi));

    const viewStub = sinon.createStubInstance(UI.SearchableView.SearchableView);
    search.updateSearchableView(viewStub);
    sinon.assert.calledOnceWithExactly(viewStub.updateSearchMatchesCount, 3);
    sinon.assert.calledOnceWithExactly(viewStub.updateCurrentMatchIndex, 0);

    assert.strictEqual(search.currentMatch()?.node?.contents, 'foo bar baz');
  });

  it('supports forward and backward iteration which wraps around', () => {
    const search = new UI.TreeOutline.TreeSearch<TestTreeNode>();

    search.search(tree, false, (node, isPostOrder) => (isPostOrder && []) || node.match(/match/gi));

    assert.strictEqual(search.currentMatch()?.node?.contents, 'match 0');
    search.next();
    assert.strictEqual(search.currentMatch()?.node?.contents, 'match 1');
    search.next();
    assert.strictEqual(search.currentMatch()?.node?.contents, 'match 2');
    search.next();
    assert.strictEqual(search.currentMatch()?.node?.contents, 'match 0');

    search.next();
    assert.strictEqual(search.currentMatch()?.node?.contents, 'match 1');
    search.prev();
    assert.strictEqual(search.currentMatch()?.node?.contents, 'match 0');
    search.prev();
    assert.strictEqual(search.currentMatch()?.node?.contents, 'match 2');
    search.prev();
    assert.strictEqual(search.currentMatch()?.node?.contents, 'match 1');
    search.prev();
    assert.strictEqual(search.currentMatch()?.node?.contents, 'match 0');
  });

  it('groups results by node', () => {
    const search = new UI.TreeOutline.TreeSearch<TestTreeNode>();
    search.search(tree, false, (node, isPostOrder) => (isPostOrder && []) || node.match(/ba/gi));

    const node = tree.get('foo bar baz');
    assert.exists(node);
    const results = search.getResults(node);
    assert.deepEqual(
        results,
        [{node, isPostOrderMatch: false, matchIndexInNode: 0}, {node, isPostOrderMatch: false, matchIndexInNode: 1}]);
  });

  it('correctly maintains the cursor position when updating the search', () => {
    const search = new UI.TreeOutline.TreeSearch<TestTreeNode>();
    search.search(tree, false, (node, isPostOrder) => (isPostOrder && []) || node.match(/ba/gi));

    const firstNode = tree.get('foo bar baz');
    assert.exists(firstNode);
    const secondNode = tree.get('bar');
    assert.exists(secondNode);

    // If the current result still matches, cursor stays
    assert.deepEqual(search.currentMatch(), {node: firstNode, isPostOrderMatch: false, matchIndexInNode: 0});
    search.search(tree, false, (node, isPostOrder) => (isPostOrder && []) || node.match(/bar/gi));
    assert.deepEqual(search.currentMatch(), {node: firstNode, isPostOrderMatch: false, matchIndexInNode: 0});
    search.next();
    assert.deepEqual(search.currentMatch(), {node: secondNode, isPostOrderMatch: false, matchIndexInNode: 0});
    search.search(tree, false, (node, isPostOrder) => (isPostOrder && []) || node.match(/ba/gi));
    assert.deepEqual(search.currentMatch(), {node: secondNode, isPostOrderMatch: false, matchIndexInNode: 0});

    // If the current result does not match, cursor moves forward
    search.reset();
    search.search(tree, false, (node, isPostOrder) => (isPostOrder && []) || node.match(/ba/gi));
    search.next();
    assert.deepEqual(search.currentMatch(), {node: firstNode, isPostOrderMatch: false, matchIndexInNode: 1});
    search.search(tree, false, (node, isPostOrder) => (isPostOrder && []) || node.match(/bar/gi));
    assert.deepEqual(search.currentMatch(), {node: secondNode, isPostOrderMatch: false, matchIndexInNode: 0});

    // If the current result does not match, cursor moves backward if moveBackward is passed
    search.reset();
    search.search(tree, false, (node, isPostOrder) => (isPostOrder && []) || node.match(/ba/gi));
    search.next();
    assert.deepEqual(search.currentMatch(), {node: firstNode, isPostOrderMatch: false, matchIndexInNode: 1});
    search.search(tree, true, (node, isPostOrder) => (isPostOrder && []) || node.match(/bar/gi));
    assert.deepEqual(search.currentMatch(), {node: firstNode, isPostOrderMatch: false, matchIndexInNode: 0});
  });
});
