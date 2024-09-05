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
    const names: string[] = [];
    const brokenScopes = new OriginalScopeBuilder(names).start(0, 0, 'global').build();
    assert.throws(() => decodeOriginalScopes([brokenScopes], names), /Malformed/);
  });

  it('throws if positions of subsequent start/end items are not monotonically increasing', () => {
    const names: string[] = [];
    const scopes =
        new OriginalScopeBuilder(names).start(0, 40, 'global').start(0, 25, 'function').end(0, 30).end(0, 50).build();
    assert.throws(() => decodeOriginalScopes([scopes], names), /Malformed/);
  });

  it('decodes a global scope', () => {
    const names: string[] = [];
    const scope = new OriginalScopeBuilder(names).start(0, 0, 'global').end(5, 0).build();

    const originalScopes = decodeOriginalScopes([scope], names);

    assert.lengthOf(originalScopes, 1);
    const {root, scopeForItemIndex} = originalScopes[0];
    assert.deepEqual(root.start, {line: 0, column: 0});
    assert.deepEqual(root.end, {line: 5, column: 0});
    assert.strictEqual(root.kind, 'global');

    assert.strictEqual(scopeForItemIndex.get(0), root);
  });

  it('ignores all but the first global scope (multiple top-level siblings)', () => {
    const names: string[] = [];
    const scope =
        new OriginalScopeBuilder(names).start(0, 0, 'global').end(5, 0).start(10, 0, 'global').end(20, 0).build();

    const originalScopes = decodeOriginalScopes([scope], names);

    assert.lengthOf(originalScopes, 1);
    const {root, scopeForItemIndex} = originalScopes[0];
    assert.deepEqual(root.start, {line: 0, column: 0});
    assert.deepEqual(root.end, {line: 5, column: 0});
    assert.lengthOf(root.children, 0);

    assert.isUndefined(scopeForItemIndex.get(2));
  });

  it('decodes nested scopes', () => {
    const names: string[] = [];
    const scope = new OriginalScopeBuilder(names)
                      .start(0, 0, 'global')
                      .start(2, 5, 'function')
                      .start(4, 10, 'block')
                      .end(6, 5)
                      .end(8, 0)
                      .end(40, 0)
                      .build();

    const originalScopes = decodeOriginalScopes([scope], names);

    assert.lengthOf(originalScopes, 1);
    const {root, scopeForItemIndex} = originalScopes[0];
    assert.lengthOf(root.children, 1);
    assert.strictEqual(root.children[0].parent, root);
    assert.lengthOf(root.children[0].children, 1);
    assert.strictEqual(scopeForItemIndex.get(1), root.children[0]);

    const innerMost = root.children[0].children[0];
    assert.strictEqual(innerMost.parent, root.children[0]);
    assert.deepEqual(innerMost.start, {line: 4, column: 10});
    assert.deepEqual(innerMost.end, {line: 6, column: 5});
    assert.strictEqual(innerMost.kind, 'block');
    assert.strictEqual(scopeForItemIndex.get(2), innerMost);
  });

  it('decodes sibling scopes', () => {
    const names: string[] = [];
    const scope = new OriginalScopeBuilder(names)
                      .start(0, 0, 'global')
                      .start(2, 5, 'function')
                      .end(4, 0)
                      .start(6, 6, 'function')
                      .end(8, 0)
                      .end(10, 0)
                      .build();

    const originalScopes = decodeOriginalScopes([scope], names);

    assert.lengthOf(originalScopes, 1);
    const {root, scopeForItemIndex} = originalScopes[0];
    assert.lengthOf(root.children, 2);
    assert.strictEqual(root.children[0].kind, 'function');
    assert.strictEqual(root.children[1].kind, 'function');

    assert.strictEqual(scopeForItemIndex.get(1), root.children[0]);
    assert.strictEqual(scopeForItemIndex.get(3), root.children[1]);

    assert.strictEqual(root.children[0].parent, root);
    assert.strictEqual(root.children[1].parent, root);
  });

  it('decodes scope names', () => {
    const names: string[] = [];
    const scope = new OriginalScopeBuilder(names)
                      .start(0, 0, 'global')
                      .start(2, 5, 'class', 'FooClass')
                      .start(4, 10, 'function', 'fooMethod')
                      .end(6, 5)
                      .end(8, 0)
                      .end(40, 0)
                      .build();

    const originalScopes = decodeOriginalScopes([scope], names);

    assert.lengthOf(originalScopes, 1);
    const {root} = originalScopes[0];
    assert.lengthOf(root.children, 1);
    assert.strictEqual(root.children[0].name, 'FooClass');

    assert.lengthOf(root.children[0].children, 1);
    assert.strictEqual(root.children[0].children[0].name, 'fooMethod');
  });

  it('decodes variable names', () => {
    const names: string[] = [];
    const scope = new OriginalScopeBuilder(names)
                      .start(0, 0, 'global')
                      .start(2, 5, 'function', 'fooFunction', ['functionVarFoo'])
                      .start(4, 10, 'block', undefined, ['blockVarFoo', 'blockVarBar'])
                      .end(6, 5)
                      .end(8, 0)
                      .end(40, 0)
                      .build();

    const originalScopes = decodeOriginalScopes([scope], names);

    assert.lengthOf(originalScopes, 1);
    const {root} = originalScopes[0];
    assert.lengthOf(root.children, 1);
    assert.deepEqual(root.children[0].variables, ['functionVarFoo']);

    assert.lengthOf(root.children[0].children, 1);
    assert.deepEqual(root.children[0].children[0].variables, ['blockVarFoo', 'blockVarBar']);
  });
});

