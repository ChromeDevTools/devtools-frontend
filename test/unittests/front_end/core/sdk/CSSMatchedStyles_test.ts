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
    });

    it('correctly parses simple CSS variables with fallback', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--foo,1px)'), {variableName: '--foo', fallback: '1px'});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(--x-y,2%)'), {variableName: '--x-y', fallback: '2%'});
    });

    it('properlty rejects non-custom variables', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('var(foo)'), {variableName: null, fallback: null});
      assert.deepEqual(parseCSSVariableNameAndFallback('var(foo,1px)'), {variableName: null, fallback: null});
    });

    // The regexp doesnin parseCSSVariableNameAndFallback needs to be fixed.
    it.skip('[crbug.com/1371322] correctly parses variables with special characters', () => {
      assert.deepEqual(parseCSSVariableNameAndFallback('--🤖)'), {variableName: '--🤖', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('--foo-🤖)'), {variableName: '--foo-🤖', fallback: ''});
      assert.deepEqual(parseCSSVariableNameAndFallback('--🤖,1px)'), {variableName: '--🤖', fallback: '1px'});
    });
  });
});
