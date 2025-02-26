// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

import type {CSSMatchedStyles, CSSValueSource, CSSVariableValue} from './CSSMatchedStyles.js';
import {
  CSSMetadata,
  cssMetadata,
  type CSSWideKeyword,
  CubicBezierKeywordValues,
  FontFamilyRegex,
  FontPropertiesRegex
} from './CSSMetadata.js';
import type {CSSProperty} from './CSSProperty.js';
import {
  ASTUtils,
  type BottomUpTreeMatching,
  type Match,
  matcherBase,
  type SyntaxTree,
  tokenizeDeclaration
} from './CSSPropertyParser.js';
import type {CSSStyleDeclaration} from './CSSStyleDeclaration.js';

export class BaseVariableMatch implements Match {
  constructor(
      readonly text: string,
      readonly node: CodeMirror.SyntaxNode,
      readonly name: string,
      readonly fallback: CodeMirror.SyntaxNode[],
      readonly matching: BottomUpTreeMatching,
      readonly computedTextCallback: (match: BaseVariableMatch, matching: BottomUpTreeMatching) => string | null,
  ) {
  }

  computedText(): string|null {
    return this.computedTextCallback(this, this.matching);
  }
}

// This matcher provides matching for var() functions and basic computedText support. Computed text is resolved by a
// callback. This matcher is intended to be used directly only in environments where CSSMatchedStyles is not available.
// A more ergonomic version of this matcher exists in VariableMatcher, which uses CSSMatchedStyles to correctly resolve
// variable references automatically.
// clang-format off
export class BaseVariableMatcher extends matcherBase(BaseVariableMatch) {
  // clang-format on
  readonly #computedTextCallback: (match: BaseVariableMatch, matching: BottomUpTreeMatching) => string | null;
  constructor(computedTextCallback: (match: BaseVariableMatch, matching: BottomUpTreeMatching) => string | null) {
    super();
    this.#computedTextCallback = computedTextCallback;
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): BaseVariableMatch|null {
    const callee = node.getChild('Callee');
    const args = node.getChild('ArgList');
    if (node.name !== 'CallExpression' || !callee || (matching.ast.text(callee) !== 'var') || !args) {
      return null;
    }

    const [lparenNode, nameNode, ...fallbackOrRParenNodes] = ASTUtils.children(args);

    if (lparenNode?.name !== '(' || nameNode?.name !== 'VariableName') {
      return null;
    }

    if (fallbackOrRParenNodes.length <= 1 && fallbackOrRParenNodes[0]?.name !== ')') {
      return null;
    }

    let fallback: CodeMirror.SyntaxNode[] = [];
    if (fallbackOrRParenNodes.length > 1) {
      if (fallbackOrRParenNodes.shift()?.name !== ',') {
        return null;
      }
      if (fallbackOrRParenNodes.pop()?.name !== ')') {
        return null;
      }
      fallback = fallbackOrRParenNodes;
      if (fallback.length === 0) {
        return null;
      }
      if (fallback.some(n => n.name === ',')) {
        return null;
      }
    }

    const varName = matching.ast.text(nameNode);
    if (!varName.startsWith('--')) {
      return null;
    }

    return new BaseVariableMatch(
        matching.ast.text(node), node, varName, fallback, matching, this.#computedTextCallback);
  }
}

export class VariableMatch extends BaseVariableMatch {
  constructor(
      text: string,
      node: CodeMirror.SyntaxNode,
      name: string,
      fallback: CodeMirror.SyntaxNode[],
      matching: BottomUpTreeMatching,
      readonly matchedStyles: CSSMatchedStyles,
      readonly style: CSSStyleDeclaration,
  ) {
    super(text, node, name, fallback, matching, () => this.resolveVariable()?.value ?? this.fallbackValue());
  }

  resolveVariable(): CSSVariableValue|null {
    return this.matchedStyles.computeCSSVariable(this.style, this.name);
  }

