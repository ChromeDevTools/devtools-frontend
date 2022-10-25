// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

const {assert} = chai;

describe('CSSMatchedStyles', () => {
  describe('parseCSSVariableNameAndFallback', () => {
    const {parseCSSVariableNameAndFallback} = SDK.CSSMatchedStyles;

    it('correctly parses simple CSS variables without fallback', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--foo)'), {variableName: '--foo', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--foo-bar)'), {variableName: '--foo-bar', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(  --space  )'), {variableName: '--space', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--123)'), {variableName: '--123', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--123Abc)'), {variableName: '--123Abc', fallback: ''});
    });

    it('need to correctly parse escaped characters', () => {
      // `var(--\)` is an invalid CSS value and must have at least 1 character.
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\ )'), {variableName: '--\\', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,)'), {variableName: '--\\,', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,,)'), {variableName: '--\\,', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,,,)'), {variableName: '--\\,', fallback: ','});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,blue)'), {variableName: '--\\,blue', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,,green)'), {variableName: '--\\,', fallback: 'green'});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--\\,  ,red)'), {variableName: '--\\,', fallback: 'red'});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--fo\\ o)'), {variableName: '--fo\\ o', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--fo\\ o,)'), {variableName: '--fo\\ o', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(--\\ bar\\ , blue)'), {variableName: '--\\ bar\\', fallback: 'blue'});

      // test \)
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var( --ba\\ z\\) )'), {variableName: '--ba\\ z\\)', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var( --ba\\ z\\), )'), {variableName: '--ba\\ z\\)', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var( --ba\\ z\\),  90%  )'),
          {variableName: '--ba\\ z\\)', fallback: '90%  '});
    });

    it('correctly parses simple CSS variables with fallback', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--foo,1px)'), {variableName: '--foo', fallback: '1px'});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--x-y,2%)'), {variableName: '--x-y', fallback: '2%'});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(--x-y , 100%  )'), {variableName: '--x-y', fallback: '100%  '});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(--A123, 666 )'), {variableName: '--A123', fallback: '666 '});
    });

    it('property rejects non-custom variables', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(foo)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(foo,1px)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(-foo,1px)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(-\ bar)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(-\\- bar)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(-90bar)'), {variableName: null, fallback: null});
    });

    it('correctly parses variables with special characters', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--🤖)'), {variableName: '--🤖', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--foo-🤖)'), {variableName: '--foo-🤖', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--🤖, 1px)'), {variableName: '--🤖', fallback: '1px'});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--永,   国)'), {variableName: '--永', fallback: '国'});
    });

    it('correctly parses variables with escaped characters in name', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--_\x30-pink)'), {variableName: '--_0-pink', fallback: ''});

      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(--_-color-blue)'), {variableName: '--_-color-blue', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(-\-_-color-blue)'), {variableName: '-\-_-color-blue', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(\--_-color-blue)'), {variableName: '\--_-color-blue', fallback: ''});
      assert.deepEqual(
          parseCSSVariableNameAndFallback('var(---three_hyphens)'), {variableName: '---three_hyphens', fallback: ''});
    });

  });
});
