// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {encodeVlqList} from '../../testing/SourceMapEncoder.js';

import * as SDK from './sdk.js';

const {buildOriginalScopes, decodePastaRanges} = SDK.SourceMapFunctionRanges;

describe('buildOriginalScopes', () => {
  it('returns an empty global scope for an empty ranges array', () => {
    const scope = buildOriginalScopes([]);

    assert.isEmpty(scope.children);
    assert.isFalse(scope.isStackFrame);
    assert.deepEqual(scope.start, {line: 0, column: 0});
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

    const root = buildOriginalScopes([rangeA, rangeB]);

    assert.lengthOf(root.children, 1);
    assert.deepNestedInclude(root.children[0], rangeA);

    assert.lengthOf(root.children[0].children, 1);
    assert.deepNestedInclude(root.children[0].children[0], rangeB);

    assert.deepEqual(root.end, rangeA.end);
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

    const root = buildOriginalScopes([rangeA, rangeB]);

    assert.lengthOf(root.children, 2);
    assert.deepNestedInclude(root.children[0], rangeA);
    assert.deepNestedInclude(root.children[1], rangeB);

    assert.deepEqual(root.end, rangeB.end);
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

    const root = buildOriginalScopes([rangeA, rangeB]);

    assert.lengthOf(root.children, 2);
    assert.deepNestedInclude(root.children[0], rangeA);
    assert.deepNestedInclude(root.children[1], rangeB);

    assert.deepEqual(root.end, rangeB.end);
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

    const root = buildOriginalScopes([rangeD, rangeB, rangeA, rangeC]);  // Shuffle to check sorting

    assert.lengthOf(root.children, 2);
    assert.deepNestedInclude(root.children[0], rangeA);
    assert.deepNestedInclude(root.children[1], rangeC);

    assert.lengthOf(root.children[0].children, 1);
    assert.deepNestedInclude(root.children[0].children[0], rangeB);
    assert.lengthOf(root.children[1].children, 1);
    assert.deepNestedInclude(root.children[1].children[0], rangeD);

    assert.deepEqual(root.end, rangeC.end);
    assert.deepEqual(root.end, rangeD.end);
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
