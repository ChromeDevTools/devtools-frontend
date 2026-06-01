// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from './common.js';

describe('Srcset', () => {
  it('parses a single URL', () => {
    const tokens = Common.Srcset.parseSrcset('image.png');
    assert.deepEqual(tokens, [
      {type: Common.Srcset.TokenType.URL, value: 'image.png'},
    ]);
  });

  it('parses a single URL with descriptor', () => {
    const tokens = Common.Srcset.parseSrcset('image.png 1x');
    assert.deepEqual(tokens, [
      {type: Common.Srcset.TokenType.URL, value: 'image.png'},
      {type: Common.Srcset.TokenType.LITERAL, value: ' 1x'},
    ]);
  });

  it('parses multiple URLs', () => {
    const tokens = Common.Srcset.parseSrcset('image.png 1x, image2.png 2x');
    assert.deepEqual(tokens, [
      {type: Common.Srcset.TokenType.URL, value: 'image.png'},
      {type: Common.Srcset.TokenType.LITERAL, value: ' 1x,'},
      {type: Common.Srcset.TokenType.LITERAL, value: ' '},
      {type: Common.Srcset.TokenType.URL, value: 'image2.png'},
      {type: Common.Srcset.TokenType.LITERAL, value: ' 2x'},
    ]);
  });

  it('parses multiple URLs without descriptors', () => {
    const tokens = Common.Srcset.parseSrcset('image.png, image2.png');
    assert.deepEqual(tokens, [
      {type: Common.Srcset.TokenType.URL, value: 'image.png'},
      {type: Common.Srcset.TokenType.LITERAL, value: ','},
      {type: Common.Srcset.TokenType.LITERAL, value: ' '},
      {type: Common.Srcset.TokenType.URL, value: 'image2.png'},
    ]);
  });

  it('parses multiple URLs with extra spacing', () => {
    const tokens = Common.Srcset.parseSrcset('  image.png  1x ,  image2.png  2x  ');
    assert.deepEqual(tokens, [
      {type: Common.Srcset.TokenType.URL, value: 'image.png'},
      {type: Common.Srcset.TokenType.LITERAL, value: '  1x ,'},
      {type: Common.Srcset.TokenType.LITERAL, value: ' '},
      {type: Common.Srcset.TokenType.URL, value: 'image2.png'},
      {type: Common.Srcset.TokenType.LITERAL, value: '  2x'},
    ]);
  });

  it('parses URLs with commas not followed by spaces (non-spec compliant behavior)', () => {
    // This test documents the current behavior, even if it's not strictly spec-compliant.
    const tokens = Common.Srcset.parseSrcset('image.png,image2.png');
    assert.deepEqual(tokens, [
      {type: Common.Srcset.TokenType.URL, value: 'image.png,image2.png'},
    ]);
  });

  it('parses an empty string', () => {
    const tokens = Common.Srcset.parseSrcset('');
    assert.deepEqual(tokens, []);
  });
});
