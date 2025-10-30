// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import { CSSMetadata, cssMetadata, CubicBezierKeywordValues, } from './CSSMetadata.js';
import { ASTUtils, matchDeclaration, matcherBase, tokenizeDeclaration } from './CSSPropertyParser.js';
export class BaseVariableMatch {
    text;
    node;
    name;
    fallback;
    matching;
    computedTextCallback;
    constructor(text, node, name, fallback, matching, computedTextCallback) {
        this.text = text;
        this.node = node;
        this.name = name;
        this.fallback = fallback;
        this.matching = matching;
        this.computedTextCallback = computedTextCallback;
    }
    computedText() {
        return this.computedTextCallback(this, this.matching);
    }
    fallbackValue() {
        // Fallback can be missing but it can be also be empty: var(--v,)
        if (!this.fallback) {
            return null;
        }
        if (this.fallback.length === 0) {
            return '';
        }
        if (this.matching.hasUnresolvedSubstitutionsRange(this.fallback[0], this.fallback[this.fallback.length - 1])) {
            return null;
        }
        return this.matching.getComputedTextRange(this.fallback[0], this.fallback[this.fallback.length - 1]);
    }
}
// This matcher provides matching for var() functions and basic computedText support. Computed text is resolved by a
// callback. This matcher is intended to be used directly only in environments where CSSMatchedStyles is not available.
// A more ergonomic version of this matcher exists in VariableMatcher, which uses CSSMatchedStyles to correctly resolve
// variable references automatically.
// clang-format off
export class BaseVariableMatcher extends matcherBase(BaseVariableMatch) {
    // clang-format on
    #computedTextCallback;
    constructor(computedTextCallback) {
        super();
        this.#computedTextCallback = computedTextCallback;
    }
    matches(node, matching) {
        const callee = node.getChild('Callee');
        if (node.name !== 'CallExpression' || !callee || (matching.ast.text(callee) !== 'var')) {
            return null;
        }
        const args = ASTUtils.callArgs(node).map(args => Array.from(ASTUtils.stripComments(args)));
        if (args.length < 1 || args[0].length !== 1) {
            return null;
        }
        const nameNode = args[0][0];
        const fallback = args.length === 2 ? args[1] : undefined;
        if (nameNode?.name !== 'VariableName') {
            return null;
        }
        const varName = matching.ast.text(nameNode);
        if (!varName.startsWith('--')) {
            return null;
        }
        return new BaseVariableMatch(matching.ast.text(node), node, varName, fallback, matching, this.#computedTextCallback);
    }
}
export class VariableMatch extends BaseVariableMatch {
    matchedStyles;
    style;
    constructor(text, node, name, fallback, matching, matchedStyles, style) {
        super(text, node, name, fallback, matching, () => this.resolveVariable()?.value ?? this.fallbackValue());
        this.matchedStyles = matchedStyles;
        this.style = style;
    }
    resolveVariable() {
        return this.matchedStyles.computeCSSVariable(this.style, this.name);
    }
}
// clang-format off
export class VariableMatcher extends matcherBase(VariableMatch) {
    matchedStyles;
    style;
    // clang-format on
    constructor(matchedStyles, style) {
        super();
        this.matchedStyles = matchedStyles;
        this.style = style;
    }
    matches(node, matching) {
        const match = new BaseVariableMatcher(() => null).matches(node, matching);
        return match ?
            new VariableMatch(match.text, match.node, match.name, match.fallback, match.matching, this.matchedStyles, this.style) :
            null;
    }
}
export class AttributeMatch extends BaseVariableMatch {
    type;
    isCSSTokens;
    isValidType;
    rawValue;
    substitutionText;
    matchedStyles;
    style;
    constructor(text, node, name, fallback, matching, type, isCSSTokens, isValidType, rawValue, substitutionText, matchedStyles, style, computedTextCallback) {
        super(text, node, name, fallback, matching, (_, matching) => computedTextCallback(this, matching));
        this.type = type;
        this.isCSSTokens = isCSSTokens;
        this.isValidType = isValidType;
        this.rawValue = rawValue;
        this.substitutionText = substitutionText;
        this.matchedStyles = matchedStyles;
        this.style = style;
    }
    rawAttributeValue() {
        return this.rawValue;
    }
    cssType() {
        return this.type ?? RAW_STRING_TYPE;
    }
    resolveAttributeValue() {
        return this.matchedStyles.computeAttribute(this.style, this.name, { type: this.cssType(), isCSSTokens: this.isCSSTokens });
    }
}
let cssEvaluationElement = null;
function getCssEvaluationElement() {
    const id = 'css-evaluation-element';
    if (!cssEvaluationElement) {
        cssEvaluationElement = document.getElementById(id);
        if (!cssEvaluationElement) {
            cssEvaluationElement = document.createElement('div');
            cssEvaluationElement.setAttribute('id', id);
            cssEvaluationElement.setAttribute('style', 'hidden: true; --evaluation: attr(data-custom-expr type(*))');
            document.body.appendChild(cssEvaluationElement);
        }
    }
    return cssEvaluationElement;
}
/**
 * These functions use an element in the frontend to evaluate CSS. The advantage
 * of this is that it is synchronous and doesn't require a CDP method. The
 * disadvantage is it lacks context that would allow substitutions such as
 * `var()` and `calc()` to be resolved correctly, and if the user is doing
 * remote debugging there is a possibility that the CSS behavior is different
 * between the two browser versions. We use it for type checking after
 * substitutions (but not for actual evaluation) and for applying units.
 **/
export function localEvalCSS(value, type) {
    const element = getCssEvaluationElement();
    element.setAttribute('data-value', value);
    element.setAttribute('data-custom-expr', `attr(data-value ${type})`);
    return element.computedStyleMap().get('--evaluation')?.toString() ?? null;
}
/**
 * It is important to establish whether a type is valid, because if it is not,
 * the current behavior of blink is to ignore the fallback and parse as a
 * raw string, returning '' if the attribute is not set.
 **/
export function isValidCSSType(type) {
    const element = getCssEvaluationElement();
    element.setAttribute('data-custom-expr', `attr(data-nonexistent ${type}, "good")`);
    return '"good"' === (element.computedStyleMap().get('--evaluation')?.toString() ?? null);
}
export function defaultValueForCSSType(type) {
    const element = getCssEvaluationElement();
    element.setAttribute('data-custom-expr', `attr(data-nonexistent ${type ?? ''})`);
    return element.computedStyleMap().get('--evaluation')?.toString() ?? null;
}
export const RAW_STRING_TYPE = 'raw-string';
// This matcher provides matching for attr() functions and basic computedText support. Computed text is resolved by a
// callback.
// clang-format off
export class AttributeMatcher extends matcherBase(AttributeMatch) {
    matchedStyles;
    style;
    computedTextCallback;
    // clang-format on
    constructor(matchedStyles, style, computedTextCallback) {
        super();
        this.matchedStyles = matchedStyles;
        this.style = style;
        this.computedTextCallback = computedTextCallback;
    }
    matches(node, matching) {
        const callee = node.getChild('Callee');
        if (node.name !== 'CallExpression' || !callee || (matching.ast.text(callee) !== 'attr')) {
            return null;
        }
        const args = ASTUtils.callArgs(node).map(args => Array.from(ASTUtils.stripComments(args)));
        if (args.length < 1) {
            return null;
        }
        const nameNode = args[0][0];
        if (args[0].length < 1 || args[0].length > 2 || nameNode?.name !== 'ValueName') {
            return null;
        }
        const fallback = args.length === 2 ? args[1] : undefined;
        let type = null;
        let isCSSTokens = false;
        if (args[0].length === 2) {
            const typeNode = args[0][1];
            type = matching.ast.text(typeNode);
            if (typeNode.name === 'CallExpression') {
                if (matching.ast.text(typeNode.getChild('Callee')) !== 'type') {
                    return null;
                }
                isCSSTokens = true;
            }
            else if (typeNode.name !== 'ValueName' && type !== '%') {
                return null;
            }
        }
        const isValidType = type === null || isValidCSSType(type);
        isCSSTokens = isCSSTokens && isValidType;
        const attrName = matching.ast.text(nameNode);
        const rawValue = this.matchedStyles.rawAttributeValueFromStyle(this.style, attrName);
        let substitutionText = null;
        if (rawValue !== null) {
            substitutionText = isCSSTokens ? rawValue : localEvalCSS(rawValue, type ?? RAW_STRING_TYPE);
        }
        else if (!fallback) {
            // In the case of unspecified type, there is a default value
            substitutionText = defaultValueForCSSType(type);
        }
        return new AttributeMatch(matching.ast.text(node), node, attrName, fallback, matching, type, isCSSTokens, isValidType, rawValue, substitutionText, this.matchedStyles, this.style, this.computedTextCallback ?? defaultComputeText);
        function defaultComputeText(match, _matching) {
            // Don't fall back if the type is invalid.
            return match.resolveAttributeValue() ??
                (isValidType ? match.fallbackValue() : defaultValueForCSSType(match.type));
        }
    }
}
export class BinOpMatch {
    text;
    node;
    constructor(text, node) {
        this.text = text;
        this.node = node;
    }
}
// clang-format off
export class BinOpMatcher extends matcherBase(BinOpMatch) {
    // clang-format on
    accepts() {
        return true;
    }
    matches(node, matching) {
        return node.name === 'BinaryExpression' ? new BinOpMatch(matching.ast.text(node), node) : null;
    }
}
export class TextMatch {
    text;
    node;
    computedText;
    constructor(text, node) {
        this.text = text;
        this.node = node;
        if (node.name === 'Comment') {
            this.computedText = () => '';
        }
    }
    render() {
        const span = document.createElement('span');
        span.appendChild(document.createTextNode(this.text));
        return [span];
    }
}
// clang-format off
export class TextMatcher extends matcherBase(TextMatch) {
    // clang-format on
    accepts() {
        return true;
    }
    matches(node, matching) {
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
export class AngleMatch {
    text;
    node;
    constructor(text, node) {
        this.text = text;
        this.node = node;
    }
    computedText() {
        return this.text;
    }
}
// clang-format off
export class AngleMatcher extends matcherBase(AngleMatch) {
    // clang-format on
    accepts(propertyName) {
        return cssMetadata().isAngleAwareProperty(propertyName);
    }
    matches(node, matching) {
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
function literalToNumber(node, ast) {
    if (node.type.name !== 'NumberLiteral') {
        return null;
    }
    const text = ast.text(node);
    return Number(text.substring(0, text.length - ast.text(node.getChild('Unit')).length));
}
export class ColorMixMatch {
    text;
    node;
    space;
    color1;
    color2;
    constructor(text, node, space, color1, color2) {
        this.text = text;
        this.node = node;
        this.space = space;
        this.color1 = color1;
        this.color2 = color2;
    }
}
// clang-format off
export class ColorMixMatcher extends matcherBase(ColorMixMatch) {
    // clang-format on
    accepts(propertyName) {
        return cssMetadata().isColorAwareProperty(propertyName);
    }
    matches(node, matching) {
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
        const p1 = color1.filter(n => n.type.name === 'NumberLiteral' && computedValueTree.text(n.getChild('Unit')) === '%');
        const p2 = color2.filter(n => n.type.name === 'NumberLiteral' && computedValueTree.text(n.getChild('Unit')) === '%');
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
export class URLMatch {
    url;
    text;
    node;
    constructor(url, text, node) {
        this.url = url;
        this.text = text;
        this.node = node;
    }
}
// clang-format off
export class URLMatcher extends matcherBase(URLMatch) {
    // clang-format on
    matches(node, matching) {
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
        const url = (urlNode.name === 'StringLiteral' ? text.substr(1, text.length - 2) : text.trim());
        return new URLMatch(url, matching.ast.text(node), node);
    }
}
export class LinearGradientMatch {
    text;
    node;
    constructor(text, node) {
        this.text = text;
        this.node = node;
    }
}
// clang-format off
export class LinearGradientMatcher extends matcherBase(LinearGradientMatch) {
    // clang-format on
    matches(node, matching) {
        const text = matching.ast.text(node);
        if (node.name === 'CallExpression' && matching.ast.text(node.getChild('Callee')) === 'linear-gradient') {
            return new LinearGradientMatch(text, node);
        }
        return null;
    }
    accepts(propertyName) {
        return ['background', 'background-image', '-webkit-mask-image'].includes(propertyName);
    }
}
export class ColorMatch {
    text;
    node;
    currentColorCallback;
    relativeColor;
    computedText;
    constructor(text, node, currentColorCallback, relativeColor) {
        this.text = text;
        this.node = node;
        this.currentColorCallback = currentColorCallback;
        this.relativeColor = relativeColor;
        this.computedText = currentColorCallback;
    }
}
// clang-format off
export class ColorMatcher extends matcherBase(ColorMatch) {
    currentColorCallback;
    constructor(currentColorCallback) {
        super();
        this.currentColorCallback = currentColorCallback;
    }
    // clang-format on
    accepts(propertyName) {
        return cssMetadata().isColorAwareProperty(propertyName);
    }
    matches(node, matching) {
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
            const colorFunc = matching.ast.text(callee).toLowerCase();
            if (callee && colorFunc.match(/^(rgba?|hsla?|hwba?|lab|lch|oklab|oklch|color)$/)) {
                const args = ASTUtils.children(node.getChild('ArgList'));
                // args are the tokens for the parthesized expression following the function name, so in a well-formed case
                // should at least contain the open and closing parens.
                const colorText = args.length >= 2 ? matching.getComputedTextRange(args[0], args[args.length - 1]) : '';
                // colorText holds the fully substituted parenthesized expression, so colorFunc + colorText is the color
                // function call.
                const isRelativeColorSyntax = Boolean(colorText.match(/^[^)]*\(\W*from\W+/) && !matching.hasUnresolvedSubstitutions(node) &&
                    CSS.supports('color', colorFunc + colorText));
                if (!isRelativeColorSyntax) {
                    return new ColorMatch(text, node);
                }
                const tokenized = matchDeclaration('--color', '--colorFunc' + colorText, [new ColorMatcher()]);
                if (!tokenized) {
                    return null;
                }
                const [colorArgs] = ASTUtils.callArgs(ASTUtils.declValue(tokenized.ast.tree));
                // getComputedText already removed comments and such, so there must be 5 or 6 args:
                // rgb(from red c0 c1 c2) or color(from yellow srgb c0 c1 c2)
                // If any of the C is a calc expression that is a single root node. If the value contains an alpha channel that
                // is parsed as a BinOp into c2.
                if (colorArgs.length !== (colorFunc === 'color' ? 6 : 5)) {
                    return null;
                }
                const colorSpace = Common.Color.getFormat(colorFunc !== 'color' ? colorFunc : matching.ast.text(colorArgs[2]));
                if (!colorSpace) {
                    return null;
                }
                const baseColor = tokenized.getMatch(colorArgs[1]);
                if (tokenized.ast.text(colorArgs[0]) !== 'from' || !(baseColor instanceof ColorMatch)) {
                    return null;
                }
                return new ColorMatch(text, node, undefined, { colorSpace, baseColor });
            }
        }
        return null;
    }
}
function isRelativeColorChannelName(channel) {
    const maybeChannel = channel;
    switch (maybeChannel) {
        case "a" /* Common.Color.ColorChannel.A */:
        case "alpha" /* Common.Color.ColorChannel.ALPHA */:
        case "b" /* Common.Color.ColorChannel.B */:
        case "c" /* Common.Color.ColorChannel.C */:
        case "g" /* Common.Color.ColorChannel.G */:
        case "h" /* Common.Color.ColorChannel.H */:
        case "l" /* Common.Color.ColorChannel.L */:
        case "r" /* Common.Color.ColorChannel.R */:
        case "s" /* Common.Color.ColorChannel.S */:
        case "w" /* Common.Color.ColorChannel.W */:
        case "x" /* Common.Color.ColorChannel.X */:
        case "y" /* Common.Color.ColorChannel.Y */:
        case "z" /* Common.Color.ColorChannel.Z */:
            return true;
    }
    // This assignment catches missed values in the switch above.
    const catchFallback = maybeChannel; // eslint-disable-line @typescript-eslint/no-unused-vars
    return false;
}
export class RelativeColorChannelMatch {
    text;
    node;
    constructor(text, node) {
        this.text = text;
        this.node = node;
    }
    getColorChannelValue(relativeColor) {
        const color = Common.Color.parse(relativeColor.baseColor.text)?.as(relativeColor.colorSpace);
        if (color instanceof Common.Color.ColorFunction) {
            switch (this.text) {
                case "r" /* Common.Color.ColorChannel.R */:
                    return color.isXYZ() ? null : color.p0;
                case "g" /* Common.Color.ColorChannel.G */:
                    return color.isXYZ() ? null : color.p1;
                case "b" /* Common.Color.ColorChannel.B */:
                    return color.isXYZ() ? null : color.p2;
                case "x" /* Common.Color.ColorChannel.X */:
                    return color.isXYZ() ? color.p0 : null;
                case "y" /* Common.Color.ColorChannel.Y */:
                    return color.isXYZ() ? color.p1 : null;
                case "z" /* Common.Color.ColorChannel.Z */:
                    return color.isXYZ() ? color.p2 : null;
                case "alpha" /* Common.Color.ColorChannel.ALPHA */:
                    return color.alpha;
            }
        }
        else if (color instanceof Common.Color.Legacy) {
            switch (this.text) {
                case "r" /* Common.Color.ColorChannel.R */:
                    return color.rgba()[0];
                case "g" /* Common.Color.ColorChannel.G */:
                    return color.rgba()[1];
                case "b" /* Common.Color.ColorChannel.B */:
                    return color.rgba()[2];
                case "alpha" /* Common.Color.ColorChannel.ALPHA */:
                    return color.rgba()[3];
            }
        }
        else if (color && this.text in color) {
            return color[this.text];
        }
        return null;
    }
    computedText() {
        return this.text;
    }
}
// clang-format off
export class RelativeColorChannelMatcher extends matcherBase(RelativeColorChannelMatch) {
    // clang-format on
    accepts(propertyName) {
        return cssMetadata().isColorAwareProperty(propertyName);
    }
    matches(node, matching) {
        const text = matching.ast.text(node);
        if (node.name === 'ValueName' && isRelativeColorChannelName(text)) {
            return new RelativeColorChannelMatch(text, node);
        }
        return null;
    }
}
export class LightDarkColorMatch {
    text;
    node;
    light;
    dark;
    style;
    constructor(text, node, light, dark, style) {
        this.text = text;
        this.node = node;
        this.light = light;
        this.dark = dark;
        this.style = style;
    }
}
// clang-format off
export class LightDarkColorMatcher extends matcherBase(LightDarkColorMatch) {
    style;
    // clang-format on
    constructor(style) {
        super();
        this.style = style;
    }
    accepts(propertyName) {
        return cssMetadata().isColorAwareProperty(propertyName);
    }
    matches(node, matching) {
        if (node.name !== 'CallExpression' || matching.ast.text(node.getChild('Callee')) !== 'light-dark') {
            return null;
        }
        const args = ASTUtils.callArgs(node);
        if (args.length !== 2 || args[0].length === 0 || args[1].length === 0) {
            return null;
        }
        return new LightDarkColorMatch(matching.ast.text(node), node, args[0], args[1], this.style);
    }
}
export class AutoBaseMatch {
    text;
    node;
    auto;
    base;
    constructor(text, node, auto, base) {
        this.text = text;
        this.node = node;
        this.auto = auto;
        this.base = base;
    }
}
// clang-format off
export class AutoBaseMatcher extends matcherBase(AutoBaseMatch) {
    // clang-format on
    matches(node, matching) {
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
export class LinkableNameMatch {
    text;
    node;
    propertyName;
    constructor(text, node, propertyName) {
        this.text = text;
        this.node = node;
        this.propertyName = propertyName;
    }
}
// clang-format off
export class LinkableNameMatcher extends matcherBase(LinkableNameMatch) {
    // clang-format on
    static isLinkableNameProperty(propertyName) {
        const names = [
            "animation" /* LinkableNameProperties.ANIMATION */,
            "animation-name" /* LinkableNameProperties.ANIMATION_NAME */,
            "font-palette" /* LinkableNameProperties.FONT_PALETTE */,
            "position-try-fallbacks" /* LinkableNameProperties.POSITION_TRY_FALLBACKS */,
            "position-try" /* LinkableNameProperties.POSITION_TRY */,
        ];
        return names.includes(propertyName);
    }
    static identifierAnimationLonghandMap = new Map(Object.entries({
        normal: "direction" /* AnimationLonghandPart.DIRECTION */,
        alternate: "direction" /* AnimationLonghandPart.DIRECTION */,
        reverse: "direction" /* AnimationLonghandPart.DIRECTION */,
        'alternate-reverse': "direction" /* AnimationLonghandPart.DIRECTION */,
        none: "fill-mode" /* AnimationLonghandPart.FILL_MODE */,
        forwards: "fill-mode" /* AnimationLonghandPart.FILL_MODE */,
        backwards: "fill-mode" /* AnimationLonghandPart.FILL_MODE */,
        both: "fill-mode" /* AnimationLonghandPart.FILL_MODE */,
        running: "play-state" /* AnimationLonghandPart.PLAY_STATE */,
        paused: "play-state" /* AnimationLonghandPart.PLAY_STATE */,
        infinite: "iteration-count" /* AnimationLonghandPart.ITERATION_COUNT */,
        linear: "easing-function" /* AnimationLonghandPart.EASING_FUNCTION */,
        ease: "easing-function" /* AnimationLonghandPart.EASING_FUNCTION */,
        'ease-in': "easing-function" /* AnimationLonghandPart.EASING_FUNCTION */,
        'ease-out': "easing-function" /* AnimationLonghandPart.EASING_FUNCTION */,
        'ease-in-out': "easing-function" /* AnimationLonghandPart.EASING_FUNCTION */,
        steps: "easing-function" /* AnimationLonghandPart.EASING_FUNCTION */,
        'step-start': "easing-function" /* AnimationLonghandPart.EASING_FUNCTION */,
        'step-end': "easing-function" /* AnimationLonghandPart.EASING_FUNCTION */,
    }));
    matchAnimationNameInShorthand(node, matching) {
        // Order is important within each animation definition for distinguishing <keyframes-name> values from other keywords.
        // When parsing, keywords that are valid for properties other than animation-name
        // whose values were not found earlier in the shorthand must be accepted for those properties rather than for animation-name.
        // See the details in: https://w3c.github.io/csswg-drafts/css-animations/#animation.
        const text = matching.ast.text(node);
        // This is not a known identifier, so return it as `animation-name`.
        if (!LinkableNameMatcher.identifierAnimationLonghandMap.has(text)) {
            return new LinkableNameMatch(text, node, "animation" /* LinkableNameProperties.ANIMATION */);
        }
        // There can be multiple `animation` declarations splitted by a comma.
        // So, we find the declaration nodes that are related to the node argument.
        const declarations = ASTUtils.split(ASTUtils.siblings(ASTUtils.declValue(matching.ast.tree)));
        const currentDeclarationNodes = declarations.find(declaration => declaration[0].from <= node.from && declaration[declaration.length - 1].to >= node.to);
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
        const identifierCategory = LinkableNameMatcher.identifierAnimationLonghandMap.get(text); // The category of the node argument
        for (let itNode = ASTUtils.declValue(tokenized.tree); itNode?.nextSibling; itNode = itNode.nextSibling) {
            // Run through all the nodes that come before node argument
            // and check whether a value in the same category is found.
            // if so, it means our identifier is an `animation-name` keyword.
            if (itNode.name === 'ValueName') {
                const categoryValue = LinkableNameMatcher.identifierAnimationLonghandMap.get(tokenized.text(itNode));
                if (categoryValue && categoryValue === identifierCategory) {
                    return new LinkableNameMatch(text, node, "animation" /* LinkableNameProperties.ANIMATION */);
                }
            }
        }
        return null;
    }
    matches(node, matching) {
        const { propertyName } = matching.ast;
        const text = matching.ast.text(node);
        const parentNode = node.parent;
        if (!parentNode) {
            return null;
        }
        if (!(propertyName && LinkableNameMatcher.isLinkableNameProperty(propertyName))) {
            return null;
        }
        const isParentADeclaration = parentNode.name === 'Declaration';
        const isInsideVarCall = parentNode.name === 'ArgList' && parentNode.prevSibling?.name === 'Callee' &&
            matching.ast.text(parentNode.prevSibling) === 'var';
        const isAParentDeclarationOrVarCall = isParentADeclaration || isInsideVarCall;
        // `position-try-fallbacks` and `position-try` only accept names with dashed ident.
        const shouldMatchOnlyVariableName = propertyName === "position-try" /* LinkableNameProperties.POSITION_TRY */ ||
            propertyName === "position-try-fallbacks" /* LinkableNameProperties.POSITION_TRY_FALLBACKS */;
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
        return new LinkableNameMatch(text, node, propertyName);
    }
}
export class BezierMatch {
    text;
    node;
    constructor(text, node) {
        this.text = text;
        this.node = node;
    }
}
// clang-format off
export class BezierMatcher extends matcherBase(BezierMatch) {
    // clang-format on
    accepts(propertyName) {
        return cssMetadata().isBezierAwareProperty(propertyName);
    }
    matches(node, matching) {
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
export class StringMatch {
    text;
    node;
    constructor(text, node) {
        this.text = text;
        this.node = node;
    }
}
// clang-format off
export class StringMatcher extends matcherBase(StringMatch) {
    // clang-format on
    matches(node, matching) {
        return node.name === 'StringLiteral' ? new StringMatch(matching.ast.text(node), node) : null;
    }
}
export class ShadowMatch {
    text;
    node;
    shadowType;
    constructor(text, node, shadowType) {
        this.text = text;
        this.node = node;
        this.shadowType = shadowType;
    }
}
// clang-format off
export class ShadowMatcher extends matcherBase(ShadowMatch) {
    // clang-format on
    accepts(propertyName) {
        return cssMetadata().isShadowProperty(propertyName);
    }
    matches(node, matching) {
        if (node.name !== 'Declaration') {
            return null;
        }
        const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
        if (valueNodes.length === 0) {
            return null;
        }
        const valueText = matching.ast.textRange(valueNodes[0], valueNodes[valueNodes.length - 1]);
        return new ShadowMatch(valueText, node, matching.ast.propertyName === 'text-shadow' ? "textShadow" /* ShadowType.TEXT_SHADOW */ : "boxShadow" /* ShadowType.BOX_SHADOW */);
    }
}
export class FontMatch {
    text;
    node;
    constructor(text, node) {
        this.text = text;
        this.node = node;
    }
}
// clang-format off
export class FontMatcher extends matcherBase(FontMatch) {
    // clang-format on
    accepts(propertyName) {
        return cssMetadata().isFontAwareProperty(propertyName);
    }
    matches(node, matching) {
        if (node.name !== 'Declaration') {
            return null;
        }
        const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
        if (valueNodes.length === 0) {
            return null;
        }
        const validNodes = matching.ast.propertyName === 'font-family' ? ['ValueName', 'StringLiteral', 'Comment', ','] :
            ['Comment', 'ValueName', 'NumberLiteral'];
        if (valueNodes.some(node => !validNodes.includes(node.name))) {
            return null;
        }
        const valueText = matching.ast.textRange(valueNodes[0], valueNodes[valueNodes.length - 1]);
        return new FontMatch(valueText, node);
    }
}
export class LengthMatch {
    text;
    node;
    unit;
    constructor(text, node, unit) {
        this.text = text;
        this.node = node;
        this.unit = unit;
    }
}
// clang-format off
export class LengthMatcher extends matcherBase(LengthMatch) {
    // clang-format on
    static LENGTH_UNITS = new Set([
        'em', 'ex', 'ch', 'cap', 'ic', 'lh', 'rem', 'rex', 'rch', 'rlh', 'ric', 'rcap', 'pt', 'pc',
        'in', 'cm', 'mm', 'Q', 'vw', 'vh', 'vi', 'vb', 'vmin', 'vmax', 'dvw', 'dvh', 'dvi', 'dvb',
        'dvmin', 'dvmax', 'svw', 'svh', 'svi', 'svb', 'svmin', 'svmax', 'lvw', 'lvh', 'lvi', 'lvb', 'lvmin', 'lvmax',
        'cqw', 'cqh', 'cqi', 'cqb', 'cqmin', 'cqmax', 'cqem', 'cqlh', 'cqex', 'cqch', '%'
    ]);
    matches(node, matching) {
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
export class BaseFunctionMatch {
    text;
    node;
    func;
    args;
    constructor(text, node, func, args) {
        this.text = text;
        this.node = node;
        this.func = func;
        this.args = args;
    }
}
export class MathFunctionMatch extends BaseFunctionMatch {
    isArithmeticFunctionCall() {
        const func = this.func;
        switch (func) {
            case "calc" /* ArithmeticFunction.CALC */:
            case "sibling-count" /* ArithmeticFunction.SIBLING_COUNT */:
            case "sibling-index" /* ArithmeticFunction.SIBLING_INDEX */:
                return true;
        }
        // This assignment catches missed values in the switch above.
        const catchFallback = func; // eslint-disable-line @typescript-eslint/no-unused-vars
        return false;
    }
}
// clang-format off
export class MathFunctionMatcher extends matcherBase(MathFunctionMatch) {
    // clang-format on
    static getFunctionType(callee) {
        const maybeFunc = callee;
        switch (maybeFunc) {
            case null:
            case "min" /* SelectFunction.MIN */:
            case "max" /* SelectFunction.MAX */:
            case "clamp" /* SelectFunction.CLAMP */:
            case "calc" /* ArithmeticFunction.CALC */:
            case "sibling-count" /* ArithmeticFunction.SIBLING_COUNT */:
            case "sibling-index" /* ArithmeticFunction.SIBLING_INDEX */:
                return maybeFunc;
        }
        // This assignment catches missed values in the switch above.
        const catchFallback = maybeFunc; // eslint-disable-line @typescript-eslint/no-unused-vars
        return null;
    }
    matches(node, matching) {
        if (node.name !== 'CallExpression') {
            return null;
        }
        const callee = MathFunctionMatcher.getFunctionType(matching.ast.text(node.getChild('Callee')));
        if (!callee) {
            return null;
        }
        const args = ASTUtils.callArgs(node);
        if (args.some(arg => arg.length === 0 || matching.hasUnresolvedSubstitutionsRange(arg[0], arg[arg.length - 1]))) {
            return null;
        }
        const text = matching.ast.text(node);
        const match = new MathFunctionMatch(text, node, callee, args);
        if (!match.isArithmeticFunctionCall() && args.length === 0) {
            return null;
        }
        return match;
    }
}
export class CustomFunctionMatch extends BaseFunctionMatch {
}
// clang-format off
export class CustomFunctionMatcher extends matcherBase(CustomFunctionMatch) {
    // clang-format on
    matches(node, matching) {
        if (node.name !== 'CallExpression') {
            return null;
        }
        const callee = matching.ast.text(node.getChild('VariableName'));
        if (!callee?.startsWith('--')) {
            return null;
        }
        const args = ASTUtils.callArgs(node);
        if (args.some(arg => arg.length === 0 || matching.hasUnresolvedSubstitutionsRange(arg[0], arg[arg.length - 1]))) {
            return null;
        }
        const text = matching.ast.text(node);
        return new CustomFunctionMatch(text, node, callee, args);
    }
}
export class FlexGridMasonryMatch {
    text;
    node;
    layoutType;
    constructor(text, node, layoutType) {
        this.text = text;
        this.node = node;
        this.layoutType = layoutType;
    }
}
// clang-format off
export class FlexGridMasonryMatcher extends matcherBase(FlexGridMasonryMatch) {
    // clang-format on
    static FLEX = ['flex', 'inline-flex', 'block flex', 'inline flex'];
    static GRID = ['grid', 'inline-grid', 'block grid', 'inline grid'];
    static MASONRY = ['masonry', 'inline-masonry', 'block masonry', 'inline masonry'];
    accepts(propertyName) {
        return propertyName === 'display';
    }
    matches(node, matching) {
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
        if (FlexGridMasonryMatcher.FLEX.includes(text)) {
            return new FlexGridMasonryMatch(matching.ast.text(node), node, "flex" /* LayoutType.FLEX */);
        }
        if (FlexGridMasonryMatcher.GRID.includes(text)) {
            return new FlexGridMasonryMatch(matching.ast.text(node), node, "grid" /* LayoutType.GRID */);
        }
        if (FlexGridMasonryMatcher.MASONRY.includes(text)) {
            return new FlexGridMasonryMatch(matching.ast.text(node), node, "masonry" /* LayoutType.MASONRY */);
        }
        return null;
    }
}
export class GridTemplateMatch {
    text;
    node;
    lines;
    constructor(text, node, lines) {
        this.text = text;
        this.node = node;
        this.lines = lines;
    }
}
// clang-format off
export class GridTemplateMatcher extends matcherBase(GridTemplateMatch) {
    // clang-format on
    accepts(propertyName) {
        return cssMetadata().isGridAreaDefiningProperty(propertyName);
    }
    matches(node, matching) {
        if (node.name !== 'Declaration' || matching.hasUnresolvedSubstitutions(node)) {
            return null;
        }
        const lines = [];
        let curLine = [];
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
        /**
         * Gather row definitions of [<line-names>? <string> <track-size>? <line-names>?], which
         * be rendered into separate lines.
         **/
        function parseNodes(nodes, varParsingMode = false) {
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
                        (varNodes[0].name === 'BracketedValue' && !needClosingLineNames)) {
                        // The variable value either starts with a string, or with a line name that belongs to a new row;
                        // therefore we start a new line with the variable.
                        lines.push(curLine);
                        curLine = [curNode];
                    }
                    else {
                        curLine.push(curNode);
                    }
                    // We parse computed nodes of this variable to correctly advance local states, but
                    // these computed nodes won't be added to the lines.
                    parseNodes(varNodes, true);
                }
                else if (curNode.name === 'BinaryExpression') {
                    parseNodes(ASTUtils.siblings(curNode.firstChild));
                }
                else if (curNode.name === 'StringLiteral') {
                    if (!varParsingMode) {
                        if (hasLeadingLineNames) {
                            curLine.push(curNode);
                        }
                        else {
                            lines.push(curLine);
                            curLine = [curNode];
                        }
                    }
                    needClosingLineNames = true;
                    hasLeadingLineNames = false;
                }
                else if (curNode.name === 'BracketedValue') {
                    if (!varParsingMode) {
                        if (needClosingLineNames) {
                            curLine.push(curNode);
                        }
                        else {
                            lines.push(curLine);
                            curLine = [curNode];
                        }
                    }
                    hasLeadingLineNames = !needClosingLineNames;
                    needClosingLineNames = !needClosingLineNames;
                }
                else if (!varParsingMode) {
                    curLine.push(curNode);
                }
            }
        }
        const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
        if (valueNodes.length === 0) {
            return null;
        }
        parseNodes(valueNodes);
        lines.push(curLine);
        const valueText = matching.ast.textRange(valueNodes[0], valueNodes[valueNodes.length - 1]);
        return new GridTemplateMatch(valueText, node, lines.filter(line => line.length > 0));
    }
}
export class AnchorFunctionMatch {
    text;
    node;
    functionName;
    constructor(text, node, functionName) {
        this.text = text;
        this.node = node;
        this.functionName = functionName;
    }
}
// clang-format off
export class AnchorFunctionMatcher extends matcherBase(AnchorFunctionMatch) {
    // clang-format on
    anchorFunction(node, matching) {
        if (node.name !== 'CallExpression') {
            return null;
        }
        const calleeText = matching.ast.text(node.getChild('Callee'));
        if (calleeText === 'anchor' || calleeText === 'anchor-size') {
            return calleeText;
        }
        return null;
    }
    matches(node, matching) {
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
/** For linking `position-anchor: --anchor-name`. **/
export class PositionAnchorMatch {
    text;
    matching;
    node;
    constructor(text, matching, node) {
        this.text = text;
        this.matching = matching;
        this.node = node;
    }
}
// clang-format off
export class PositionAnchorMatcher extends matcherBase(PositionAnchorMatch) {
    // clang-format on
    accepts(propertyName) {
        return propertyName === 'position-anchor';
    }
    matches(node, matching) {
        if (node.name !== 'VariableName') {
            return null;
        }
        const dashedIdentifier = matching.ast.text(node);
        return new PositionAnchorMatch(dashedIdentifier, matching, node);
    }
}
export class CSSWideKeywordMatch {
    text;
    node;
    property;
    matchedStyles;
    constructor(text, node, property, matchedStyles) {
        this.text = text;
        this.node = node;
        this.property = property;
        this.matchedStyles = matchedStyles;
    }
    resolveProperty() {
        return this.matchedStyles.resolveGlobalKeyword(this.property, this.text);
    }
    computedText() {
        return this.resolveProperty()?.value ?? null;
    }
}
// clang-format off
export class CSSWideKeywordMatcher extends matcherBase(CSSWideKeywordMatch) {
    property;
    matchedStyles;
    // clang-format on
    constructor(property, matchedStyles) {
        super();
        this.property = property;
        this.matchedStyles = matchedStyles;
    }
    matches(node, matching) {
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
export class PositionTryMatch {
    text;
    node;
    preamble;
    fallbacks;
    constructor(text, node, preamble, fallbacks) {
        this.text = text;
        this.node = node;
        this.preamble = preamble;
        this.fallbacks = fallbacks;
    }
}
// clang-format off
export class PositionTryMatcher extends matcherBase(PositionTryMatch) {
    // clang-format on
    accepts(propertyName) {
        return propertyName === "position-try" /* LinkableNameProperties.POSITION_TRY */ ||
            propertyName === "position-try-fallbacks" /* LinkableNameProperties.POSITION_TRY_FALLBACKS */;
    }
    matches(node, matching) {
        if (node.name !== 'Declaration') {
            return null;
        }
        let preamble = [];
        const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
        const fallbacks = ASTUtils.split(valueNodes);
        if (matching.ast.propertyName === "position-try" /* LinkableNameProperties.POSITION_TRY */) {
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
export class EnvFunctionMatch {
    text;
    node;
    varName;
    value;
    varNameIsValid;
    constructor(text, node, varName, value, varNameIsValid) {
        this.text = text;
        this.node = node;
        this.varName = varName;
        this.value = value;
        this.varNameIsValid = varNameIsValid;
    }
    computedText() {
        return this.value;
    }
}
// clang-format off
export class EnvFunctionMatcher extends matcherBase(EnvFunctionMatch) {
    matchedStyles;
    // clang-format on
    constructor(matchedStyles) {
        super();
        this.matchedStyles = matchedStyles;
    }
    matches(node, matching) {
        if (node.name !== 'CallExpression' || matching.ast.text(node.getChild('Callee')) !== 'env') {
            return null;
        }
        const [valueNodes, ...fallbackNodes] = ASTUtils.callArgs(node);
        if (!valueNodes?.length) {
            return null;
        }
        const fallbackValue = fallbackNodes.length > 0 ? matching.getComputedTextRange(...ASTUtils.range(fallbackNodes.flat())) : undefined;
        const varName = matching.getComputedTextRange(...ASTUtils.range(valueNodes)).trim();
        const value = this.matchedStyles.environmentVariable(varName);
        return new EnvFunctionMatch(matching.ast.text(node), node, varName, value ?? fallbackValue ?? null, Boolean(value));
    }
}
//# sourceMappingURL=CSSPropertyParserMatchers.js.map