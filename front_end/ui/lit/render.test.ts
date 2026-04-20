// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

import {html, render} from './lit.js';

describe('render', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders a template into a container', () => {
    render(html`<span>Hello</span>`, container);
    assert.strictEqual(container.textContent, 'Hello');
  });

  it('updates attributes on the container', () => {
    render(html`<span>Content</span>`, container, {container: {attributes: {'data-test': 'value1'}}});
    assert.strictEqual(container.getAttribute('data-test'), 'value1');

    render(html`<span>Content</span>`, container, {container: {attributes: {'data-test': 'value2', another: 'attr'}}});
    assert.strictEqual(container.getAttribute('data-test'), 'value2');
    assert.strictEqual(container.getAttribute('another'), 'attr');

    render(html`<span>Content</span>`, container, {container: {attributes: {another: 'attr'}}});
    assert.isFalse(container.hasAttribute('data-test'));
    assert.strictEqual(container.getAttribute('another'), 'attr');

    render(html`<span>Content</span>`, container, {container: {attributes: {another: null}}});
    assert.isFalse(container.hasAttribute('another'));

    render(html`<span>Content</span>`, container, {container: {attributes: {boolAttr: true, boolAttrFalse: false}}});
    assert.isTrue(container.hasAttribute('boolAttr'));
    assert.strictEqual(container.getAttribute('boolAttr'), '');
    assert.isFalse(container.hasAttribute('boolAttrFalse'));

    render(html`<span>Content</span>`, container, {container: {attributes: {boolAttr: false, boolAttrFalse: true}}});
    assert.isFalse(container.hasAttribute('boolAttr'));
    assert.isTrue(container.hasAttribute('boolAttrFalse'));
    assert.strictEqual(container.getAttribute('boolAttrFalse'), '');

    render(html`<span>Content</span>`, container, {container: {attributes: {undefAttr: 'value'}}});
    assert.strictEqual(container.getAttribute('undefAttr'), 'value');

    render(html`<span>Content</span>`, container, {container: {attributes: {undefAttr: undefined}}});
    assert.isFalse(container.hasAttribute('undefAttr'));

    const obj = {toString: () => 'string-value'};
    render(html`<span>Content</span>`, container, {container: {attributes: {objAttr: obj}}});
    assert.strictEqual(container.getAttribute('objAttr'), 'string-value');
  });

  it('updates classes on the container', () => {
    render(html`<span>Content</span>`, container, {container: {classes: ['class1', 'class2']}});
    assert.isTrue(container.classList.contains('class1'));
    assert.isTrue(container.classList.contains('class2'));

    render(html`<span>Content</span>`, container, {container: {classes: ['class2', 'class3']}});
    assert.isFalse(container.classList.contains('class1'));
    assert.isTrue(container.classList.contains('class2'));
    assert.isTrue(container.classList.contains('class3'));

    render(html`<span>Content</span>`, container, {container: {classes: []}});
    assert.isFalse(container.classList.contains('class2'));
    assert.isFalse(container.classList.contains('class3'));
  });

  it('updates event listeners on the container', () => {
    let clicked1 = 0;
    let clicked2 = 0;
    const listener1 = () => {
      clicked1++;
    };
    const listener2 = () => {
      clicked2++;
    };

    render(html`<span>Content</span>`, container, {container: {listeners: {click: listener1}}});
    container.click();
    assert.strictEqual(clicked1, 1);

    render(html`<span>Content</span>`, container, {container: {listeners: {click: listener2}}});
    container.click();
    assert.strictEqual(clicked1, 1);
    assert.strictEqual(clicked2, 1);

    render(html`<span>Content</span>`, container, {container: {listeners: {}}});
    container.click();
    assert.strictEqual(clicked2, 1);
  });

  it('applies options to the host when rendering into a ShadowRoot', () => {
    const shadowRoot = container.attachShadow({mode: 'open'});

    let clicked = 0;
    const listener = () => {
      clicked++;
    };

    render(html`<span>Content</span>`, shadowRoot, {
      container: {
        attributes: {'data-test': 'value1'},
        classes: ['class1'],
        listeners: {click: listener},
      }
    });

    assert.strictEqual(container.getAttribute('data-test'), 'value1');
    assert.isTrue(container.classList.contains('class1'));
    container.click();
    assert.strictEqual(clicked, 1);

    // Update
    render(html`<span>Content</span>`, shadowRoot, {
      container: {
        attributes: {'data-test2': 'value2'},
        classes: ['class2'],
        listeners: {},
      }
    });

    assert.isFalse(container.hasAttribute('data-test'));
    assert.strictEqual(container.getAttribute('data-test2'), 'value2');
    assert.isFalse(container.classList.contains('class1'));
    assert.isTrue(container.classList.contains('class2'));
    container.click();
    assert.strictEqual(clicked, 1);
  });

  it('diffs options correctly when called multiple times', () => {
    render(html`1`, container, {container: {attributes: {a: '1'}, classes: ['c1']}});
    assert.strictEqual(container.getAttribute('a'), '1');
    assert.isTrue(container.classList.contains('c1'));

    render(html`2`, container, {container: {attributes: {b: '2'}, classes: ['c2']}});
    assert.isFalse(container.hasAttribute('a'));
    assert.strictEqual(container.getAttribute('b'), '2');
    assert.isFalse(container.classList.contains('c1'));
    assert.isTrue(container.classList.contains('c2'));

    render(html`3`, container);
    assert.isFalse(container.hasAttribute('b'));
    assert.isFalse(container.classList.contains('c2'));
  });

  it('preserves existing attributes, classes, and listeners', () => {
    let clicked1 = 0;
    let clicked2 = 0;
    const listener1 = () => {
      clicked1++;
    };
    const listener2 = () => {
      clicked2++;
    };
    container.setAttribute('data-test-1', 'value1');
    container.classList.add('class1');
    container.addEventListener('click', listener1);

    render(
        html`<span>Content</span>`, container,
        {container: {attributes: {'data-test-2': 'value2'}, classes: ['class2'], listeners: {click: listener2}}});
    assert.strictEqual(container.getAttribute('data-test-1'), 'value1');
    assert.strictEqual(container.getAttribute('data-test-2'), 'value2');
    assert.isTrue(container.classList.contains('class1'));
    assert.isTrue(container.classList.contains('class2'));
    container.click();
    assert.strictEqual(clicked1, 1);
    assert.strictEqual(clicked2, 1);
  });
});
