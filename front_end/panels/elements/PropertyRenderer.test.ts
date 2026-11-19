// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {Printer} from '../../testing/PropertyParser.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import {type LitTemplate, nothing, render} from '../../ui/lit/lit.js';

import * as Elements from './elements.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('PropertyRenderer', () => {
  function renderValueElement(name: string, value: string) {
    return Elements.PropertyRenderer.Renderer.renderValueElement(
        {name, value}, SDK.CSSPropertyParser.matchDeclaration(name, value, []), []);
  }

  describe('Renderer', () => {
    function textFragments(nodes: Node|LitTemplate): Array<string|null> {
      if (nodes instanceof Node) {
        return nodes.childTextNodes().map(n => n.textContent).filter(Boolean);
      }
      const span = document.createElement('span');
      render(nodes, span);
      return textFragments(span);
    }

    it('parses text', () => {
      // Prevent normalization to get an accurate representation of the parser result.
      sinon.stub(Element.prototype, 'normalize');
      assert.deepEqual(textFragments(renderValueElement('--p', 'var(--v)').valueElement), ['var', '(', '--v', ')']);

      assert.deepEqual(textFragments(renderValueElement('--p', '/* comments are text */ 1px solid 4').valueElement),
                       ['/* comments are text */', ' ', '1px', ' ', 'solid', ' ', '4']);
      assert.deepEqual(
          textFragments(renderValueElement('--p', '2px var(--double, var(--fallback, black)) #32a1ce rgb(124 125 21 0)')
                            .valueElement),
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
      assert.deepEqual(textFragments(Elements.PropertyRenderer.Renderer.render(tree, context).nodes).join(''), rule,
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
      assert.deepEqual(textFragments(Elements.PropertyRenderer.Renderer.render(tree, context).nodes).join(''),
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
      assert.deepEqual(textFragments(Elements.PropertyRenderer.Renderer.render(tree, context).nodes).join(''), property,
                       Printer.walk(ast).get());
    });

    it('renders trailing comments', () => {
      const property = '/* color: red */ blue /* color: red */';
      assert.strictEqual(textFragments(renderValueElement('--p', property).valueElement).join(''), property);

      const withoutSpaces = '/* color: red */blue/* color: red */';
      assert.strictEqual(textFragments(renderValueElement('--p', withoutSpaces).valueElement).join(''), withoutSpaces);
    });

    it('renders malformed comments', () => {
      const property = 'red /* foo: bar';
      assert.strictEqual(textFragments(renderValueElement('--p', property).valueElement).join(''), property);
    });

    it('computes preceding space from the AST', () => {
      const property = '/* c1 */1px  /* c2 */ solid\tvar( --v , 2px )/* c3 */';
      const ast = SDK.CSSPropertyParser.tokenizeDeclaration('--p', property);
      assert.exists(ast);
      const nodes: Array<[string, string]> = [];
      SDK.CSSPropertyParser.TreeSearch.findAll(ast, node => {
        if ((!node.firstChild && node.parent?.name !== 'NumberLiteral') || node.name === 'NumberLiteral') {
          nodes.push([ast.text(node), Elements.PropertyRenderer.precedingSpace(node, ast)]);
        }
        return false;
      });
      for (const trailing of ast.trailingNodes) {
        nodes.push([ast.text(trailing), Elements.PropertyRenderer.precedingSpace(trailing, ast)]);
      }
      assert.strictEqual(Elements.PropertyRenderer.precedingSpace(ast.tree, ast), '');
      assert.deepEqual(nodes, [
        ['/* c1 */', ' '],
        ['1px', ''],
        ['/* c2 */', '  '],
        ['solid', ' '],
        ['var', '\t'],
        ['(', ''],
        ['--v', ' '],
        [',', ' '],
        ['2px', ' '],
        [')', ' '],
        ['/* c3 */', ''],
      ]);
    });

    it('passes callbacks to match renderers for a single node and for an array', () => {
      const matchedResult = SDK.CSSPropertyParser.matchDeclaration('color', 'red blue',
                                                                   [new SDK.CSSPropertyParserMatchers.ColorMatcher()]);
      assert.exists(matchedResult);
      const nodes =
          SDK.CSSPropertyParser.ASTUtils.siblings(SDK.CSSPropertyParser.ASTUtils.declValue(matchedResult.ast.tree));
      assert.lengthOf(nodes, 2);

      const seen: Elements.PropertyRenderer.RenderingCallbacks[] = [];
      const colorRenderer: Elements.PropertyRenderer.MatchRenderer<SDK.CSSPropertyParser.Match> = {
        matchType: SDK.CSSPropertyParserMatchers.ColorMatch,
        render(_match, context) {
          seen.push(context.callbacks);
          return nothing;
        },
      };
      const context = new Elements.PropertyRenderer.RenderingContext(
          matchedResult.ast, null, new Map([[colorRenderer.matchType, colorRenderer]]), matchedResult);
      const callbacks: Elements.PropertyRenderer.RenderingCallbacks = {onColor: () => {}};

      Elements.PropertyRenderer.Renderer.render(nodes[0], context, callbacks);
      assert.deepEqual(seen, [callbacks]);

      seen.length = 0;
      Elements.PropertyRenderer.Renderer.render(nodes, context, callbacks);
      assert.deepEqual(seen, [callbacks, callbacks]);
    });

    it('does not forward callbacks into nested Renderer.render calls', () => {
      const matchedResult = SDK.CSSPropertyParser.matchDeclaration('color', 'hsl(120deg, 100%, 50%)', [
        new SDK.CSSPropertyParserMatchers.ColorMatcher(),
        new SDK.CSSPropertyParserMatchers.AngleMatcher(),
      ]);
      assert.exists(matchedResult);
      const valueNode = SDK.CSSPropertyParser.ASTUtils.declValue(matchedResult.ast.tree);
      assert.exists(valueNode);

      let outerCallbacks: Elements.PropertyRenderer.RenderingCallbacks|undefined;
      let innerCallbacks: Elements.PropertyRenderer.RenderingCallbacks|undefined;
      const renderers = new Map<Platform.Constructor.Constructor<SDK.CSSPropertyParser.Match>,
                                Elements.PropertyRenderer.MatchRenderer<SDK.CSSPropertyParser.Match>>([
        [
          SDK.CSSPropertyParserMatchers.ColorMatch,
          {
            matchType: SDK.CSSPropertyParserMatchers.ColorMatch,
            render(match, context) {
              outerCallbacks = context.callbacks;
              return Elements.PropertyRenderer.Renderer
                  .render(SDK.CSSPropertyParser.ASTUtils.children(match.node), context)
                  .nodes;
            },
          },
        ],
        [
          SDK.CSSPropertyParserMatchers.AngleMatch,
          {
            matchType: SDK.CSSPropertyParserMatchers.AngleMatch,
            render(_match, context) {
              innerCallbacks = context.callbacks;
              return nothing;
            },
          },
        ],
      ]);
      const context = new Elements.PropertyRenderer.RenderingContext(matchedResult.ast, null, renderers, matchedResult);
      const callbacks: Elements.PropertyRenderer.RenderingCallbacks = {onColor: () => {}};

      Elements.PropertyRenderer.Renderer.render(valueNode, context, callbacks);

      assert.strictEqual(outerCallbacks, callbacks);
      assert.exists(innerCallbacks);
      assert.deepEqual(innerCallbacks, {});
    });
  });

  describe('URLRenderer', () => {
    it('linkifies package relative URLs completed against the stylesheet URL', () => {
      const mockRule = {
        resourceURL() {
          return urlString`http://example.com/styles/styles-url-linkify.css`;
        },
      } as SDK.CSSRule.CSSRule;

      const renderer = new Elements.PropertyRenderer.URLRenderer(mockRule, null);
      const name = 'background-image';
      const value = 'url(fromcss.png)';
      const matchers = [new SDK.CSSPropertyParserMatchers.URLMatcher()];
      const matchedResult = SDK.CSSPropertyParser.matchDeclaration(name, value, matchers);
      assert.exists(matchedResult);

      const {valueElement} =
          Elements.PropertyRenderer.Renderer.renderValueElement({name, value}, matchedResult, [renderer]);

      const link = valueElement.querySelector('.devtools-link');
      assert.exists(link);
      assert.strictEqual((link as HTMLElement & {href?: string}).href, 'http://example.com/styles/fromcss.png');
      assert.strictEqual(link.textContent, 'fromcss.png');
      assert.isTrue(link.classList.contains('devtools-link'));
    });

    it('linkifies package relative URLs resolved against the node context', () => {
      const mockNode = {
        resolveURL(url: string) {
          return urlString`http://example.com/styles/resources/${url}`;
        },
      } as SDK.DOMModel.DOMNode;

      const renderer = new Elements.PropertyRenderer.URLRenderer(null, mockNode);
      const name = 'background-image';
      const value = 'url(iframed.png)';
      const matchers = [new SDK.CSSPropertyParserMatchers.URLMatcher()];
      const matchedResult = SDK.CSSPropertyParser.matchDeclaration(name, value, matchers);
      assert.exists(matchedResult);

      const {valueElement} =
          Elements.PropertyRenderer.Renderer.renderValueElement({name, value}, matchedResult, [renderer]);

      const link = valueElement.querySelector('.devtools-link');
      assert.exists(link);
      assert.strictEqual((link as HTMLElement & {href?: string}).href,
                         'http://example.com/styles/resources/iframed.png');
      assert.strictEqual(link.textContent, 'iframed.png');
    });

    it('preserves multiple URLs inside -webkit-image-set without collapsing them into one', () => {
      const mockRule = {
        resourceURL() {
          return urlString`http://example.com/styles/main.css`;
        },
      } as SDK.CSSRule.CSSRule;

      const renderer = new Elements.PropertyRenderer.URLRenderer(mockRule, null);
      const name = 'background-image';
      const value = '-webkit-image-set(url("test-1x.png") 1x, url("test-2x.png") 2x)';
      const matchers = [new SDK.CSSPropertyParserMatchers.URLMatcher()];
      const matchedResult = SDK.CSSPropertyParser.matchDeclaration(name, value, matchers);
      assert.exists(matchedResult);

      const {valueElement} =
          Elements.PropertyRenderer.Renderer.renderValueElement({name, value}, matchedResult, [renderer]);

      const links = Array.from(valueElement.querySelectorAll('.devtools-link')) as Array<HTMLElement&{href?: string}>;
      assert.lengthOf(links, 2);
      assert.strictEqual(links[0].textContent, 'test-1x.png');
      assert.strictEqual(links[0].href, 'http://example.com/styles/test-1x.png');
      assert.strictEqual(links[1].textContent, 'test-2x.png');
      assert.strictEqual(links[1].href, 'http://example.com/styles/test-2x.png');
      assert.strictEqual(valueElement.textContent, '-webkit-image-set(url(test-1x.png) 1x, url(test-2x.png) 2x)');
    });
  });

  describe('StringRenderer', () => {
    it('renders string with unescaped tooltip title', () => {
      const renderer = new Elements.PropertyRenderer.StringRenderer();
      const name = 'content';
      const value = '"\\2716"';
      const matchers = [new SDK.CSSPropertyParserMatchers.StringMatcher()];
      const matchedResult = SDK.CSSPropertyParser.matchDeclaration(name, value, matchers);
      assert.exists(matchedResult);

      const {valueElement} =
          Elements.PropertyRenderer.Renderer.renderValueElement({name, value}, matchedResult, [renderer]);

      const span = valueElement.querySelector('span');
      assert.exists(span);
      assert.strictEqual(span.textContent, '"\\2716"');
      assert.strictEqual(span.title, '"\u2716"');
    });
  });

  describe('EditableContent', () => {
    it('renders initial state with null editedValue', () => {
      const view = createViewFunctionStub(Elements.PropertyRenderer.EditableContent);
      const widget = new Elements.PropertyRenderer.EditableContent(undefined, view);
      renderElementIntoDOM(widget);

      assert.isNull(view.input.editedValue);
    });

    it('updates editedValue when onValueEdit is called', () => {
      const view = createViewFunctionStub(Elements.PropertyRenderer.EditableContent);
      const widget = new Elements.PropertyRenderer.EditableContent(undefined, view);
      renderElementIntoDOM(widget);

      view.input.onValueEdit('42px');

      assert.strictEqual(view.input.editedValue, '42px');
    });

    describe('view', () => {
      it('renders default slot when editedValue is null', () => {
        const target = document.createElement('div');
        Elements.PropertyRenderer.DEFAULT_VIEW({
          editedValue: null,
          onValueEdit: () => {},
        },
                                               undefined, target);

        assert.exists(target.querySelector('slot[name="icon"]'));
        assert.exists(target.querySelector('slot:not([name])'));
      });

      it('renders editedValue text instead of default slot when editedValue is set', () => {
        const target = document.createElement('div');
        Elements.PropertyRenderer.DEFAULT_VIEW({
          editedValue: '100deg',
          onValueEdit: () => {},
        },
                                               undefined, target);

        assert.exists(target.querySelector('slot[name="icon"]'));
        assert.isNull(target.querySelector('slot:not([name])'));
        assert.strictEqual(target.textContent, '100deg');
      });

      it('forwards ValueEditEvent detail to onValueEdit', () => {
        const target = document.createElement('div');
        const onValueEdit = sinon.spy();
        Elements.PropertyRenderer.DEFAULT_VIEW({
          editedValue: null,
          onValueEdit,
        },
                                               undefined, target);

        const iconSlot = target.querySelector('slot[name="icon"]');
        assert.exists(iconSlot);
        iconSlot.dispatchEvent(new Elements.PropertyRenderer.ValueEditEvent('2turn'));

        sinon.assert.calledOnceWithExactly(onValueEdit, '2turn');
      });
    });
  });

});

describe('TracingContext', () => {
  it('assumes no substitutions by default', () => {
    const matchedResult = SDK.CSSPropertyParser.matchDeclaration('prop', 'value', []);
    assert.exists(matchedResult);
    const context = new Elements.PropertyRenderer.TracingContext(new Elements.PropertyRenderer.Highlighting(), false, 0,
                                                                 matchedResult);
    assert.isFalse(context.nextSubstitution());

    sinon.stub(matchedResult, 'hasMatches').returns(true);
    const context2 = new Elements.PropertyRenderer.TracingContext(new Elements.PropertyRenderer.Highlighting(), false,
                                                                  0, matchedResult);
    assert.isTrue(context2.nextSubstitution());

    const context3 = new Elements.PropertyRenderer.TracingContext(new Elements.PropertyRenderer.Highlighting(), false);
    assert.isFalse(context3.nextSubstitution());
  });

  it('controls substitution by creating "nested" tracing contexts', () => {
    const matchedResult = SDK.CSSPropertyParser.matchDeclaration('prop', 'value', []);
    assert.exists(matchedResult);
    sinon.stub(matchedResult, 'hasMatches').returns(true);
    const context = new Elements.PropertyRenderer.TracingContext(new Elements.PropertyRenderer.Highlighting(), false, 0,
                                                                 matchedResult);

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
    const context = new Elements.PropertyRenderer.TracingContext(new Elements.PropertyRenderer.Highlighting(), false, 0,
                                                                 matchedResult);

    assert.throw(() => context.nextEvaluation());
    context.nextSubstitution();
    assert.doesNotThrow(() => context.nextEvaluation());
  });

  it('controls evaluations creating nested context', () => {
    const matchedResult = SDK.CSSPropertyParser.matchDeclaration('prop', 'value', []);
    assert.exists(matchedResult);
    const context = new Elements.PropertyRenderer.TracingContext(new Elements.PropertyRenderer.Highlighting(), false, 0,
                                                                 matchedResult);

    const evaluation = (): {template: LitTemplate} => ({template: nothing});
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
    const tracingContext = new Elements.PropertyRenderer.TracingContext(new Elements.PropertyRenderer.Highlighting(),
                                                                        false, 0, matchedResult);

    // The initial offset is 0.
    assert.strictEqual(tracingContext.longhandOffset, 0);
    const varNode = matchedResult.ast.tree.lastChild;
    const match = varNode && matchedResult.getMatch(varNode);
    assert.exists(match);
    // Apply one level of substitutions (for the var(--c)).
    assert.isTrue(tracingContext.nextSubstitution());
    const childTracingContext = tracingContext.substitution({
      match,
      context: new Elements.PropertyRenderer.RenderingContext(matchedResult.ast, null, new Map(), matchedResult),
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
    const match1 = new SDK.CSSPropertyParserMatchers.TextMatch('match1', {} as CodeMirror.SyntaxNode);
    const match2 = new SDK.CSSPropertyParserMatchers.TextMatch('match2', {} as CodeMirror.SyntaxNode);
    highlighting.addMatch(match1, [node('1'), node('2'), node('3')]);
    highlighting.addMatch(match1, [node('4'), node('5'), node('6'), node('7')]);
    highlighting.addMatch(match1, [node('8')]);
    highlighting.addMatch(match2, [node('a'), node('b'), node('c')]);
  });

  it('adds highlights on mouseenter', () => {
    const registry = CSS.highlights.get(Elements.PropertyRenderer.Highlighting.REGISTRY_NAME);
    assert.exists(registry);

    document.querySelector('#node-6')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)),
                     ['123', '4567', '8']);
  });

  it('removes highlights on mouseexit', () => {
    const registry = CSS.highlights.get(Elements.PropertyRenderer.Highlighting.REGISTRY_NAME);
    assert.exists(registry);

    document.querySelector('#node-6')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)),
                     ['123', '4567', '8']);
    document.querySelector('#node-6')?.dispatchEvent(new MouseEvent('mouseleave'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), []);
  });

  it('replaces highlights on subsequent mouseenter', () => {
    const registry = CSS.highlights.get(Elements.PropertyRenderer.Highlighting.REGISTRY_NAME);
    assert.exists(registry);

    document.querySelector('#node-6')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)),
                     ['123', '4567', '8']);

    document.querySelector('#node-a')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), ['abc']);
  });

  it('restores previous highlights on mouseexit', () => {
    const registry = CSS.highlights.get(Elements.PropertyRenderer.Highlighting.REGISTRY_NAME);
    assert.exists(registry);

    document.querySelector('#node-6')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)),
                     ['123', '4567', '8']);

    document.querySelector('#node-a')?.dispatchEvent(new MouseEvent('mouseenter'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)), ['abc']);

    document.querySelector('#node-a')?.dispatchEvent(new MouseEvent('mouseleave'));
    assert.deepEqual(Array.from(registry.keys().map(value => (value as Range).cloneContents().textContent)),
                     ['123', '4567', '8']);
  });
});
