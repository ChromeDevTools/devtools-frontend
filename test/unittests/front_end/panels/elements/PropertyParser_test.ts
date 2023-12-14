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
}

function textFragments(nodes: Node[]): Array<string|null> {
  return nodes.map(n => n.textContent);
}

function tokenizePropertyValue(value: string): Elements.PropertyParser.SyntaxTree {
  const ast = Elements.PropertyParser.tokenizePropertyValue(value);
  Platform.assertNotNullOrUndefined(ast);
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
    const context = {ast, matchedResult};
    assert.deepStrictEqual(
        textFragments(Elements.PropertyParser.Renderer.render(tree, context)).join(''), rule, Printer.walk(ast).get());
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
    const context = {ast, matchedResult};
    assert.deepStrictEqual(
        textFragments(Elements.PropertyParser.Renderer.render(tree, context)).join(''), `--property: ${property}`,
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
});