  fallbackValue(): string|null {
    if (this.fallback.length === 0 ||
        this.matching.hasUnresolvedVarsRange(this.fallback[0], this.fallback[this.fallback.length - 1])) {
      return null;
    }
    return this.matching.getComputedTextRange(this.fallback[0], this.fallback[this.fallback.length - 1]);
  }
}

// clang-format off
export class VariableMatcher extends matcherBase(VariableMatch) {
  // clang-format on
  constructor(readonly matchedStyles: CSSMatchedStyles, readonly style: CSSStyleDeclaration) {
    super();
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): VariableMatch|null {
    const match = new BaseVariableMatcher(() => null).matches(node, matching);
    return match ?
        new VariableMatch(
            match.text, match.node, match.name, match.fallback, match.matching, this.matchedStyles, this.style) :
        null;
  }
}

export class TextMatch implements Match {
  computedText?: () => string;
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode) {
    if (node.name === 'Comment') {
      this.computedText = () => '';
    }
  }
  render(): Node[] {
    return [document.createTextNode(this.text)];
  }
}

// clang-format off
export class TextMatcher extends matcherBase(TextMatch) {
  // clang-format on
  override accepts(): boolean {
    return true;
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): TextMatch|null {
    if (!node.firstChild || node.name === 'NumberLiteral' /* may have a Unit child */) {
      // Leaf node, just emit text
      const text = matching.ast.text(node);
      if (text.length) {
        return new TextMatch(text, node);
      }
    }
    return null;
  }
}

export class AngleMatch implements Match {
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode) {
  }

  computedText(): string {
    return this.text;
  }
}

// clang-format off
export class AngleMatcher extends matcherBase(AngleMatch) {
  // clang-format on
  override accepts(propertyName: string): boolean {
    return cssMetadata().isAngleAwareProperty(propertyName);
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): AngleMatch|null {
    if (node.name !== 'NumberLiteral') {
      return null;
    }
    const unit = node.getChild('Unit');
    // TODO(crbug/1138628) handle unitless 0
    if (!unit || !['deg', 'grad', 'rad', 'turn'].includes(matching.ast.text(unit))) {
      return null;
    }

    return new AngleMatch(matching.ast.text(node), node);
  }
}

function literalToNumber(node: CodeMirror.SyntaxNode, ast: SyntaxTree): number|null {
  if (node.type.name !== 'NumberLiteral') {
    return null;
  }
  const text = ast.text(node);

  return Number(text.substring(0, text.length - ast.text(node.getChild('Unit')).length));
}

export class ColorMixMatch implements Match {
  constructor(
      readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly space: CodeMirror.SyntaxNode[],
      readonly color1: CodeMirror.SyntaxNode[], readonly color2: CodeMirror.SyntaxNode[]) {
  }
}

// clang-format off
export class ColorMixMatcher extends matcherBase(ColorMixMatch) {
  // clang-format on
  override accepts(propertyName: string): boolean {
    return cssMetadata().isColorAwareProperty(propertyName);
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): ColorMixMatch|null {
    if (node.name !== 'CallExpression' || matching.ast.text(node.getChild('Callee')) !== 'color-mix') {
      return null;
    }

    const computedValueTree = tokenizeDeclaration('--property', matching.getComputedText(node));
    if (!computedValueTree) {
      return null;
    }

    const value = ASTUtils.declValue(computedValueTree.tree);
    if (!value) {
      return null;
    }
    const computedValueArgs = ASTUtils.callArgs(value);
    if (computedValueArgs.length !== 3) {
      return null;
    }

    const [space, color1, color2] = computedValueArgs;
    // Verify that all arguments are there, and that the space starts with a literal `in`.
    if (space.length < 2 || computedValueTree.text(ASTUtils.stripComments(space).next().value) !== 'in' ||
        color1.length < 1 || color2.length < 1) {
      return null;
    }

    // Verify there's at most one percentage value for each color.
    const p1 =
        color1.filter(n => n.type.name === 'NumberLiteral' && computedValueTree.text(n.getChild('Unit')) === '%');
    const p2 =
        color2.filter(n => n.type.name === 'NumberLiteral' && computedValueTree.text(n.getChild('Unit')) === '%');
    if (p1.length > 1 || p2.length > 1) {
      return null;
    }

    // Verify that if both colors carry percentages, they aren't both zero (which is an invalid property value).
    if (p1[0] && p2[0] && (literalToNumber(p1[0], computedValueTree) ?? 0) === 0 &&
        (literalToNumber(p2[0], computedValueTree) ?? 0) === 0) {
      return null;
    }

    const args = ASTUtils.callArgs(node);
    if (args.length !== 3) {
      return null;
    }
    return new ColorMixMatch(matching.ast.text(node), node, args[0], args[1], args[2]);
  }
}

