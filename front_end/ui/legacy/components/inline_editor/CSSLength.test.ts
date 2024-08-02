// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';

import * as InlineEditor from './inline_editor.js';

describe('CSSLength', () => {
  const {CSSLength} = InlineEditor.CSSLength;

  it('can render CSSLength component correctly', () => {
    const component = new CSSLength();
    renderElementIntoDOM(component);
    component.data = {lengthText: '42rem'};

    assert.strictEqual(component.shadowRoot!.textContent?.trim(), '42rem');
    const valueElement = component.shadowRoot!.querySelector('.value');
    assert.strictEqual(valueElement!.textContent, '42');
  });

  it('correctly preserves lengths in decimal notation', () => {
    const component = new CSSLength();
    renderElementIntoDOM(component);
    component.data = {lengthText: '.0000001px'};

    assert.strictEqual(component.shadowRoot!.textContent?.trim(), '.0000001px');
    const valueElement = component.shadowRoot!.querySelector('.value');
    assert.strictEqual(valueElement!.textContent, '.0000001');
  });

  it('correctly preserves lengths in exponential notation', () => {
    const component = new CSSLength();
    renderElementIntoDOM(component);
    component.data = {lengthText: '1e-7vw'};

    assert.strictEqual(component.shadowRoot!.textContent?.trim(), '1e-7vw');
    const valueElement = component.shadowRoot!.querySelector('.value');
    assert.strictEqual(valueElement!.textContent, '1e-7');
  });

  it('correctly increments and decrements lengths via dragging', async () => {
    const component = new CSSLength();
    renderElementIntoDOM(component);
    component.data = {lengthText: '42px'};

    const valueElement = component.shadowRoot!.querySelector('.value');
    valueElement!.dispatchEvent(new MouseEvent('mousedown', {clientX: 1}));
    // Wait enough to let CSSLength think it is not a click.
    await new Promise<void>(res => setTimeout(() => res(), 400));

    document.dispatchEvent(new MouseEvent('mousemove', {movementX: 1}));
    assert.strictEqual(valueElement!.textContent, '43');

    document.dispatchEvent(new MouseEvent('mousemove', {movementX: -1, shiftKey: true}));
    assert.strictEqual(valueElement!.textContent, '33');

    document.dispatchEvent(new MouseEvent('mousemove', {movementX: 1, altKey: true}));
    assert.strictEqual(valueElement!.textContent, '33.1');
  });

  it('correctly increments by 0.1 with Alt key held', async () => {
    const component = new CSSLength();
    renderElementIntoDOM(component);
    component.data = {lengthText: '100px'};

    const valueElement = component.shadowRoot!.querySelector('.value');
    valueElement!.dispatchEvent(new MouseEvent('mousedown', {clientX: 1}));
    // Wait enough to let CSSLength think it is not a click.
    await new Promise<void>(res => setTimeout(() => res(), 400));

    document.dispatchEvent(new MouseEvent('mousemove', {movementX: 1, altKey: true}));
    assert.strictEqual(valueElement!.textContent, '100.1');
  });
});
