// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Lit from '../../third_party/lit/lit.js';

import {CustomDirectives, html, render} from './lit.js';

function cloneNodeWithListeners(node: Node): Node {
  const clone = node.cloneNode(false);
  for (const child of node.childNodes) {
    clone.appendChild(cloneNodeWithListeners(child));
  }
  if (node instanceof Element && clone instanceof Element) {
    CustomDirectives.InterceptBindingDirective.setEventListeners(node, clone);
  }
  return clone;
}

describe('InterceptBindingDirective', () => {
  const interceptBinding = Lit.Directive.directive(CustomDirectives.InterceptBindingDirective);

  it('attaches event handlers to clones', () => {
    const container = document.createElement('div');
    const clickHandler = sinon.spy();
    render(html`<button @click=${interceptBinding(clickHandler)}></button>`, container);
    const templateButton = container.firstElementChild;
    assert.instanceOf(templateButton, HTMLButtonElement);
    templateButton.click();
    sinon.assert.calledOnce(clickHandler);

    const clonedButton = cloneNodeWithListeners(templateButton);
    assert.instanceOf(clonedButton, HTMLButtonElement);

    clonedButton.click();
    sinon.assert.calledTwice(clickHandler);
  });

  it('attaches multiple event handlers to the same element', () => {
    const container = document.createElement('div');
    const clickHandler = sinon.spy();
    const mousedownHandler = sinon.spy();
    render(html`<button @click=${interceptBinding(clickHandler)} @mousedown=${
               interceptBinding(mousedownHandler)}></button>`,
           container);
    const templateButton = container.firstElementChild;
    assert.instanceOf(templateButton, HTMLButtonElement);

    const clonedButton = cloneNodeWithListeners(templateButton);
    assert.instanceOf(clonedButton, HTMLButtonElement);

    clonedButton.dispatchEvent(new MouseEvent('mousedown'));
    sinon.assert.notCalled(clickHandler);
    sinon.assert.calledOnce(mousedownHandler);
    clonedButton.click();
    sinon.assert.calledOnce(clickHandler);
    sinon.assert.calledOnce(mousedownHandler);
  });

  it('attaches event handlers to nested elements', () => {
    const container = document.createElement('div');
    const buttonClickHandler = sinon.spy();
    const divClickHandler = sinon.spy();
    render(html`<div @click=${interceptBinding(divClickHandler)}><button @click=${
               interceptBinding(buttonClickHandler)}></button></div>`,
           container);
    const templateDiv = container.firstElementChild;
    assert.instanceOf(templateDiv, HTMLDivElement);

    const clonedDiv = cloneNodeWithListeners(templateDiv);
    assert.instanceOf(clonedDiv, HTMLDivElement);

    const clonedButton = clonedDiv.querySelector('button');
    assert.instanceOf(clonedButton, HTMLButtonElement);

    clonedButton.click();
    sinon.assert.calledOnce(buttonClickHandler);
    sinon.assert.calledOnce(divClickHandler);
  });

  it('attaches event handlers from multiple template elements to a single rendered element', () => {
    const container1 = document.createElement('div');
    const container2 = document.createElement('div');
    const clickHandler1 = sinon.spy();
    const clickHandler2 = sinon.spy();
    const mousedownHandler = sinon.spy();
    render(html`<button @click=${interceptBinding(clickHandler1)} @mousedown=${
               interceptBinding(mousedownHandler)}></button>`,
           container1);
    render(html`<button @click=${interceptBinding(clickHandler2)}></button>`, container2);
    const templateButton1 = container1.firstElementChild;
    const templateButton2 = container2.firstElementChild;
    assert.instanceOf(templateButton1, HTMLButtonElement);
    assert.instanceOf(templateButton2, HTMLButtonElement);

    const targetElement = document.createElement('button');
    CustomDirectives.InterceptBindingDirective.setEventListeners([templateButton1, templateButton2], targetElement);

    targetElement.dispatchEvent(new MouseEvent('mousedown'));
    sinon.assert.calledOnce(mousedownHandler);
    sinon.assert.notCalled(clickHandler1);
    sinon.assert.notCalled(clickHandler2);

    targetElement.click();
    sinon.assert.calledOnce(clickHandler1);
    sinon.assert.calledOnce(clickHandler2);

    // Re-running setEventListeners with only templateButton1 should remove clickHandler2
    CustomDirectives.InterceptBindingDirective.setEventListeners([templateButton1], targetElement);
    targetElement.click();
    sinon.assert.calledTwice(clickHandler1);
    sinon.assert.calledOnce(clickHandler2);
  });

  it('registers and removes listeners with registerListeners', () => {
    const element = document.createElement('div');
    const clickHandler = sinon.spy();
    CustomDirectives.InterceptBindingDirective.registerListeners(element, {click: clickHandler});

    const targetElement = document.createElement('div');
    CustomDirectives.InterceptBindingDirective.setEventListeners([element], targetElement);
    targetElement.click();
    sinon.assert.calledOnce(clickHandler);

    CustomDirectives.InterceptBindingDirective.registerListeners(element, undefined);
    CustomDirectives.InterceptBindingDirective.setEventListeners([element], targetElement);
    targetElement.click();
    sinon.assert.calledOnce(clickHandler);
  });
});
