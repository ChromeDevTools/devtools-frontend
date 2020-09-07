// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {createElement, setPlatform, reset} from '../../../inspector_overlay/common.js';

// Make sure typescript knows about the custom properties that are set on the window object.
declare global {
  interface Window {
    platform: string;
    viewportSize: object;
    deviceScaleFactor: number;
  }
}

describe('common helper', () => {
  it('can create DOM elements', () => {
    assert.instanceOf(createElement('div', 'test'), HTMLDivElement);
  });

  it('exposes DOM manipulation methods on DOM elements', () => {
    const wrapper = document.createElement('div');

    assert.isTrue(!!wrapper.createChild, 'createChild is available on DOM elements');
    const child = wrapper.createChild('span', 'child');

    assert.instanceOf(child, HTMLSpanElement, 'The right span element got created');
    assert.strictEqual(child.className, 'child', 'The right className got set');

    assert.isTrue(!!wrapper.createTextChild, 'createTextChild is available on DOM elements');
    const textChild = wrapper.createTextChild('hello world');

    assert.instanceOf(textChild, Text, 'The right text node got created');
    assert.strictEqual(textChild.textContent, 'hello world', 'The right text content got set');

    assert.isTrue(!!wrapper.removeChildren, 'removeChildren is available on DOM elements');
    wrapper.removeChildren();

    assert.strictEqual(wrapper.childElementCount, 0, 'All children got removed');
  });

  it('sets the right platform', () => {
    const platform = 'mac';
    setPlatform(platform);

    assert.isTrue(document.body.classList.contains(`platform-${platform}`));
    assert.strictEqual(window.platform, platform);
  });

  it('sets the right window dimensions on reset', () => {
    const canvas = <HTMLCanvasElement>document.body.createChild('canvas');
    canvas.id = 'canvas';

    const viewportSize = {width: 100, height: 200};
    const deviceScaleFactor = 1.5;

    reset({viewportSize, deviceScaleFactor});

    assert.deepStrictEqual(window.viewportSize, viewportSize, 'The viewport size was set on the window');
    assert.strictEqual(window.deviceScaleFactor, deviceScaleFactor, 'The scale factor was set on the window');
    assert.strictEqual(canvas.width, viewportSize.width * deviceScaleFactor, 'The canvas was given the correct width');
    assert.strictEqual(
        canvas.height, viewportSize.height * deviceScaleFactor, 'The canvas was given the correct height');
  });
});
