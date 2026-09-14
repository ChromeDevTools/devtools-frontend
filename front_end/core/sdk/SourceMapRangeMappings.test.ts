// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from './sdk.js';

const {decodeRangeMappings} = SDK.SourceMapRangeMappings;

describe('decodeRangeMappings', () => {
  it('decodes an empty field as a single line without range mappings', () => {
    assert.deepEqual(decodeRangeMappings(''), [[]]);
  });

  it('decodes a single absolute index', () => {
    assert.deepEqual(decodeRangeMappings('A'), [[0]]);
    assert.deepEqual(decodeRangeMappings('B'), [[1]]);
    assert.deepEqual(decodeRangeMappings('C'), [[2]]);
  });

  it('accumulates subsequent indices as relative offsets', () => {
    assert.deepEqual(decodeRangeMappings('AB'), [[0, 1]]);
    assert.deepEqual(decodeRangeMappings('AC'), [[0, 2]]);
    assert.deepEqual(decodeRangeMappings('BCB'), [[1, 3, 4]]);
  });

  it('decodes indices that need the VLQ continuation bit', () => {
    // This is the `vlq-continuation-bit` fixture from the proposal's test suite.
    assert.deepEqual(decodeRangeMappings('AgCF'), [[0, 64, 69]]);
  });

  it('splits lines on semicolons', () => {
    assert.deepEqual(decodeRangeMappings('A;B'), [[0], [1]]);
    assert.deepEqual(decodeRangeMappings('A;;B'), [[0], [], [1]]);
    assert.deepEqual(decodeRangeMappings(';A'), [[], [0]]);
  });

  it('keeps a trailing empty line', () => {
    assert.deepEqual(decodeRangeMappings('A;'), [[0], []]);
    assert.deepEqual(decodeRangeMappings(';A;;;'), [[], [0], [], [], []]);
  });

  it('restarts the relative indices on every line', () => {
    assert.deepEqual(decodeRangeMappings('AB;AB'), [[0, 1], [0, 1]]);
  });

  it('repeats the previous index for a relative index of zero', () => {
    // The proposal's test suite rejects this as `invalid-vlq-zero`, but a repeated index
    // only marks the same mapping twice, so it is tolerated.
    assert.deepEqual(decodeRangeMappings('AA'), [[0, 0]]);
    assert.deepEqual(decodeRangeMappings('BCA'), [[1, 3, 3]]);
  });

  it('throws on a comma separator', () => {
    // Unlike `mappings`, range mappings are not comma separated.
    assert.throws(() => decodeRangeMappings('A,B'), /Unexpected char/);
  });

  it('throws on a character outside the base64 alphabet', () => {
    assert.throws(() => decodeRangeMappings('A$B'), /Unexpected char/);
  });

  it('throws when an index does not fit into 32 bits', () => {
    assert.throws(() => decodeRangeMappings('gggggggB'), /32 bits/);
  });
});
