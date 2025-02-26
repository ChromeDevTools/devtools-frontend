// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {Printer} from '../../testing/PropertyParser.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

function matchSingleValue<T extends SDK.CSSPropertyParser.Match>(
    name: string, value: string, matcher: SDK.CSSPropertyParser.Matcher<T>):
    {ast: SDK.CSSPropertyParser.SyntaxTree|null, match: T|null, text: string} {
  const ast = SDK.CSSPropertyParser.tokenizeDeclaration(name, value);
  if (!ast) {
    return {ast, match: null, text: value};
  }

  const matchedResult = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, [matcher]);
  const matchedNode =
      SDK.CSSPropertyParser.TreeSearch.find(ast, n => matchedResult.getMatch(n) instanceof matcher.matchType);
  const match = matchedNode && matchedResult.getMatch(matchedNode);

  return {
    ast,
    match: match instanceof matcher.matchType ? match : null,
    text: Printer.walk(ast).get(),
  };
}

function injectVariableSubstitutions(variables: Record<string, string>) {
  const {getComputedText, getComputedTextRange, getMatch} = SDK.CSSPropertyParser.BottomUpTreeMatching.prototype;
  const variableNames = new Map<string, {varName: string, value: string}>();
  function injectChunk(matching: SDK.CSSPropertyParser.BottomUpTreeMatching): void {
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

  sinon.stub(SDK.CSSPropertyParser.BottomUpTreeMatching.prototype, 'getComputedText')
      .callsFake(function(this: SDK.CSSPropertyParser.BottomUpTreeMatching, node: CodeMirror.SyntaxNode): string {
        injectChunk(this);
        return getComputedText.call(this, node);
      });
  sinon.stub(SDK.CSSPropertyParser.BottomUpTreeMatching.prototype, 'getComputedTextRange')
      .callsFake(function(
          this: SDK.CSSPropertyParser.BottomUpTreeMatching, from: CodeMirror.SyntaxNode,
          to: CodeMirror.SyntaxNode): string {
        injectChunk(this);
        return getComputedTextRange.call(this, from, to);
      });
  sinon.stub(SDK.CSSPropertyParser.BottomUpTreeMatching.prototype, 'getMatch')
      .callsFake(function(this: SDK.CSSPropertyParser.BottomUpTreeMatching, node: CodeMirror.SyntaxNode):
                     SDK.CSSPropertyParser.Match|undefined {
                       injectChunk(this);
                       const resolvedValue = variableNames.get(this.ast.text(node));
                       if (!resolvedValue) {
                         return getMatch.call(this, node);
                       }
                       return new SDK.CSSPropertyParserMatchers.BaseVariableMatch(
                           this.ast.text(node), node, resolvedValue.varName, [], this, () => resolvedValue.value);
                     });
}

describe('Matchers for SDK.CSSPropertyParser.BottomUpTreeMatching', () => {
  it('parses colors', () => {
    for (const fail of ['red-blue', '#f', '#foobar', '', 'rgbz(1 2 2)', 'tan(45deg)']) {
      const {match, text} = matchSingleValue('color', fail, new SDK.CSSPropertyParserMatchers.ColorMatcher());
      assert.isNull(match, text);
    }
    for (const succeed
             of ['rgb(/* R */155, /* G */51, /* B */255)', 'red', 'rgb(0 0 0)', 'rgba(0 0 0)', '#fff', '#ffff',
                 '#ffffff', '#ffffffff']) {
      const {match, text} = matchSingleValue('color', succeed, new SDK.CSSPropertyParserMatchers.ColorMatcher());
      assert.exists(match, text);
      assert.strictEqual(match.text, succeed);
    }
    // The property name matters:
    for (const fail
             of ['rgb(/* R */155, /* G */51, /* B */255)', 'red', 'rgb(0 0 0)', 'rgba(0 0 0)', '#fff', '#ffff',
                 '#ffffff', '#ffffffff']) {
      const {match, text} = matchSingleValue('width', fail, new SDK.CSSPropertyParserMatchers.ColorMatcher());
      assert.isNull(match, text);
    }
  });

  it('parses colors in logical border properties', () => {
    for (const success
             of ['border-block-end', 'border-block-end-color', 'border-block-start', 'border-block-start-color',
                 'border-inline-end', 'border-inline-end-color', 'border-inline-start', 'border-inline-start-color']) {
      const {ast, match, text} = matchSingleValue(success, 'red', new SDK.CSSPropertyParserMatchers.ColorMatcher());
      assert.exists(match, text);
      assert.strictEqual(match.text, 'red');
      assert.strictEqual(ast?.propertyName, success);
    }
  });

  it('parses linear gradients', () => {
    for (const succeed
             of ['linear-gradient(90deg, red, blue)', 'linear-gradient(to top left, red, blue)',
                 'linear-gradient(in oklab, red, blue)']) {
      const {match, text} =
          matchSingleValue('background', succeed, new SDK.CSSPropertyParserMatchers.LinearGradientMatcher());
      assert.exists(match, text);
      assert.strictEqual(match.text, succeed);
    }
    for (const fail
             of ['linear-gradient(90deg, red, blue)', 'linear-gradient(to top left, red, blue)',
                 'linear-gradient(in oklab, red, blue)']) {
      const {match, text} = matchSingleValue('width', fail, new SDK.CSSPropertyParserMatchers.ColorMatcher());
      assert.isNull(match, text);
    }
  });

  it('parses colors in masks', () => {
    for (const succeed of ['mask', 'mask-image', 'mask-border', 'mask-border-source']) {
      const ast = SDK.CSSPropertyParser.tokenizeDeclaration(succeed, 'linear-gradient(to top, red, var(--other))');
      assert.exists(ast, succeed);
      const matching =
          SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, [new SDK.CSSPropertyParserMatchers.ColorMatcher()]);
      const colorNode = SDK.CSSPropertyParser.TreeSearch.find(ast, node => ast.text(node) === 'red');
      assert.exists(colorNode);
      const match = matching.getMatch(colorNode);
      assert.exists(match);
      assert.instanceOf(match, SDK.CSSPropertyParserMatchers.ColorMatch);
      assert.strictEqual(match.text, 'red');
    }
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
          new SDK.CSSPropertyParserMatchers.ColorMixMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepEqual(match.space.map(n => ast.text(n)), ['in', 'srgb', 'var(--interpolation)', 'hue']);
      assert.strictEqual(match.color1.map(n => ast.text(n)).join(), 'red,var(--percentage)');
      assert.strictEqual(match.color2.map(n => ast.text(n)).join(), 'rgb(var(--rgb))');
    }
    {
      const {ast, match, text} = matchSingleValue(
          'color', 'color-mix(var(--space), var(--color1), var(--color2))',
          new SDK.CSSPropertyParserMatchers.ColorMixMatcher());
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
      const {ast, match, text} = matchSingleValue('color', fail, new SDK.CSSPropertyParserMatchers.ColorMixMatcher());
      assert.exists(ast, text);
      assert.isNull(match, text);
    }
  });

  it('parses color-mix', () => {
    function check(space: string, color1: string, color2: string): void {
      const {ast, match, text} = matchSingleValue(
          'color', `color-mix(${space}, ${color1}, ${color2})`, new SDK.CSSPropertyParserMatchers.ColorMixMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);

      assert.deepEqual(match.space.map(n => ast.text(n)).join(' '), space, text);
      assert.strictEqual(match.color1.map(n => ast.text(n)).join(' '), color1, text);
      assert.strictEqual(match.color2.map(n => ast.text(n)).join(' '), color2, text);
    }

    function checkFailure(space: string, color1: string, color2: string): void {
      const {match, text} = matchSingleValue(
          'color', `color-mix(${space}, ${color1}, ${color2})`, new SDK.CSSPropertyParserMatchers.ColorMixMatcher());
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

  it('parses URLs', () => {
    const url = 'http://example.com';
    {
      const {match, text} =
          matchSingleValue('background-image', `url(${url})`, new SDK.CSSPropertyParserMatchers.URLMatcher());
      assert.exists(match);
      assert.strictEqual(match.url, url, text);
    }
    {
      const {match, text} =
          matchSingleValue('background-image', `url("${url}")`, new SDK.CSSPropertyParserMatchers.URLMatcher());
      assert.exists(match);
      assert.strictEqual(match.url, url, text);
    }
  });

  it('parses angles correctly', () => {
    for (const succeed of ['45deg', '1.3rad', '-25grad', '2.3turn']) {
      const {ast, match, text} =
          matchSingleValue('transform', succeed, new SDK.CSSPropertyParserMatchers.AngleMatcher());
      assert.exists(ast, succeed);
      assert.exists(match, text);
      assert.strictEqual(match.text, succeed);
    }
    for (const fail of ['0DEG', '0', '123', '2em']) {
      const {match, text} = matchSingleValue('transform', fail, new SDK.CSSPropertyParserMatchers.AngleMatcher());
      assert.isNull(match, text);
    }
  });

  it('parses linkable names correctly', () => {
    function match(name: string, value: string) {
      const ast = SDK.CSSPropertyParser.tokenizeDeclaration(name, value);
      assert.exists(ast);
      const matchedResult = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, [
        new SDK.CSSPropertyParserMatchers.LinkableNameMatcher(),
      ]);

      const matches = SDK.CSSPropertyParser.TreeSearch.findAll(
          ast, node => matchedResult.getMatch(node) instanceof SDK.CSSPropertyParserMatchers.LinkableNameMatch);
      return matches.map(m => matchedResult.getMatch(m)?.text);
    }

    assert.deepEqual(match('animation-name', 'first, second, -moz-third'), ['first', 'second', '-moz-third']);
    assert.deepEqual(match('animation-name', 'first'), ['first']);
    assert.deepEqual(match('font-palette', 'first'), ['first']);
    {
      assert.deepEqual(match('position-try-fallbacks', 'flip-block'), []);
      assert.deepEqual(match('position-try-fallbacks', '--one'), ['--one']);
      assert.deepEqual(match('position-try-fallbacks', '--one, --two'), ['--one', '--two']);
    }
    {
      assert.deepEqual(match('position-try', 'flip-block'), []);
      assert.deepEqual(match('position-try', '--one'), ['--one']);
      assert.deepEqual(match('position-try', '--one, --two'), ['--one', '--two']);
    }
    {
      injectVariableSubstitutions({
        '--duration-and-easing': '1s linear',
      });
      assert.deepEqual(match('animation', '1s linear --animation-name'), ['--animation-name']);
      assert.deepEqual(match('animation', '1s linear linear'), ['linear']);
      assert.deepEqual(
          match('animation', '1s linear --first-name, 1s ease-in --second-name'), ['--first-name', '--second-name']);
      assert.deepEqual(match('animation', '1s linear'), []);
      // Matching to variable names inside `var()` functions are fine as it is handled by variable renderer in usage.
      assert.deepEqual(match('animation', 'var(--duration-and-easing) linear'), ['--duration-and-easing', 'linear']);
      assert.deepEqual(
          match('animation', '1s linear var(--non-existent, --animation-name)'),
          ['--non-existent', '--animation-name']);
      assert.deepEqual(match('animation', '1s step-start 0s kf'), ['kf']);
      assert.deepEqual(match('animation', '1s step-end 0s kf'), ['kf']);
      assert.deepEqual(match('animation', '1s steps(1, jump-start) 0s kf'), ['kf']);
      assert.deepEqual(match('animation', '1s steps(1, jump-end) 0s kf'), ['kf']);
      assert.deepEqual(match('animation', '1s steps(1, jump-none) 0s kf'), ['kf']);
      assert.deepEqual(match('animation', '1s steps(1, start) 0s kf'), ['kf']);
      assert.deepEqual(match('animation', '1s steps(1, end) 0s kf'), ['kf']);
    }
  });

  it('parses easing functions properly', () => {
    for (const succeed
             of ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear(0 0%, 1 100%)',
                 'cubic-bezier(0.3, 0.3, 0.3, 0.3)']) {
      const {ast, match, text} =
          matchSingleValue('animation-timing-function', succeed, new SDK.CSSPropertyParserMatchers.BezierMatcher());
      assert.exists(ast, succeed);
      assert.exists(match, text);
      assert.strictEqual(match.text, succeed);
    }

    const {ast, match, text} = matchSingleValue('border', 'ease-in', new SDK.CSSPropertyParserMatchers.BezierMatcher());
    assert.exists(ast, 'border');
    assert.isNull(match, text);
  });

  it('parses strings correctly', () => {
    function match(name: string, value: string) {
      const ast = SDK.CSSPropertyParser.tokenizeDeclaration(name, value);
      assert.exists(ast);
      const matchedResult =
          SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, [new SDK.CSSPropertyParserMatchers.StringMatcher()]);
      assert.exists(matchedResult);

      const match = SDK.CSSPropertyParser.TreeSearch.find(
          ast, node => matchedResult.getMatch(node) instanceof SDK.CSSPropertyParserMatchers.StringMatch);
      assert.exists(match);
    }
    match('quotes', '"\'" "\'"');
    match('content', '"foobar"');
    match('--image-file-accelerometer-back', 'url("devtools\:\/\/devtools\/bundled\/Images\/accelerometer-back\.svg")');
  });

  it('parses shadows correctly', () => {
    const {match, text} = matchSingleValue(
        'box-shadow', '/*0*/3px 3px red, -1em 0 .4em /*a*/ olive /*b*/',
        new SDK.CSSPropertyParserMatchers.ShadowMatcher());
    assert.exists(match, text);
    assert.strictEqual(match.text, '/*0*/3px 3px red, -1em 0 .4em /*a*/ olive');
  });

  it('parses fonts correctly', () => {
    for (const fontSize of ['-.23', 'smaller', '17px']) {
      const {ast, match, text} =
          matchSingleValue('font-size', fontSize, new SDK.CSSPropertyParserMatchers.FontMatcher());

      assert.exists(ast, text);
      assert.exists(match, text);
      assert.strictEqual(match.text, fontSize);
    }

    {
      const ast = SDK.CSSPropertyParser.tokenizeDeclaration('font-family', '"Gill Sans", sans-serif');
      assert.exists(ast);
      const matchedResult =
          SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, [new SDK.CSSPropertyParserMatchers.FontMatcher()]);
      assert.exists(matchedResult);

      const matches = SDK.CSSPropertyParser.TreeSearch.findAll(
          ast, node => matchedResult.getMatch(node) instanceof SDK.CSSPropertyParserMatchers.FontMatch);
      assert.deepEqual(matches.map(m => matchedResult.getMatch(m)?.text), ['"Gill Sans", sans-serif']);
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
      const {ast, match, text} =
          matchSingleValue('grid', '"a a"', new SDK.CSSPropertyParserMatchers.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.strictEqual(match.lines.map(line => line.map(n => ast.text(n)).join(' ')).join('\n'), '"a a"');
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid-template-areas', '"a a a" "b b b" "c c c"', new SDK.CSSPropertyParserMatchers.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')), ['"a a a"', '"b b b"', '"c c c"']);
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid-template', '"a a a" var(--row) / auto 1fr auto',
          new SDK.CSSPropertyParserMatchers.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')), ['"a a a"', 'var(--row) / auto 1fr auto']);
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid', '[header-top] "a a" var(--row-with-names) [main-top] "b b b" 1fr [main-bottom] / auto 1fr auto;',

          new SDK.CSSPropertyParserMatchers.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')),
          ['[header-top] "a a" var(--row-with-names)', '[main-top] "b b b" 1fr [main-bottom] / auto 1fr auto']);
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid', '[header-top] "a a" "b b b" var(--line-name) "c c" / auto 1fr auto;',

          new SDK.CSSPropertyParserMatchers.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')),
          ['[header-top] "a a"', '"b b b" var(--line-name)', '"c c" / auto 1fr auto']);
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid', '[line1] "a a" [line2] var(--double-row) "b b" / auto 1fr auto;',

          new SDK.CSSPropertyParserMatchers.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')),
          ['[line1] "a a" [line2]', 'var(--double-row)', '"b b" / auto 1fr auto']);
    }
    {
      const {ast, match, text} = matchSingleValue(
          'grid', '"a a" var(--unresolved) / auto 1fr auto;', new SDK.CSSPropertyParserMatchers.GridTemplateMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);
      assert.deepEqual(
          match.lines.map(line => line.map(n => ast.text(n)).join(' ')), ['"a a" var(--unresolved) / auto 1fr auto']);
    }
  });

  it('parses light-dark correctly', () => {
    for (const fail of ['light-dark()', 'light-dark(red)', 'light-dark(var(--foo))']) {
      const {match, text} = matchSingleValue(
          'color', fail,
          new SDK.CSSPropertyParserMatchers.LightDarkColorMatcher(
              sinon.createStubInstance(SDK.CSSProperty.CSSProperty)));
      assert.isNull(match, text);
    }

    for (const succeed
             of ['light-dark(red, blue)', 'light-dark(var(--foo), red)', 'light-dark(red, var(--foo))',
                 'light-dark(var(--foo), var(--bar))']) {
      const {ast, match, text} = matchSingleValue(
          'color', succeed,
          new SDK.CSSPropertyParserMatchers.LightDarkColorMatcher(
              sinon.createStubInstance(SDK.CSSProperty.CSSProperty)));
      assert.exists(ast, text);
      assert.exists(match, text);

      const [light, dark] = succeed.slice('light-dark('.length, -1).split(', ');
      assert.lengthOf(match.light, 1);
      assert.lengthOf(match.dark, 1);
      assert.strictEqual(ast.text(match.light[0]), light);
      assert.strictEqual(ast.text(match.dark[0]), dark);
    }

    // light-dark only applies to color properties
    const {match, text} = matchSingleValue(
        'width', 'light-dark(red, blue)',
        new SDK.CSSPropertyParserMatchers.LightDarkColorMatcher(sinon.createStubInstance(SDK.CSSProperty.CSSProperty)));
    assert.isNull(match, text);
  });

  it('parses auto-base correctly', () => {
    for (const fail of ['-internal-auto-base()', '-internal-auto-base(block)', '-internal-auto-base(var(--foo))']) {
      const {match, text} = matchSingleValue('display', fail, new SDK.CSSPropertyParserMatchers.AutoBaseMatcher());
      assert.isNull(match, text);
    }

    for (const [succeed, propertyName] of [
             ['-internal-auto-base(red, blue)', 'color'],
             ['-internal-auto-base(var(--foo), red)', 'color'],
             ['-internal-auto-base(red, var(--foo))', 'color'],
             ['-internal-auto-base(var(--foo), var(--bar))', 'color'],
             ['-internal-auto-base(gray, coral)', 'background-color'],
             ['-internal-auto-base(inline, block)', 'display'],
             ['-internal-auto-base(center, right)', 'text-align'],
             ['-internal-auto-base(serif, cursive)', 'font-family'],
             ['-internal-auto-base(solid, dashed)', 'border-style'],
             ['-internal-auto-base(0, 0.5em)', 'border-radius'],
             ['-internal-auto-base(2px, 0.25em)', 'padding'],
             ['-internal-auto-base(1en, 3pt)', 'margin'],
    ]) {
      const {ast, match, text} =
          matchSingleValue(propertyName, succeed, new SDK.CSSPropertyParserMatchers.AutoBaseMatcher());
      assert.exists(ast, text);
      assert.exists(match, text);

      const [auto, base] = succeed.slice('-internal-auto-base('.length, -1).split(', ');
      assert.lengthOf(match.auto, 1);
      assert.lengthOf(match.base, 1);
      assert.strictEqual(ast.text(match.auto[0]), auto);
      assert.strictEqual(ast.text(match.base[0]), base);
    }
  });

  describe('AnchorFunctionMatcher', () => {
    it('should not match when it is not a call expression', () => {
      const {match, text} =
          matchSingleValue('left', 'anchor', new SDK.CSSPropertyParserMatchers.AnchorFunctionMatcher());
      assert.isNull(match, text);
    });

    it('should not match anchor() call without arguments', () => {
      const {match: anchorMatch} =
          matchSingleValue('left', 'anchor()', new SDK.CSSPropertyParserMatchers.AnchorFunctionMatcher());
      assert.isNull(anchorMatch);
    });

    it('should match anchor-size() call without arguments', () => {
      const {match: anchorSizeMatch, text: anchorSizeText} =
          matchSingleValue('width', 'anchor-size()', new SDK.CSSPropertyParserMatchers.AnchorFunctionMatcher());
      assert.exists(anchorSizeMatch, anchorSizeText);
    });

    it('should match if it is an anchor() or anchor-size() call', () => {
      const {match: anchorMatch, text: anchorText} =
          matchSingleValue('left', 'anchor(left)', new SDK.CSSPropertyParserMatchers.AnchorFunctionMatcher());
      assert.exists(anchorMatch, anchorText);

      const {match: anchorSizeMatch, text: anchorSizeText} =
          matchSingleValue('width', 'anchor-size(width)', new SDK.CSSPropertyParserMatchers.AnchorFunctionMatcher());
      assert.exists(anchorSizeMatch, anchorSizeText);
    });

    it('should match dashed identifier as name from the first argument', () => {
      const {match: anchorMatch, text: anchorText} = matchSingleValue(
          'left', 'anchor(--dashed-ident left)', new SDK.CSSPropertyParserMatchers.AnchorFunctionMatcher());
      assert.exists(anchorMatch, anchorText);
      assert.strictEqual(anchorMatch.text, '--dashed-ident');

      const {match: anchorSizeMatch, text: anchorSizeText} = matchSingleValue(
          'width', 'anchor-size(--dashed-ident width)', new SDK.CSSPropertyParserMatchers.AnchorFunctionMatcher());
      assert.exists(anchorSizeMatch, anchorSizeText);
      assert.strictEqual(anchorSizeMatch.text, '--dashed-ident');
    });

    it('should match dashed identifier as name from the second argument', () => {
      const {match: anchorMatch, text: anchorText} = matchSingleValue(
          'left', 'anchor(right --dashed-ident)', new SDK.CSSPropertyParserMatchers.AnchorFunctionMatcher());
      assert.exists(anchorMatch, anchorText);
      assert.strictEqual(anchorMatch.text, '--dashed-ident');

      const {match: anchorSizeMatch, text: anchorSizeText} = matchSingleValue(
          'width', 'anchor-size(height --dashed-ident)', new SDK.CSSPropertyParserMatchers.AnchorFunctionMatcher());
      assert.exists(anchorSizeMatch, anchorSizeText);
      assert.strictEqual(anchorSizeMatch.text, '--dashed-ident');
    });
  });

  describe('PositionAnchorMatcher', () => {
    it('should match `position-anchor` property with dashed identifier', () => {
      const {match, text} = matchSingleValue(
          'position-anchor', '--dashed-ident', new SDK.CSSPropertyParserMatchers.PositionAnchorMatcher());
      assert.exists(match, text);
      assert.strictEqual(match.text, '--dashed-ident');
    });

    it('should not match `position-anchor` property when it is not a dashed identifier', () => {
      const {match} = matchSingleValue(
          'position-anchor', 'something-non-dashed', new SDK.CSSPropertyParserMatchers.PositionAnchorMatcher());
      assert.isNull(match);
    });
  });

  describe('PositionTryMatcher', () => {
    it('should match `position-try[-fallbacks]` property with linkable names', () => {
      {
        const {match, text} = matchSingleValue(
            'position-try', 'flip-block, --top, --bottom', new SDK.CSSPropertyParserMatchers.PositionTryMatcher());
        assert.exists(match, text);
        assert.strictEqual(match.text, 'flip-block, --top, --bottom');
        assert.lengthOf(match.preamble, 0);
      } {
        const {ast, match, text} = matchSingleValue(
            'position-try', '/* comment */ most-height --top, --bottom',
            new SDK.CSSPropertyParserMatchers.PositionTryMatcher());
        assert.exists(ast, text);
        assert.exists(match, text);
        assert.strictEqual(match.text, '/* comment */ most-height --top, --bottom');
        assert.strictEqual(
            ast.textRange(match.preamble[0], match.preamble[match.preamble.length - 1]), '/* comment */ most-height');

      } {
        const {match, text} = matchSingleValue(
            'position-try-fallbacks', '/* comment */ flip-block, --top, /* comment */ --bottom',
            new SDK.CSSPropertyParserMatchers.PositionTryMatcher());
        assert.exists(match, text);
        assert.strictEqual(match.text, '/* comment */ flip-block, --top, /* comment */ --bottom');
        assert.lengthOf(match.preamble, 0);
      } {
        const {match} =
            matchSingleValue('position-try', 'revert', new SDK.CSSPropertyParserMatchers.PositionTryMatcher());
        assert.isNull(match);
      }
    });
  });

  describe('MathFunctionMatcher', () => {
    it('matches selecting functions', () => {
      const success = ['clamp(1px, 2px, 3px)', 'min(1, 2)', 'max(3, 4)'];
      for (const value of success) {
        const {match, text} = matchSingleValue('width', value, new SDK.CSSPropertyParserMatchers.MathFunctionMatcher());
        assert.exists(match, text);
        assert.strictEqual(match.text, value);
        assert.strictEqual(match.func, value.substr(0, value.indexOf('(')));
        assert.isAbove(match.args.length, 0);
      }

      const failure = ['clomp(1px, 2px, 3px)', 'min()'];
      for (const value of failure) {
        const {match, text} = matchSingleValue('width', value, new SDK.CSSPropertyParserMatchers.MathFunctionMatcher());
        assert.notExists(match, text);
      }
    });
  });

  it('matches lengths', () => {
    for (const unit of SDK.CSSPropertyParserMatchers.LengthMatcher.LENGTH_UNITS) {
      const {match, text} =
          matchSingleValue('min-width', `100${unit}`, new SDK.CSSPropertyParserMatchers.LengthMatcher());
      assert.exists(match, text);
      assert.strictEqual(match.text, `100${unit}`);
    }
  });

  it('match css keywords', () => {
    const propertyStub = sinon.createStubInstance(SDK.CSSProperty.CSSProperty);
    const matchedStylesStub = sinon.createStubInstance(SDK.CSSMatchedStyles.CSSMatchedStyles);
    for (const keyword of SDK.CSSMetadata.CSSWideKeywords) {
      const {match, text} = matchSingleValue(
          '--property', keyword,
          new SDK.CSSPropertyParserMatchers.CSSWideKeywordMatcher(propertyStub, matchedStylesStub));
      assert.exists(match, text);
      assert.strictEqual(match.text, keyword);
    }

    const {match, text} = matchSingleValue(
        '--property', '1px inherits',
        new SDK.CSSPropertyParserMatchers.CSSWideKeywordMatcher(propertyStub, matchedStylesStub));
    assert.notExists(match, text);
  });

  it('match flex and grid values', () => {
    const good = [
      'flex',
      'grid',
      'inline-flex',
      'inline-grid',
      'block flex',
      'block grid',
      'inline   flex',
      'inline grid',
      'inline grid !important',
      'grid /* comment */',
    ];
    const bad = ['flex block', 'grid inline', 'block', 'inline'];
    for (const value of good) {
      const {match, text} = matchSingleValue('display', value, new SDK.CSSPropertyParserMatchers.FlexGridMatcher());
      assert.exists(match, text);
      assert.strictEqual(match.text.includes('flex'), match.isFlex);
    }
    for (const value of bad) {
      const {match, text} = matchSingleValue('display', value, new SDK.CSSPropertyParserMatchers.FlexGridMatcher());
      assert.notExists(match, text);
    }
  });
});
