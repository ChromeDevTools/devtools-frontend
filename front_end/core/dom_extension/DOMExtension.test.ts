// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './dom_extension.js';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

function createSlot(parent: HTMLElement, name?: string) {
  const slot = parent.createChild('slot');
  if (name) {
    slot.name = name;
  }
  return slot;
}

function createChild(parent: HTMLElement, tagName: keyof HTMLElementTagNameMap, name?: string, text = '') {
  const child = parent.createChild(tagName, name);
  if (name) {
    child.slot = name;
  }
  child.textContent = text;
  return child;
}

function traverseNextNode(parent: HTMLElement, stayWithin: HTMLElement): HTMLElement {
  return parent.traverseNextNode(stayWithin) as HTMLElement;
}

describe('DataGrid', () => {
  it('Traverse Node with Children', () => {
    const component1 = document.createElement('div');
    component1.classList.add('component1');
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

    let node: HTMLElement = component1;
    assert.isNull(node.nodeValue, 'root node value is incorrect');
    assert.strictEqual(node.nodeName, 'DIV', 'root node name is incorrect');
    assert.strictEqual(node.className, 'component1', 'root node class is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV', 'first child node name is incorrect');
    assert.strictEqual(node.className, 'component1-content', 'first child class is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeValue, 'text 1', 'second child node value is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV', 'second child node name is incorrect');
    assert.strictEqual(node.className, 'component2-content', 'second child class is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeValue, 'text 2', 'second child node value is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'SPAN', 'third child node name is incorrect');
    assert.strictEqual(node.className, '', 'third child class is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeValue, 'text 3', 'third child node value is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'SPAN', 'forth child node name is incorrect');
    assert.strictEqual(node.className, 'component1-content', 'forth child class is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeValue, 'text 4', 'forth child node value is incorrect');
  });

  it('Traverse Node with Shadows', () => {
    const component1 = document.createElement('div');
    component1.classList.add('component1');
    const shadow1 = component1.attachShadow({mode: 'open'});
    const shadow1Content = document.createElement('div');
    shadow1Content.classList.add('shadow-component1');
    shadow1.appendChild(shadow1Content);
    const component2 = shadow1Content.createChild('div', 'component2');
    const shadow2 = component2.attachShadow({mode: 'open'});
    const shadow2Content = document.createElement('div');
    shadow2Content.classList.add('shadow-component1');
    shadow2.appendChild(shadow2Content);
    const midDiv = createChild(shadow2Content, 'div', 'mid-div');
    createChild(midDiv, 'div', undefined, 'component2-text');

    // Now we have:
    /*
        * <div class="component1"></div>
        * <div class="shadow-component1"><div class="component2"></div></div>
        * <div class="shadow-component1"><div class="mid-div" slot="mid-div"><div>component2-text</div></div></div>
        */

    let node: HTMLElement = component1;
    assert.strictEqual(node.nodeName, 'DIV', 'root node name is incorrect');
    assert.strictEqual(node.className, 'component1', 'root node class is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, '#document-fragment', 'first document fragment node name is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV', 'first document fragment child node name is incorrect');
    assert.strictEqual(node.className, 'shadow-component1', 'first document fragment child node name is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV');
    assert.strictEqual(node.className, 'component2');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, '#document-fragment');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV');
    assert.strictEqual(node.className, 'shadow-component1');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV');
    assert.strictEqual(node.className, 'mid-div');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV');
    assert.strictEqual(node.className, '');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, '#text');
    assert.strictEqual(node.nodeValue, 'component2-text');
  });

  it('Traverse Node with Slots', () => {
    const component1 = document.createElement('div');
    component1.classList.add('component1');
    const shadow1 = component1.attachShadow({mode: 'open'});
    const shadow1Content = document.createElement('div');
    shadow1Content.classList.add('shadow-component1');
    shadow1.appendChild(shadow1Content);
    createSlot(shadow1Content, 'component1-content');
    createSlot(shadow1Content);
    const component2 = shadow1Content.createChild('div', 'component2');
    const shadow2 = component2.attachShadow({mode: 'open'});
    createSlot(component2, 'component2-content');
    createChild(component2, 'div', 'component2-content', 'component2 light dom text');
    const shadow2Content = document.createElement('div');
    shadow2Content.classList.add('shadow-component1');
    shadow2.appendChild(shadow2Content);
    const midDiv = createChild(shadow2Content, 'div', 'mid-div');
    createChild(midDiv, 'div', undefined, 'component2-text');
    createSlot(midDiv);
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

    let node: HTMLElement = component1;
    assert.strictEqual(node.nodeName, 'DIV', 'root node name is incorrect');
    assert.strictEqual(node.className, 'component1', 'root node class is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, '#document-fragment', 'first document fragment node name is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV', 'first document fragment child node name is incorrect');
    assert.strictEqual(node.className, 'shadow-component1', 'first document fragment child node name is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'SLOT', 'first slot node name is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'SLOT', 'second slot node name is incorrect');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV');
    assert.strictEqual(node.className, 'component2');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, '#document-fragment');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV');
    assert.strictEqual(node.className, 'shadow-component1');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV');
    assert.strictEqual(node.className, 'mid-div');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV');
    assert.strictEqual(node.className, '');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeValue, 'component2-text');
    assert.strictEqual(node.nodeName, '#text');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'SLOT');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'SLOT');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'SLOT');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeName, 'DIV');
    assert.strictEqual(node.className, 'component2-content');

    node = traverseNextNode(node, component1);
    assert.strictEqual(node.nodeValue, 'component2 light dom text');
    assert.strictEqual(node.nodeName, '#text');
  });
});

