// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from './text_utils.js';

interface ExpectedTextRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

function assertIsTextRangeAndEqualsRange(
    range: TextUtils.TextRange.TextRange, expectedRange: ExpectedTextRange, description: string) {
  const prefix = description.length ? `${description}, but ` : '';
  assert.isTrue(
      range instanceof TextUtils.TextRange.TextRange, `${prefix}range is not a TextUtils.TextRange.TextRange`);
  assert.strictEqual(range.startLine, expectedRange.startLine, `${prefix}range's startLine differs from expectation`);
  assert.strictEqual(
      range.startColumn, expectedRange.startColumn, `${prefix}range's startColumn differs from expectation`);
  assert.strictEqual(range.endLine, expectedRange.endLine, `${prefix}range's endLine differs from expectation`);
  assert.strictEqual(range.endColumn, expectedRange.endColumn, `${prefix}range's endColumn differs from expectation`);
}

function assertIsUnitTextRange(
    range: TextUtils.TextRange.TextRange, line: number, column: number, description: string) {
  const prefix = description.length ? `${description}, but ` : '';
  assert.isTrue(
      range instanceof TextUtils.TextRange.TextRange, `${prefix}range is not a TextUtils.TextRange.TextRange`);
  assert.strictEqual(range.startLine, range.endLine, `${prefix}the range is not a unit range: start/end lines differ`);
  assert.strictEqual(
      range.startColumn, range.endColumn, `${prefix}the range is not a unit range: start/end columns differ`);
  assert.strictEqual(range.startLine, line, `${prefix}the line was not set correctly`);
  assert.strictEqual(range.startColumn, column, `${prefix}the column was not set correctly`);
}