// clang-format off
export class URLMatch implements Match {
  constructor(
      readonly url: Platform.DevToolsPath.UrlString, readonly text: string, readonly node: CodeMirror.SyntaxNode) {
  }
}

// clang-format off
export class URLMatcher extends matcherBase(URLMatch) {
  // clang-format on
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): URLMatch|null {
    if (node.name !== 'CallLiteral') {
      return null;
    }
    const callee = node.getChild('CallTag');
    if (!callee || matching.ast.text(callee) !== 'url') {
      return null;
    }
    const [, lparenNode, urlNode, rparenNode] = ASTUtils.siblings(callee);
    if (matching.ast.text(lparenNode) !== '(' ||
        (urlNode.name !== 'ParenthesizedContent' && urlNode.name !== 'StringLiteral') ||
        matching.ast.text(rparenNode) !== ')') {
      return null;
    }

    const text = matching.ast.text(urlNode);
    const url = (urlNode.name === 'StringLiteral' ? text.substr(1, text.length - 2) : text.trim()) as
        Platform.DevToolsPath.UrlString;
    return new URLMatch(url, matching.ast.text(node), node);
  }
}

export class LinearGradientMatch implements Match {
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode) {
  }
}

// clang-format off
export class LinearGradientMatcher extends matcherBase(LinearGradientMatch) {
  // clang-format on
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    const text = matching.ast.text(node);
    if (node.name === 'CallExpression' && matching.ast.text(node.getChild('Callee')) === 'linear-gradient') {
      return new LinearGradientMatch(text, node);
    }
    return null;
  }
  override accepts(propertyName: string): boolean {
    return ['background', 'background-image', '-webkit-mask-image'].includes(propertyName);
  }
}

export class ColorMatch implements Match {
  computedText: (() => string | null)|undefined;
  constructor(
      readonly text: string, readonly node: CodeMirror.SyntaxNode,
      private readonly currentColorCallback?: () => string | null) {
    this.computedText = currentColorCallback;
  }
}

// clang-format off
export class ColorMatcher extends matcherBase(ColorMatch) {
  constructor(private readonly currentColorCallback?: () => string|null) {
      super();
  }
  // clang-format on
  override accepts(propertyName: string): boolean {
    return cssMetadata().isColorAwareProperty(propertyName);
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): ColorMatch|null {
    const text = matching.ast.text(node);
    if (node.name === 'ColorLiteral') {
      return new ColorMatch(text, node);
    }
    if (node.name === 'ValueName') {
      if (Common.Color.Nicknames.has(text)) {
        return new ColorMatch(text, node);
      }
      if (text.toLowerCase() === 'currentcolor' && this.currentColorCallback) {
        const callback = this.currentColorCallback;
        return new ColorMatch(text, node, () => callback() ?? text);
      }
    }
    if (node.name === 'CallExpression') {
      const callee = node.getChild('Callee');
      if (callee && matching.ast.text(callee).match(/^(rgba?|hsla?|hwba?|lab|lch|oklab|oklch|color)$/)) {
        return new ColorMatch(text, node);
      }
    }
    return null;
  }
}

export class LightDarkColorMatch implements Match {
  constructor(
      readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly light: CodeMirror.SyntaxNode[],
      readonly dark: CodeMirror.SyntaxNode[], readonly property: CSSProperty) {
  }
}

// clang-format off
export class LightDarkColorMatcher extends matcherBase(LightDarkColorMatch) {
  // clang-format on
  constructor(readonly property: CSSProperty) {
    super();
  }
  override accepts(propertyName: string): boolean {
    return cssMetadata().isColorAwareProperty(propertyName);
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): LightDarkColorMatch|null {
    if (node.name !== 'CallExpression' || matching.ast.text(node.getChild('Callee')) !== 'light-dark') {
      return null;
    }
    const args = ASTUtils.callArgs(node);
    if (args.length !== 2 || args[0].length === 0 || args[1].length === 0) {
      return null;
    }
    return new LightDarkColorMatch(matching.ast.text(node), node, args[0], args[1], this.property);
  }
}

export class AutoBaseMatch implements Match {
  constructor(
      readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly auto: CodeMirror.SyntaxNode[],
      readonly base: CodeMirror.SyntaxNode[]) {
  }
}