describe('Node.prototype.deepInnerText', () => {
  it('gets text from a simple element', () => {
    const element = document.createElement('div');
    element.textContent = 'Simple text';
    renderElementIntoDOM(element);
    assert.strictEqual(element.deepInnerText(), 'Simple text');
  });

  it('gets text from an element with multiple children', () => {
    const element = document.createElement('div');
    element.createChild('p').textContent = 'First child';
    element.createChild('span').textContent = 'Second child';
    renderElementIntoDOM(element);
    assert.strictEqual(element.deepInnerText(), element.innerText);
    assert.strictEqual(element.deepInnerText(), 'First child\n\nSecond child');
  });

  it('gets text from an element with nested children', () => {
    const element = document.createElement('div');
    element.appendChild(document.createTextNode('  Outer text. '));
    const childDiv = element.createChild('div');
    childDiv.textContent = '  Child text. ';  // innerText of childDiv would be "Child text. Grandchild text."
    const grandchildSpan = childDiv.createChild('span');
    grandchildSpan.textContent = 'Grandchild text.';
    renderElementIntoDOM(element);
    assert.strictEqual(element.deepInnerText(), element.innerText);
    assert.strictEqual(element.deepInnerText(), 'Outer text.\nChild text. Grandchild text.');
  });

  it('gets text from an element with a shadow DOM', () => {
    const element = document.createElement('div');
    const shadow = element.attachShadow({mode: 'open'});
    shadow.createChild('p').textContent = 'Shadow text';
    renderElementIntoDOM(element);
    assert.strictEqual(element.deepInnerText(), 'Shadow text');
  });

  it('gets text from an element with a shadow DOM and slotted content', () => {
    const element = document.createElement('div');
    element.createChild('span').textContent = 'Slotted content';

    const shadow = element.attachShadow({mode: 'open'});
    shadow.appendChild(document.createTextNode('Shadow text before slot. '));
    shadow.createChild('slot');
    shadow.createChild('p').textContent = 'Shadow text after slot.';

    renderElementIntoDOM(element);
    const expectedText = 'Shadow text before slot.\nSlotted content\nShadow text after slot.';
    assert.strictEqual(element.deepInnerText(), expectedText);
  });

  it('gets text from an element with multiple shadow DOMs and regular siblings', () => {
    const element = document.createElement('div');
    element.appendChild(document.createTextNode('Light DOM text before shadow 1. '));
    const shadow1 = element.createChild('div').attachShadow({mode: 'open'});
    const shadow1Paragraph1 = shadow1.createChild('p');
    shadow1Paragraph1.createChild('span').textContent = 'Shadow 1';
    shadow1Paragraph1.createChild('span').textContent = '(1)';
    const shadow1Paragraph2 = shadow1.createChild('p');
    shadow1Paragraph2.createChild('span').textContent = 'Shadow 1';
    shadow1Paragraph2.createChild('span').textContent = '(2)';
    element.appendChild(document.createTextNode(' Light DOM text between shadows. '));
    const shadow2 = element.createChild('div').attachShadow({mode: 'open'});
    shadow2.createChild('span').textContent = 'Shadow 2 text.';
    element.appendChild(document.createTextNode(' Light DOM text after shadow 2.'));

    renderElementIntoDOM(element);
    const expectedText =
        'Light DOM text before shadow 1.\nShadow 1(1)\nShadow 1(2)\nLight DOM text between shadows.\nShadow 2 text.\nLight DOM text after shadow 2.';
    assert.strictEqual(element.deepInnerText(), expectedText);
  });

  it('returns empty string for an element with no text content', () => {
    const element = document.createElement('div');
    renderElementIntoDOM(element);
    assert.strictEqual(element.deepInnerText(), '');
  });

  it('ignores text content within SCRIPT tags', () => {
    const element = document.createElement('div');
    element.innerHTML = 'Visible text<script>console.log("script text")</script>';
    renderElementIntoDOM(element);
    assert.strictEqual(element.deepInnerText(), 'Visible text');
  });

  it('ignores text content within STYLE tags', () => {
    const element = document.createElement('div');
    element.innerHTML = 'Visible text<style>body { color: red; }</style>';
    renderElementIntoDOM(element);
    assert.strictEqual(element.deepInnerText(), 'Visible text');
  });

  it('gets text when called directly on a TextNode', () => {
    const textNode = document.createTextNode('Direct text node content');
    assert.strictEqual(textNode.deepInnerText(), 'Direct text node content');
  });

  it('handles elements that only contain other elements which produce text', () => {
    const element = document.createElement('div');
    const child = element.createChild('p');
    child.textContent = 'Paragraph text';
    renderElementIntoDOM(element);
    assert.strictEqual(element.deepInnerText(), 'Paragraph text');
  });
});
