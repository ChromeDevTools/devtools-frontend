// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {default as Fragment} from '../../../../front_end/ui/Fragment.js';

describe('Fragment', () => {
  it('can be instantiated correctly', () => {
    const testEl = document.createElement('p');
    const fragment = new Fragment(testEl);
    assert.equal(fragment.element().outerHTML, '<p></p>', 'element was not set correctly');
  });

  it('is able to return an element from an ID', () => {
    const build = Fragment.build(['<p>', '</p>'], 'Test Text');
    assert.equal(build.element().outerHTML, '<p>Test Text</p>', 'the element was not built correctly');
  });

  it('is able to find a certain element by its ID', () => {
    const build = Fragment.build(['<p $="testID">Test Text</p>']);
    assert.equal(build.$('testID').outerHTML, '<p class="">Test Text</p>', 'the element was not retrieved correctly');
  });

  it('is able to retrieve cached fragment', () => {
    const cached = Fragment.cached(['<p>', '</p>'], 'Test Text');
    assert.equal(cached.element().outerHTML, '<p>Test Text</p>', 'the element was not cached correctly');
  });

  it('is able to build a template with no inside text', () => {
    const build = Fragment.build(['<', '>'], 'p');
    assert.equal(
        build.element().outerHTML, '<template-attribute0></template-attribute0>',
        'the element was not built correctly');
  });

  it('is able to build a template with no tags', () => {
    const build = Fragment.build(['a', 'b'], 'testText');
    assert.equal(build.element().textContent, 'atestTextb', 'the element was not built correctly');
  });

  it('is able to build a template with a normal attribute', () => {
    const build = Fragment.build(['<p align="center">', '</p>'], 'Test Text');
    assert.equal(build.element().outerHTML, '<p align="center">Test Text</p>', 'the element was not built correctly');
  });

  it('is able to build a template with a dollar sign attribute', () => {
    const build = Fragment.build(['<p $>', '</p>'], 'Test Text');
    assert.equal(build.element().outerHTML, '<p class="">Test Text</p>', 'the element was not built correctly');
  });

  it('is able to build a template with template attribute', () => {
    const build = Fragment.build(['<p template-attribute0>', '</p>'], 'testAttribute', 'Test Text');
    assert.equal(
        build.element().outerHTML, '<p class="" testattribute="">Test Text</p>', 'the element was not built correctly');
  });
});