// clang-format off
export class AutoBaseMatcher extends matcherBase(AutoBaseMatch) {
  // clang-format on
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): AutoBaseMatch|null {
    if (node.name !== 'CallExpression' || matching.ast.text(node.getChild('Callee')) !== '-internal-auto-base') {
      return null;
    }

    const args = ASTUtils.callArgs(node);
    if (args.length !== 2 || args[0].length === 0 || args[1].length === 0) {
      return null;
    }

    return new AutoBaseMatch(matching.ast.text(node), node, args[0], args[1]);
  }
}

export const enum LinkableNameProperties {
  ANIMATION = 'animation',
  ANIMATION_NAME = 'animation-name',
  FONT_PALETTE = 'font-palette',
  POSITION_TRY_FALLBACKS = 'position-try-fallbacks',
  POSITION_TRY = 'position-try',
}

const enum AnimationLonghandPart {
  DIRECTION = 'direction',
  FILL_MODE = 'fill-mode',
  PLAY_STATE = 'play-state',
  ITERATION_COUNT = 'iteration-count',
  EASING_FUNCTION = 'easing-function',
}

export class LinkableNameMatch implements Match {
  constructor(
      readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly propertyName: LinkableNameProperties) {
  }
}

// clang-format off
export class LinkableNameMatcher extends matcherBase(LinkableNameMatch) {
  // clang-format on
  private static isLinkableNameProperty(propertyName: string): propertyName is LinkableNameProperties {
    const names: string[] = [
      LinkableNameProperties.ANIMATION,
      LinkableNameProperties.ANIMATION_NAME,
      LinkableNameProperties.FONT_PALETTE,
      LinkableNameProperties.POSITION_TRY_FALLBACKS,
      LinkableNameProperties.POSITION_TRY,
    ];
    return names.includes(propertyName);
  }

  static readonly identifierAnimationLonghandMap = new Map<string, AnimationLonghandPart>(
      Object.entries({
        normal: AnimationLonghandPart.DIRECTION,
        alternate: AnimationLonghandPart.DIRECTION,
        reverse: AnimationLonghandPart.DIRECTION,
        'alternate-reverse': AnimationLonghandPart.DIRECTION,
        none: AnimationLonghandPart.FILL_MODE,
        forwards: AnimationLonghandPart.FILL_MODE,
        backwards: AnimationLonghandPart.FILL_MODE,
        both: AnimationLonghandPart.FILL_MODE,
        running: AnimationLonghandPart.PLAY_STATE,
        paused: AnimationLonghandPart.PLAY_STATE,
        infinite: AnimationLonghandPart.ITERATION_COUNT,
        linear: AnimationLonghandPart.EASING_FUNCTION,
        ease: AnimationLonghandPart.EASING_FUNCTION,
        'ease-in': AnimationLonghandPart.EASING_FUNCTION,
        'ease-out': AnimationLonghandPart.EASING_FUNCTION,
        'ease-in-out': AnimationLonghandPart.EASING_FUNCTION,
        steps: AnimationLonghandPart.EASING_FUNCTION,
        'step-start': AnimationLonghandPart.EASING_FUNCTION,
        'step-end': AnimationLonghandPart.EASING_FUNCTION,
      }),
  );

  private matchAnimationNameInShorthand(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): LinkableNameMatch|
      null {
    // Order is important within each animation definition for distinguishing <keyframes-name> values from other keywords.
    // When parsing, keywords that are valid for properties other than animation-name
    // whose values were not found earlier in the shorthand must be accepted for those properties rather than for animation-name.
    // See the details in: https://w3c.github.io/csswg-drafts/css-animations/#animation.
    const text = matching.ast.text(node);
    // This is not a known identifier, so return it as `animation-name`.
    if (!LinkableNameMatcher.identifierAnimationLonghandMap.has(text)) {
      return new LinkableNameMatch(text, node, LinkableNameProperties.ANIMATION);
    }
    // There can be multiple `animation` declarations splitted by a comma.
    // So, we find the declaration nodes that are related to the node argument.
    const declarations = ASTUtils.split(ASTUtils.siblings(ASTUtils.declValue(matching.ast.tree)));
    const currentDeclarationNodes = declarations.find(
        declaration => declaration[0].from <= node.from && declaration[declaration.length - 1].to >= node.to);
    if (!currentDeclarationNodes) {
      return null;
    }

    // We reparse here until the node argument since a variable might be
    // providing a meaningful value such as a timing keyword,
    // that might change the meaning of the node.
    const computedText = matching.getComputedTextRange(currentDeclarationNodes[0], node);
    const tokenized = tokenizeDeclaration('--p', computedText);
    if (!tokenized) {
      return null;
    }

    const identifierCategory =
        LinkableNameMatcher.identifierAnimationLonghandMap.get(text);  // The category of the node argument
    for (let itNode: typeof tokenized.tree|null = ASTUtils.declValue(tokenized.tree); itNode?.nextSibling;
         itNode = itNode.nextSibling) {
      // Run through all the nodes that come before node argument
      // and check whether a value in the same category is found.
      // if so, it means our identifier is an `animation-name` keyword.
      if (itNode.name === 'ValueName') {
        const categoryValue = LinkableNameMatcher.identifierAnimationLonghandMap.get(tokenized.text(itNode));
        if (categoryValue && categoryValue === identifierCategory) {
          return new LinkableNameMatch(text, node, LinkableNameProperties.ANIMATION);
        }
      }
    }

    return null;
  }

