// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Elements from '../../../../../front_end/panels/elements/elements.js';
import * as CodeMirror from '../../../../../front_end/third_party/codemirror.next/codemirror.next.js';

const cssParser = CodeMirror.css.cssLanguage.parser;

export class Printer extends Elements.PropertyParser.TreeWalker {
  #printedText: string[] = [];
  #indent = 0;

  protected override enter({node}: Elements.PropertyParser.SyntaxNodeRef): boolean {
    const text = this.ast.text(node);
    this.#printedText.push(`${'|'.repeat(this.#indent)} ${node.name}${text !== node.name ? `: ${text}` : ''}`);
    this.#indent++;
    return true;
  }
  protected override leave(): void {
    this.#indent--;
  }

  get(): string {
    return this.#printedText.join('\n');
  }

  static log(ast: Elements.PropertyParser.SyntaxTree): void {
    /* eslint-disable-next-line no-console */
    console.log(Printer.walk(ast).get());
  }

  static rule(rule: string): string {
    const ast = new Elements.PropertyParser.SyntaxTree('', rule, cssParser.parse(rule).topNode);
    return Printer.walk(ast).get();
  }
}

function textFragments(nodes: Node[]): Array<string|null> {
  return nodes.map(n => n.textContent);
}

function tokenizePropertyValue(value: string, name?: string): Elements.PropertyParser.SyntaxTree {
  const ast = Elements.PropertyParser.tokenizePropertyValue(value, name);
  Platform.assertNotNullOrUndefined(ast, Printer.rule(`*{${name}: ${value};}`));
  return ast;
}

