// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as SDK from './sdk.js';

const {decodeRangeMappings, interpolateOriginalPosition, interpolateGeneratedPosition} = SDK.SourceMapRangeMappings;

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

describe('interpolateOriginalPosition', () => {
  // A range mapping starting at generated 3:10, mapping to original 7:2.
  const rangeMapping = {lineNumber: 3, columnNumber: 10, sourceLineNumber: 7, sourceColumnNumber: 2};

  it('returns the mapped position for the start of the range', () => {
    assert.deepEqual(interpolateOriginalPosition(rangeMapping, 3, 10), {lineNumber: 7, columnNumber: 2});
  });

  it('advances the original column along with the generated column', () => {
    assert.deepEqual(interpolateOriginalPosition(rangeMapping, 3, 14), {lineNumber: 7, columnNumber: 6});
  });

  it('advances the original line along with the generated line', () => {
    assert.deepEqual(interpolateOriginalPosition(rangeMapping, 5, 0), {lineNumber: 9, columnNumber: 0});
  });

  it('takes the generated column verbatim on lines after the start line', () => {
    // Once a newline is crossed both sides restart at column 0, so the column offset
    // of the range's start no longer applies.
    assert.deepEqual(interpolateOriginalPosition(rangeMapping, 4, 6), {lineNumber: 8, columnNumber: 6});
  });
});

describe('interpolateGeneratedPosition', () => {
  const rangeMapping = {lineNumber: 3, columnNumber: 10, sourceLineNumber: 7, sourceColumnNumber: 2};

  it('returns the start of the range for the mapped position', () => {
    assert.deepEqual(interpolateGeneratedPosition(rangeMapping, 7, 2), {lineNumber: 3, columnNumber: 10});
  });

  it('advances the generated column along with the original column', () => {
    assert.deepEqual(interpolateGeneratedPosition(rangeMapping, 7, 6), {lineNumber: 3, columnNumber: 14});
  });

  it('takes the original column verbatim on lines after the start line', () => {
    assert.deepEqual(interpolateGeneratedPosition(rangeMapping, 8, 6), {lineNumber: 4, columnNumber: 6});
    assert.deepEqual(interpolateGeneratedPosition(rangeMapping, 9, 0), {lineNumber: 5, columnNumber: 0});
  });

  it('inverts interpolateOriginalPosition', () => {
    for (const [line, column] of [[3, 10], [3, 25], [4, 0], [4, 13], [9, 7]]) {
      const original = interpolateOriginalPosition(rangeMapping, line, column);
      assert.deepEqual(interpolateGeneratedPosition(rangeMapping, original.lineNumber, original.columnNumber),
                       {lineNumber: line, columnNumber: column}, `round trip failed for ${line}:${column}`);
    }
  });
});
