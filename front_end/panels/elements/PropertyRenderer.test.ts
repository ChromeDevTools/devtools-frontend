// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {Printer} from '../../testing/PropertyParser.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

import * as Elements from './elements.js';

describeWithEnvironment('PropertyRenderer', () => {
  function renderValueElement(name: string, value: string) {
    return Elements.PropertyRenderer.Renderer.renderValueElement(
        {name, value}, SDK.CSSPropertyParser.matchDeclaration(name, value, []), []);
  }

  describe('Renderer', () => {
    function textFragments(nodes: Node[]): Array<string|null> {
      return nodes.map(n => n.textContent);
    }

    it('parses text', () => {
      // Prevent normalization to get an accurate representation of the parser result.
      sinon.stub(Element.prototype, 'normalize');
      assert.deepEqual(
          textFragments(Array.from(renderValueElement('--p', 'var(--v)').valueElement.childNodes)),
          ['var', '(', '--v', ')']);

      assert.deepEqual(
          textFragments(
              Array.from(renderValueElement('--p', '/* comments are text */ 1px solid 4').valueElement.childNodes)),
          ['/* comments are text */', ' ', '1px', ' ', 'solid', ' ', '4']);
      assert.deepEqual(
          textFragments(Array.from(
              renderValueElement('--p', '2px var(--double, var(--fallback, black)) #32a1ce rgb(124 125 21 0)')
                  .valueElement.childNodes)),
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
      const context = new Elements.PropertyRenderer.RenderingContext(ast, null, new Map(), matchedResult);
      assert.deepEqual(
          textFragments(Elements.PropertyRenderer.Renderer.render(tree, context).nodes).join(''), rule,
          Printer.walk(ast).get());
    });

    it('nicely formats binary expressions', () => {
      const property = 'calc((50 -(0* 4))* 1vmin)';
      const rule = `*{--property: ${property};}`;
      const tree = cssParser.parse(rule).topNode;
      const ast = new SDK.CSSPropertyParser.SyntaxTree(property, rule, tree);
      const matchedResult =
          SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, [new SDK.CSSPropertyParserMatchers.BinOpMatcher()]);
      const renderer = new Elements.PropertyRenderer.BinOpRenderer();
      const context = new Elements.PropertyRenderer.RenderingContext(
          ast, null, new Map([[renderer.matchType, renderer]]), matchedResult);
      assert.deepEqual(
          textFragments(Elements.PropertyRenderer.Renderer.render(tree, context).nodes).join(''),
          '*{--property: calc((50 - (0 * 4)) * 1vmin);}', Printer.walk(ast).get());
    });

    it('correctly renders subtrees', () => {
      const property = '2px var(--double, var(--fallback, black)) #32a1ce rgb(124 125 21 0)';
      const rule = `*{--property: ${property};}`;
      const tree = cssParser.parse(rule).topNode.firstChild?.firstChild?.nextSibling?.firstChild?.nextSibling;
      assert.exists(tree);
      const ast = new SDK.CSSPropertyParser.SyntaxTree(property, rule, tree);
      const matchedResult = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, []);
      const context = new Elements.PropertyRenderer.RenderingContext(ast, null, new Map(), matchedResult);
      assert.deepEqual(
          textFragments(Elements.PropertyRenderer.Renderer.render(tree, context).nodes).join(''), property,
          Printer.walk(ast).get());
    });

    it('renders trailing comments', () => {
      const property = '/* color: red */ blue /* color: red */';
      assert.strictEqual(
          textFragments(Array.from(renderValueElement('--p', property).valueElement.childNodes)).join(''), property);
    });

    it('renders malformed comments', () => {
      const property = 'red /* foo: bar';
      assert.strictEqual(
          textFragments(Array.from(renderValueElement('--p', property).valueElement.childNodes)).join(''), property);
    });
  });
});

