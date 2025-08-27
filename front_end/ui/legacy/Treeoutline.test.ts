// Copyright 2020 The Chromium Authors. All rights reserved.
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
    const onExpand = sinon.stub<[UI.TreeOutline.TreeViewElement.ExpandEvent]>();
    let firstConfigElement: Element|undefined, secondConfigElement: Element|undefined;
    const component = await makeTree(html`<devtools-tree .template=${html`
      <ul role="tree">
        <li @expand=${onExpand as (e: UI.TreeOutline.TreeViewElement.ExpandEvent) => void} ${Lit.Directives.ref(e => {
      firstConfigElement = e;
    })} role="treeitem">first subtree
          <ul role="group" hidden>
            <li role="treeitem">in first subtree</li>
          </ul>
        </li>
        <li @expand=${onExpand as (e: UI.TreeOutline.TreeViewElement.ExpandEvent) => void} ${Lit.Directives.ref(e => {
      secondConfigElement = e;
    })} role="treeitem">second subtree
          <ul role="group" hidden>
            <li role="treeitem">in second subtree</li>
          </ul>
        </li>
      </ul>`}></devtools-tree>`);

    assert.exists(firstConfigElement);
    assert.exists(secondConfigElement);
    component.getInternalTreeOutlineForTest().rootElement().lastChild()?.expand();
    sinon.assert.calledOnce(onExpand);
    assert.deepEqual(onExpand.args[0][0].detail, {expanded: true, target: secondConfigElement});

    component.getInternalTreeOutlineForTest().rootElement().lastChild()?.collapse();
    sinon.assert.calledTwice(onExpand);
    assert.deepEqual(onExpand.args[1][0].detail, {expanded: false, target: secondConfigElement});
  });
});
