// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';

const {assert} = chai;

describe('StylePropertiesSection', async () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('contains specificity information', async () => {
    const specificity = {a: 0, b: 1, c: 0};
    const selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        [{text: '.child', specificity}], [true], new WeakMap());
    assert.deepEqual(selectorElement.textContent, '.child');
    assert.deepEqual(
        Elements.StylePropertiesSection.StylePropertiesSection.getSpecificityStoredForNodeElement(
            (selectorElement.firstChild as Element)),
        specificity);
  });

  it('renders selectors correctly', async () => {
    let selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        [{text: '.child', specificity: {a: 0, b: 2, c: 0}}, {text: '.item', specificity: {a: 0, b: 2, c: 0}}], [true],
        new WeakMap());
    assert.deepEqual(selectorElement.textContent, '.child, .item');
    selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        [{text: '.child', specificity: {a: 0, b: 2, c: 0}}, {text: '& .item', specificity: {a: 0, b: 2, c: 0}}], [true],
        new WeakMap());
    assert.deepEqual(selectorElement.textContent, '.child, & .item');
    selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        [{text: '&.child', specificity: {a: 0, b: 2, c: 0}}, {text: '& .item', specificity: {a: 0, b: 2, c: 0}}],
        [true], new WeakMap());
    assert.deepEqual(selectorElement.textContent, '&.child, & .item');
  });
});
