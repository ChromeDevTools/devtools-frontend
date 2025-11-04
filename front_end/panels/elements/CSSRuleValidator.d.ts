import * as SDK from '../../core/sdk/sdk.js';
export declare const enum HintType {
    INACTIVE_PROPERTY = "ruleValidation",
    DEPRECATED_PROPERTY = "deprecatedProperty"
}
export declare class Hint {
    #private;
    constructor(hintMessage: string, possibleFixMessage: string | null, learnMoreLink?: string);
    getMessage(): string;
    getPossibleFixMessage(): string | null;
    getLearnMoreLink(): string | undefined;
}
export declare abstract class CSSRuleValidator {
    #private;
    constructor(affectedProperties: string[]);
    getApplicableProperties(): string[];
    abstract getHint(propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>, nodeName?: string, fontFaces?: SDK.CSSFontFace.CSSFontFace[]): Hint | undefined;
}
export declare class AlignContentValidator extends CSSRuleValidator {
    constructor();
    getHint(_propertyName: string, computedStyles?: Map<string, string>): Hint | undefined;
}
export declare class FlexItemValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, _computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint | undefined;
}
export declare class FlexContainerValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, computedStyles?: Map<string, string>): Hint | undefined;
}
export declare class GridContainerValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, computedStyles?: Map<string, string>): Hint | undefined;
}
export declare class GridItemValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, _computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint | undefined;
}
export declare class FlexOrGridItemValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, _computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint | undefined;
}
export declare class FlexGridValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint | undefined;
}
export declare class MulticolFlexGridValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, computedStyles?: Map<string, string>): Hint | undefined;
}
export declare class PaddingValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, computedStyles?: Map<string, string>): Hint | undefined;
}
export declare class PositionValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, computedStyles?: Map<string, string>): Hint | undefined;
}
export declare class ZIndexValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint | undefined;
}
/**
 * Validates if CSS width/height are having an effect on an element.
 * See "Applies to" in https://www.w3.org/TR/css-sizing-3/#propdef-width.
 * See "Applies to" in https://www.w3.org/TR/css-sizing-3/#propdef-height.
 */
export declare class SizingValidator extends CSSRuleValidator {
    constructor();
    getHint(propertyName: string, computedStyles?: Map<string, string>, _parentComputedStyles?: Map<string, string>, nodeName?: string): Hint | undefined;
}
/**
 * Checks that font variation settings are applicable to the actual font.
 */
export declare class FontVariationSettingsValidator extends CSSRuleValidator {
    constructor();
    getHint(_propertyName: string, computedStyles?: Map<string, string>, _parentComputedStyles?: Map<string, string>, _nodeName?: string, fontFaces?: SDK.CSSFontFace.CSSFontFace[]): Hint | undefined;
}
export declare const cssRuleValidatorsMap: Map<string, CSSRuleValidator[]>;
