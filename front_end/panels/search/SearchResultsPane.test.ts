// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';

import * as Search from './search.js';

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

class FakeSearchResult implements Search.SearchScope.SearchResult {
  #label: string;
  #description: string;
  #matchDescriptors: {lineNumber: number, lineContent: string, matchRange?: TextUtils.TextRange.SourceRange}[];

  constructor(
      label: string, description: string,
      matchDescriptors: {lineNumber: number, lineContent: string, matchRange?: TextUtils.TextRange.SourceRange}[]) {
    this.#label = label;
    this.#description = description;
    this.#matchDescriptors = matchDescriptors;
  }

  label(): string {
    return this.#label;
  }
  description(): string {
    return this.#description;
  }
  matchesCount(): number {
    return this.#matchDescriptors.length;
  }
  matchLabel(index: number): string {
    return this.#matchDescriptors[index].lineNumber.toString();
  }
  matchLineContent(index: number): string {
    return this.#matchDescriptors[index].lineContent;
  }
  matchRevealable(): Object {
    return {};
  }
  matchColumn(index: number): number|undefined {
    return this.#matchDescriptors[index].matchRange?.offset;
  }
  matchLength(index: number): number|undefined {
    return this.#matchDescriptors[index].matchRange?.length;
  }
}

describeWithLocale('SearchResultsPane', () => {
  it('shows one entry per line with matches when matchColumn/matchLength is NOT present', () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('the', true, false);
    const resultPane = new Search.SearchResultsPane.SearchResultsPane(searchConfig);
    resultPane.addSearchResult(new FakeSearchResult('file.txt', 'file.txt', [
      {lineNumber: 10, lineContent: 'This is the line with multiple "the" matches'},
      {lineNumber: 15, lineContent: 'This is a line with only one "the" match'},
    ]));

    resultPane.showAllMatches();

    const matchSpans = resultPane['treeOutline'].shadowRoot.querySelectorAll('.search-match-content');
    assert.lengthOf(matchSpans, 2);
    assert.deepEqual(
        [...matchSpans].map(span => span.textContent),
        ['This is the line with multiple "the" matches', '…with only one "the" match']);
  });

  it('shows one entry per match when matchColumn/matchLength is present', () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('the', true, false);
    const resultPane = new Search.SearchResultsPane.SearchResultsPane(searchConfig);
    resultPane.addSearchResult(new FakeSearchResult('file.txt', 'file.txt', [
      {
        lineNumber: 10,
        lineContent: 'This is the line with multiple "the" matches',
        matchRange: r`        [  )`,
      },
      {
        lineNumber: 10,
        lineContent: 'This is the line with multiple "the" matches',
        matchRange: r`                                [  )`,
      },
      {
        lineNumber: 15,
        lineContent: 'This is a line with only one "the" match',
        matchRange: r`                              [  )`,
      },
    ]));

    resultPane.showAllMatches();

    const matchSpans = resultPane['treeOutline'].shadowRoot.querySelectorAll('.search-match-content');
    assert.lengthOf(matchSpans, 3);
    assert.deepEqual([...matchSpans].map(span => span.textContent), [
      'This is the line with multiple "the" matches',
      '… the line with multiple "the" matches',
      '…is a line with only one "the" match',
    ]);
  });

  it('highlights all matches of a line when matchColumn/matchLength is NOT present', () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('the', true, false);
    const resultPane = new Search.SearchResultsPane.SearchResultsPane(searchConfig);
    resultPane.addSearchResult(new FakeSearchResult('file.txt', 'file.txt', [
      {lineNumber: 10, lineContent: 'This is the line with multiple "the" matches'},
      {lineNumber: 15, lineContent: 'This is a line with only one "the" match'},
    ]));

    resultPane.showAllMatches();

    const matchSpans = resultPane['treeOutline'].shadowRoot.querySelectorAll('.highlighted-search-result');
    assert.lengthOf(matchSpans, 3);
    assert.deepEqual([...matchSpans].map(span => span.textContent), ['the', 'the', 'the']);
  });

  it('highlights only the specified match when matchColumn/matchLength is present', () => {
    const searchConfig = new Workspace.SearchConfig.SearchConfig('the', true, false);
    const resultPane = new Search.SearchResultsPane.SearchResultsPane(searchConfig);
    resultPane.addSearchResult(new FakeSearchResult('file.txt', 'file.txt', [
      {
        lineNumber: 10,
        lineContent: 'This is the line with multiple "the" matches',
        matchRange: r`        [  )`,
      },
      {
        lineNumber: 10,
        lineContent: 'This is the line with multiple "the" matches',
        matchRange: r`                                [  )`,
      },
      {
        lineNumber: 15,
        lineContent: 'This is a line with only one "the" match',
        matchRange: r`                              [  )`,
      },
    ]));

    resultPane.showAllMatches();

    const matchSpans = resultPane['treeOutline'].shadowRoot.querySelectorAll('.search-match-content');
    assert.lengthOf(matchSpans, 3);
    assert.deepEqual([...matchSpans].map(span => span.innerHTML), [
      'This is <span class="highlighted-search-result">the</span> line with multiple "the" matches',
      '… the line with multiple "<span class="highlighted-search-result">the</span>" matches',
      '…is a line with only one "<span class="highlighted-search-result">the</span>" match',
    ]);
  });
});