describe('TracingContext', () => {
  it('assumes no substitutions by default', () => {
    const matchedResult = SDK.CSSPropertyParser.matchDeclaration('prop', 'value', []);
    assert.exists(matchedResult);
    const context = new Elements.PropertyRenderer.TracingContext(
        new Elements.PropertyRenderer.Highlighting(), false, 0, matchedResult);
    assert.isFalse(context.nextSubstitution());

    sinon.stub(matchedResult, 'hasMatches').returns(true);
    const context2 = new Elements.PropertyRenderer.TracingContext(
        new Elements.PropertyRenderer.Highlighting(), false, 0, matchedResult);
    assert.isTrue(context2.nextSubstitution());

    const context3 = new Elements.PropertyRenderer.TracingContext(new Elements.PropertyRenderer.Highlighting(), false);
    assert.isFalse(context3.nextSubstitution());
  });

  it('controls substitution by creating "nested" tracing contexts', () => {
    const matchedResult = SDK.CSSPropertyParser.matchDeclaration('prop', 'value', []);
    assert.exists(matchedResult);
    sinon.stub(matchedResult, 'hasMatches').returns(true);
    const context = new Elements.PropertyRenderer.TracingContext(
        new Elements.PropertyRenderer.Highlighting(), false, 0, matchedResult);

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
    const matchedResult = SDK.CSSPropertyParser.matchDeclaration('prop', 'value', []);
    assert.exists(matchedResult);
    sinon.stub(matchedResult, 'hasMatches').returns(true);
    const context = new Elements.PropertyRenderer.TracingContext(
        new Elements.PropertyRenderer.Highlighting(), false, 0, matchedResult);

    assert.throw(() => context.nextEvaluation());
    context.nextSubstitution();
    assert.doesNotThrow(() => context.nextEvaluation());
  });

  it('controls evaluations creating nested context', () => {
    const matchedResult = SDK.CSSPropertyParser.matchDeclaration('prop', 'value', []);
    assert.exists(matchedResult);
    const context = new Elements.PropertyRenderer.TracingContext(
        new Elements.PropertyRenderer.Highlighting(), false, 0, matchedResult);

    const evaluation = () => ({placeholder: []});
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
      assert.isOk(firstGrandChild.applyEvaluation([], evaluation));
      assert.isOk(secondGrandChild.applyEvaluation([], evaluation));
      assert.isOk(thirdGrandChild.applyEvaluation([], evaluation));
      assert.isOk(secondChild.applyEvaluation([], evaluation));
      // firstChild has inner expressions (the grand children), so pass the inner tracing contexts here.
      assert.isNotOk(firstChild.applyEvaluation([firstGrandChild, secondGrandChild, thirdGrandChild], evaluation));
      assert.isNotOk(context.applyEvaluation([firstChild, secondChild], evaluation));
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
      assert.isOk(firstGrandChild.applyEvaluation([], evaluation));
      assert.isOk(secondGrandChild.applyEvaluation([], evaluation));
      assert.isOk(thirdGrandChild.applyEvaluation([], evaluation));
      assert.isOk(secondChild.applyEvaluation([], evaluation));
      assert.isOk(firstChild.applyEvaluation([firstGrandChild, secondGrandChild, thirdGrandChild], evaluation));
      assert.isNotOk(context.applyEvaluation([firstChild, secondChild], evaluation));
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
      assert.isOk(firstGrandChild.applyEvaluation([], evaluation));
      assert.isOk(secondGrandChild.applyEvaluation([], evaluation));
      assert.isOk(thirdGrandChild.applyEvaluation([], evaluation));
      assert.isOk(secondChild.applyEvaluation([], evaluation));
      assert.isOk(firstChild.applyEvaluation([firstGrandChild, secondGrandChild, thirdGrandChild], evaluation));
      assert.isOk(context.applyEvaluation([firstChild, secondChild], evaluation));
    }

    assert.isFalse(context.nextEvaluation());
  });

  it('can inject itself into a RenderingContext', () => {
    const tracingContext =
        new Elements.PropertyRenderer.TracingContext(new Elements.PropertyRenderer.Highlighting(), false);
    const renderingContext = sinon.createStubInstance(Elements.PropertyRenderer.RenderingContext);
    assert.strictEqual(tracingContext.renderingContext(renderingContext).tracing, tracingContext);
  });

  it('keeps track of longhand offsets', () => {
    // The property name isn't relevant, but we need something with sufficiently many longhands. `animation` has lots
    // of longhands.
    const matchedResult = SDK.CSSPropertyParser.matchDeclaration(
        'animation', 'a b var(--c)',
        [new SDK.CSSPropertyParserMatchers.BaseVariableMatcher(match => match.name === '--c' ? 'ddd' : null)]);
    assert.exists(matchedResult);
    const tracingContext = new Elements.PropertyRenderer.TracingContext(
        new Elements.PropertyRenderer.Highlighting(), false, 0, matchedResult);

    // The initial offset is 0.
    assert.strictEqual(tracingContext.longhandOffset, 0);
    const varNode = matchedResult.ast.tree.lastChild;
    const match = varNode && matchedResult.getMatch(varNode);
    assert.exists(match);
    // Apply one level of substitutions (for the var(--c)).
    assert.isTrue(tracingContext.nextSubstitution());
    const childTracingContext = tracingContext.substitution({
      match,
      context: new Elements.PropertyRenderer.RenderingContext(matchedResult.ast, null, new Map(), matchedResult)
    });
    assert.exists(childTracingContext);
    // The var(--c) appears in the longhand position #2.
    assert.strictEqual(childTracingContext?.longhandOffset, 2);

    // Now test that the offset of the var(--c) gets passed down to what the var gets substituted with.
    const innerMatchedResult = SDK.CSSPropertyParser.matchDeclaration('--c', 'c1 c2 c3', []);
    assert.exists(innerMatchedResult);
    const lastNode = innerMatchedResult.ast.tree.lastChild;  // c3
    assert.exists(lastNode);
    const renderingContext = new Elements.PropertyRenderer.RenderingContext(
        innerMatchedResult.ast, null, new Map(), innerMatchedResult, undefined, undefined, childTracingContext);

    const longhands = SDK.CSSMetadata.cssMetadata().getLonghands(matchedResult.ast.propertyName ?? '');
    assert.exists(longhands);
    // In the fully substituted value, c3 appears in the fifth position.
    const expectedLonghand = longhands.at(4);
    assert.exists(expectedLonghand);
    assert.strictEqual(renderingContext.getComputedLonghandName(lastNode), expectedLonghand);
  });
});

