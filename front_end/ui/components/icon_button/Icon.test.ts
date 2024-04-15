// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';

import * as IconButton from './icon_button.js';

function getSpanElement(icon: IconButton.Icon.Icon): HTMLSpanElement {
  const {shadowRoot} = icon;
  assert.isNotNull(shadowRoot);
  const span = shadowRoot.querySelector('span');
  assert.instanceOf(span, HTMLSpanElement);
  return span;
}

describe('Icon', () => {
  describe('Icon', () => {
    const {Icon} = IconButton.Icon;

    it('constructs a sub-aligned 20x20 icon by default', () => {
      const icon = new Icon();
      renderElementIntoDOM(icon);
      assert.strictEqual(window.getComputedStyle(icon).verticalAlign, 'sub');
      assert.strictEqual(icon.getBoundingClientRect().width, 20);
      assert.strictEqual(icon.getBoundingClientRect().height, 20);
    });

    for (const name of ['triangle-up', 'triangle-down', 'triangle-left', 'triangle-right']) {
      it(`constructs a baseline-aligned 14x14 icon for "${name}"`, () => {
        const icon = new Icon();
        icon.name = name;
        renderElementIntoDOM(icon);
        assert.strictEqual(window.getComputedStyle(icon).verticalAlign, 'baseline');
        assert.strictEqual(icon.getBoundingClientRect().width, 14);
        assert.strictEqual(icon.getBoundingClientRect().height, 14);
      });
    }

    describe('data', () => {
      it('can be used to set name and style', () => {
        const icon = new Icon();
        icon.data = {iconName: 'foo', color: 'red', width: '14px', height: '14px'};
        assert.strictEqual(icon.name, 'foo');
        assert.strictEqual(icon.style.color, 'red');
        assert.strictEqual(icon.style.width, '14px');
        assert.strictEqual(icon.style.height, '14px');
      });

      it('can be used to set path and style', () => {
        const icon = new Icon();
        icon.data = {iconPath: 'file:///path/to/bar.svg', color: 'darkblue', width: '8pt', height: '8pt'};
        assert.strictEqual(icon.name, 'file:///path/to/bar.svg');
        assert.strictEqual(icon.style.color, 'darkblue');
        assert.strictEqual(icon.style.width, '8pt');
        assert.strictEqual(icon.style.height, '8pt');
      });
    });

    describe('name', () => {
      it('is initially unset', () => {
        const icon = new Icon();
        assert.isNull(icon.name);
      });

      it('can be set and unset', () => {
        const icon = new Icon();
        icon.name = 'foobar';
        icon.name = null;
        assert.isNull(icon.name);
      });

      it('reflects the "name" attribute', () => {
        const icon = new Icon();
        icon.setAttribute('name', 'bar');
        assert.strictEqual(icon.name, 'bar');
      });

      it('is reflected to the "name" attribute', () => {
        const icon = new Icon();
        icon.name = 'foo';
        assert.strictEqual(icon.getAttribute('name'), 'foo');
      });

      it('accepts a `.svg` URL that is used verbatim for the icon URL', () => {
        const icon = new Icon();
        icon.name = 'devtools://path/to/images/file.svg';
        renderElementIntoDOM(icon);
        const span = getSpanElement(icon);
        assert.strictEqual(window.getComputedStyle(span).maskImage, 'url("devtools://path/to/images/file.svg")');
      });

      it('accepts an icon name and resolves that via `--image-file-<name>` CSS variables', () => {
        const icon = new Icon();
        icon.name = 'bar';
        icon.style.setProperty('--image-file-bar', 'url(http://foo/bar.svg)');
        renderElementIntoDOM(icon);
        const span = getSpanElement(icon);
        assert.strictEqual(window.getComputedStyle(span).maskImage, 'url("http://foo/bar.svg")');
      });
    });

    describe('role', () => {
      it('is initially presentation', () => {
        const icon = new Icon();
        assert.strictEqual(icon.role, 'presentation');
      });
    });
  });

  describe('create', () => {
    const {create} = IconButton.Icon;

    it('constructs a new Icon with the given `name`', () => {
      const icon = create('bin');
      assert.strictEqual(icon.name, 'bin');
    });

    it('constructs a new Icon with the given `className`', () => {
      const icon = create('select-element', 'my-awesome-class');
      assert.isTrue(icon.classList.contains('my-awesome-class'));
    });
  });
});
