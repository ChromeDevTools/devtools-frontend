// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Printer} from '../../testing/PropertyParser.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

import * as Elements from './elements.js';

class TreeSearch extends Elements.PropertyParser.TreeWalker {
  #found: CodeMirror.SyntaxNode|null = null;
  #predicate: (node: CodeMirror.SyntaxNode) => boolean;

  constructor(ast: Elements.PropertyParser.SyntaxTree, predicate: (node: CodeMirror.SyntaxNode) => boolean) {
    super(ast);
    this.#predicate = predicate;
  }

  protected override enter({node}: Elements.PropertyParser.SyntaxNodeRef): boolean {
    if (this.#found) {
      return false;
    }

    if (this.#predicate(node)) {
      this.#found = this.#found ?? node;
      return false;
    }
    return true;
  }

  static find(ast: Elements.PropertyParser.SyntaxTree, predicate: (node: CodeMirror.SyntaxNode) => boolean):
      CodeMirror.SyntaxNode|null {
    return TreeSearch.walk(ast, predicate).#found;
  }

  static findAll(ast: Elements.PropertyParser.SyntaxTree, predicate: (node: CodeMirror.SyntaxNode) => boolean):
      CodeMirror.SyntaxNode[] {
    const foundNodes: CodeMirror.SyntaxNode[] = [];
    TreeSearch.walk(ast, (node: CodeMirror.SyntaxNode) => {
      if (predicate(node)) {
        foundNodes.push(node);
      }

      return false;
    });
    return foundNodes;
  }
}

function matchSingleValue<T extends Elements.PropertyParser.Match>(
    name: string, value: string, matcher: Elements.PropertyParser.Matcher<T>):
    {ast: Elements.PropertyParser.SyntaxTree|null, match: T|null, text: string} {
  const ast = Elements.PropertyParser.tokenizeDeclaration(name, value);
  if (!ast) {
    return {ast, match: null, text: value};
  }

  const matchedResult = Elements.PropertyParser.BottomUpTreeMatching.walk(ast, [matcher]);
  const matchedNode = TreeSearch.find(ast, n => matchedResult.getMatch(n) instanceof matcher.matchType);
  const match = matchedNode && matchedResult.getMatch(matchedNode);

  return {
    ast,
    match: match instanceof matcher.matchType ? match : null,
    text: Printer.walk(ast).get(),
  };
}

function tokenizeDeclaration(name: string, value: string): Elements.PropertyParser.SyntaxTree {
  const ast = Elements.PropertyParser.tokenizeDeclaration(name, value);
  assert.exists(ast, Printer.rule(`*{${name}: ${value};}`));
  return ast;
}

function injectVariableSubstitutions(variables: Record<string, string>) {
  const {getComputedText, getComputedTextRange, getMatch} = Elements.PropertyParser.BottomUpTreeMatching.prototype;
  const variableNames = new Map<string, {varName: string, value: string}>();
  function injectChunk(matching: Elements.PropertyParser.BottomUpTreeMatching): void {
    if (matching.computedText.chunkCount === 0) {
      const propertyOffset = matching.ast.rule.indexOf(matching.ast.propertyName ?? '--');
      assert.isAbove(propertyOffset, 0);
      for (const [varName, value] of Object.entries(variables)) {
        const varText = `var(${varName})`;
        for (let offset = matching.ast.rule.indexOf(varText); offset >= 0;
             offset = matching.ast.rule.indexOf(varText, offset + 1)) {
          matching.computedText.push(
              {text: varText, computedText: () => value, node: {} as CodeMirror.SyntaxNode}, offset - propertyOffset);
        }
        variableNames.set(varText, {varName, value});
      }
    }
  }

  sinon.stub(Elements.PropertyParser.BottomUpTreeMatching.prototype, 'getComputedText')
      .callsFake(function(this: Elements.PropertyParser.BottomUpTreeMatching, node: CodeMirror.SyntaxNode): string {
        injectChunk(this);
        return getComputedText.call(this, node);
      });
  sinon.stub(Elements.PropertyParser.BottomUpTreeMatching.prototype, 'getComputedTextRange')
      .callsFake(function(
          this: Elements.PropertyParser.BottomUpTreeMatching, from: CodeMirror.SyntaxNode,
          to: CodeMirror.SyntaxNode): string {
        injectChunk(this);
        return getComputedTextRange.call(this, from, to);
      });
  sinon.stub(Elements.PropertyParser.BottomUpTreeMatching.prototype, 'getMatch')
      .callsFake(function(this: Elements.PropertyParser.BottomUpTreeMatching, node: CodeMirror.SyntaxNode):
                     Elements.PropertyParser.Match|undefined {
                       injectChunk(this);
                       const resolvedValue = variableNames.get(this.ast.text(node));
                       if (!resolvedValue) {
                         return getMatch.call(this, node);
                       }
                       return new Elements.PropertyParser.VariableMatch(
                           this.ast.text(node), node, resolvedValue.varName, [], this, () => resolvedValue.value);
                     });
}

