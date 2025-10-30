import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import type { CSSMatchedStyles, CSSValueSource, CSSVariableValue } from './CSSMatchedStyles.js';
import { type CSSWideKeyword } from './CSSMetadata.js';
import type { CSSProperty } from './CSSProperty.js';
import { type BottomUpTreeMatching, type Match } from './CSSPropertyParser.js';
import type { CSSStyleDeclaration } from './CSSStyleDeclaration.js';
export declare class BaseVariableMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly name: string;
    readonly fallback: CodeMirror.SyntaxNode[] | undefined;
    readonly matching: BottomUpTreeMatching;
    readonly computedTextCallback: (match: BaseVariableMatch, matching: BottomUpTreeMatching) => string | null;
    constructor(text: string, node: CodeMirror.SyntaxNode, name: string, fallback: CodeMirror.SyntaxNode[] | undefined, matching: BottomUpTreeMatching, computedTextCallback: (match: BaseVariableMatch, matching: BottomUpTreeMatching) => string | null);
    computedText(): string | null;
    fallbackValue(): string | null;
}
declare const BaseVariableMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<BaseVariableMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): BaseVariableMatch | null;
    };
};
export declare class BaseVariableMatcher extends BaseVariableMatcher_base {
    #private;
    constructor(computedTextCallback: (match: BaseVariableMatch, matching: BottomUpTreeMatching) => string | null);
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): BaseVariableMatch | null;
}
export declare class VariableMatch extends BaseVariableMatch {
    readonly matchedStyles: CSSMatchedStyles;
    readonly style: CSSStyleDeclaration;
    constructor(text: string, node: CodeMirror.SyntaxNode, name: string, fallback: CodeMirror.SyntaxNode[] | undefined, matching: BottomUpTreeMatching, matchedStyles: CSSMatchedStyles, style: CSSStyleDeclaration);
    resolveVariable(): CSSVariableValue | null;
}
declare const VariableMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<VariableMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): VariableMatch | null;
    };
};
export declare class VariableMatcher extends VariableMatcher_base {
    readonly matchedStyles: CSSMatchedStyles;
    readonly style: CSSStyleDeclaration;
    constructor(matchedStyles: CSSMatchedStyles, style: CSSStyleDeclaration);
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): VariableMatch | null;
}
export declare class AttributeMatch extends BaseVariableMatch {
    readonly type: string | null;
    readonly isCSSTokens: boolean;
    readonly isValidType: boolean;
    readonly rawValue: string | null;
    readonly substitutionText: string | null;
    readonly matchedStyles: CSSMatchedStyles;
    readonly style: CSSStyleDeclaration;
    constructor(text: string, node: CodeMirror.SyntaxNode, name: string, fallback: CodeMirror.SyntaxNode[] | undefined, matching: BottomUpTreeMatching, type: string | null, isCSSTokens: boolean, isValidType: boolean, rawValue: string | null, substitutionText: string | null, matchedStyles: CSSMatchedStyles, style: CSSStyleDeclaration, computedTextCallback: (match: AttributeMatch, matching: BottomUpTreeMatching) => string | null);
    rawAttributeValue(): string | null;
    cssType(): string;
    resolveAttributeValue(): string | null;
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
export declare function localEvalCSS(value: string, type: string): string | null;
/**
 * It is important to establish whether a type is valid, because if it is not,
 * the current behavior of blink is to ignore the fallback and parse as a
 * raw string, returning '' if the attribute is not set.
 **/
export declare function isValidCSSType(type: string): boolean;
export declare function defaultValueForCSSType(type: string | null): string | null;
export declare const RAW_STRING_TYPE = "raw-string";
declare const AttributeMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<AttributeMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): AttributeMatch | null;
    };
};
export declare class AttributeMatcher extends AttributeMatcher_base {
    private readonly matchedStyles;
    private readonly style;
    private readonly computedTextCallback?;
    constructor(matchedStyles: CSSMatchedStyles, style: CSSStyleDeclaration, computedTextCallback?: ((match: AttributeMatch, matching: BottomUpTreeMatching) => string | null) | undefined);
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): AttributeMatch | null;
}
export declare class BinOpMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    constructor(text: string, node: CodeMirror.SyntaxNode);
}
declare const BinOpMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<BinOpMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): BinOpMatch | null;
    };
};
export declare class BinOpMatcher extends BinOpMatcher_base {
    accepts(): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): BinOpMatch | null;
}
export declare class TextMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    computedText?: () => string;
    constructor(text: string, node: CodeMirror.SyntaxNode);
    render(): Node[];
}
declare const TextMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<TextMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): TextMatch | null;
    };
};
export declare class TextMatcher extends TextMatcher_base {
    accepts(): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): TextMatch | null;
}
export declare class AngleMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    constructor(text: string, node: CodeMirror.SyntaxNode);
    computedText(): string;
}
declare const AngleMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<AngleMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): AngleMatch | null;
    };
};
export declare class AngleMatcher extends AngleMatcher_base {
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): AngleMatch | null;
}
export declare class ColorMixMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly space: CodeMirror.SyntaxNode[];
    readonly color1: CodeMirror.SyntaxNode[];
    readonly color2: CodeMirror.SyntaxNode[];
    constructor(text: string, node: CodeMirror.SyntaxNode, space: CodeMirror.SyntaxNode[], color1: CodeMirror.SyntaxNode[], color2: CodeMirror.SyntaxNode[]);
}
declare const ColorMixMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<ColorMixMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): ColorMixMatch | null;
    };
};
export declare class ColorMixMatcher extends ColorMixMatcher_base {
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): ColorMixMatch | null;
}
export declare class URLMatch implements Match {
    readonly url: Platform.DevToolsPath.UrlString;
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    constructor(url: Platform.DevToolsPath.UrlString, text: string, node: CodeMirror.SyntaxNode);
}
declare const URLMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<URLMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): URLMatch | null;
    };
};
export declare class URLMatcher extends URLMatcher_base {
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): URLMatch | null;
}
export declare class LinearGradientMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    constructor(text: string, node: CodeMirror.SyntaxNode);
}
declare const LinearGradientMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<LinearGradientMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): LinearGradientMatch | null;
    };
};
export declare class LinearGradientMatcher extends LinearGradientMatcher_base {
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match | null;
    accepts(propertyName: string): boolean;
}
interface RelativeColor {
    colorSpace: Common.Color.Format;
    baseColor: ColorMatch;
}
export declare class ColorMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    private readonly currentColorCallback?;
    readonly relativeColor?: RelativeColor | undefined;
    computedText: (() => string | null) | undefined;
    constructor(text: string, node: CodeMirror.SyntaxNode, currentColorCallback?: (() => string | null) | undefined, relativeColor?: RelativeColor | undefined);
}
declare const ColorMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<ColorMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): ColorMatch | null;
    };
};
export declare class ColorMatcher extends ColorMatcher_base {
    private readonly currentColorCallback?;
    constructor(currentColorCallback?: (() => string | null) | undefined);
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): ColorMatch | null;
}
export declare class RelativeColorChannelMatch implements Match {
    readonly text: Common.Color.ColorChannel;
    readonly node: CodeMirror.SyntaxNode;
    constructor(text: Common.Color.ColorChannel, node: CodeMirror.SyntaxNode);
    getColorChannelValue(relativeColor: RelativeColor): number | null;
    computedText(): string;
}
declare const RelativeColorChannelMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<RelativeColorChannelMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): RelativeColorChannelMatch | null;
    };
};
export declare class RelativeColorChannelMatcher extends RelativeColorChannelMatcher_base {
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): RelativeColorChannelMatch | null;
}
export declare class LightDarkColorMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly light: CodeMirror.SyntaxNode[];
    readonly dark: CodeMirror.SyntaxNode[];
    readonly style: CSSStyleDeclaration;
    constructor(text: string, node: CodeMirror.SyntaxNode, light: CodeMirror.SyntaxNode[], dark: CodeMirror.SyntaxNode[], style: CSSStyleDeclaration);
}
declare const LightDarkColorMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<LightDarkColorMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): LightDarkColorMatch | null;
    };
};
export declare class LightDarkColorMatcher extends LightDarkColorMatcher_base {
    readonly style: CSSStyleDeclaration;
    constructor(style: CSSStyleDeclaration);
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): LightDarkColorMatch | null;
}
export declare class AutoBaseMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly auto: CodeMirror.SyntaxNode[];
    readonly base: CodeMirror.SyntaxNode[];
    constructor(text: string, node: CodeMirror.SyntaxNode, auto: CodeMirror.SyntaxNode[], base: CodeMirror.SyntaxNode[]);
}
declare const AutoBaseMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<AutoBaseMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): AutoBaseMatch | null;
    };
};
export declare class AutoBaseMatcher extends AutoBaseMatcher_base {
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): AutoBaseMatch | null;
}
export declare const enum LinkableNameProperties {
    ANIMATION = "animation",
    ANIMATION_NAME = "animation-name",
    FONT_PALETTE = "font-palette",
    POSITION_TRY_FALLBACKS = "position-try-fallbacks",
    POSITION_TRY = "position-try"
}
declare const enum AnimationLonghandPart {
    DIRECTION = "direction",
    FILL_MODE = "fill-mode",
    PLAY_STATE = "play-state",
    ITERATION_COUNT = "iteration-count",
    EASING_FUNCTION = "easing-function"
}
export declare class LinkableNameMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly propertyName: LinkableNameProperties;
    constructor(text: string, node: CodeMirror.SyntaxNode, propertyName: LinkableNameProperties);
}
declare const LinkableNameMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<LinkableNameMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): LinkableNameMatch | null;
    };
};
export declare class LinkableNameMatcher extends LinkableNameMatcher_base {
    private static isLinkableNameProperty;
    static readonly identifierAnimationLonghandMap: Map<string, AnimationLonghandPart>;
    private matchAnimationNameInShorthand;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): LinkableNameMatch | null;
}
export declare class BezierMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    constructor(text: string, node: CodeMirror.SyntaxNode);
}
declare const BezierMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<BezierMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): BezierMatch | null;
    };
};
export declare class BezierMatcher extends BezierMatcher_base {
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match | null;
}
export declare class StringMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    constructor(text: string, node: CodeMirror.SyntaxNode);
}
declare const StringMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<StringMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): StringMatch | null;
    };
};
export declare class StringMatcher extends StringMatcher_base {
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match | null;
}
export declare const enum ShadowType {
    BOX_SHADOW = "boxShadow",
    TEXT_SHADOW = "textShadow"
}
export declare class ShadowMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly shadowType: ShadowType;
    constructor(text: string, node: CodeMirror.SyntaxNode, shadowType: ShadowType);
}
declare const ShadowMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<ShadowMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): ShadowMatch | null;
    };
};
export declare class ShadowMatcher extends ShadowMatcher_base {
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): ShadowMatch | null;
}
export declare class FontMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    constructor(text: string, node: CodeMirror.SyntaxNode);
}
declare const FontMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<FontMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): FontMatch | null;
    };
};
export declare class FontMatcher extends FontMatcher_base {
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match | null;
}
export declare class LengthMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly unit: string;
    constructor(text: string, node: CodeMirror.SyntaxNode, unit: string);
}
declare const LengthMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<LengthMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): LengthMatch | null;
    };
};
export declare class LengthMatcher extends LengthMatcher_base {
    static readonly LENGTH_UNITS: Set<string>;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): LengthMatch | null;
}
export declare const enum SelectFunction {
    MIN = "min",
    MAX = "max",
    CLAMP = "clamp"
}
export declare const enum ArithmeticFunction {
    CALC = "calc",
    SIBLING_COUNT = "sibling-count",
    SIBLING_INDEX = "sibling-index"
}
type MathFunction = SelectFunction | ArithmeticFunction;
export declare class BaseFunctionMatch<T extends string> implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly func: T;
    readonly args: CodeMirror.SyntaxNode[][];
    constructor(text: string, node: CodeMirror.SyntaxNode, func: T, args: CodeMirror.SyntaxNode[][]);
}
export declare class MathFunctionMatch extends BaseFunctionMatch<MathFunction> {
    isArithmeticFunctionCall(): boolean;
}
declare const MathFunctionMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<MathFunctionMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): MathFunctionMatch | null;
    };
};
export declare class MathFunctionMatcher extends MathFunctionMatcher_base {
    private static getFunctionType;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): MathFunctionMatch | null;
}
export declare class CustomFunctionMatch extends BaseFunctionMatch<string> {
}
declare const CustomFunctionMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<CustomFunctionMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): CustomFunctionMatch | null;
    };
};
export declare class CustomFunctionMatcher extends CustomFunctionMatcher_base {
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): CustomFunctionMatch | null;
}
export declare const enum LayoutType {
    FLEX = "flex",
    GRID = "grid",
    MASONRY = "masonry"
}
export declare class FlexGridMasonryMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly layoutType: LayoutType;
    constructor(text: string, node: CodeMirror.SyntaxNode, layoutType: LayoutType);
}
declare const FlexGridMasonryMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<FlexGridMasonryMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): FlexGridMasonryMatch | null;
    };
};
export declare class FlexGridMasonryMatcher extends FlexGridMasonryMatcher_base {
    static readonly FLEX: string[];
    static readonly GRID: string[];
    static readonly MASONRY: string[];
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): FlexGridMasonryMatch | null;
}
export declare class GridTemplateMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly lines: CodeMirror.SyntaxNode[][];
    constructor(text: string, node: CodeMirror.SyntaxNode, lines: CodeMirror.SyntaxNode[][]);
}
declare const GridTemplateMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<GridTemplateMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): GridTemplateMatch | null;
    };
};
export declare class GridTemplateMatcher extends GridTemplateMatcher_base {
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): GridTemplateMatch | null;
}
export declare class AnchorFunctionMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly functionName: string | null;
    constructor(text: string, node: CodeMirror.SyntaxNode, functionName: string | null);
}
declare const AnchorFunctionMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<AnchorFunctionMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): AnchorFunctionMatch | null;
    };
};
export declare class AnchorFunctionMatcher extends AnchorFunctionMatcher_base {
    anchorFunction(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): string | null;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): AnchorFunctionMatch | null;
}
/** For linking `position-anchor: --anchor-name`. **/
export declare class PositionAnchorMatch implements Match {
    readonly text: string;
    readonly matching: BottomUpTreeMatching;
    readonly node: CodeMirror.SyntaxNode;
    constructor(text: string, matching: BottomUpTreeMatching, node: CodeMirror.SyntaxNode);
}
declare const PositionAnchorMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<PositionAnchorMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): PositionAnchorMatch | null;
    };
};
export declare class PositionAnchorMatcher extends PositionAnchorMatcher_base {
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): PositionAnchorMatch | null;
}
export declare class CSSWideKeywordMatch implements Match {
    readonly text: CSSWideKeyword;
    readonly node: CodeMirror.SyntaxNode;
    readonly property: CSSProperty;
    readonly matchedStyles: CSSMatchedStyles;
    constructor(text: CSSWideKeyword, node: CodeMirror.SyntaxNode, property: CSSProperty, matchedStyles: CSSMatchedStyles);
    resolveProperty(): CSSValueSource | null;
    computedText?(): string | null;
}
declare const CSSWideKeywordMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<CSSWideKeywordMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): CSSWideKeywordMatch | null;
    };
};
export declare class CSSWideKeywordMatcher extends CSSWideKeywordMatcher_base {
    readonly property: CSSProperty;
    readonly matchedStyles: CSSMatchedStyles;
    constructor(property: CSSProperty, matchedStyles: CSSMatchedStyles);
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): CSSWideKeywordMatch | null;
}
export declare class PositionTryMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly preamble: CodeMirror.SyntaxNode[];
    readonly fallbacks: CodeMirror.SyntaxNode[][];
    constructor(text: string, node: CodeMirror.SyntaxNode, preamble: CodeMirror.SyntaxNode[], fallbacks: CodeMirror.SyntaxNode[][]);
}
declare const PositionTryMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<PositionTryMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): PositionTryMatch | null;
    };
};
export declare class PositionTryMatcher extends PositionTryMatcher_base {
    accepts(propertyName: string): boolean;
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): PositionTryMatch | null;
}
export declare class EnvFunctionMatch implements Match {
    readonly text: string;
    readonly node: CodeMirror.SyntaxNode;
    readonly varName: string;
    readonly value: string | null;
    readonly varNameIsValid: boolean;
    constructor(text: string, node: CodeMirror.SyntaxNode, varName: string, value: string | null, varNameIsValid: boolean);
    computedText(): string | null;
}
declare const EnvFunctionMatcher_base: {
    new (): {
        matchType: Platform.Constructor.ConstructorOrAbstract<EnvFunctionMatch>;
        accepts(_propertyName: string): boolean;
        matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): EnvFunctionMatch | null;
    };
};
export declare class EnvFunctionMatcher extends EnvFunctionMatcher_base {
    readonly matchedStyles: CSSMatchedStyles;
    constructor(matchedStyles: CSSMatchedStyles);
    matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): EnvFunctionMatch | null;
}
export {};
