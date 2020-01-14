// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const { assert } = chai;
import '/front_end/dom_extension/DOMExtension.js';

declare global {
    function createElementWithClass(tagName: string, className?: string, content?: string): HTMLElement;

    interface HTMLElement {
        traverseNextNode(node: HTMLElement): HTMLElement;
        createChild(tagName: string, className?: string, content?: string): HTMLElement;
    }
}

function createSlot(parent, name) {
    const slot = parent.createChild('slot');
    if (name) {
      slot.name = name;
    }
    return slot;
}

function createChild(parent, tagName, name, text = '') {
    const child = parent.createChild(tagName, name);
    if (name) {
      child.slot = name;
    }
    child.textContent = text;
    return child;
}


describe('DataGrid', () => {
  it('Traverse Node with Children', () => {
    const component1 = createElementWithClass('div', 'component1');
    createChild(component1, 'div', 'component1-content', 'text 1');
    createChild(component1, 'div', 'component2-content', 'text 2');
    createChild(component1, 'span', undefined, 'text 3');
    createChild(component1, 'span', 'component1-content', 'text 4');

    // Now we have:
    /*
        * <div class="component1">
        *    <div class="component1-content" slot="component1-content">text 1</div>
        *    <div class="component2-content" slot="component2-content">text 2</div>
        *    <span>text 3</span><span class="component1-content" slot="component1-content">text 4</span>
        * </div>
        */


    let node = component1;
    assert.equal(node.nodeValue, null, 'root node value is incorrect');
    assert.equal(node.nodeName, 'DIV', 'root node name is incorrect');
    assert.equal(node.className, 'component1', 'root node class is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV', 'first child node name is incorrect');
    assert.equal(node.className, 'component1-content', 'first child class is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeValue, 'text 1', 'second child node value is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV', 'second child node name is incorrect');
    assert.equal(node.className, 'component2-content', 'second child class is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeValue, 'text 2', 'second child node value is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'SPAN', 'third child node name is incorrect');
    assert.equal(node.className, '', 'third child class is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeValue, 'text 3', 'third child node value is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'SPAN', 'forth child node name is incorrect');
    assert.equal(node.className, 'component1-content', 'forth child class is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeValue, 'text 4', 'forth child node value is incorrect');
  });

  it('Traverse Node with Shadows', () => {
    const component1 = createElementWithClass('div', 'component1');
    const shadow1 = component1.attachShadow({mode: 'open'});
    const shadow1Content = createElementWithClass('div', 'shadow-component1');
    shadow1.appendChild(shadow1Content);
    const component2 = shadow1Content.createChild('div', 'component2');
    const shadow2 = component2.attachShadow({mode: 'open'});
    const shadow2Content = createElementWithClass('div', 'shadow-component1');
    shadow2.appendChild(shadow2Content);
    const midDiv = createChild(shadow2Content, 'div', 'mid-div');
    createChild(midDiv, 'div', undefined, 'component2-text');

    // Now we have:
    /*
        * <div class="component1"></div>
        * <div class="shadow-component1"><div class="component2"></div></div>
        * <div class="shadow-component1"><div class="mid-div" slot="mid-div"><div>component2-text</div></div></div>
        */

    let node = component1;
    assert.equal(node.nodeName, 'DIV', 'root node name is incorrect');
    assert.equal(node.className, 'component1', 'root node class is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, '#document-fragment', 'first document fragment node name is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV', 'first document fragment child node name is incorrect');
    assert.equal(node.className, 'shadow-component1', 'first document fragment child node name is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV');
    assert.equal(node.className, 'component2');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, '#document-fragment');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV');
    assert.equal(node.className, 'shadow-component1');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV');
    assert.equal(node.className, 'mid-div');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV');
    assert.equal(node.className, '');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, '#text');
    assert.equal(node.nodeValue, 'component2-text');
  });

  it('Traverse Node with Slots', () => {
    const component1 = createElementWithClass('div', 'component1');
    const shadow1 = component1.attachShadow({mode: 'open'});
    const shadow1Content = createElementWithClass('div', 'shadow-component1');
    shadow1.appendChild(shadow1Content);
    createSlot(shadow1Content, 'component1-content');
    createSlot(shadow1Content, null);
    const component2 = shadow1Content.createChild('div', 'component2');
    const shadow2 = component2.attachShadow({mode: 'open'});
    createSlot(component2, 'component2-content');
    createChild(component2, 'div', 'component2-content', 'component2 light dom text');
    const shadow2Content = createElementWithClass('div', 'shadow-component1');
    shadow2.appendChild(shadow2Content);
    const midDiv = createChild(shadow2Content, 'div', 'mid-div');
    createChild(midDiv, 'div', undefined, 'component2-text');
    createSlot(midDiv, null);
    createSlot(midDiv, 'component2-content');

    // Now we have:
    /*
        * <div class="component1"></div>
        * <div class="shadow-component1">
        *    <slot name="component1-content"></slot>
        *    <slot></slot>
        *    <div class="component2">
        *       <slot name="component2-content"></slot>
        *       <div class="component2-content" slot="component2-content">component2 light dom text</div>
        *    </div>
        * </div>
        * <div class="shadow-component1">
        *    <div class="mid-div" slot="mid-div">
        *       <div>component2-text</div>
        *       <slot></slot>
        *       <slot name="component2-content"></slot>
        *    </div>
        * </div>
        */

    let node = component1;
    assert.equal(node.nodeName, 'DIV', 'root node name is incorrect');
    assert.equal(node.className, 'component1', 'root node class is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, '#document-fragment', 'first document fragment node name is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV', 'first document fragment child node name is incorrect');
    assert.equal(node.className, 'shadow-component1', 'first document fragment child node name is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'SLOT', 'first slot node name is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'SLOT', 'second slot node name is incorrect');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV');
    assert.equal(node.className, 'component2');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, '#document-fragment');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV');
    assert.equal(node.className, 'shadow-component1');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV');
    assert.equal(node.className, 'mid-div');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV');
    assert.equal(node.className, '');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeValue, 'component2-text');
    assert.equal(node.nodeName, '#text');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'SLOT');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'SLOT');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'SLOT');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeName, 'DIV');
    assert.equal(node.className, 'component2-content');

    node = node.traverseNextNode(component1);
    assert.equal(node.nodeValue, 'component2 light dom text');
    assert.equal(node.nodeName, '#text');
  });
});
