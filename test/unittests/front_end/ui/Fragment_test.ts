// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import '../../../../front_end/dom_extension/DOMExtension.js';
import * as UI from '../../../../front_end/ui/ui.js';

describe('Fragment', () => {
  it('can be instantiated correctly', () => {
    const testEl = document.createElement('p');
    const fragment = new UI.Fragment.Fragment(testEl);
    assert.strictEqual(fragment.element().outerHTML, '<p></p>', 'element was not set correctly');
  });

  it('is able to return an element from an ID', () => {
    const build = UI.Fragment.Fragment.build(['<p>', '</p>'], 'Test Text');
    assert.strictEqual(build.element().outerHTML, '<p>Test Text</p>', 'the element was not built correctly');
  });

  it('is able to find a certain element by its ID', () => {
    const build = UI.Fragment.Fragment.build(['<p $="testID">Test Text</p>']);
    assert.strictEqual(
        build.$('testID').outerHTML, '<p class="">Test Text</p>', 'the element was not retrieved correctly');
  });

  it('is able to retrieve cached fragment', () => {
    const cached = UI.Fragment.Fragment.cached(['<p>', '</p>'], 'Test Text');
    assert.strictEqual(cached.element().outerHTML, '<p>Test Text</p>', 'the element was not cached correctly');
  });

  it('is able to build a template with no inside text', () => {
    const build = UI.Fragment.Fragment.build(['<', '>'], 'p');
    assert.strictEqual(
        build.element().outerHTML, '<template-attribute0></template-attribute0>',
        'the element was not built correctly');
  });

  it('is able to build a template with no tags', () => {
    const build = UI.Fragment.Fragment.build(['a', 'b'], 'testText');
    assert.strictEqual(build.element().textContent, 'atestTextb', 'the element was not built correctly');
  });

  it('is able to build a template with a normal attribute', () => {
    const build = UI.Fragment.Fragment.build(['<p align="center">', '</p>'], 'Test Text');
    assert.strictEqual(
        build.element().outerHTML, '<p align="center">Test Text</p>', 'the element was not built correctly');
  });

  it('is able to build a template with a dollar sign attribute', () => {
    const build = UI.Fragment.Fragment.build(['<p $>', '</p>'], 'Test Text');
    assert.strictEqual(build.element().outerHTML, '<p class="">Test Text</p>', 'the element was not built correctly');
  });

  it('is able to build a template with template attribute', () => {
    const build = UI.Fragment.Fragment.build(['<p template-attribute0>', '</p>'], 'testAttribute', 'Test Text');
    assert.strictEqual(
        build.element().outerHTML, '<p class="" testattribute="">Test Text</p>', 'the element was not built correctly');
  });
});
