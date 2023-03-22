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

  it('renders selectors with nesting symbols correctly', async () => {
    let selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        ['.child', '.item'], [true], new WeakMap(), ['.parent']);
    assert.deepEqual(selectorElement.textContent, '& .child, .item');
    selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        ['.child', '& .item'], [true], new WeakMap(), ['.parent']);
    assert.deepEqual(selectorElement.textContent, '.child, & .item');
    selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        ['&.child', '& .item'], [true], new WeakMap(), ['.parent']);
    assert.deepEqual(selectorElement.textContent, '&.child, & .item');
  });

  it('renders nesting symbols with correct nesting selectors', async () => {
    let nestingSymbol = Elements.StylePropertiesSection.StylePropertiesSection.createNestingSymbol(['.parent']);
    assert.deepEqual(nestingSymbol.dataset.nestingSelectors, '.parent');
    nestingSymbol =
        Elements.StylePropertiesSection.StylePropertiesSection.createNestingSymbol(['.parent', '.grand-parent']);
    assert.deepEqual(nestingSymbol.dataset.nestingSelectors, '.grand-parent .parent');
    nestingSymbol =
        Elements.StylePropertiesSection.StylePropertiesSection.createNestingSymbol(['mid1, #mid2, .mid3', '.parent']);
    assert.deepEqual(nestingSymbol.dataset.nestingSelectors, '.parent :is(mid1, #mid2, .mid3)');
  });
});
