// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';

import * as InlineEditor from './inline_editor.js';

function createSwatch(space: string, items: string[], colors: string[]) {
  const swatch = new InlineEditor.ColorMixSwatch.ColorMixSwatch();
  renderElementIntoDOM(swatch);
  swatch.setColorMix(space, items);
  colors.forEach((color, index) => swatch.setColor(index, color));
  return swatch;
}

describe('ColorMixSwatch', () => {
  setupLocaleHooks();
  it('should render color-mix swatch icon when the syntax is correct', () => {
    const swatch = createSwatch('in srgb', ['red', 'blue'], ['red', 'blue']);

    const swatchIcon = swatch.shadowRoot?.querySelector('.swatch-icon');

    assert.strictEqual(swatch?.getText(), 'color-mix(in srgb, red, blue)');
    assert.isNotNull(swatchIcon);
    assert.lengthOf(swatch.shadowRoot?.querySelectorAll('.swatch') ?? [], 3);
  });

  it('should changing the second color work correctly when the colors are the same', () => {
    const swatch = createSwatch('in srgb', ['red', 'red'], ['red', 'red']);
    swatch.setColor(1, 'blue');

    assert.strictEqual(swatch?.getText(), 'color-mix(in srgb, red, blue)');

    const swatchIcon = swatch.shadowRoot?.querySelector('.swatch-icon');
    assert.isNotNull(swatchIcon);
  });

  it('changes only the color of the given item when the colors are the same', () => {
    const swatch = createSwatch('in srgb', ['red 20%', 'red', 'red'], ['red', 'red', 'red']);
    swatch.setColor(1, 'blue');

    assert.strictEqual(swatch.getText(), 'color-mix(in srgb, red 20%, blue, red)');
  });

  it('ignores colors without an item', () => {
    const swatch = new InlineEditor.ColorMixSwatch.ColorMixSwatch();
    renderElementIntoDOM(swatch);
    swatch.setColor(0, 'red');
    swatch.setColor(0, 'blue');
    assert.strictEqual(swatch.getText(), '');

    swatch.setColorMix('in srgb', ['red', 'blue']);
    swatch.setColor(2, 'green');
    swatch.setColor(-1, 'green');
    swatch.setColor(0, 'red');
    swatch.setColor(1, 'blue');
    assert.strictEqual(swatch.getText(), 'color-mix(in srgb, red, blue)');
    assert.lengthOf(swatch.shadowRoot?.querySelectorAll('.swatch-icon:not(.mix-only) .swatch') ?? [], 3);
  });

  for (const [items, text] of [[['teal'], 'color-mix(teal)'],
                               [['red', 'green', 'blue'], 'color-mix(red, green, blue)'],
  ] as Array<[string[], string]>) {
    it(`shows only the mixed color of ${text}`, () => {
      const swatch = createSwatch('', items, items);

      assert.strictEqual(swatch.getText(), text);
      const swatches = swatch.shadowRoot?.querySelectorAll<HTMLElement>('.swatch-icon.mix-only .swatch');
      assert.lengthOf(swatches ?? [], 1);
      assert.strictEqual(swatches?.[0].style.getPropertyValue('--color'), text);
    });
  }
});
