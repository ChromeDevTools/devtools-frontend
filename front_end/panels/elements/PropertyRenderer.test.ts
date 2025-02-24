// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {Printer} from '../../testing/PropertyParser.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

import * as Elements from './elements.js';

describeWithEnvironment('PropertyRenderer', () => {
  function renderValueElement(name: string, value: string) {
    return Elements.PropertyRenderer.Renderer.renderValueElement(
        name, value, SDK.CSSPropertyParser.matchDeclaration(name, value, []), []);
  }

  describe('Renderer', () => {
    function textFragments(nodes: Node[]): Array<string|null> {
      return nodes.map(n => n.textContent);
    }

    it('parses text', () => {
      // Prevent normaliztaion to get an accurate representation of the parser result.
      sinon.stub(Element.prototype, 'normalize');
      assert.deepEqual(
          textFragments(Array.from(renderValueElement('--p', 'var(--v)').childNodes)), ['var', '(', '--v', ')']);

      assert.deepEqual(
          textFragments(Array.from(renderValueElement('--p', '/* comments are text */ 1px solid 4').childNodes)),
          ['/* comments are text */', ' ', '1px', ' ', 'solid', ' ', '4']);
      assert.deepEqual(
          textFragments(Array.from(
              renderValueElement('--p', '2px var(--double, var(--fallback, black)) #32a1ce rgb(124 125 21 0)')
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
      assert.deepEqual(
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
      assert.deepEqual(
          textFragments(Elements.PropertyRenderer.Renderer.render(tree, context).nodes).join(''), property,
          Printer.walk(ast).get());
    });

    it('renders trailing comments', () => {
      const property = '/* color: red */ blue /* color: red */';
      assert.strictEqual(textFragments(Array.from(renderValueElement('--p', property).childNodes)).join(''), property);
    });

    it('renders malformed comments', () => {
      const property = 'red /* foo: bar';
      assert.strictEqual(textFragments(Array.from(renderValueElement('--p', property).childNodes)).join(''), property);
    });
  });
});

describe('TracingContext', () => {
  it('assumes no substitutions by default', () => {
    const matchedResult = sinon.createStubInstance(SDK.CSSPropertyParser.BottomUpTreeMatching);
    matchedResult.hasMatches.returns(false);
    const context = new Elements.PropertyRenderer.TracingContext(matchedResult);
    assert.isFalse(context.nextSubstitution());

    matchedResult.hasMatches.returns(true);
    const context2 = new Elements.PropertyRenderer.TracingContext(matchedResult);
    assert.isTrue(context2.nextSubstitution());

    const context3 = new Elements.PropertyRenderer.TracingContext();
    assert.isFalse(context3.nextSubstitution());
  });

  it('controls substitution by creating "nested" tracing contexts', () => {
    const matchedResult = sinon.createStubInstance(SDK.CSSPropertyParser.BottomUpTreeMatching);
    matchedResult.hasMatches.returns(true);
    const context = new Elements.PropertyRenderer.TracingContext(matchedResult);

    assert.isTrue(context.nextSubstitution());
    assert.exists(context.substitution());
    assert.notExists(context.substitution()?.substitution());
    assert.notExists(context.substitution()?.substitution()?.substitution());

    assert.isTrue(context.nextSubstitution());
    assert.exists(context.substitution());
    assert.exists(context.substitution()?.substitution());
    assert.notExists(context.substitution()?.substitution()?.substitution());

    assert.isTrue(context.nextSubstitution());
    assert.exists(context.substitution());
    assert.exists(context.substitution()?.substitution());
    assert.exists(context.substitution()?.substitution()?.substitution());

    assert.isFalse(context.nextSubstitution());
    assert.exists(context.substitution());
    assert.exists(context.substitution()?.substitution());
    assert.exists(context.substitution()?.substitution()?.substitution());
  });

  it('does not allow tracing evaluations until substitutions are exhausted', () => {
    const matchedResult = sinon.createStubInstance(SDK.CSSPropertyParser.BottomUpTreeMatching);
    matchedResult.hasMatches.returns(true);
    const context = new Elements.PropertyRenderer.TracingContext(matchedResult);

    assert.throw(() => context.nextEvaluation());
    context.nextSubstitution();
    assert.doesNotThrow(() => context.nextEvaluation());
  });

  it('controls evaluations creating nested context', () => {
    const matchedResult = sinon.createStubInstance(SDK.CSSPropertyParser.BottomUpTreeMatching);
    matchedResult.hasMatches.returns(false);
    const context = new Elements.PropertyRenderer.TracingContext(matchedResult);

    // Evaluations are applied bottom up
    assert.isTrue(context.nextEvaluation());
    {
      // Top-down pass: first prepare evaluations for outermost scopes with nested expressions [1, 2] and [4, 5, 6]
      const childContexts = context.evaluation([1, 2]);
      assert.exists(childContexts);
      assert.lengthOf(childContexts, 2);
      const [firstChild, secondChild] = childContexts;
      const [firstGrandChild, secondGrandChild, thirdGrandChild] = secondChild.evaluation([4, 5, 6]) ?? [];
      assert.exists(firstGrandChild);
      assert.exists(secondGrandChild);
      assert.exists(thirdGrandChild);
      // Bottom-up pass: actually apply evaluations "from the inside out".
      // Grand children don't have any inner expressions to be evaluated, no need to request evaluation and no inner
      // tracing contexts to be passed here.
      assert.isTrue(firstGrandChild.applyEvaluation([]));
      assert.isTrue(secondGrandChild.applyEvaluation([]));
      assert.isTrue(thirdGrandChild.applyEvaluation([]));
      assert.isTrue(secondChild.applyEvaluation([]));
      // firstChild has inner expressions (the grand children), so pass the inner tracing contexts here.
      assert.isFalse(firstChild.applyEvaluation([firstGrandChild, secondGrandChild, thirdGrandChild]));
      assert.isFalse(context.applyEvaluation([firstChild, secondChild]));
    }

    assert.isTrue(context.nextEvaluation());
    {
      const [firstChild, secondChild] = context.evaluation([1, 2]) ?? [];
      assert.exists(firstChild);
      assert.exists(secondChild);
      const [firstGrandChild, secondGrandChild, thirdGrandChild] = secondChild.evaluation([4, 5, 6]) ?? [];
      assert.exists(firstGrandChild);
      assert.exists(secondGrandChild);
      assert.exists(thirdGrandChild);
      assert.isTrue(firstGrandChild.applyEvaluation([]));
      assert.isTrue(secondGrandChild.applyEvaluation([]));
      assert.isTrue(thirdGrandChild.applyEvaluation([]));
      assert.isTrue(secondChild.applyEvaluation([]));
      assert.isTrue(firstChild.applyEvaluation([firstGrandChild, secondGrandChild, thirdGrandChild]));
      assert.isFalse(context.applyEvaluation([firstChild, secondChild]));
    }

    assert.isTrue(context.nextEvaluation());
    {
      const [firstChild, secondChild] = context.evaluation([1, 2]) ?? [];
      assert.exists(firstChild);
      assert.exists(secondChild);
      const [firstGrandChild, secondGrandChild, thirdGrandChild] = secondChild.evaluation([4, 5, 6]) ?? [];
      assert.exists(firstGrandChild);
      assert.exists(secondGrandChild);
      assert.exists(thirdGrandChild);
      assert.isTrue(firstGrandChild.applyEvaluation([]));
      assert.isTrue(secondGrandChild.applyEvaluation([]));
      assert.isTrue(thirdGrandChild.applyEvaluation([]));
      assert.isTrue(secondChild.applyEvaluation([]));
      assert.isTrue(firstChild.applyEvaluation([firstGrandChild, secondGrandChild, thirdGrandChild]));
      assert.isTrue(context.applyEvaluation([firstChild, secondChild]));
    }

    assert.isFalse(context.nextEvaluation());
  });

  it('can inject itself into a RenderingContext', () => {
    const tracingContext = new Elements.PropertyRenderer.TracingContext();
    const renderingContext = sinon.createStubInstance(Elements.PropertyRenderer.RenderingContext);
    assert.strictEqual(tracingContext.renderingContext(renderingContext).tracing, tracingContext);
  });
});
