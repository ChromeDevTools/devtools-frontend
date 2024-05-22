// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {encodeVlq, GeneratedRangeBuilder, OriginalScopeBuilder} from '../../testing/SourceMapEncoder.js';

import * as SDK from './sdk.js';

const {decodeOriginalScopes, decodeGeneratedRanges} = SDK.SourceMapScopes;

describe('decodeOriginalScopes', () => {
  it('throws for empty input', () => {
    assert.throws(() => decodeOriginalScopes([''], []));
  });

  it('throws for unexpected commas', () => {
    const brokenScopes = encodeVlq(42) + ',' + encodeVlq(21);
    assert.throws(() => decodeOriginalScopes([brokenScopes], []), /Unexpected char ','/);
  });

  it('throws for missing "end" item', () => {
    const brokenScopes = new OriginalScopeBuilder().start(0, 0, 'global').build();
    assert.throws(() => decodeOriginalScopes([brokenScopes], []), /Malformed/);
  });

  it('throws if positions of subsequent start/end items are not monotonically increasing', () => {
    const scopes =
        new OriginalScopeBuilder().start(0, 40, 'global').start(0, 25, 'function').end(0, 30).end(0, 50).build();
    assert.throws(() => decodeOriginalScopes([scopes], []), /Malformed/);
  });

  it('decodes a global scope', () => {
    const scope = new OriginalScopeBuilder().start(0, 0, 'global').end(5, 0).build();

    const originalScopes = decodeOriginalScopes([scope], []);

    assert.lengthOf(originalScopes, 1);
    assert.deepEqual(originalScopes[0].start, {line: 0, column: 0});
    assert.deepEqual(originalScopes[0].end, {line: 5, column: 0});
    assert.strictEqual(originalScopes[0].kind, 'global');
  });

  it('ignores all but the first global scope (multiple top-level siblings)', () => {
    const scope = new OriginalScopeBuilder().start(0, 0, 'global').end(5, 0).start(10, 0, 'global').end(20, 0).build();

    const originalScopes = decodeOriginalScopes([scope], []);

    assert.lengthOf(originalScopes, 1);
    assert.deepEqual(originalScopes[0].start, {line: 0, column: 0});
    assert.deepEqual(originalScopes[0].end, {line: 5, column: 0});
    assert.lengthOf(originalScopes[0].children, 0);
  });

  it('decodes nested scopes', () => {
    const scope = new OriginalScopeBuilder()
                      .start(0, 0, 'global')
                      .start(2, 5, 'function')
                      .start(4, 10, 'block')
                      .end(6, 5)
                      .end(8, 0)
                      .end(40, 0)
                      .build();

    const originalScopes = decodeOriginalScopes([scope], []);

    assert.lengthOf(originalScopes, 1);
    assert.lengthOf(originalScopes[0].children, 1);
    assert.lengthOf(originalScopes[0].children[0].children, 1);

    const innerMost = originalScopes[0].children[0].children[0];
    assert.deepEqual(innerMost.start, {line: 4, column: 10});
    assert.deepEqual(innerMost.end, {line: 6, column: 5});
    assert.strictEqual(innerMost.kind, 'block');
  });

  it('decodes sibling scopes', () => {
    const scope = new OriginalScopeBuilder()
                      .start(0, 0, 'global')
                      .start(2, 5, 'function')
                      .end(4, 0)
                      .start(6, 6, 'function')
                      .end(8, 0)
                      .end(10, 0)
                      .build();

    const originalScopes = decodeOriginalScopes([scope], []);

    assert.lengthOf(originalScopes, 1);
    assert.lengthOf(originalScopes[0].children, 2);
    assert.strictEqual(originalScopes[0].children[0].kind, 'function');
    assert.strictEqual(originalScopes[0].children[1].kind, 'function');
  });

  it('decodes scope names', () => {
    const scope = new OriginalScopeBuilder()
                      .start(0, 0, 'global')
                      .start(2, 5, 'class', 0)
                      .start(4, 10, 'function', 1)
                      .end(6, 5)
                      .end(8, 0)
                      .end(40, 0)
                      .build();

    const originalScopes = decodeOriginalScopes([scope], ['FooClass', 'fooMethod']);

    assert.lengthOf(originalScopes, 1);
    assert.lengthOf(originalScopes[0].children, 1);
    assert.strictEqual(originalScopes[0].children[0].name, 'FooClass');

    assert.lengthOf(originalScopes[0].children[0].children, 1);
    assert.strictEqual(originalScopes[0].children[0].children[0].name, 'fooMethod');
  });

  it('decodes variable names', () => {
    const scope = new OriginalScopeBuilder()
                      .start(0, 0, 'global')
                      .start(2, 5, 'function', 0, [1])
                      .start(4, 10, 'block', undefined, [2, 3])
                      .end(6, 5)
                      .end(8, 0)
                      .end(40, 0)
                      .build();

    const originalScopes =
        decodeOriginalScopes([scope], ['fooFunction', 'functionVarFoo', 'blockVarFoo', 'blockVarBar']);

    assert.lengthOf(originalScopes, 1);
    assert.lengthOf(originalScopes[0].children, 1);
    assert.deepEqual(originalScopes[0].children[0].variables, ['functionVarFoo']);

    assert.lengthOf(originalScopes[0].children[0].children, 1);
    assert.deepEqual(originalScopes[0].children[0].children[0].variables, ['blockVarFoo', 'blockVarBar']);
  });
});