describe('decodeGeneratedRanges', () => {
  it('returns an empty array for empty input', () => {
    assert.lengthOf(decodeGeneratedRanges('', [], []), 0);
  });

  it('throws for missing "end" item', () => {
    const brokenRanges = new GeneratedRangeBuilder([]).start(0, 0).build();
    assert.throws(() => decodeGeneratedRanges(brokenRanges, [], []), /Malformed/);
  });

  it('decodes a single range', () => {
    const range = new GeneratedRangeBuilder([]).start(0, 0).end(5, 0).build();

    const [generatedRange] = decodeGeneratedRanges(range, [], []);

    assert.deepEqual(generatedRange.start, {line: 0, column: 0});
    assert.deepEqual(generatedRange.end, {line: 5, column: 0});
  });

  it('decodes multiple top-level ranges', () => {
    const range = new GeneratedRangeBuilder([]).start(0, 0).end(0, 10).start(0, 11).end(0, 20).build();

    const [generatedRange1, generatedRange2] = decodeGeneratedRanges(range, [], []);

    assert.deepEqual(generatedRange1.start, {line: 0, column: 0});
    assert.deepEqual(generatedRange1.end, {line: 0, column: 10});

    assert.deepEqual(generatedRange2.start, {line: 0, column: 11});
    assert.deepEqual(generatedRange2.end, {line: 0, column: 20});
  });

  it('decodes a nested range on a single line', () => {
    const range = new GeneratedRangeBuilder([]).start(0, 0).start(0, 5).end(0, 10).end(0, 15).build();

    const [generatedRange] = decodeGeneratedRanges(range, [], []);

    assert.deepEqual(generatedRange.start, {line: 0, column: 0});
    assert.deepEqual(generatedRange.end, {line: 0, column: 15});

    assert.lengthOf(generatedRange.children, 1);
    assert.deepEqual(generatedRange.children[0].start, {line: 0, column: 5});
    assert.deepEqual(generatedRange.children[0].end, {line: 0, column: 10});
  });

  it('decodes sibling ranges on a single line', () => {
    const range =
        new GeneratedRangeBuilder([]).start(0, 0).start(0, 5).end(0, 10).start(0, 15).end(0, 20).end(0, 25).build();

    const [generatedRange] = decodeGeneratedRanges(range, [], []);

    assert.deepEqual(generatedRange.start, {line: 0, column: 0});
    assert.deepEqual(generatedRange.end, {line: 0, column: 25});

    assert.lengthOf(generatedRange.children, 2);
    assert.deepEqual(generatedRange.children[0].start, {line: 0, column: 5});
    assert.deepEqual(generatedRange.children[0].end, {line: 0, column: 10});
    assert.deepEqual(generatedRange.children[1].start, {line: 0, column: 15});
    assert.deepEqual(generatedRange.children[1].end, {line: 0, column: 20});
  });

  it('decodes nested and sibling ranges over multiple lines', () => {
    const range = new GeneratedRangeBuilder([])
                      .start(0, 0)
                      .start(5, 0)
                      .start(10, 8)
                      .end(15, 4)
                      .end(20, 0)
                      .start(25, 4)
                      .end(30, 0)
                      .end(35, 0)
                      .build();

    const [generatedRange] = decodeGeneratedRanges(range, [], []);

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

  it('throws if the definition references has an invalid source index', () => {
    const names: string[] = [];
    const originEncodedScpoes = new OriginalScopeBuilder(names).start(2, 0, 'function').end(5, 0).build();
    const originalScopes = decodeOriginalScopes([originEncodedScpoes], names);
    const range =
        new GeneratedRangeBuilder([]).start(0, 0, {definition: {sourceIdx: 1, scopeIdx: 0}}).end(0, 20).build();

    assert.throws(() => decodeGeneratedRanges(range, originalScopes, []), /Invalid source index/);
  });

  it('throws if the definition references has an invalid scope index', () => {
    const names: string[] = [];
    const originEncodedScpoes = new OriginalScopeBuilder(names).start(2, 0, 'function').end(5, 0).build();
    const originalScopes = decodeOriginalScopes([originEncodedScpoes], names);
    const range =
        new GeneratedRangeBuilder([]).start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 4}}).end(0, 20).build();

    assert.throws(() => decodeGeneratedRanges(range, originalScopes, []), /Invalid original scope index/);
  });

  it('decodes original scope (definition) references', () => {
    const names: string[] = [];
    const originEncodedScpoes =
        new OriginalScopeBuilder(names).start(0, 0, 'global').start(5, 0, 'function').end(10, 0).end(20, 0).build();
    const originalScopes = decodeOriginalScopes([originEncodedScpoes], names);
    const range = new GeneratedRangeBuilder([])
                      .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
                      .start(0, 5, {definition: {sourceIdx: 0, scopeIdx: 1}})
                      .end(0, 10)
                      .end(0, 20)
                      .build();

    const [generatedRange] = decodeGeneratedRanges(range, originalScopes, []);

    assert.strictEqual(generatedRange.originalScope, originalScopes[0].root, 'range does not reference global scope');
    assert.strictEqual(
        generatedRange.children[0].originalScope, originalScopes[0].root.children[0],
        'range does not reference function scope');
  });

  it('decodes original scope (definition) references across multiple original sources', () => {
    const names: string[] = [];
    const originEncodedScopes1 =
        new OriginalScopeBuilder(names).start(0, 0, 'global').start(5, 0, 'function').end(10, 0).end(20, 0).build();
    const originEncodedScopes2 =
        new OriginalScopeBuilder(names).start(0, 0, 'global').start(5, 0, 'function').end(10, 0).end(20, 0).build();
    const originalScopes = decodeOriginalScopes([originEncodedScopes1, originEncodedScopes2], names);
    const range = new GeneratedRangeBuilder([])
                      .start(0, 0)
                      .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 1}})
                      .end(0, 5)
                      .start(0, 10, {definition: {sourceIdx: 1, scopeIdx: 1}})
                      .end(0, 15)
                      .end(0, 16)
                      .build();

    const [generatedRange] = decodeGeneratedRanges(range, originalScopes, []);

    assert.strictEqual(generatedRange.children[0].originalScope, originalScopes[0].root.children[0]);
    assert.strictEqual(generatedRange.children[1].originalScope, originalScopes[1].root.children[0]);
  });

  it('throws if an inlined range\'s callsite references an invalid source index', () => {
    const names: string[] = [];
    const originEncodedScpoes = new OriginalScopeBuilder(names).start(2, 0, 'function').end(5, 0).build();
    const originalScopes = decodeOriginalScopes([originEncodedScpoes], names);
    const range =
        new GeneratedRangeBuilder([]).start(0, 0, {callsite: {sourceIdx: 1, line: 0, column: 0}}).end(0, 20).build();

    assert.throws(() => decodeGeneratedRanges(range, originalScopes, []), /Invalid source index/);
  });

  it('decodes multiple callsite references in the same source file and the same line', () => {
    const names: string[] = [];
    const originEncodedScpoes =
        new OriginalScopeBuilder(names).start(0, 0, 'global').start(1, 0, 'function').end(4, 0).end(10, 0).build();
    const originalScopes = decodeOriginalScopes([originEncodedScpoes], names);
    const range =
        new GeneratedRangeBuilder([])
            .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
            .start(0, 5, {definition: {sourceIdx: 0, scopeIdx: 1}, callsite: {sourceIdx: 0, line: 6, column: 0}})
            .end(0, 7)
            .start(0, 8, {definition: {sourceIdx: 0, scopeIdx: 1}, callsite: {sourceIdx: 0, line: 8, column: 5}})
            .end(0, 12)
            .start(0, 13, {definition: {sourceIdx: 0, scopeIdx: 1}, callsite: {sourceIdx: 0, line: 8, column: 15}})
            .end(0, 18)
            .end(0, 20)
            .build();

    const [generatedRange] = decodeGeneratedRanges(range, originalScopes, []);

    assert.lengthOf(generatedRange.children, 3);
    assert.deepEqual(generatedRange.children[0].callsite, {sourceIndex: 0, line: 6, column: 0});
    assert.deepEqual(generatedRange.children[1].callsite, {sourceIndex: 0, line: 8, column: 5});
    assert.deepEqual(generatedRange.children[2].callsite, {sourceIndex: 0, line: 8, column: 15});
  });

  it('decodes multiple callsite refrences over multiple source files', () => {
    // A single function in the first file, is called in the first and second file. The bundler inlines both call-sites.
    const names: string[] = [];
    const originalEncodedScopes1 =
        new OriginalScopeBuilder(names).start(0, 0, 'global').start(1, 0, 'function').end(4, 0).end(10, 0).build();
    const originalEncodedScopes2 = new OriginalScopeBuilder(names).start(0, 0, 'global').end(10, 0).build();
    const originalScopes = decodeOriginalScopes([originalEncodedScopes1, originalEncodedScopes2], names);
    const range =
        new GeneratedRangeBuilder([])
            .start(
                0, 0)  // Pseudo root range so we can have multiple global ranges. This will be fixed soon in the spec.
            .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
            .start(5, 0, {definition: {sourceIdx: 0, scopeIdx: 1}, callsite: {sourceIdx: 0, line: 7, column: 5}})
            .end(8, 0)
            .end(20, 0)
            .start(21, 0, {definition: {sourceIdx: 1, scopeIdx: 0}})
            .start(22, 0, {definition: {sourceIdx: 0, scopeIdx: 1}, callsite: {sourceIdx: 1, line: 3, column: 7}})
            .end(25, 0)
            .end(40, 0)
            .end(40, 0)
            .build();

    const [generatedRange] = decodeGeneratedRanges(range, originalScopes, []);

    assert.lengthOf(generatedRange.children, 2);
    assert.lengthOf(generatedRange.children[0].children, 1);
    assert.deepEqual(generatedRange.children[0].children[0].callsite, {sourceIndex: 0, line: 7, column: 5});

    assert.lengthOf(generatedRange.children[1].children, 1);
    assert.deepEqual(generatedRange.children[1].children[0].callsite, {sourceIndex: 1, line: 3, column: 7});
  });

  it('decodes bindings that are available/unavailable for the full range', () => {
    const names: string[] = [];
    const originalEncodedScopes =
        new OriginalScopeBuilder(names).start(0, 0, 'global', undefined, ['foo', 'bar', 'baz']).end(10, 0).build();
    const originalScopes = decodeOriginalScopes([originalEncodedScopes], names);
    const range = new GeneratedRangeBuilder(names)
                      .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}, bindings: ['x', undefined, 'y']})
                      .end(0, 100)
                      .build();

    const [generatedRange] = decodeGeneratedRanges(range, originalScopes, names);

    assert.lengthOf(generatedRange.values, 3);
    assert.deepEqual(generatedRange.values, ['x', undefined, 'y']);
  });

  it('decodes bindings that are available with different expressions throughout a range', () => {
    const names: string[] = [];
    const originalEncodedScopes =
        new OriginalScopeBuilder(names).start(0, 0, 'global', undefined, ['foo']).end(10, 0).build();
    const originalScopes = decodeOriginalScopes([originalEncodedScopes], names);
    const range = new GeneratedRangeBuilder(names)
                      .start(0, 0, {
                        definition: {sourceIdx: 0, scopeIdx: 0},
                        bindings: [[
                          {line: 0, column: 0, name: 'x'},
                          {line: 0, column: 30, name: undefined},
                          {line: 0, column: 60, name: 'y'},
                        ]],
                      })
                      .end(0, 100)
                      .build();

    const [generatedRange] = decodeGeneratedRanges(range, originalScopes, names);

    assert.lengthOf(generatedRange.values, 1);
    assert.deepEqual(generatedRange.values[0], [
      {from: {line: 0, column: 0}, to: {line: 0, column: 30}, value: 'x'},
      {from: {line: 0, column: 30}, to: {line: 0, column: 60}, value: undefined},
      {from: {line: 0, column: 60}, to: {line: 0, column: 100}, value: 'y'},
    ]);
  });

  it('decodes the "isFunctionScope" flag', () => {
    const range = new GeneratedRangeBuilder([])
                      .start(0, 0)
                      .start(5, 0, {isFunctionScope: true})
                      .end(10, 0)
                      .start(20, 4, {isFunctionScope: false})
                      .end(30, 0)
                      .end(40, 0)
                      .build();

    const [generatedRange] = decodeGeneratedRanges(range, [], []);
    assert.lengthOf(generatedRange.children, 2);
    assert.isTrue(generatedRange.children[0].isFunctionScope);
    assert.isFalse(generatedRange.children[1].isFunctionScope);
  });
});
