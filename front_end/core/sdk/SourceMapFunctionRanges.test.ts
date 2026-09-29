// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {encodeVlqList} from '../../testing/SourceMapEncoder.js';

import * as SDK from './sdk.js';

const {buildOriginalScopes, decodePastaRanges} = SDK.SourceMapFunctionRanges;

describe('buildOriginalScopes', () => {
  it('returns an empty array for an empty ranges array', () => {
    const scopes = buildOriginalScopes([]);

    assert.isEmpty(scopes);
  });

  it('throws if a range has zero length (i.e. equal start and end positions)', () => {
    assert.throws(() => buildOriginalScopes([{name: 'foo', start: {line: 5, column: 0}, end: {line: 5, column: 0}}]));
  });

  it('throws if the start position doesn\'t come before the end position', () => {
    assert.throws(() => buildOriginalScopes([{name: 'foo', start: {line: 5, column: 0}, end: {line: 2, column: 0}}]));
  });

  it('throws for partially overlapping ranges (i.e. "straddling")', () => {
    /*
     * --- A
     *  |  --- B
     * ---  |
     *     ---
     */
    const rangeA = {start: {line: 0, column: 0}, end: {line: 20, column: 0}, name: 'A'};
    const rangeB = {start: {line: 10, column: 0}, end: {line: 30, column: 0}, name: 'B'};

    assert.throws(() => buildOriginalScopes([rangeA, rangeB]));
  });

  it('handles nested scopes', () => {
    /*
     * --- A
     *  |    --- B
     *  |     |
     *  |    ---
     * ---
     */
    const rangeA = {start: {line: 0, column: 0}, end: {line: 30, column: 0}, name: 'A'};
    const rangeB = {start: {line: 10, column: 0}, end: {line: 20, column: 0}, name: 'B'};

    const scopes = buildOriginalScopes([rangeA, rangeB]);

    assert.lengthOf(scopes, 1);
    assert.deepNestedInclude(scopes[0], rangeA);
    assert.isUndefined(scopes[0].parent);

    assert.lengthOf(scopes[0].children, 1);
    assert.deepNestedInclude(scopes[0].children[0], rangeB);
    assert.strictEqual(scopes[0].children[0].parent, scopes[0]);
  });

  it('handles sibling scopes', () => {
    /*
     * --- A
     *  |
     * ---
     * --- B
     *  |
     * ---
     */
    const rangeA = {start: {line: 0, column: 0}, end: {line: 10, column: 0}, name: 'A'};
    const rangeB = {start: {line: 20, column: 0}, end: {line: 30, column: 0}, name: 'B'};

    const scopes = buildOriginalScopes([rangeA, rangeB]);

    assert.lengthOf(scopes, 2);
    assert.deepNestedInclude(scopes[0], rangeA);
    assert.deepNestedInclude(scopes[1], rangeB);
  });

  it('handles siblings where first.end === second.start (because end is exclusive)', () => {
    /*
     * --- A
     *  |
     * --- --- B
     *      |
     *     ---
     */
    const rangeA = {start: {line: 0, column: 0}, end: {line: 10, column: 0}, name: 'A'};
    const rangeB = {start: {line: 10, column: 0}, end: {line: 20, column: 0}, name: 'B'};

    const scopes = buildOriginalScopes([rangeA, rangeB]);

    assert.lengthOf(scopes, 2);
    assert.deepNestedInclude(scopes[0], rangeA);
    assert.deepNestedInclude(scopes[1], rangeB);
  });

  it('handles siblings that either have the same start, or the same end', () => {
    /*
     * --- A  --- B
     *  |      |
     *  |     ---
     *  |
     * ---
     * --- C
     *  |    --- D
     *  |     |
     * ---   ---
     */
    const rangeA = {start: {line: 0, column: 0}, end: {line: 20, column: 0}, name: 'A'};
    const rangeB = {start: {line: 0, column: 0}, end: {line: 10, column: 0}, name: 'B'};
    const rangeC = {start: {line: 30, column: 0}, end: {line: 50, column: 0}, name: 'C'};
    const rangeD = {start: {line: 40, column: 0}, end: {line: 50, column: 0}, name: 'D'};

    const scopes = buildOriginalScopes([rangeD, rangeB, rangeA, rangeC]);  // Shuffle to check sorting

    assert.lengthOf(scopes, 2);
    assert.deepNestedInclude(scopes[0], rangeA);
    assert.deepNestedInclude(scopes[1], rangeC);

    assert.lengthOf(scopes[0].children, 1);
    assert.deepNestedInclude(scopes[0].children[0], rangeB);
    assert.lengthOf(scopes[1].children, 1);
    assert.deepNestedInclude(scopes[1].children[0], rangeD);
  });
});

describe('decodeBloombergRanges', () => {
  it('returns an empty list for an empty string', () => {
    assert.deepEqual(decodePastaRanges('', []), []);
  });

  it('ignores ranges with non-existing name index', () => {
    const mapping = encodeVlqList([0, 0, 0, 5, 0]);

    assert.deepEqual(decodePastaRanges(mapping, []), []);
  });

  it('decodes nested ranges', () => {
    const mappings = [
      encodeVlqList([0, 0, 10, 30, 2]),
      encodeVlqList([1, -20, 5, 10, 2]),
    ].join(',');

    assert.deepEqual(decodePastaRanges(mappings, ['foo', 'bar']), [
      {start: {line: 0, column: 10}, end: {line: 30, column: 2}, name: 'foo'},
      {start: {line: 10, column: 15}, end: {line: 20, column: 4}, name: 'bar'},
    ]);
  });

  it('decodes sibling scopes', () => {
    const mappings = [
      encodeVlqList([0, 0, 10, 10, 2]),
      encodeVlqList([1, 10, 0, 10, 0]),
    ].join(',');

    assert.deepEqual(decodePastaRanges(mappings, ['foo', 'bar']), [
      {start: {line: 0, column: 10}, end: {line: 10, column: 2}, name: 'foo'},
      {start: {line: 20, column: 10}, end: {line: 30, column: 2}, name: 'bar'},
    ]);
  });
});