  override accepts(propertyName: string): boolean {
    return LinkableNameMatcher.isLinkableNameProperty(propertyName);
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): LinkableNameMatch|null {
    const {propertyName} = matching.ast;
    const text = matching.ast.text(node);
    const parentNode = node.parent;
    if (!parentNode) {
      return null;
    }

    const isParentADeclaration = parentNode.name === 'Declaration';
    const isInsideVarCall = parentNode.name === 'ArgList' && parentNode.prevSibling?.name === 'Callee' &&
        matching.ast.text(parentNode.prevSibling) === 'var';
    const isAParentDeclarationOrVarCall = isParentADeclaration || isInsideVarCall;
    // `position-try-fallbacks` and `position-try` only accept names with dashed ident.
    const shouldMatchOnlyVariableName = propertyName === LinkableNameProperties.POSITION_TRY ||
        propertyName === LinkableNameProperties.POSITION_TRY_FALLBACKS;
    // We only mark top level nodes or nodes that are inside `var()` expressions as linkable names.
    if (!propertyName || (node.name !== 'ValueName' && node.name !== 'VariableName') ||
        !isAParentDeclarationOrVarCall || (node.name === 'ValueName' && shouldMatchOnlyVariableName)) {
      return null;
    }

    if (propertyName === 'animation') {
      return this.matchAnimationNameInShorthand(node, matching);
    }

    // The assertion here is safe since this matcher only runs for
    // properties with names inside `LinkableNameProperties` (See the `accepts` function.)
    return new LinkableNameMatch(text, node, propertyName as LinkableNameProperties);
  }
}

export class BezierMatch implements Match {
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode) {
  }
}

// clang-format off
export class BezierMatcher extends matcherBase(BezierMatch) {
  // clang-format on
  override accepts(propertyName: string): boolean {
    return cssMetadata().isBezierAwareProperty(propertyName);
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    const text = matching.ast.text(node);

    const isCubicBezierKeyword = node.name === 'ValueName' && CubicBezierKeywordValues.has(text);
    const isCubicBezierOrLinearFunction = node.name === 'CallExpression' &&
        ['cubic-bezier', 'linear'].includes(matching.ast.text(node.getChild('Callee')));

    if (!isCubicBezierKeyword && !isCubicBezierOrLinearFunction) {
      return null;
    }
    return new BezierMatch(text, node);
  }
}

export class StringMatch implements Match {
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode) {
  }
}

// clang-format off
export class StringMatcher extends matcherBase(StringMatch) {
  // clang-format on
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    return node.name === 'StringLiteral' ? new StringMatch(matching.ast.text(node), node) : null;
  }
}

export const enum ShadowType {
  BOX_SHADOW = 'boxShadow',
  TEXT_SHADOW = 'textShadow',
}
export class ShadowMatch implements Match {
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly shadowType: ShadowType) {
  }
}

// clang-format off
export class ShadowMatcher extends matcherBase(ShadowMatch) {
  // clang-format on
  override accepts(propertyName: string): boolean {
    return cssMetadata().isShadowProperty(propertyName);
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): ShadowMatch|null {
    if (node.name !== 'Declaration') {
      return null;
    }
    const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
    if (valueNodes.length === 0) {
      return null;
    }
    const valueText = matching.ast.textRange(valueNodes[0], valueNodes[valueNodes.length - 1]);
    return new ShadowMatch(
        valueText, node, matching.ast.propertyName === 'text-shadow' ? ShadowType.TEXT_SHADOW : ShadowType.BOX_SHADOW);
  }
}

