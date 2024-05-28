// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {Printer} from '../../testing/PropertyParser.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

import * as SDK from './sdk.js';

describe('CSSPropertyParser', () => {
  describe('stripComments', () => {
    const stripComments = SDK.CSSPropertyParser.stripComments;

    it('should strip a single comment', () => {
      assert.strictEqual(stripComments('text /* comment */ text'), 'text  text');
    });

    it('should strip a multiline comment', () => {
      assert.strictEqual(
          stripComments(`text /* comment
      some other comment */ text`),
          'text  text');
    });

    it('should strip a comment with a comment start string', () => {
      assert.strictEqual(stripComments('text /* comment /* comment */ text'), 'text  text');
    });

    it('should strip multiple commnets', () => {
      assert.strictEqual(stripComments('text /* comment */ text /* comment */ text'), 'text  text  text');
    });
  });

  describe('parseFontVariationSettings', () => {
    const parseFontVariationSettings = SDK.CSSPropertyParser.parseFontVariationSettings;

    it('should parse settings with a single value', () => {
      assert.deepEqual(parseFontVariationSettings('"wght" 10'), [{tag: 'wght', value: 10}]);
    });

    it('should parse settings with multiple values', () => {
      assert.deepEqual(
          parseFontVariationSettings('"wght" 10, "wdth" 20'), [{tag: 'wght', value: 10}, {tag: 'wdth', value: 20}]);
    });

    it('should parse settings with a single float value', () => {
      assert.deepEqual(parseFontVariationSettings('"wght" 5.5'), [{tag: 'wght', value: 5.5}]);
    });
  });

  describe('parseFontFamily', () => {
    const parseFontFamily = SDK.CSSPropertyParser.parseFontFamily;

    it('should parse a single unquoted name', () => {
      assert.deepEqual(parseFontFamily('Arial'), ['Arial']);
    });

    it('should parse a double quoted name with spaces', () => {
      assert.deepEqual(parseFontFamily('"Some font"'), ['Some font']);
    });

    it('should parse a single quoted name with spaces', () => {
      assert.deepEqual(parseFontFamily('\'Some font\''), ['Some font']);
    });

    it('should parse multiple names', () => {
      assert.deepEqual(parseFontFamily('  Arial  , "Some font" , serif'), ['Arial', 'Some font', 'serif']);
    });
  });

  class TreeSearch extends SDK.CSSPropertyParser.TreeWalker {
    #found: CodeMirror.SyntaxNode|null = null;
    #predicate: (node: CodeMirror.SyntaxNode) => boolean;

    constructor(ast: SDK.CSSPropertyParser.SyntaxTree, predicate: (node: CodeMirror.SyntaxNode) => boolean) {
      super(ast);
      this.#predicate = predicate;
    }

    protected override enter({node}: SDK.CSSPropertyParser.SyntaxNodeRef): boolean {
      if (this.#found) {
        return false;
      }

      if (this.#predicate(node)) {
        this.#found = this.#found ?? node;
        return false;
      }
      return true;
    }

    static find(ast: SDK.CSSPropertyParser.SyntaxTree, predicate: (node: CodeMirror.SyntaxNode) => boolean):
        CodeMirror.SyntaxNode|null {
      return TreeSearch.walk(ast, predicate).#found;
    }

    static findAll(ast: SDK.CSSPropertyParser.SyntaxTree, predicate: (node: CodeMirror.SyntaxNode) => boolean):
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

  function matchSingleValue<T extends SDK.CSSPropertyParser.Match>(
      name: string, value: string, matcher: SDK.CSSPropertyParser.Matcher<T>):
      {ast: SDK.CSSPropertyParser.SyntaxTree|null, match: T|null, text: string} {
    const ast = SDK.CSSPropertyParser.tokenizeDeclaration(name, value);
    if (!ast) {
      return {ast, match: null, text: value};
    }

    const matchedResult = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, [matcher]);
    const matchedNode = TreeSearch.find(ast, n => matchedResult.getMatch(n) instanceof matcher.matchType);
    const match = matchedNode && matchedResult.getMatch(matchedNode);

    return {
      ast,
      match: match instanceof matcher.matchType ? match : null,
      text: Printer.walk(ast).get(),
    };
  }

  function tokenizeDeclaration(name: string, value: string): SDK.CSSPropertyParser.SyntaxTree {
    const ast = SDK.CSSPropertyParser.tokenizeDeclaration(name, value);
    assert.exists(ast, Printer.rule(`*{${name}: ${value};}`));
    return ast;
  }

  describe('PropertyParser', () => {
    it('correctly identifies spacing', () => {
      const requiresSpace = (a: string, b: string) =>
          SDK.CSSPropertyParser.requiresSpace([document.createTextNode(a)], [document.createTextNode(b)]);

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

      assert.isTrue(SDK.CSSPropertyParser.requiresSpace(
          [document.createTextNode('text'), document.createElement('div')], [document.createTextNode('text')]));
      assert.isTrue(SDK.CSSPropertyParser.requiresSpace(
          [document.createTextNode('text')], [document.createElement('div'), document.createTextNode('text')]));
      assert.isTrue(SDK.CSSPropertyParser.requiresSpace(
          [document.createTextNode('text'), document.createElement('div')],
          [document.createElement('div'), document.createTextNode('text')]));
      assert.isFalse(SDK.CSSPropertyParser.requiresSpace(
          [document.createTextNode('text'), document.createElement('div')], [document.createTextNode(' text')]));
      assert.isFalse(SDK.CSSPropertyParser.requiresSpace(
          [document.createTextNode('text')], [document.createElement('div'), document.createTextNode(' text')]));
      assert.isFalse(SDK.CSSPropertyParser.requiresSpace(
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
      assert.isNull(SDK.CSSPropertyParser.tokenizeDeclaration('--p', ''));
      assert.isNull(SDK.CSSPropertyParser.tokenizeDeclaration('--p', '/*'));
      assert.isNull(SDK.CSSPropertyParser.tokenizeDeclaration('--p', '}'));
    });

    it('correctly parses property names', () => {
      assert.strictEqual(tokenizeDeclaration('color /*comment*/', 'red')?.propertyName, 'color');
      assert.strictEqual(tokenizeDeclaration('/*comment*/color/*comment*/', 'red')?.propertyName, 'color');
      assert.strictEqual(tokenizeDeclaration(' /*comment*/color', 'red')?.propertyName, 'color');
      assert.strictEqual(tokenizeDeclaration('co/*comment*/lor', 'red')?.propertyName, 'lor');
      assert.isNull(SDK.CSSPropertyParser.tokenizeDeclaration('co:lor', 'red'));
    });

    class ComputedTextMatch implements SDK.CSSPropertyParser.Match {
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

      const computedText = new SDK.CSSPropertyParser.ComputedText(originalText);

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
      const computedText = new SDK.CSSPropertyParser.ComputedText(originalText);

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
      assert.strictEqual(
          computedText.get(originalText.indexOf('c'), originalText.indexOf('q') + 1), 'CDEFGHIJKLMNO pq');
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
      const computedText = new SDK.CSSPropertyParser.ComputedText('abcdefgh');
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
      const matching = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, []);
      assert.strictEqual(matching.getComputedText(ast.tree), '--property: 1px  solid');
      assert.strictEqual(matching.getComputedText(width), '1px');
      assert.strictEqual(matching.getComputedText(style), 'solid');
    });

    it('retains tokenization in the computed text', () => {
      const ast = tokenizeDeclaration('--property', 'dark/**/gray');
      const matching = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, []);
      assert.strictEqual(matching.getComputedText(ast.tree), '--property: dark gray');
    });

    it('parses vars correctly', () => {
      for (const succeed
               of ['var(--a)', 'var(--a, 123)', 'var(--a, calc(1+1))', 'var(--a, var(--b))', 'var(--a, var(--b, 123))',
                   'var(--a, a b c)']) {
        const {ast, match, text} =
            matchSingleValue('width', succeed, new SDK.CSSPropertyParser.VariableMatcher(() => ''));

        assert.exists(ast, succeed);
        assert.exists(match, text);
        assert.strictEqual(match.text, succeed);
        assert.strictEqual(match.name, '--a');
        const [name, ...fallback] = succeed.substring(4, succeed.length - 1).split(', ');
        assert.strictEqual(match.name, name);
        assert.strictEqual(match.fallback.map(n => ast.text(n)).join(' '), fallback.join(', '));
      }
      for (const fail of ['var', 'var(--a, 123, 123)', 'var(a)', 'var(--a']) {
        const {match, text} = matchSingleValue('width', fail, new SDK.CSSPropertyParser.VariableMatcher(() => ''));

        assert.isNull(match, text);
      }
    });
  });
});
