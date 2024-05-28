// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {Printer} from '../../testing/PropertyParser.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

import * as Elements from './elements.js';

describeWithEnvironment('PropertyRenderer', () => {
  describe('Renderer', () => {
    function textFragments(nodes: Node[]): Array<string|null> {
      return nodes.map(n => n.textContent);
    }

    it('parses text', () => {
      // Prevent normaliztaion to get an accurate representation of the parser result.
      sinon.stub(Element.prototype, 'normalize');
      assert.deepStrictEqual(
          textFragments(
              Array.from(Elements.PropertyRenderer.Renderer.renderValueElement('--p', 'var(--v)', []).childNodes)),
          ['var', '(', '--v', ')']);

      assert.deepStrictEqual(
          textFragments(Array.from(
              Elements.PropertyRenderer.Renderer.renderValueElement('--p', '/* comments are text */ 1px solid 4', [])
                  .childNodes)),
          ['/* comments are text */', ' ', '1px', ' ', 'solid', ' ', '4']);
      assert.deepStrictEqual(
          textFragments(Array.from(
              Elements.PropertyRenderer.Renderer
                  .renderValueElement('--p', '2px var(--double, var(--fallback, black)) #32a1ce rgb(124 125 21 0)', [])
                  .childNodes)),
          [
            '2px', ' ', 'var',     '(', '--double', ',', ' ',   'var', '(',   '--fallback', ',',  ' ', 'black', ')',
            ')',   ' ', '#32a1ce', ' ', 'rgb',      '(', '124', ' ',   '125', ' ',          '21', ' ', '0',     ')',
          ]);
    });

    const cssParser = CodeMirror.css.cssLanguage.parser;
    it('reproduces the input if nothing matched', () => {
      const property = '2px var(--double, var(--fallback, black)) #32a1ce rgb(124 125 21 0)';
      const rule = `*{--property: ${property};}`;
      const tree = cssParser.parse(rule).topNode;
      const ast = new SDK.CSSPropertyParser.SyntaxTree(property, rule, tree);
      const matchedResult = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, []);
      const context = new Elements.PropertyRenderer.RenderingContext(ast, new Map(), matchedResult);
      assert.deepStrictEqual(
          textFragments(Elements.PropertyRenderer.Renderer.render(tree, context).nodes).join(''), rule,
          Printer.walk(ast).get());
    });

    it('correctly renders subtrees', () => {
      const property = '2px var(--double, var(--fallback, black)) #32a1ce rgb(124 125 21 0)';
      const rule = `*{--property: ${property};}`;
      const tree = cssParser.parse(rule).topNode.firstChild?.firstChild?.nextSibling?.firstChild?.nextSibling;
      assert.exists(tree);
      const ast = new SDK.CSSPropertyParser.SyntaxTree(property, rule, tree);
      const matchedResult = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, []);
      const context = new Elements.PropertyRenderer.RenderingContext(ast, new Map(), matchedResult);
      assert.deepStrictEqual(
          textFragments(Elements.PropertyRenderer.Renderer.render(tree, context).nodes).join(''), property,
          Printer.walk(ast).get());
    });

    it('renders trailing comments', () => {
      const property = '/* color: red */ blue /* color: red */';
      assert.strictEqual(
          textFragments(
              Array.from(Elements.PropertyRenderer.Renderer.renderValueElement('--p', property, []).childNodes))
              .join(''),
          property);
    });

    it('renders malformed comments', () => {
      const property = 'red /* foo: bar';
      assert.strictEqual(
          textFragments(
              Array.from(Elements.PropertyRenderer.Renderer.renderValueElement('--p', property, []).childNodes))
              .join(''),
          property);
    });
  });
});