export class FontMatch implements Match {
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode) {
  }
}

// clang-format off
export class FontMatcher extends matcherBase(FontMatch) {
  // clang-format on
  override accepts(propertyName: string): boolean {
    return cssMetadata().isFontAwareProperty(propertyName);
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    if (node.name !== 'Declaration') {
      return null;
    }
    const regex = matching.ast.propertyName === 'font-family' ? FontFamilyRegex : FontPropertiesRegex;
    const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
    if (valueNodes.length === 0) {
      return null;
    }
    const valueText = matching.ast.textRange(valueNodes[0], valueNodes[valueNodes.length - 1]);
    return regex.test(valueText) ? new FontMatch(valueText, node) : null;
  }
}

export class LengthMatch implements Match {
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly unit: string) {
  }
}

// clang-format off
export class LengthMatcher extends matcherBase(LengthMatch) {
  // clang-format on
  static readonly LENGTH_UNITS = new Set([
    'em',  'ex',    'ch',    'cap',   'ic',  'lh',  'rem', 'rex',   'rch',   'rlh',   'ric',  'rcap', 'pt',
    'pc',  'in',    'cm',    'mm',    'Q',   'vw',  'vh',  'vi',    'vb',    'vmin',  'vmax', 'dvw',  'dvh',
    'dvi', 'dvb',   'dvmin', 'dvmax', 'svw', 'svh', 'svi', 'svb',   'svmin', 'svmax', 'lvw',  'lvh',  'lvi',
    'lvb', 'lvmin', 'lvmax', 'cqw',   'cqh', 'cqi', 'cqb', 'cqmin', 'cqmax', 'cqem',  'cqlh', 'cqex', 'cqch',
  ]);
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): LengthMatch|null {
    if (node.name !== 'NumberLiteral') {
      return null;
    }
    const unit = matching.ast.text(node.getChild('Unit'));
    if (!LengthMatcher.LENGTH_UNITS.has(unit)) {
      return null;
    }
    const text = matching.ast.text(node);
    return new LengthMatch(text, node, unit);
  }
}

export class MathFunctionMatch implements Match {
  constructor(
      readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly func: string,
      readonly args: CodeMirror.SyntaxNode[][]) {
  }
}

// clang-format off
export class MathFunctionMatcher extends matcherBase(MathFunctionMatch) {
  // clang-format on
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): MathFunctionMatch|null {
    if (node.name !== 'CallExpression') {
      return null;
    }
    const callee = matching.ast.text(node.getChild('Callee'));
    if (!['min', 'max', 'clamp', 'calc'].includes(callee)) {
      return null;
    }
    const args = ASTUtils.callArgs(node);
    if (args.some(arg => arg.length === 0 || matching.hasUnresolvedVarsRange(arg[0], arg[arg.length - 1]))) {
      return null;
    }
    const text = matching.ast.text(node);
    return new MathFunctionMatch(text, node, callee, args);
  }
}

export class FlexGridMatch implements Match {
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly isFlex: boolean) {
  }
}

// clang-format off
export class FlexGridMatcher extends matcherBase(FlexGridMatch) {
  // clang-format on
  static readonly FLEX = ['flex', 'inline-flex', 'block flex', 'inline flex'];
  static readonly GRID = ['grid', 'inline-grid', 'block grid', 'inline grid'];
  override accepts(propertyName: string): boolean {
    return propertyName === 'display';
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): FlexGridMatch|null {
    if (node.name !== 'Declaration') {
      return null;
    }
    const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
    if (valueNodes.length < 1) {
      return null;
    }
    const values = valueNodes.filter(node => node.name !== 'Important')
                       .map(node => matching.getComputedText(node).trim())
                       .filter(value => value);
    const text = values.join(' ');
    if (FlexGridMatcher.FLEX.includes(text)) {
      return new FlexGridMatch(matching.ast.text(node), node, true);
    }
    if (FlexGridMatcher.GRID.includes(text)) {
      return new FlexGridMatch(matching.ast.text(node), node, false);
    }
    return null;
  }
}