describe('decodeGeneratedRanges', () => {
  it('throws for empty input', () => {
    assert.throws(() => decodeGeneratedRanges('', [], []));
  });

  it('throws for missing "end" item', () => {
    const brokenRanges = new GeneratedRangeBuilder().start(0, 0).build();
    assert.throws(() => decodeGeneratedRanges(brokenRanges, [], []), /Malformed/);
  });

  it('decodes a single range', () => {
    const range = new GeneratedRangeBuilder().start(0, 0).end(5, 0).build();

    const generatedRange = decodeGeneratedRanges(range, [], []);

    assert.deepEqual(generatedRange.start, {line: 0, column: 0});
    assert.deepEqual(generatedRange.end, {line: 5, column: 0});
  });

  it('decodes a nested range on a single line', () => {
    const range = new GeneratedRangeBuilder().start(0, 0).start(0, 5).end(0, 10).end(0, 15).build();

    const generatedRange = decodeGeneratedRanges(range, [], []);

    assert.deepEqual(generatedRange.start, {line: 0, column: 0});
    assert.deepEqual(generatedRange.end, {line: 0, column: 15});

    assert.lengthOf(generatedRange.children, 1);
    assert.deepEqual(generatedRange.children[0].start, {line: 0, column: 5});
    assert.deepEqual(generatedRange.children[0].end, {line: 0, column: 10});
  });

  it('decodes sibling ranges on a single line', () => {
    const range =
        new GeneratedRangeBuilder().start(0, 0).start(0, 5).end(0, 10).start(0, 15).end(0, 20).end(0, 25).build();

    const generatedRange = decodeGeneratedRanges(range, [], []);

    assert.deepEqual(generatedRange.start, {line: 0, column: 0});
    assert.deepEqual(generatedRange.end, {line: 0, column: 25});

    assert.lengthOf(generatedRange.children, 2);
    assert.deepEqual(generatedRange.children[0].start, {line: 0, column: 5});
    assert.deepEqual(generatedRange.children[0].end, {line: 0, column: 10});
    assert.deepEqual(generatedRange.children[1].start, {line: 0, column: 15});
    assert.deepEqual(generatedRange.children[1].end, {line: 0, column: 20});
  });

  it('decodes nested and sibling ranges over multiple lines', () => {
    const range = new GeneratedRangeBuilder()
                      .start(0, 0)
                      .start(5, 0)
                      .start(10, 8)
                      .end(15, 4)
                      .end(20, 0)
                      .start(25, 4)
                      .end(30, 0)
                      .end(35, 0)
                      .build();

    const generatedRange = decodeGeneratedRanges(range, [], []);

    assert.deepEqual(generatedRange.start, {line: 0, column: 0});
    assert.deepEqual(generatedRange.end, {line: 35, column: 0});

    assert.lengthOf(generatedRange.children, 2);
    assert.deepEqual(generatedRange.children[0].start, {line: 5, column: 0});
    assert.deepEqual(generatedRange.children[0].end, {line: 20, column: 0});

    assert.lengthOf(generatedRange.children[0].children, 1);
    assert.deepEqual(generatedRange.children[0].children[0].start, {line: 10, column: 8});
    assert.deepEqual(generatedRange.children[0].children[0].end, {line: 15, column: 4});

    assert.deepEqual(generatedRange.children[1].start, {line: 25, column: 4});
    assert.deepEqual(generatedRange.children[1].end, {line: 30, column: 0});
  });
});