describe('TextRange', () => {
  it('can be instantiated successfully', () => {
    const startLine = 1;
    const startColumn = 2;
    const endLine = 3;
    const endColumn = 4;
    const textRange = new TextUtils.TextRange.TextRange(startLine, startColumn, endLine, endColumn);
    assert.strictEqual(textRange.startLine, startLine, 'the start line was not set or retrieved correctly');
    assert.strictEqual(textRange.startColumn, startColumn, 'the start column was not set or retrieved correctly');
    assert.strictEqual(textRange.endLine, endLine, 'the end line was not set or retrieved correctly');
    assert.strictEqual(textRange.endColumn, endColumn, 'the end column was not set or retrieved correctly');
  });

  it('can be created from a location', () => {
    const line = 1;
    const column = 2;
    const textRange = TextUtils.TextRange.TextRange.createFromLocation(line, column);
    assertIsUnitTextRange(textRange, line, column, 'range created from a location should be a unit range');
  });

  it('can be created from a serialized text range', () => {
    const range = {startLine: 1, startColumn: 2, endLine: 3, endColumn: 4};
    const textRange = TextUtils.TextRange.TextRange.fromObject(range);
    assertIsTextRangeAndEqualsRange(textRange, range, 'deserializing should preserve the range');
    const serializedRange = textRange.serializeToObject();
    const deserializedTextRange = TextUtils.TextRange.TextRange.fromObject(serializedRange);
    assertIsTextRangeAndEqualsRange(deserializedTextRange, range, 'deserializing should preserve the range');
  });

  it('can be checked for emptiness', () => {
    const textRange =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 1, endColumn: 2});
    assert.isTrue(textRange.isEmpty(), 'the range was non-empty');
  });

  describe('immediatelyPrecedes()', () => {
    it('can handle non-range inputs', () => {
      const textRange =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
      assert.isFalse(textRange.immediatelyPrecedes(), 'invalid ranges should not be judged as immediatelly preceeding');
    });

    it('can judge immediate preceedence correctly', () => {
      const textRangeA =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
      const textRangeB =
          TextUtils.TextRange.TextRange.fromObject({startLine: 3, startColumn: 4, endLine: 5, endColumn: 6});
      const textRangeC =
          TextUtils.TextRange.TextRange.fromObject({startLine: 5, startColumn: 6, endLine: 7, endColumn: 8});
      assert.isTrue(textRangeA.immediatelyPrecedes(textRangeB), 'range A should immediatelly preceed range B');
      assert.isTrue(textRangeB.immediatelyPrecedes(textRangeC), 'range B should immediatelly preceed range C');
      assert.isFalse(textRangeB.immediatelyPrecedes(textRangeA), 'range B should not immediatelly preceed range A');
      assert.isFalse(textRangeA.immediatelyPrecedes(textRangeC), 'range A should not immediatelly preceed range C');
    });
  });

  describe('immediatelyFollows()', () => {
    it('can handle non-range inputs', () => {
      const textRange =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
      assert.isFalse(textRange.immediatelyFollows(), 'invalid ranges should not be judged as \'immediatelly follows\'');
    });

    it('can judge \'immediatelly follows\' relationship correctly', () => {
      const textRangeA =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
      const textRangeB =
          TextUtils.TextRange.TextRange.fromObject({startLine: 3, startColumn: 4, endLine: 5, endColumn: 6});
      const textRangeC =
          TextUtils.TextRange.TextRange.fromObject({startLine: 5, startColumn: 6, endLine: 7, endColumn: 8});
      assert.isTrue(textRangeB.immediatelyFollows(textRangeA), 'range B should immediatelly follow range A');
      assert.isTrue(textRangeC.immediatelyFollows(textRangeB), 'range C should immediatelly follow range B');
      assert.isFalse(textRangeA.immediatelyFollows(textRangeB), 'range A should not immediatelly follow range B');
      assert.isFalse(textRangeC.immediatelyFollows(textRangeA), 'range C should not immediatelly follow range A');
    });
  });

  describe('follows()', () => {
    it('can judge \'follows\' relationship correctly', () => {
      const textRangeA =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
      const textRangeB =
          TextUtils.TextRange.TextRange.fromObject({startLine: 3, startColumn: 4, endLine: 5, endColumn: 6});
      const textRangeC =
          TextUtils.TextRange.TextRange.fromObject({startLine: 5, startColumn: 6, endLine: 7, endColumn: 8});
      assert.isTrue(textRangeB.follows(textRangeA), 'range B should follow range A');
      assert.isTrue(textRangeC.follows(textRangeB), 'range C should follow range B');
      assert.isFalse(textRangeA.follows(textRangeB), 'range A should not follow range B');
      assert.isTrue(textRangeC.follows(textRangeA), 'range C should follow range A');
    });
  });

  it('can report the line count', () => {
    const textRangeA =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 1, endColumn: 2});
    const textRangeB =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 2, endColumn: 2});
    const textRangeC =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 12, endColumn: 2});
    assert.strictEqual(textRangeA.linesCount, 0, 'line count was wrong');
    assert.strictEqual(textRangeB.linesCount, 1, 'line count was wrong');
    assert.strictEqual(textRangeC.linesCount, 11, 'line count was wrong');
  });

  it('can be collapsed to start', () => {
    const rangeA = {startLine: 1, startColumn: 2, endLine: 1, endColumn: 2};
    const textRangeA = TextUtils.TextRange.TextRange.fromObject(rangeA);
    const rangeB = {startLine: 4, startColumn: 2, endLine: 2, endColumn: 2};
    const textRangeB = TextUtils.TextRange.TextRange.fromObject(rangeB);
    const textRangeACollapsed = textRangeA.collapseToStart();
    assertIsUnitTextRange(
        textRangeACollapsed, rangeA.startLine, rangeA.startColumn,
        'collapsing to start should produce a unit range at start');
    const textRangeBCollapsed = textRangeB.collapseToStart();
    assertIsUnitTextRange(
        textRangeBCollapsed, rangeB.startLine, rangeB.startColumn,
        'collapsing to start should produce a unit range at start');
    assertIsTextRangeAndEqualsRange(textRangeA, rangeA, 'original TextUtils.TextRange.TextRange should be unchanged');
    assertIsTextRangeAndEqualsRange(textRangeB, rangeB, 'original TextUtils.TextRange.TextRange should be unchanged');
  });

  it('can be collapsed to end', () => {
    const rangeA = {startLine: 1, startColumn: 2, endLine: 1, endColumn: 2};
    const textRangeA = TextUtils.TextRange.TextRange.fromObject(rangeA);
    const rangeB = {startLine: 4, startColumn: 2, endLine: 2, endColumn: 2};
    const textRangeB = TextUtils.TextRange.TextRange.fromObject(rangeB);
    const textRangeACollapsed = textRangeA.collapseToEnd();
    assertIsUnitTextRange(
        textRangeACollapsed, rangeA.endLine, rangeA.endColumn, 'collapsing to end should produce a unit range at end');
    const textRangeBCollapsed = textRangeB.collapseToEnd();
    assertIsUnitTextRange(
        textRangeBCollapsed, rangeB.endLine, rangeB.endColumn, 'collapsing to end should produce a unit range at end');
    assertIsTextRangeAndEqualsRange(textRangeA, rangeA, 'original TextUtils.TextRange.TextRange should be unchanged');
    assertIsTextRangeAndEqualsRange(textRangeB, rangeB, 'original TextUtils.TextRange.TextRange should be unchanged');
  });

  it('can be normalized', () => {
    const rangeA = {startLine: 1, startColumn: 2, endLine: 3, endColumn: 4};
    const textRangeA = TextUtils.TextRange.TextRange.fromObject(rangeA);
    const rangeB = {startLine: 3, startColumn: 4, endLine: 1, endColumn: 2};
    const textRangeB = TextUtils.TextRange.TextRange.fromObject(rangeB);
    const textRangeANormalized = textRangeA.normalize();
    const textRangeBNormalized = textRangeB.normalize();
    assertIsTextRangeAndEqualsRange(textRangeANormalized, rangeA, 'normalizing should keep range A unchanged');
    assert.notStrictEqual(textRangeANormalized, textRangeA, 'range should have been cloned');
    assertIsTextRangeAndEqualsRange(textRangeBNormalized, rangeA, 'range B should be normalized');
    assertIsTextRangeAndEqualsRange(textRangeA, rangeA, 'range A should be unchanged');
    assertIsTextRangeAndEqualsRange(textRangeB, rangeB, 'range B should be unchanged');
  });

  it('can be cloned', () => {
    const rangeA = {startLine: 1, startColumn: 2, endLine: 3, endColumn: 4};
    const textRangeA = TextUtils.TextRange.TextRange.fromObject(rangeA);
    const textRangeB = textRangeA.clone();
    assertIsTextRangeAndEqualsRange(textRangeB, rangeA, 'cloned range should be equal');
    assert.notStrictEqual(textRangeB, textRangeA, 'cloned range should be different object');
    assertIsTextRangeAndEqualsRange(textRangeA, rangeA, 'original range should be unchanged');
  });

  it('can be checked for equality', () => {
    const rangeA = {startLine: 1, startColumn: 2, endLine: 3, endColumn: 4};
    const textRangeA = TextUtils.TextRange.TextRange.fromObject(rangeA);
    const textRangeB = TextUtils.TextRange.TextRange.fromObject(rangeA);
    assert.isTrue(textRangeA.equal(textRangeA), 'range A is equal to itself');
    assert.isTrue(textRangeA.equal(textRangeB), 'range A and B are equal');
  });

  it('can be compared', () => {
    const textRangeA =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
    const textRangeB =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 4, endLine: 3, endColumn: 4});
    const textRangeC =
        TextUtils.TextRange.TextRange.fromObject({startLine: 2, startColumn: 2, endLine: 3, endColumn: 4});
    const textRangeD =
        TextUtils.TextRange.TextRange.fromObject({startLine: 3, startColumn: 1, endLine: 3, endColumn: 4});

    assert.strictEqual(textRangeA.compareTo(textRangeA), 0, 'A should be equal to itself');
    assert.strictEqual(textRangeA.compareTo(textRangeB), -1, 'A should be before B');
    assert.strictEqual(textRangeB.compareTo(textRangeA), 1, 'B should be after A');
    assert.strictEqual(textRangeA.compareTo(textRangeC), -1, 'A should be before C');
    assert.strictEqual(textRangeC.compareTo(textRangeA), 1, 'C should be after A');
    assert.strictEqual(textRangeC.compareTo(textRangeD), -1, 'C should be before D');
    assert.strictEqual(textRangeD.compareTo(textRangeC), 1, 'D should be after C');
  });

  it('can be compared with TextUtils.TextRange.TextRange.comparator', () => {
    const textRangeA =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
    const textRangeB =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 4, endLine: 3, endColumn: 4});
    const textRangeC =
        TextUtils.TextRange.TextRange.fromObject({startLine: 2, startColumn: 2, endLine: 3, endColumn: 4});
    const textRangeD =
        TextUtils.TextRange.TextRange.fromObject({startLine: 3, startColumn: 1, endLine: 3, endColumn: 4});

    assert.strictEqual(
        TextUtils.TextRange.TextRange.comparator(textRangeA, textRangeA), 0, 'A should be equal to itself');
    assert.strictEqual(TextUtils.TextRange.TextRange.comparator(textRangeA, textRangeB), -1, 'A should be before B');
    assert.strictEqual(TextUtils.TextRange.TextRange.comparator(textRangeB, textRangeA), 1, 'B should be after A');
    assert.strictEqual(TextUtils.TextRange.TextRange.comparator(textRangeA, textRangeC), -1, 'A should be before C');
    assert.strictEqual(TextUtils.TextRange.TextRange.comparator(textRangeC, textRangeA), 1, 'C should be after A');
    assert.strictEqual(TextUtils.TextRange.TextRange.comparator(textRangeC, textRangeD), -1, 'C should be before D');
    assert.strictEqual(TextUtils.TextRange.TextRange.comparator(textRangeD, textRangeC), 1, 'D should be after C');
  });

  it('can be compared to a position', () => {
    const textRangeA =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
    assert.strictEqual(textRangeA.compareToPosition(0, 3), -1, 'position before range should compare less');
    assert.strictEqual(textRangeA.compareToPosition(1, 1), -1, 'position before range should compare less');
    assert.strictEqual(textRangeA.compareToPosition(1, 2), 0, 'start position should compare equal');
    assert.strictEqual(textRangeA.compareToPosition(1, 4), 0, 'position in range should compare equal');
    assert.strictEqual(textRangeA.compareToPosition(3, 4), 0, 'end position should compare equal');
    assert.strictEqual(textRangeA.compareToPosition(3, 5), 1, 'position after range should compare greater');
    assert.strictEqual(textRangeA.compareToPosition(4, 4), 1, 'position after range should compare greater');
  });

  it('can be adjusted relative to a position', () => {
    const textRange =
        TextUtils.TextRange.TextRange.fromObject({startLine: 4, startColumn: 3, endLine: 6, endColumn: 7});
    const relativeTextRangeA = textRange.relativeTo(2, 2);
    const expectedRangeA = {startLine: 2, startColumn: 3, endLine: 4, endColumn: 7};
    assertIsTextRangeAndEqualsRange(
        relativeTextRangeA, expectedRangeA,
        'relativating to position strictly inside line range should not change columns');
    const relativeTextRangeB = textRange.relativeTo(4, 2);
    const expectedRangeB = {startLine: 0, startColumn: 1, endLine: 2, endColumn: 7};
    assertIsTextRangeAndEqualsRange(
        relativeTextRangeB, expectedRangeB, 'relativating to position on start line should change start column');
    const relativeTextRangeC = textRange.relativeTo(6, 3);
    const expectedRangeC = {startLine: -2, startColumn: 3, endLine: 0, endColumn: 4};
    assertIsTextRangeAndEqualsRange(
        relativeTextRangeC, expectedRangeC, 'relativating to position on end line should change end column');
    const relativeTextRangeD = textRange.relativeTo(0, 0);
    assert.notStrictEqual(relativeTextRangeD, textRange, 'relativeTo should clone range');
  });

  it('can be adjusted relative from a position', () => {
    const textRange =
        TextUtils.TextRange.TextRange.fromObject({startLine: 4, startColumn: 3, endLine: 6, endColumn: 7});
    const relativeTextRangeA = textRange.relativeFrom(2, 2);
    const expectedRangeA = {startLine: 6, startColumn: 3, endLine: 8, endColumn: 7};
    assertIsTextRangeAndEqualsRange(
        relativeTextRangeA, expectedRangeA,
        'relativating from position strictly inside line range should not change columns');
    const relativeTextRangeB = textRange.relativeFrom(4, 2);
    const expectedRangeB = {startLine: 8, startColumn: 3, endLine: 10, endColumn: 7};
    assertIsTextRangeAndEqualsRange(
        relativeTextRangeB, expectedRangeB, 'relativating from position on start line should not change columns');
    const relativeTextRangeC = textRange.relativeFrom(6, 3);
    const expectedRangeC = {startLine: 10, startColumn: 3, endLine: 12, endColumn: 7};
    assertIsTextRangeAndEqualsRange(
        relativeTextRangeC, expectedRangeC, 'relativating from position on end line should not change columns');
    const relativeTextRangeD = textRange.relativeFrom(0, 0);
    assert.notStrictEqual(relativeTextRangeD, textRange, 'relativeFrom should clone range');

    const textRange2 =
        TextUtils.TextRange.TextRange.fromObject({startLine: 0, startColumn: 3, endLine: 6, endColumn: 7});
    const relativeTextRangeE = textRange2.relativeFrom(2, 2);
    const expectedRangeE = {startLine: 2, startColumn: 5, endLine: 8, endColumn: 7};
    assertIsTextRangeAndEqualsRange(
        relativeTextRangeE, expectedRangeE, 'relativating range with startLine 0 should change start column');

    const textRange3 =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 3, endLine: 0, endColumn: 7});
    const relativeTextRangeF = textRange3.relativeFrom(2, 2);
    const expectedRangeF = {startLine: 3, startColumn: 3, endLine: 2, endColumn: 9};
    assertIsTextRangeAndEqualsRange(
        relativeTextRangeF, expectedRangeF, 'relativating range with endLine 0 should change end column');
  });

  describe('containsLocation', () => {
    it('can check if a position is contained', () => {
      const textRangeA =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
      assert.isFalse(textRangeA.containsLocation(0, 3), 'position before range should not be contained');
      assert.isFalse(textRangeA.containsLocation(1, 1), 'position before range should not be contained');
      assert.isTrue(textRangeA.containsLocation(1, 2), 'start position should be contained');
      assert.isTrue(textRangeA.containsLocation(1, 4), 'position in range should be contained');
      assert.isFalse(textRangeA.containsLocation(3, 4), 'end position should not be contained');
      assert.isFalse(textRangeA.containsLocation(3, 5), 'position after range should compare greater');
      assert.isFalse(textRangeA.containsLocation(4, 4), 'position after range should compare greater');

      const textRangeB =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 1, endColumn: 4});
      assert.isFalse(textRangeB.containsLocation(1, 1), 'position before range should not be contained');
      assert.isTrue(textRangeB.containsLocation(1, 2), 'start position should be contained');
      assert.isFalse(textRangeB.containsLocation(1, 4), 'end position should not be contained');
      assert.isFalse(textRangeB.containsLocation(1, 5), 'position after range should not be contained');
    });
  });

  describe('fromEdit()', () => {
    it('can construct a range from an edit of a text ending with a newline', () => {
      const textRange =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
      const text = 'This is\nan example text\nwith newlines\nin it. It is for\n the test.\n';
      const textRangeEdited = TextUtils.TextRange.TextRange.fromEdit(textRange, text);
      const expectedRange = {startLine: 1, startColumn: 2, endLine: 6, endColumn: 0};
      assertIsTextRangeAndEqualsRange(textRangeEdited, expectedRange, 'range end should have been shifted back');
    });

    it('can construct a range from an edit of a text ending without a newline', () => {
      const textRange =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
      const text = 'This is\nan example text\nwith newlines\nin it. It is for\n the test.';
      const textRangeEdited = TextUtils.TextRange.TextRange.fromEdit(textRange, text);
      const expectedRange = {startLine: 1, startColumn: 2, endLine: 5, endColumn: 10};
      assertIsTextRangeAndEqualsRange(textRangeEdited, expectedRange, 'range end should have been shifted back');
    });

    it('can construct a range from an edit of a text without newlines', () => {
      const textRange =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
      const text = 'This is an example text without newlines in it. It is for the test.';
      const textRangeEdited = TextUtils.TextRange.TextRange.fromEdit(textRange, text);
      const expectedRange = {startLine: 1, startColumn: 2, endLine: 1, endColumn: 69};
      assertIsTextRangeAndEqualsRange(textRangeEdited, expectedRange, 'range end should have been shifted forward');
    });
  });

  describe('rebaseAfterTextEdit()', () => {
    let originalRange: TextUtils.TextRange.TextRange;
    let editedRange: TextUtils.TextRange.TextRange;

    beforeEach(() => {
      originalRange =
          TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
      editedRange = TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 7, endColumn: 8});
    });

    it('can rebase a range that doesn\'t follow the original range', () => {
      const range = {startLine: 2, startColumn: 4, endLine: 7, endColumn: 8};
      const textRange = TextUtils.TextRange.TextRange.fromObject(range);
      const rebasedTextrange = textRange.rebaseAfterTextEdit(originalRange, editedRange);
      assertIsTextRangeAndEqualsRange(rebasedTextrange, range, 'range should not have been modified');
    });

    it('can rebase a range if its rebased range neither starts nor ends at end of the edited range', () => {
      const textRange =
          TextUtils.TextRange.TextRange.fromObject({startLine: 4, startColumn: 4, endLine: 6, endColumn: 8});
      const rebasedTextRange = textRange.rebaseAfterTextEdit(originalRange, editedRange);
      const expectedRange = {startLine: 8, startColumn: 4, endLine: 10, endColumn: 8};
      assertIsTextRangeAndEqualsRange(rebasedTextRange, expectedRange, 'range’s lines should have been shifted back');
    });

    it('can rebase a range if its rebased range starts at the end of the edited range', () => {
      const textRangeToRebase =
          TextUtils.TextRange.TextRange.fromObject({startLine: 3, startColumn: 5, endLine: 6, endColumn: 8});
      const rebasedTextRange = textRangeToRebase.rebaseAfterTextEdit(originalRange, editedRange);
      const expectedRange = {startLine: 7, startColumn: 9, endLine: 10, endColumn: 8};
      assertIsTextRangeAndEqualsRange(
          rebasedTextRange, expectedRange, 'range’s lines and start column should have been shifted back');
    });

    it('can rebase a range if its rebased range starts and ends at the end of the edited range', () => {
      const textRangeToRebase =
          TextUtils.TextRange.TextRange.fromObject({startLine: 3, startColumn: 5, endLine: 3, endColumn: 8});
      const rebasedTextRange = textRangeToRebase.rebaseAfterTextEdit(originalRange, editedRange);
      const expectedRange = {startLine: 7, startColumn: 9, endLine: 7, endColumn: 12};
      assertIsTextRangeAndEqualsRange(
          rebasedTextRange, expectedRange, 'range’s lines and columns should have been shifted back');
    });
  });

  it('can be stringified', () => {
    const textRange =
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 3, endColumn: 4});
    assert.isTrue(typeof textRange.toString() === 'string', 'toString should return a string');
  });

  describe('intersection', () => {
    const {TextRange} = TextUtils.TextRange;

    it('yields empty range for empty inputs', () => {
      const range1 = new TextRange(0, 0, 0, 0);
      const range2 = new TextRange(1, 4, 1, 4);
      assert.isTrue(range1.intersection(range2).isEmpty(), 'intersection should be empty');
      assert.isTrue(range2.intersection(range1).isEmpty(), 'intersection should be empty');
    });

    it('yields empty range for non-overlapping inputs', () => {
      const range1 = new TextRange(1, 0, 2, 0);
      const range2 = new TextRange(3, 0, 4, 0);
      assert.isTrue(range1.intersection(range2).isEmpty(), 'intersection should be empty');
      assert.isTrue(range2.intersection(range1).isEmpty(), 'intersection should be empty');

      const range3 = new TextRange(7, 1, 8, 4);
      const range4 = new TextRange(8, 4, 8, 9);
      assert.isTrue(range3.intersection(range4).isEmpty(), 'intersection should be empty');
      assert.isTrue(range4.intersection(range3).isEmpty(), 'intersection should be empty');
    });

    it('yields same range for identical inputs', () => {
      const range = new TextRange(1, 2, 3, 4);
      assert.deepEqual(range.intersection(range), range);
    });

    it('yields a point range for inputs overlapping on a single character', () => {
      const range1 = new TextRange(7, 1, 7, 4);
      const range2 = new TextRange(7, 3, 9, 9);
      const result = new TextRange(range2.startLine, range2.startColumn, range1.endLine, range1.endColumn);
      assert.deepEqual(range1.intersection(range2), result);
      assert.deepEqual(range2.intersection(range1), result);
    });

    it('yields a copy and never the input', () => {
      const range = new TextRange(8, 0, 8, 9);
      const empty = new TextRange(7, 0, 7, 0);
      assert.notStrictEqual(range.intersection(range), range);
      assert.notStrictEqual(empty.intersection(empty), empty);
      assert.notStrictEqual(empty.intersection(range), empty);
      assert.notStrictEqual(empty.intersection(range), range);
      assert.notStrictEqual(range.intersection(empty), empty);
      assert.notStrictEqual(range.intersection(empty), range);
    });

    it('yields the smaller range if it is fully contained in the other', () => {
      const large = new TextRange(0, 1, 10, 0);
      const small = new TextRange(0, 2, 9, 25);
      assert.deepEqual(large.intersection(small), small);
      assert.deepEqual(small.intersection(large), small);
    });
  });
});