export class GridTemplateMatch implements Match {
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly lines: CodeMirror.SyntaxNode[][]) {
  }
}

// clang-format off
export class GridTemplateMatcher extends matcherBase(GridTemplateMatch) {
  // clang-format on
  override accepts(propertyName: string): boolean {
    return cssMetadata().isGridAreaDefiningProperty(propertyName);
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): GridTemplateMatch|null {
    if (node.name !== 'Declaration' || matching.hasUnresolvedVars(node)) {
      return null;
    }

    const lines: CodeMirror.SyntaxNode[][] = [];
    let curLine: CodeMirror.SyntaxNode[] = [];
    // The following two states are designed to consume different cases of LineNames:
    // 1. no LineNames in between StringLiterals;
    // 2. one LineNames in between, which means the LineNames belongs to the current line;
    // 3. two LineNames in between, which means the second LineNames starts a new line.
    // `hasLeadingLineNames` tracks if the current row already starts with a LineNames and
    // with no following StringLiteral yet, which means that the next StringLiteral should
    // be appended to the same `curLine`, instead of creating a new line.
    let hasLeadingLineNames = false;
    // `needClosingLineNames` tracks if the current row can still consume an optional LineNames,
    // which will decide if we should start a new line or not when a LineNames is encountered.
    let needClosingLineNames = false;
    // Gather row definitions of [<line-names>? <string> <track-size>? <line-names>?], which
    // be rendered into separate lines.
    function parseNodes(nodes: CodeMirror.SyntaxNode[], varParsingMode = false): void {
      for (const curNode of nodes) {
        if (matching.getMatch(curNode) instanceof BaseVariableMatch) {
          const computedValueTree = tokenizeDeclaration('--property', matching.getComputedText(curNode));
          if (!computedValueTree) {
            continue;
          }
          const varNodes = ASTUtils.siblings(ASTUtils.declValue(computedValueTree.tree));
          if (varNodes.length === 0) {
            continue;
          }
          if ((varNodes[0].name === 'StringLiteral' && !hasLeadingLineNames) ||
              (varNodes[0].name === 'LineNames' && !needClosingLineNames)) {
            // The variable value either starts with a string, or with a line name that belongs to a new row;
            // therefore we start a new line with the variable.
            lines.push(curLine);
            curLine = [curNode];
          } else {
            curLine.push(curNode);
          }
          // We parse computed nodes of this variable to correctly advance local states, but
          // these computed nodes won't be added to the lines.
          parseNodes(varNodes, true);
        } else if (curNode.name === 'BinaryExpression') {
          parseNodes(ASTUtils.siblings(curNode.firstChild));
        } else if (curNode.name === 'StringLiteral') {
          if (!varParsingMode) {
            if (hasLeadingLineNames) {
              curLine.push(curNode);
            } else {
              lines.push(curLine);
              curLine = [curNode];
            }
          }
          needClosingLineNames = true;
          hasLeadingLineNames = false;
        } else if (curNode.name === 'LineNames') {
          if (!varParsingMode) {
            if (needClosingLineNames) {
              curLine.push(curNode);
            } else {
              lines.push(curLine);
              curLine = [curNode];
            }
          }
          hasLeadingLineNames = !needClosingLineNames;
          needClosingLineNames = !needClosingLineNames;
        } else if (!varParsingMode) {
          curLine.push(curNode);
        }
      }
    }

    const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
    parseNodes(valueNodes);
    lines.push(curLine);
    const valueText = matching.ast.textRange(valueNodes[0], valueNodes[valueNodes.length - 1]);
    return new GridTemplateMatch(valueText, node, lines.filter(line => line.length > 0));
  }
}
export class AnchorFunctionMatch implements Match {
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly functionName: string|null) {
  }
}

