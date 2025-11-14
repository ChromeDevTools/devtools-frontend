import * as Protocol from '../../generated/protocol.js';
import { CSSWideKeyword } from './CSSMetadata.js';
import type { CSSModel } from './CSSModel.js';
import { CSSProperty } from './CSSProperty.js';
import * as PropertyParser from './CSSPropertyParser.js';
import type { Match, Matcher } from './CSSPropertyParser.js';
import { CSSAtRule, CSSFunctionRule, CSSKeyframesRule, CSSPositionTryRule, CSSPropertyRule, CSSStyleRule } from './CSSRule.js';
import { CSSStyleDeclaration } from './CSSStyleDeclaration.js';
import type { DOMNode } from './DOMModel.js';
export interface CSSMatchedStylesPayload {
    cssModel: CSSModel;
    node: DOMNode;
    activePositionFallbackIndex: number;
    inlinePayload: Protocol.CSS.CSSStyle | null;
    attributesPayload: Protocol.CSS.CSSStyle | null;
    matchedPayload: Protocol.CSS.RuleMatch[];
    pseudoPayload: Protocol.CSS.PseudoElementMatches[];
    inheritedPayload: Protocol.CSS.InheritedStyleEntry[];
    inheritedPseudoPayload: Protocol.CSS.InheritedPseudoElementMatches[];
    animationsPayload: Protocol.CSS.CSSKeyframesRule[];
    parentLayoutNodeId: Protocol.DOM.NodeId | undefined;
    positionTryRules: Protocol.CSS.CSSPositionTryRule[];
    propertyRules: Protocol.CSS.CSSPropertyRule[];
    cssPropertyRegistrations: Protocol.CSS.CSSPropertyRegistration[];
    atRules: Protocol.CSS.CSSAtRule[];
    animationStylesPayload: Protocol.CSS.CSSAnimationStyle[];
    transitionsStylePayload: Protocol.CSS.CSSStyle | null;
    inheritedAnimatedPayload: Protocol.CSS.InheritedAnimatedStyleEntry[];
    functionRules: Protocol.CSS.CSSFunctionRule[];
}
export interface CSSType {
    type: string;
    isCSSTokens: boolean;
}
export declare class CSSRegisteredProperty {
    #private;
    constructor(cssModel: CSSModel, registration: CSSPropertyRule | Protocol.CSS.CSSPropertyRegistration);
    propertyName(): string;
    initialValue(): string | null;
    inherits(): boolean;
    syntax(): string;
    parseValue(matchedStyles: CSSMatchedStyles, computedStyles: Map<string, string> | null): PropertyParser.BottomUpTreeMatching | null;
    style(): CSSStyleDeclaration;
}
export declare class CSSMatchedStyles {
    #private;
    static create(payload: CSSMatchedStylesPayload): Promise<CSSMatchedStyles>;
    private constructor();
    private init;
    private buildMainCascade;
    /**
     * Pseudo rule matches received via the inspector protocol are grouped by pseudo type.
     * For custom highlight pseudos, we need to instead group the rule matches by highlight
     * name in order to produce separate cascades for each highlight name. This is necessary
     * so that styles of ::highlight(foo) are not shown as overriding styles of ::highlight(bar).
     *
     * This helper function takes a list of rule matches and generates separate NodeCascades
     * for each custom highlight name that was matched.
     */
    private buildSplitCustomHighlightCascades;
    private buildPseudoCascades;
    private addMatchingSelectors;
    node(): DOMNode;
    cssModel(): CSSModel;
    hasMatchingSelectors(rule: CSSStyleRule): boolean;
    getParentLayoutNodeId(): Protocol.DOM.NodeId | undefined;
    getMatchingSelectors(rule: CSSStyleRule): number[];
    recomputeMatchingSelectors(rule: CSSStyleRule): Promise<void>;
    addNewRule(rule: CSSStyleRule, node: DOMNode): Promise<void>;
    private setSelectorMatches;
    nodeStyles(): CSSStyleDeclaration[];
    inheritedStyles(): CSSStyleDeclaration[];
    animationStyles(): CSSStyleDeclaration[];
    transitionsStyle(): CSSStyleDeclaration | null;
    registeredProperties(): CSSRegisteredProperty[];
    getRegisteredProperty(name: string): CSSRegisteredProperty | undefined;
    getRegisteredFunction(name: string): string | undefined;
    functionRules(): CSSFunctionRule[];
    atRules(): CSSAtRule[];
    keyframes(): CSSKeyframesRule[];
    positionTryRules(): CSSPositionTryRule[];
    activePositionFallbackIndex(): number;
    pseudoStyles(pseudoType: Protocol.DOM.PseudoType): CSSStyleDeclaration[];
    pseudoTypes(): Set<Protocol.DOM.PseudoType>;
    customHighlightPseudoStyles(highlightName: string): CSSStyleDeclaration[];
    customHighlightPseudoNames(): Set<string>;
    nodeForStyle(style: CSSStyleDeclaration): DOMNode | null;
    availableCSSVariables(style: CSSStyleDeclaration): string[];
    computeCSSVariable(style: CSSStyleDeclaration, variableName: string): CSSVariableValue | null;
    computeAttribute(style: CSSStyleDeclaration, attributeName: string, type: CSSType): string | null;
    originatingNodeForStyle(style: CSSStyleDeclaration): DOMNode | null;
    rawAttributeValueFromStyle(style: CSSStyleDeclaration, attributeName: string): string | null;
    resolveProperty(name: string, ownerStyle: CSSStyleDeclaration): CSSProperty | null;
    resolveGlobalKeyword(property: CSSProperty, keyword: CSSWideKeyword): CSSValueSource | null;
    isInherited(style: CSSStyleDeclaration): boolean;
    propertyState(property: CSSProperty): PropertyState | null;
    resetActiveProperties(): void;
    propertyMatchers(style: CSSStyleDeclaration, computedStyles: Map<string, string> | null): Array<Matcher<Match>>;
    environmentVariable(name: string): string | undefined;
}
export declare class CSSValueSource {
    readonly declaration: CSSProperty | CSSRegisteredProperty;
    constructor(declaration: CSSProperty | CSSRegisteredProperty);
    get value(): string | null;
    get style(): CSSStyleDeclaration;
    get name(): string;
}
export interface CSSVariableValue {
    value: string;
    declaration: CSSValueSource;
}
export declare const enum PropertyState {
    ACTIVE = "Active",
    OVERLOADED = "Overloaded"
}