describe('Highlighting', () => {
  const node = (id: string) => {
    const span = document.createElement('span');
    span.textContent = id;
    span.id = `node-${id}`;
    renderElementIntoDOM(span, {allowMultipleChildren: true});
    return span;
  };

  beforeEach(() => {
    const highlighting = new Elements.PropertyRenderer.Highlighting();
    const match1 = sinon.createStubInstance(SDK.CSSPropertyParserMatchers.TextMatch);
    const match2 = sinon.createStubInstance(SDK.CSSPropertyParserMatchers.TextMatch);
    highlighting.addMatch(match1, [node('1'), node('2'), node('3')]);
    highlighting.addMatch(match1, [node('4'), node('5'), node('6'), node('7')]);
    highlighting.addMatch(match1, [node('8')]);
    highlighting.addMatch(match2, [node('a'), node('b'), node('c')]);
  });

  it('adds highlights on mouseenter', () => {
    const registry = CSS.highlights.get(Elements.PropertyRenderer.Highlighting.REGISTRY_NAME);
    assert.exists(registry);

    document.querySelector('#node-6')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(
        Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), ['123', '4567', '8']);
  });

  it('removes highlights on mouseexit', () => {
    const registry = CSS.highlights.get(Elements.PropertyRenderer.Highlighting.REGISTRY_NAME);
    assert.exists(registry);

    document.querySelector('#node-6')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(
        Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), ['123', '4567', '8']);
    document.querySelector('#node-6')?.dispatchEvent(new MouseEvent('mouseleave'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), []);
  });

  it('replaces highlights on subsequent mouseenter', () => {
    const registry = CSS.highlights.get(Elements.PropertyRenderer.Highlighting.REGISTRY_NAME);
    assert.exists(registry);

    document.querySelector('#node-6')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(
        Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), ['123', '4567', '8']);

    document.querySelector('#node-a')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), ['abc']);
  });

  it('restores previous highlights on mouseexit', () => {
    const registry = CSS.highlights.get(Elements.PropertyRenderer.Highlighting.REGISTRY_NAME);
    assert.exists(registry);

    document.querySelector('#node-6')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(
        Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), ['123', '4567', '8']);

    document.querySelector('#node-a')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), ['abc']);

    document.querySelector('#node-a')?.dispatchEvent(new MouseEvent('mouseleave'));
    assert.deepEqual(
        Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), ['123', '4567', '8']);
  });
});