// clang-format off
export class AnchorFunctionMatcher extends matcherBase(AnchorFunctionMatch) {
  // clang-format on
  anchorFunction(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): string|null {
    if (node.name !== 'CallExpression') {
      return null;
    }
    const calleeText = matching.ast.text(node.getChild('Callee'));
    if (calleeText === 'anchor' || calleeText === 'anchor-size') {
      return calleeText;
    }
    return null;
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): AnchorFunctionMatch|null {
    if (node.name === 'VariableName') {
      // Double-dashed anchor reference to be rendered with a link to its matching anchor.
      let parent = node.parent;
      if (!parent || parent.name !== 'ArgList') {
        return null;
      }
      parent = parent.parent;
      if (!parent || !this.anchorFunction(parent, matching)) {
        return null;
      }
      return new AnchorFunctionMatch(matching.ast.text(node), node, null);
    }
    const calleeText = this.anchorFunction(node, matching);
    if (!calleeText) {
      return null;
    }
    // Match if the anchor/anchor-size function implicitly references an anchor.
    const args = ASTUtils.children(node.getChild('ArgList'));
    if (calleeText === 'anchor' && args.length <= 2) {
      return null;
    }
    if (args.find(arg => arg.name === 'VariableName')) {
      // We have an explicit anchor reference, no need to render swatch.
      return null;
    }
    return new AnchorFunctionMatch(matching.ast.text(node), node, calleeText);
  }
}

// For linking `position-anchor: --anchor-name`.
export class PositionAnchorMatch implements Match {
  constructor(readonly text: string, readonly matching: BottomUpTreeMatching, readonly node: CodeMirror.SyntaxNode) {
  }
}

// clang-format off
export class PositionAnchorMatcher extends matcherBase(PositionAnchorMatch) {
  // clang-format on
  override accepts(propertyName: string): boolean {
    return propertyName === 'position-anchor';
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): PositionAnchorMatch|null {
    if (node.name !== 'VariableName') {
      return null;
    }

    const dashedIdentifier = matching.ast.text(node);
    return new PositionAnchorMatch(dashedIdentifier, matching, node);
  }
}

export class CSSWideKeywordMatch implements Match {
  constructor(
      readonly text: CSSWideKeyword, readonly node: CodeMirror.SyntaxNode, readonly property: CSSProperty,
      readonly matchedStyles: CSSMatchedStyles) {
  }
  resolveProperty(): CSSValueSource|null {
    return this.matchedStyles.resolveGlobalKeyword(this.property, this.text);
  }
  computedText?(): string|null {
    return this.resolveProperty()?.value ?? null;
  }
}

// clang-format off
export class CSSWideKeywordMatcher extends matcherBase(CSSWideKeywordMatch) {
  // clang-format on
  constructor(readonly property: CSSProperty, readonly matchedStyles: CSSMatchedStyles) {
    super();
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): CSSWideKeywordMatch|null {
    const parentNode = node.parent;
    if (node.name !== 'ValueName' || parentNode?.name !== 'Declaration') {
      return null;
    }

    if (Array.from(ASTUtils.stripComments(ASTUtils.siblings(ASTUtils.declValue(parentNode))))
            .some(child => !ASTUtils.equals(child, node))) {
      return null;
    }

    const text = matching.ast.text(node);
    if (!CSSMetadata.isCSSWideKeyword(text)) {
      return null;
    }

    return new CSSWideKeywordMatch(text, node, this.property, this.matchedStyles);
  }
}

export class PositionTryMatch implements Match {
  constructor(
      readonly text: string, readonly node: CodeMirror.SyntaxNode, readonly preamble: CodeMirror.SyntaxNode[],
      readonly fallbacks: CodeMirror.SyntaxNode[][]) {
  }
}

// clang-format off
export class PositionTryMatcher extends matcherBase(PositionTryMatch) {
  // clang-format on
  override accepts(propertyName: string): boolean {
    return propertyName === LinkableNameProperties.POSITION_TRY ||
        propertyName === LinkableNameProperties.POSITION_TRY_FALLBACKS;
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): PositionTryMatch|null {
    if (node.name !== 'Declaration') {
      return null;
    }

    let preamble: CodeMirror.SyntaxNode[] = [];
    const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
    const fallbacks = ASTUtils.split(valueNodes);
    if (matching.ast.propertyName === LinkableNameProperties.POSITION_TRY) {
      for (const [i, n] of fallbacks[0].entries()) {
        const computedText = matching.getComputedText(n);
        if (CSSMetadata.isCSSWideKeyword(computedText)) {
          return null;
        }
        if (CSSMetadata.isPositionTryOrderKeyword(computedText)) {
          preamble = fallbacks[0].splice(0, i + 1);
          break;
        }
      }
    }

    const valueText = matching.ast.textRange(valueNodes[0], valueNodes[valueNodes.length - 1]);
    return new PositionTryMatch(valueText, node, preamble, fallbacks);
  }
}