describe('PropertyParser', () => {
  it('parses text', () => {
    assert.deepStrictEqual(
        textFragments(Elements.PropertyParser.renderPropertyValue('var(--v)', [])), ['var', '(', '--v', ')']);

    assert.deepStrictEqual(
        textFragments(Elements.PropertyParser.renderPropertyValue('/* comments are text */ 1px solid 4', [])),
        ['/* comments are text */', ' ', '1px', ' ', 'solid', ' ', '4']);
    assert.deepStrictEqual(
        textFragments(Elements.PropertyParser.renderPropertyValue(
            '2px var(--double, var(--fallback, black)) #32a1ce rgb(124 125 21 0)', [])),
        [
          '2px', ' ', 'var',     '(', '--double', ',', ' ',   'var', '(',   '--fallback', ',',  ' ', 'black', ')',
          ')',   ' ', '#32a1ce', ' ', 'rgb',      '(', '124', ' ',   '125', ' ',          '21', ' ', '0',     ')',
        ]);
  });

  it('reproduces the input if nothing matched', () => {
    const property = '2px var(--double, var(--fallback, black)) #32a1ce rgb(124 125 21 0)';
    const rule = `*{--property: ${property};}`;
    const tree = cssParser.parse(rule).topNode;
    const ast = new Elements.PropertyParser.SyntaxTree(property, rule, tree);
    const matchedResult = Elements.PropertyParser.BottomUpTreeMatching.walk(ast, []);
    const context = new Elements.PropertyParser.RenderingContext(ast, matchedResult);
    assert.deepStrictEqual(
        textFragments(Elements.PropertyParser.Renderer.render(tree, context).nodes).join(''), rule,
        Printer.walk(ast).get());
  });

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

  it('correctly renders subtrees', () => {
    const property = '2px var(--double, var(--fallback, black)) #32a1ce rgb(124 125 21 0)';
    const rule = `*{--property: ${property};}`;
    const tree = cssParser.parse(rule).topNode.firstChild?.firstChild?.nextSibling?.firstChild?.nextSibling;
    Platform.assertNotNullOrUndefined(tree);
    const ast = new Elements.PropertyParser.SyntaxTree(property, rule, tree);
    const matchedResult = Elements.PropertyParser.BottomUpTreeMatching.walk(ast, []);
    const context = new Elements.PropertyParser.RenderingContext(ast, matchedResult);
    assert.deepStrictEqual(
        textFragments(Elements.PropertyParser.Renderer.render(tree, context).nodes).join(''), `--property: ${property}`,
        Printer.walk(ast).get());
  });

  it('parses comments', () => {
    const property = '/* color: red */blue/* color: red */';
    const ast = tokenizePropertyValue(property);
    const topNode = ast.tree.parent?.parent?.parent?.parent;
    Platform.assertNotNullOrUndefined(topNode);
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

  it('renders trailing comments', () => {
    const property = '/* color: red */ blue /* color: red */';
    assert.strictEqual(textFragments(Elements.PropertyParser.renderPropertyValue(property, [])).join(''), property);
  });

  it('renders malformed comments', () => {
    const property = 'red /* foo: bar';
    assert.strictEqual(textFragments(Elements.PropertyParser.renderPropertyValue(property, [])).join(''), property);
  });

  it('correctly tokenizes invalid text', () => {
    assert.isNull(Elements.PropertyParser.tokenizePropertyValue(''));
    assert.isNull(Elements.PropertyParser.tokenizePropertyValue('/*'));
    assert.isNull(Elements.PropertyParser.tokenizePropertyValue('}'));
  });

  it('correctly parses property names', () => {
    assert.strictEqual(tokenizePropertyValue('red', 'color /*comment*/')?.propertyName, 'color');
    assert.strictEqual(tokenizePropertyValue('red', '/*comment*/color/*comment*/')?.propertyName, 'color');
    assert.strictEqual(tokenizePropertyValue('red', ' /*comment*/color')?.propertyName, 'color');
    assert.strictEqual(tokenizePropertyValue('red', 'co/*comment*/lor')?.propertyName, 'lor');
    assert.strictEqual(tokenizePropertyValue('red', 'co:lor')?.propertyName, undefined);
  });

  class ComputedTextMatch implements Elements.PropertyParser.Match {
    type: string = 'computed-text-test';
    constructor(readonly text: string, readonly constructedText: string) {
    }
    render(): Node[] {
      return [];
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
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('o')), 'cdefgh012n');

    // Range ends in original text ends on the beginning of a chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //    |-----|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('i')), 'cdefgh');

    // Range ends in original text ends on the end of a chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //    |----------|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('n')), 'cdefgh012');

    // Range ends in original text after the second chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //    |----------------------|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('z')), 'cdefgh012nopqry');

    // Range ends in original text after the second chunk containing no chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //                          ||
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('y'), originalText.indexOf('z') + 1), 'yz');

    // Range ends in original text on the end of the second chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //    |---------------------|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('c'), originalText.indexOf('y')), 'cdefgh012nopqr');

    // range starts in original text after the chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //                |-|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('o'), originalText.indexOf('q')), 'op');

    // range starts on the first chunk
    // 'abcdefghijklmnopqrstuvwxyz'
    //          |-------|
    // 'abcdefgh012  nopqr      yz'
    assert.strictEqual(computedText.get(originalText.indexOf('i'), originalText.indexOf('q')), '012nop');

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
    assert.strictEqual(computedText.get(originalText.indexOf('f'), originalText.indexOf('l')), 'fgh');
  });

  it('computes ComputedText with back-to-back chunks', () => {
    const computedText = new Elements.PropertyParser.ComputedText('abcdefgh');
    computedText.push(new ComputedTextMatch('abcd', '01234'), 0);
    computedText.push(new ComputedTextMatch('efgh', '56789'), 4);
    assert.strictEqual(computedText.get(0, 8), '0123456789');
  });

  it('correctly substitutes more general matches', () => {
    const computedText = new Elements.PropertyParser.ComputedText('abcdefgh');
    computedText.push(new ComputedTextMatch('cd', '01'), 2);
    computedText.push(new ComputedTextMatch('fg', '56'), 5);
    computedText.push(new ComputedTextMatch('bcdefgh', 'xx'), 1);
    assert.strictEqual(computedText.chunkCount, 1);
    assert.strictEqual(computedText.get(0, 8), 'axx');
  });

  it('correctly produces the computed text during matching', () => {
    const ast = tokenizePropertyValue('1px /* red */ solid');
    const width = ast.tree.parent?.getChild('NumberLiteral');
    Platform.assertNotNullOrUndefined(width);
    const style = ast.tree.parent?.getChild('ValueName');
    Platform.assertNotNullOrUndefined(style);
    const matching = Elements.PropertyParser.BottomUpTreeMatching.walk(ast, []);
    assert.strictEqual(matching.computedText.get(0, ast.propertyValue.length), '1px  solid');
    assert.strictEqual(matching.getComputedText(width), '1px');
    assert.strictEqual(matching.getComputedText(style), 'solid');
  });
});
