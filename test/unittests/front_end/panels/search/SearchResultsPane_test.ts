// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Search from '../../../../../front_end/panels/search/search.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';

const {lineSegmentForMatch} = Search.SearchResultsPane;

function r(matchDescriptor: TemplateStringsArray): TextUtils.TextRange.SourceRange {
  const start = matchDescriptor[0].indexOf('[');
  const end = matchDescriptor[0].indexOf(')');
  return new TextUtils.TextRange.SourceRange(start, end - start);
}

describe('lineSegmentForMatch', () => {
  it('is a no-op if for short lines with the match close to the start', () => {
    const lineContent = 'Just a short line';
    const matchRange = r`       [    )`;

    const {lineSegment, matchRange: actualMRange} = lineSegmentForMatch(lineContent, matchRange);

    assert.strictEqual(lineSegment, lineContent);
    assert.deepEqual(actualMRange, matchRange);
  });

  it('only shows {prefixLength} characters before the match with an ellipsis', () => {
    const lineContent = 'Just a somewhat short line';
    const matchRange = r`                [    )`;

    const {lineSegment, matchRange: actualMRange} = lineSegmentForMatch(lineContent, matchRange, {prefixLength: 5});

    assert.strictEqual(lineSegment, '…what short line');
    assert.deepEqual(actualMRange, r`      [    )`);
  });

  it('only shows {maxLength} characters (excluding prefix ellipsis)', () => {
    const lineContent = 'A somewhat longer line to demonstrate maxLength';
    const matchRange = r`           [     )`;

    const {lineSegment, matchRange: actualMRange} = lineSegmentForMatch(lineContent, matchRange, {maxLength: 22});

    assert.strictEqual(lineSegment, 'A somewhat longer line');
    assert.deepEqual(actualMRange, r`           [     )`);
  });

  it('trims whitespace at the beginning of the line', () => {
    const lineContent = '     A line with whitespace at the beginning';
    const matchRange = r`            [   )`;

    const {lineSegment, matchRange: actualMRange} = lineSegmentForMatch(lineContent, matchRange);

    assert.strictEqual(lineSegment, 'A line with whitespace at the beginning');
    assert.deepEqual(actualMRange, r`       [   )`);
  });

  it('works with whitespace trimming and {prefixLength}', () => {
    const lineContent = '     A line with whitespace at the beginning';
    const matchRange = r`                            [     )`;

    const {lineSegment, matchRange: actualMRange} = lineSegmentForMatch(lineContent, matchRange, {prefixLength: 5});

    assert.strictEqual(lineSegment, '…pace at the beginning');
    assert.deepEqual(actualMRange, r`      [     )`);
  });

  it('only trims whitespace until the match starts', () => {
    const lineContent = '     A line with whitespace at the beginning';
    const matchRange = r`   [       )`;

    const {lineSegment, matchRange: actualMRange} = lineSegmentForMatch(lineContent, matchRange);

    assert.strictEqual(lineSegment, '  A line with whitespace at the beginning');
    assert.deepEqual(actualMRange, r`[       )`);
  });

  it('it shortens the range to the end of the segment if the line was truncated (together with the match)', () => {
    const lineContent = 'A very very very long line with a very long match';
    const matchRange = r`            [                                    )`;

    const {lineSegment, matchRange: actualMRange} =
        lineSegmentForMatch(lineContent, matchRange, {prefixLength: 5, maxLength: 15});

    assert.strictEqual(lineSegment, '…very very long ');
    assert.deepEqual(actualMRange, r`      [         )`);
  });
});