describe('PropertyParser', () => {
  it('correctly identifies spacing', () => {
    const requiresSpace = (a: string, b: string) =>
        Elements.PropertyParser.requiresSpace([document.createTextNode(a)], [document.createTextNode(b)]);

    assert.isTrue(requiresSpace('a', 'b'));
    assert.isFalse(requiresSpace('', 'text'));
    assert.isFalse(requiresSpace('(', 'text'));
    assert.isFalse(requiresSpace(' ', 'text'));
    assert.isFalse(requiresSpace('{', 'text'));
    assert.isFalse(requiresSpace('}', 'text'));
    assert.isFalse(requiresSpace(';', 'text'));
    assert.isFalse(requiresSpace('text(', 'text'));
    assert.isFalse(requiresSpace('text ', 'text'));
    assert.isFalse(requiresSpace('text{', 'text'));
    assert.isFalse(requiresSpace('text}', 'text'));
    assert.isFalse(requiresSpace('text;', 'text'));

    assert.isFalse(requiresSpace('text', ''));
    assert.isFalse(requiresSpace('text', '('));
    assert.isFalse(requiresSpace('text', ')'));
    assert.isFalse(requiresSpace('text', ','));
    assert.isFalse(requiresSpace('text', ':'));
    assert.isFalse(requiresSpace('text', ' '));
    assert.isFalse(requiresSpace('text', '*'));
    assert.isFalse(requiresSpace('text', '{'));
    assert.isFalse(requiresSpace('text', ';'));
    assert.isFalse(requiresSpace('text', '( text'));
    assert.isFalse(requiresSpace('text', ') text'));
    assert.isFalse(requiresSpace('text', ', text'));
    assert.isFalse(requiresSpace('text', ': text'));
    assert.isFalse(requiresSpace('text', ' text'));
    assert.isFalse(requiresSpace('text', '* text'));
    assert.isFalse(requiresSpace('text', '{ text'));
    assert.isFalse(requiresSpace('text', '; text'));

    assert.isTrue(Elements.PropertyParser.requiresSpace(
        [document.createTextNode('text'), document.createElement('div')], [document.createTextNode('text')]));
    assert.isTrue(Elements.PropertyParser.requiresSpace(
        [document.createTextNode('text')], [document.createElement('div'), document.createTextNode('text')]));
    assert.isTrue(Elements.PropertyParser.requiresSpace(
        [document.createTextNode('text'), document.createElement('div')],
        [document.createElement('div'), document.createTextNode('text')]));
    assert.isFalse(Elements.PropertyParser.requiresSpace(
        [document.createTextNode('text'), document.createElement('div')], [document.createTextNode(' text')]));
    assert.isFalse(Elements.PropertyParser.requiresSpace(
        [document.createTextNode('text')], [document.createElement('div'), document.createTextNode(' text')]));
    assert.isFalse(Elements.PropertyParser.requiresSpace(
        [document.createTextNode('text'), document.createElement('div')],
        [document.createElement('div'), document.createTextNode(' text')]));
  });

  it('parses comments', () => {
    const property = '/* color: red */blue/* color: red */';
    const ast = tokenizeDeclaration('--property', property);
    const topNode = ast.tree.parent?.parent?.parent;
    assert.exists(topNode);
    assert.strictEqual(
        Printer.walk(ast.subtree(topNode)).get(), ` StyleSheet: *{--property: /* color: red */blue/* color: red */;}
| RuleSet: *{--property: /* color: red */blue/* color: red */;}
|| UniversalSelector: *
|| Block: {--property: /* color: red */blue/* color: red */;}
||| {
||| Declaration: --property: /* color: red */blue
|||| VariableName: --property
|||| :
|||| Comment: /* color: red */
|||| ValueName: blue
||| Comment: /* color: red */
||| ;
||| }`);
  });

  it('correctly tokenizes invalid text', () => {
    assert.isNull(Elements.PropertyParser.tokenizeDeclaration('--p', ''));
    assert.isNull(Elements.PropertyParser.tokenizeDeclaration('--p', '/*'));
    assert.isNull(Elements.PropertyParser.tokenizeDeclaration('--p', '}'));
  });

  it('correctly parses property names', () => {
    assert.strictEqual(tokenizeDeclaration('color /*comment*/', 'red')?.propertyName, 'color');
    assert.strictEqual(tokenizeDeclaration('/*comment*/color/*comment*/', 'red')?.propertyName, 'color');
    assert.strictEqual(tokenizeDeclaration(' /*comment*/color', 'red')?.propertyName, 'color');
    assert.strictEqual(tokenizeDeclaration('co/*comment*/lor', 'red')?.propertyName, 'lor');
    assert.isNull(Elements.PropertyParser.tokenizeDeclaration('co:lor', 'red'));
  });

  it('parses colors', () => {
    for (const fail of ['red-blue', '#f', '#foobar', '', 'rgbz(1 2 2)', 'tan(45deg)']) {
      const {match, text} = matchSingleValue('color', fail, new Elements.PropertyParser.ColorMatcher());
      assert.isNull(match, text);
    }
    for (const succeed
             of ['rgb(/* R */155, /* G */51, /* B */255)', 'red', 'rgb(0 0 0)', 'rgba(0 0 0)', '#fff', '#ffff',
                 '#ffffff', '#ffffffff']) {
      const {match, text} = matchSingleValue('color', succeed, new Elements.PropertyParser.ColorMatcher());
      assert.exists(match, text);
      assert.strictEqual(match.text, succeed);
    }
    // The property name matters:
    for (const fail
             of ['rgb(/* R */155, /* G */51, /* B */255)', 'red', 'rgb(0 0 0)', 'rgba(0 0 0)', '#fff', '#ffff',
                 '#ffffff', '#ffffffff']) {
      const {match, text} = matchSingleValue('width', fail, new Elements.PropertyParser.ColorMatcher());
      assert.isNull(match, text);
    }
  });

  it('parses colors in masks', () => {
    for (const succeed of ['mask', 'mask-image', 'mask-border', 'mask-border-source']) {
      const ast = Elements.PropertyParser.tokenizeDeclaration(succeed, 'linear-gradient(to top, red, var(--other))');
      assert.exists(ast, succeed);
      const matching =
          Elements.PropertyParser.BottomUpTreeMatching.walk(ast, [new Elements.PropertyParser.ColorMatcher()]);
      const colorNode = TreeSearch.find(ast, node => ast.text(node) === 'red');
      assert.exists(colorNode);
      const match = matching.getMatch(colorNode);
      assert.exists(match);
      assert.instanceOf(match, Elements.PropertyParser.ColorMatch);
      assert.strictEqual(match.text, 'red');
    }
  });

  class ComputedTextMatch implements Elements.PropertyParser.Match {
    node: CodeMirror.SyntaxNode;
    constructor(readonly text: string, readonly constructedText: string) {
      this.node = {} as CodeMirror.SyntaxNode;
    }
    computedText?(): string {
      return this.constructedText;
    }
  }

  it('computes ComputedText', () => {
    const originalText = 'abcdefghijklmnopqrstuvwxyz';
    // computed text:    '        +++--     ------  '
    // Where + means a replacement, - means a deletion, i.e., computed texts are shorter than the corresponding
    // original snippet.

    const computedText = new Elements.PropertyParser.ComputedText(originalText);

    // 'abcdefghijklmnopqrstuvwxyz'
    //    |----|
    assert.strictEqual(computedText.get(2, 8), 'cdefgh');

    computedText.push(new ComputedTextMatch('ijklm', '012'), originalText.indexOf('i'));
    computedText.push(new ComputedTextMatch('stuvwx', ''), originalText.indexOf('s'));

    // Range starts in original text before the first chunk, ends in original text before the first chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //    |----|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('h')), 'cdefg');

    // Range ends in original text after the first chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //    |-----------|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('o')), 'cdefgh 012 n');

    // Range ends in original text ends on the beginning of a chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //    |-----|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('i')), 'cdefgh');

    // Range ends in original text ends on the end of a chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //    |----------|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('n')), 'cdefgh 012');

    // Range ends in original text after the second chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //    |----------------------|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('z')), 'cdefgh 012 nopqr y');

    // Range ends in original text after the second chunk containing no chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //                          ||
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('y'), originalText.indexOf('z') + 1), 'yz');

    // Range ends in original text on the end of the second chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //    |---------------------|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('y')), 'cdefgh 012 nopqr');

    // range starts in original text after the chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //                |-|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('o'), originalText.indexOf('q')), 'op');

    // range starts on the first chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //          |-------|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('i'), originalText.indexOf('q')), '012 nop');

    // range starts on the second chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //                    |------|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('s'), originalText.indexOf('z')), 'y');

    // range starts in the middle of a chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //           |-----|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('j'), originalText.indexOf('p')), 'jklmno');

    // range ends in the middle of a chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //       |-----|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('f'), originalText.indexOf('l')), 'fghijk');
  });

  it('computes ComputedText with overlapping ranges', () => {
    const originalText = 'abcdefghijklmnopqrstuvwxyz';
    const computedText = new Elements.PropertyParser.ComputedText(originalText);

    const push = (from: string, to: string) => {
      const text = originalText.substring(originalText.indexOf(from), originalText.indexOf(to) + 1);
      assert.isAbove(text.length, 1);
      // This means computed and authored test have identical length, but we're testing the computed text stitching
      // sufficiently above.
      computedText.push(new ComputedTextMatch(text, text.toUpperCase()), originalText.indexOf(text[0]));
    };

    // 'abcdefghijklmnopqrstuvwxyz'
    //    |-----------|
    //    |----|
    //   ++++++++++++++++          (requested ranges)
    //    +++++++++++++++
    //   ++++++++
    //   +++++++
    //    +++++++
    //    ++++++
    computedText.clear();
    push('c', 'o');
    push('c', 'h');
    assert.strictEqual(
        computedText.get(originalText.indexOf('b'), originalText.indexOf('q') + 1), 'b CDEFGHIJKLMNO pq');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('q') + 1), 'CDEFGHIJKLMNO pq');
    assert.strictEqual(computedText.get(originalText.indexOf('b'), originalText.indexOf('i') + 1), 'b CDEFGH i');
    assert.strictEqual(computedText.get(originalText.indexOf('b'), originalText.indexOf('h') + 1), 'b CDEFGH');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('i') + 1), 'CDEFGH i');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('h') + 1), 'CDEFGH');

    // 'abcdefghijklmnopqrstuvwxyz'
    //    |-----------|
    //         |----|
    //   ++++++++++++++++
    //         +++++++
    //        ++++++++
    //   ++++++++++++
    //    +++++++++++
    computedText.clear();
    push('c', 'o');
    push('h', 'm');
    assert.strictEqual(
        computedText.get(originalText.indexOf('b'), originalText.indexOf('q') + 1), 'b CDEFGHIJKLMNO pq');
    assert.strictEqual(computedText.get(originalText.indexOf('h'), originalText.indexOf('n') + 1), 'HIJKLM n');
    assert.strictEqual(computedText.get(originalText.indexOf('g'), originalText.indexOf('n') + 1), 'g HIJKLM n');
    assert.strictEqual(computedText.get(originalText.indexOf('b'), originalText.indexOf('m') + 1), 'bcdefg HIJKLM');
    assert.strictEqual(computedText.get(originalText.indexOf('d'), originalText.indexOf('m') + 1), 'defg HIJKLM');

    // 'abcdefghijklmnopqrstuvwxyz'
    //    |-----------|
    //           |----|
    //   ++++++++++++++++
    //           ++++++
    //          +++++++
    computedText.clear();
    // Swap the insertion order around to test sorting behavior.
    push('j', 'o');
    push('c', 'o');
    assert.strictEqual(
        computedText.get(originalText.indexOf('b'), originalText.indexOf('q') + 1), 'b CDEFGHIJKLMNO pq');
    assert.strictEqual(computedText.get(originalText.indexOf('j'), originalText.indexOf('o') + 1), 'JKLMNO');
    assert.strictEqual(computedText.get(originalText.indexOf('i'), originalText.indexOf('o') + 1), 'i JKLMNO');

    // 'abcdefghijklmnopqrstuvwxyz'
    //    |-----------|
    //    |----| |--|
    //   ++++++++++++++++
    //    +++++++++++
    //    ++++++++++++
    //    +++++++
    //    ++++++
    //          +++++
    //          ++++++
    computedText.clear();
    push('c', 'o');
    push('c', 'h');
    push('j', 'm');
    assert.strictEqual(
        computedText.get(originalText.indexOf('b'), originalText.indexOf('q') + 1), 'b CDEFGHIJKLMNO pq');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('n') + 1), 'CDEFGH i JKLM n');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('m') + 1), 'CDEFGH i JKLM');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('i') + 1), 'CDEFGH i');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('h') + 1), 'CDEFGH');
    assert.strictEqual(computedText.get(originalText.indexOf('i'), originalText.indexOf('m') + 1), 'i JKLM');
    assert.strictEqual(computedText.get(originalText.indexOf('i'), originalText.indexOf('n') + 1), 'i JKLM n');

    // 'abcdefghijklmnopqrstuvwxyz';
    //    |-----------|
    //     |----| |--|
    //   ++++++++++++++++
    //    ++++++++++++
    //    +++++++++++++
    //     +++++++++++
    //     ++++++++++++
    // 'abcdefghijklmnopqrstuvwxyz';
    //    +++++++
    //    ++++++++
    //     ++++++
    //     +++++++
    // 'abcdefghijklmnopqrstuvwxyz';
    //           +++++
    //            ++++
    //           ++++++
    //            +++++
    // 'abcdefghijklmnopqrstuvwxyz';
    computedText.clear();
    // Swap the insertion order around to test sorting behavior.
    push('k', 'n');
    push('c', 'o');
    push('d', 'i');
    assert.strictEqual(
        computedText.get(originalText.indexOf('b'), originalText.indexOf('q') + 1), 'b CDEFGHIJKLMNO pq');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('n') + 1), 'c DEFGHI j KLMN');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('o') + 1), 'CDEFGHIJKLMNO');
    assert.strictEqual(computedText.get(originalText.indexOf('d'), originalText.indexOf('n') + 1), 'DEFGHI j KLMN');
    assert.strictEqual(computedText.get(originalText.indexOf('d'), originalText.indexOf('o') + 1), 'DEFGHI j KLMN o');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('i') + 1), 'c DEFGHI');
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('j') + 1), 'c DEFGHI j');
    assert.strictEqual(computedText.get(originalText.indexOf('d'), originalText.indexOf('i') + 1), 'DEFGHI');
    assert.strictEqual(computedText.get(originalText.indexOf('d'), originalText.indexOf('j') + 1), 'DEFGHI j');
    assert.strictEqual(computedText.get(originalText.indexOf('j'), originalText.indexOf('n') + 1), 'j KLMN');
    assert.strictEqual(computedText.get(originalText.indexOf('k'), originalText.indexOf('n') + 1), 'KLMN');
    assert.strictEqual(computedText.get(originalText.indexOf('j'), originalText.indexOf('o') + 1), 'j KLMN o');
    assert.strictEqual(computedText.get(originalText.indexOf('k'), originalText.indexOf('o') + 1), 'KLMN o');
  });

  it('computes ComputedText with back-to-back chunks', () => {
    const computedText = new Elements.PropertyParser.ComputedText('abcdefgh');
    computedText.push(new ComputedTextMatch('abcd', '01234'), 0);
    computedText.push(new ComputedTextMatch('efgh', '56789'), 4);
    assert.strictEqual(computedText.get(0, 8), '01234 56789');
  });

  it('correctly produces the computed text during matching', () => {
    const ast = tokenizeDeclaration('--property', '1px /* red */ solid');
    const width = ast.tree.getChild('NumberLiteral');
    assert.exists(width);
    const style = ast.tree.getChild('ValueName');
    assert.exists(style);
    const matching = Elements.PropertyParser.BottomUpTreeMatching.walk(ast, []);
    assert.strictEqual(matching.getComputedText(ast.tree), '--property: 1px  solid');
    assert.strictEqual(matching.getComputedText(width), '1px');
    assert.strictEqual(matching.getComputedText(style), 'solid');
  });

  it('retains tokenization in the computed text', () => {
    const ast = tokenizeDeclaration('--property', 'dark/**/gray');
    const matching = Elements.PropertyParser.BottomUpTreeMatching.walk(ast, []);
    assert.strictEqual(matching.getComputedText(ast.tree), '--property: dark gray');
  });

  it('parses color-mix with vars', () => {
    injectVariableSubstitutions({
      '--interpolation': 'shorter',
      '--color1': 'red',
      '--percentage': '13%',
      '--rgb': 'shorter',
      '--space': 'in srgb',
      '--color2': '25% blue',
      '--multiple-colors': 'red, blue',
    });
    {
      const {ast, match, text} = matchSingleValue(
          'color', 'color-mix(in srgb var(--interpolation) hue, red var(--percentage), rgb(var(--rgb)))',
          new Elements.PropertyParser.ColorMixMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepStrictEqual(match.space.map(n => ast.text(n)), ['in', 'srgb', 'var(--interpolation)', 'hue']);
      assert.strictEqual(match.color1.map(n => ast.text(n)).join(), 'red,var(--percentage)');
      assert.strictEqual(match.color2.map(n => ast.text(n)).join(), 'rgb(var(--rgb))');
    }
    {
      const {ast, match, text} = matchSingleValue(
          'color', 'color-mix(var(--space), var(--color1), var(--color2))',
          new Elements.PropertyParser.ColorMixMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.strictEqual(match.space.map(n => ast.text(n)).join(), 'var(--space)');
      assert.strictEqual(match.color1.map(n => ast.text(n)).join(), 'var(--color1)');
      assert.strictEqual(match.color2.map(n => ast.text(n)).join(), 'var(--color2)');
    }

    for (const fail
             of ['color-mix(var(--color1), var(--color1), var(--color2))',
                 'color-mix(var(--space), var(--color1) var(--percentage) var(--percentage), var(--color2))',
                 'color-mix(var(--space), var(--color1) 10% var(--percentage), var(--color2))',
                 'color-mix(var(--space), var(--color1), var(--color2) 15%)',
                 'color-mix(var(--space), var(--color1), var(--color2) var(--percentage))',
                 'color-mix(var(--space), var(--multiple-colors))',
    ]) {
      const {ast, match, text} = matchSingleValue('color', fail, new Elements.PropertyParser.ColorMixMatcher());
      assert.exists(ast, text);
      assert.isNull(match, text);
    }
  });

  it('parses color-mix', () => {
    function check(space: string, color1: string, color2: string): void {
      const {ast, match, text} = matchSingleValue(
          'color', `color-mix(${space}, ${color1}, ${color2})`, new Elements.PropertyParser.ColorMixMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);

      assert.deepStrictEqual(match.space.map(n => ast.text(n)).join(' '), space, text);
      assert.strictEqual(match.color1.map(n => ast.text(n)).join(' '), color1, text);
      assert.strictEqual(match.color2.map(n => ast.text(n)).join(' '), color2, text);
    }

    function checkFailure(space: string, color1: string, color2: string): void {
      const {match, text} = matchSingleValue(
          'color', `color-mix(${space}, ${color1}, ${color2})`, new Elements.PropertyParser.ColorMixMatcher());
      assert.isNull(match, text);
    }

    check('in srgb shorter hue', 'red 35%', 'blue');
    check('in /*asd*/ srgb shorter hue', 'red 35%', 'blue');
    check('in srgb', 'red 35%', 'blue');
    check('in srgb', '35% red', 'blue 16%');
    check('in srgb', '/*a*/ 35% /*b*/ red /*c*/', '/*a*/ blue /*b*/ 16% /*c*/');
    checkFailure('insrgb shorter hue', 'red 35%', 'blue');
    checkFailure('/*asd*/srgb in', 'red 35%', 'blue');
    checkFailure('in srgb', '0% red', 'blue 0%');
  });

  it('parses vars correctly', () => {
    for (const succeed
             of ['var(--a)', 'var(--a, 123)', 'var(--a, calc(1+1))', 'var(--a, var(--b))', 'var(--a, var(--b, 123))',
                 'var(--a, a b c)']) {
      const {ast, match, text} =
          matchSingleValue('width', succeed, new Elements.PropertyParser.VariableMatcher(() => ''));

      assert.exists(ast, succeed);
      assert.exists(match, text);
      assert.strictEqual(match.text, succeed);
      assert.strictEqual(match.name, '--a');
      const [name, ...fallback] = succeed.substring(4, succeed.length - 1).split(', ');
      assert.strictEqual(match.name, name);
      assert.strictEqual(match.fallback.map(n => ast.text(n)).join(' '), fallback.join(', '));
    }
    for (const fail of ['var', 'var(--a, 123, 123)', 'var(a)', 'var(--a']) {
      const {match, text} = matchSingleValue('width', fail, new Elements.PropertyParser.VariableMatcher(() => ''));

      assert.isNull(match, text);
    }
  });

  it('parses URLs', () => {
    const url = 'http://example.com';
    {
      const {match, text} =
          matchSingleValue('background-image', `url(${url})`, new Elements.PropertyParser.URLMatcher());
      assert.exists(match);
      assert.strictEqual(match.url, url, text);
    }
    {
      const {match, text} =
          matchSingleValue('background-image', `url("${url}")`, new Elements.PropertyParser.URLMatcher());
      assert.exists(match);
      assert.strictEqual(match.url, url, text);
    }
  });

  it('parses angles correctly', () => {
    for (const succeed of ['45deg', '1.3rad', '-25grad', '2.3turn']) {
      const {ast, match, text} = matchSingleValue('transform', succeed, new Elements.PropertyParser.AngleMatcher());
      assert.exists(ast, succeed);
      assert.exists(match, text);
      assert.strictEqual(match.text, succeed);
    }
    for (const fail of ['0DEG', '0', '123', '2em']) {
      const {match, text} = matchSingleValue('transform', fail, new Elements.PropertyParser.AngleMatcher());
      assert.isNull(match, text);
    }
  });

  it('parses linkable names correctly', () => {
    function match(name: string, value: string) {
      const ast = Elements.PropertyParser.tokenizeDeclaration(name, value);
      assert.exists(ast);
      const matchedResult = Elements.PropertyParser.BottomUpTreeMatching.walk(ast, [
        new Elements.PropertyParser.LinkableNameMatcher(),
      ]);

      const matches = TreeSearch.findAll(
          ast, node => matchedResult.getMatch(node) instanceof Elements.PropertyParser.LinkableNameMatch);
      return matches.map(m => matchedResult.getMatch(m)?.text);
    }

    assert.deepStrictEqual(match('animation-name', 'first, second, -moz-third'), ['first', 'second', '-moz-third']);
    assert.deepStrictEqual(match('animation-name', 'first'), ['first']);
    assert.deepStrictEqual(match('font-palette', 'first'), ['first']);
    assert.deepStrictEqual(match('position-fallback', 'first'), ['first']);
    {
      assert.deepStrictEqual(match('position-try-options', 'flip-block'), []);
      assert.deepStrictEqual(match('position-try-options', '--one'), ['--one']);
      assert.deepStrictEqual(match('position-try-options', '--one, --two'), ['--one', '--two']);
    }
    {
      assert.deepStrictEqual(match('position-try', 'flip-block'), []);
      assert.deepStrictEqual(match('position-try', '--one'), ['--one']);
      assert.deepStrictEqual(match('position-try', '--one, --two'), ['--one', '--two']);
    }
    {
      injectVariableSubstitutions({
        '--duration-and-easing': '1s linear',
      });
      assert.deepStrictEqual(match('animation', '1s linear --animation-name'), ['--animation-name']);
      assert.deepStrictEqual(match('animation', '1s linear linear'), ['linear']);
      assert.deepStrictEqual(
          match('animation', '1s linear --first-name, 1s ease-in --second-name'), ['--first-name', '--second-name']);
      assert.deepStrictEqual(match('animation', '1s linear'), []);
      // Matching to variable names inside `var()` functions are fine as it is handled by variable renderer in usage.
      assert.deepStrictEqual(
          match('animation', 'var(--duration-and-easing) linear'), ['--duration-and-easing', 'linear']);
      assert.deepStrictEqual(
          match('animation', '1s linear var(--non-existent, --animation-name)'),
          ['--non-existent', '--animation-name']);
    }
  });

  it('parses easing functions properly', () => {
    for (const succeed
             of ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear(0 0%, 1 100%)',
                 'cubic-bezier(0.3, 0.3, 0.3, 0.3)']) {
      const {ast, match, text} =
          matchSingleValue('animation-timing-function', succeed, new Elements.PropertyParser.BezierMatcher());
      assert.exists(ast, succeed);
      assert.exists(match, text);
      assert.strictEqual(match.text, succeed);
    }

    const {ast, match, text} = matchSingleValue('border', 'ease-in', new Elements.PropertyParser.BezierMatcher());
    assert.exists(ast, 'border');
    assert.isNull(match, text);
  });

  it('parses strings correctly', () => {
    function match(name: string, value: string) {
      const ast = Elements.PropertyParser.tokenizeDeclaration(name, value);
      assert.exists(ast);
      const matchedResult =
          Elements.PropertyParser.BottomUpTreeMatching.walk(ast, [new Elements.PropertyParser.StringMatcher()]);
      assert.exists(matchedResult);

      const match =
          TreeSearch.find(ast, node => matchedResult.getMatch(node) instanceof Elements.PropertyParser.StringMatch);
      assert.exists(match);
    }
    match('quotes', '"\'" "\'"');
    match('content', '"foobar"');
    match('--image-file-accelerometer-back', 'url("devtools\:\/\/devtools\/bundled\/Images\/accelerometer-back\.svg")');
  });

  it('parses shadows correctly', () => {
    const {match, text} = matchSingleValue(
        'box-shadow', '/*0*/3px 3px red, -1em 0 .4em /*a*/ olive /*b*/', new Elements.PropertyParser.ShadowMatcher());
    assert.exists(match, text);
    assert.strictEqual(match.text, '/*0*/3px 3px red, -1em 0 .4em /*a*/ olive');
  });

  it('parses fonts correctly', () => {
    for (const fontSize of ['-.23', 'smaller', '17px', 'calc(17px + 17px)']) {
      const {ast, match, text} = matchSingleValue('font-size', fontSize, new Elements.PropertyParser.FontMatcher());

      assert.exists(ast, text);
      assert.exists(match, text);
      assert.strictEqual(match.text, fontSize);
    }

    {
      const ast = Elements.PropertyParser.tokenizeDeclaration('font-family', '"Gill Sans", sans-serif');
      assert.exists(ast);
      const matchedResult =
          Elements.PropertyParser.BottomUpTreeMatching.walk(ast, [new Elements.PropertyParser.FontMatcher()]);
      assert.exists(matchedResult);

      const matches =
          TreeSearch.findAll(ast, node => matchedResult.getMatch(node) instanceof Elements.PropertyParser.FontMatch);
      assert.deepStrictEqual(matches.map(m => matchedResult.getMatch(m)?.text), ['"Gill Sans"', 'sans-serif']);
    }
  });

  it('parses grid templates correctly', () => {
    injectVariableSubstitutions({
      '--row': '"a a b"',
      '--row-with-names': '[name1] "a a" [name2]',
      '--line-name': '[name1]',
      '--double-row': '"a b" "b c"',
    });

    {
      const {ast, match, text} = matchSingleValue('grid', '"a a"', new Elements.PropertyParser.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.strictEqual(match.lines.map(line => line.map(n => ast.text(n)).join(' ')).join('\n'), '"a a"');
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid-template-areas', '"a a a" "b b b" "c c c"', new Elements.PropertyParser.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepStrictEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')), ['"a a a"', '"b b b"', '"c c c"']);
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid-template', '"a a a" var(--row) / auto 1fr auto', new Elements.PropertyParser.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepStrictEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')), ['"a a a"', 'var(--row) / auto 1fr auto']);
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid', '[header-top] "a a" var(--row-with-names) [main-top] "b b b" 1fr [main-bottom] / auto 1fr auto;',

          new Elements.PropertyParser.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepStrictEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')),
          ['[header-top] "a a" var(--row-with-names)', '[main-top] "b b b" 1fr [main-bottom] / auto 1fr auto']);
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid', '[header-top] "a a" "b b b" var(--line-name) "c c" / auto 1fr auto;',

          new Elements.PropertyParser.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepStrictEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')),
          ['[header-top] "a a"', '"b b b" var(--line-name)', '"c c" / auto 1fr auto']);
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid', '[line1] "a a" [line2] var(--double-row) "b b" / auto 1fr auto;',

          new Elements.PropertyParser.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepStrictEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')),
          ['[line1] "a a" [line2]', 'var(--double-row)', '"b b" / auto 1fr auto']);
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid', '"a a" var(--unresolved) / auto 1fr auto;', new Elements.PropertyParser.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepStrictEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')), ['"a a" var(--unresolved) / auto 1fr auto']);
    }
  });

  it('parses light-dark correctly', () => {
    for (const fail of ['light-dark()', 'light-dark(red)', 'light-dark(var(--foo))']) {
      const {match, text} = matchSingleValue('color', fail, new Elements.PropertyParser.LightDarkColorMatcher());
      assert.isNull(match, text);
    }

    for (const succeed
             of ['light-dark(red, blue)', 'light-dark(var(--foo), red)', 'light-dark(red, var(--foo))',
                 'light-dark(var(--foo), var(--bar))']) {
      const {ast, match, text} =
          matchSingleValue('color', succeed, new Elements.PropertyParser.LightDarkColorMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);

      const [light, dark] = succeed.slice('light-dark('.length, -1).split(', ');
      assert.lengthOf(match.light, 1);
      assert.lengthOf(match.dark, 1);
      assert.strictEqual(ast.text(match.light[0]), light);
      assert.strictEqual(ast.text(match.dark[0]), dark);
    }

    // light-dark only applies to color properties
    const {match, text} =
        matchSingleValue('width', 'light-dark(red, blue)', new Elements.PropertyParser.LightDarkColorMatcher());
    assert.isNull(match, text);
  });
});
