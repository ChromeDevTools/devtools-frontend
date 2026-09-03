import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as Tooltips from '../../ui/components/tooltips/tooltips.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import { type MatchRenderer, type RendererBase, RenderingContext } from './PropertyRenderer.js';
import type { ActiveAiSuggestionProperty, StylePropertiesSection } from './StylePropertiesSection.js';
import type { StylesContainer } from './StylesContainer.js';
interface StylePropertyTreeElementParams {
    stylesContainer: StylesContainer;
    section: StylePropertiesSection;
    matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
    property: SDK.CSSProperty.CSSProperty;
    isShorthand: boolean;
    inherited: boolean;
    overloaded: boolean;
    newProperty: boolean;
}
declare const EnvFunctionRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.EnvFunctionMatch>;
export declare class EnvFunctionRenderer extends EnvFunctionRendererBase {
    readonly treeElement: StylePropertyTreeElement | null;
    readonly matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
    readonly computedStyles: Map<string, string>;
    readonly computedStyleExtraFields: Protocol.CSS.ComputedStyleExtraFields | null;
    constructor(treeElement: StylePropertyTreeElement | null, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>, computedStyleExtraFields: Protocol.CSS.ComputedStyleExtraFields | null);
    render(match: SDK.CSSPropertyParserMatchers.EnvFunctionMatch, context: RenderingContext): Node[];
}
declare const FlexGridRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.FlexGridGridLanesMatch>;
export declare class FlexGridRenderer extends FlexGridRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.FlexGridGridLanesMatch, context: RenderingContext): Node[];
}
declare const CSSWideKeywordRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.CSSWideKeywordMatch>;
export declare class CSSWideKeywordRenderer extends CSSWideKeywordRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.CSSWideKeywordMatch, context: RenderingContext): Node[];
}
export declare function handleVarDefinitionActivate(variable: string | SDK.CSSMatchedStyles.CSSValueSource, stylesContainer: StylesContainer): void;
declare const VariableRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.VariableMatch>;
export declare class VariableRenderer extends VariableRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, treeElement: StylePropertyTreeElement | null, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>, computedStyleExtraFields: Protocol.CSS.ComputedStyleExtraFields | null);
    render(match: SDK.CSSPropertyParserMatchers.VariableMatch, context: RenderingContext): Node[];
}
declare const VariableNameRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.VariableNameMatch>;
export declare class VariableNameRenderer extends VariableNameRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, treeElement: StylePropertyTreeElement | null, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles);
    render(match: SDK.CSSPropertyParserMatchers.VariableNameMatch, _context: RenderingContext): Node[];
}
declare const AttributeRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.AttributeMatch>;
export declare class AttributeRenderer extends AttributeRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, treeElement: StylePropertyTreeElement | null, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>, computedStyleExtraFields: Protocol.CSS.ComputedStyleExtraFields | null);
    render(match: SDK.CSSPropertyParserMatchers.AttributeMatch, context: RenderingContext): Node[];
}
declare const LinearGradientRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.LinearGradientMatch>;
export declare class LinearGradientRenderer extends LinearGradientRendererBase {
    render(match: SDK.CSSPropertyParserMatchers.LinearGradientMatch, context: RenderingContext): Node[];
}
declare const RelativeColorChannelRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.RelativeColorChannelMatch>;
export declare class RelativeColorChannelRenderer extends RelativeColorChannelRendererBase {
    #private;
    constructor(treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.RelativeColorChannelMatch, context: RenderingContext): Node[];
}
declare const ColorRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.ColorMatch>;
export declare class ColorRenderer extends ColorRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.ColorMatch, context: RenderingContext): Node[];
    renderColorSwatch(color: Common.Color.Color | undefined, valueChild: Node): InlineEditor.ColorSwatch.ColorSwatch;
}
declare const LightDarkColorRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.LightDarkColorMatch>;
export declare class LightDarkColorRenderer extends LightDarkColorRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.LightDarkColorMatch, context: RenderingContext): Node[];
    applyColorScheme(match: SDK.CSSPropertyParserMatchers.LightDarkColorMatch, context: RenderingContext, colorSwatch: InlineEditor.ColorSwatch.ColorSwatch, light: HTMLSpanElement, dark: HTMLSpanElement, lightControls: SDK.CSSPropertyParser.CSSControlMap, darkControls: SDK.CSSPropertyParser.CSSControlMap): Promise<void>;
}
declare const ColorMixRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.ColorMixMatch>;
export declare class ColorMixRenderer extends ColorMixRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>, computedStyleExtraFields: Protocol.CSS.ComputedStyleExtraFields | null, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.ColorMixMatch, context: RenderingContext): Node[];
}
declare const ContrastColorRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.ContrastColorMatch>;
export declare class ContrastColorRenderer extends ContrastColorRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.ContrastColorMatch, context: RenderingContext): Node[];
}
declare const AngleRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.AngleMatch>;
export declare class AngleRenderer extends AngleRendererBase {
    #private;
    constructor(treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.AngleMatch, context: RenderingContext): Node[];
}
declare const LinkableNameRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.LinkableNameMatch>;
export declare class LinkableNameRenderer extends LinkableNameRendererBase {
    #private;
    constructor(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, stylesContainer: StylesContainer);
    render(match: SDK.CSSPropertyParserMatchers.LinkableNameMatch): Node[];
}
declare const BezierRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.BezierMatch>;
export declare class BezierRenderer extends BezierRendererBase {
    #private;
    constructor(treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.BezierMatch, context: RenderingContext): Node[];
}
declare const AutoBaseRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.AutoBaseMatch>;
export declare class AutoBaseRenderer extends AutoBaseRendererBase {
    #private;
    constructor(computedStyle: Map<string, string>, computedStyleExtraFields: Protocol.CSS.ComputedStyleExtraFields | null);
    render(match: SDK.CSSPropertyParserMatchers.AutoBaseMatch, context: RenderingContext): Node[];
}
export declare const enum ShadowPropertyType {
    X = "x",
    Y = "y",
    SPREAD = "spread",
    BLUR = "blur",
    INSET = "inset",
    COLOR = "color"
}
interface ShadowProperty {
    value: string | CodeMirror.SyntaxNode;
    source: CodeMirror.SyntaxNode | null;
    expansionContext: RenderingContext | null;
    propertyType: ShadowPropertyType;
}
/**
 * The shadow model is an abstraction over the various shadow properties on the one hand and the order they were defined
 * in on the other, so that modifications through the shadow editor can retain the property order in the authored text.
 * The model also looks through var()s by keeping a mapping between individual properties and any var()s they are coming
 * from, replacing the var() functions as needed with concrete values when edited.
 **/
export declare class ShadowModel implements InlineEditor.CSSShadowEditor.CSSShadowModel {
    #private;
    constructor(shadowType: SDK.CSSPropertyParserMatchers.ShadowType, properties: ShadowProperty[], context: RenderingContext);
    isBoxShadow(): boolean;
    inset(): boolean;
    offsetX(): InlineEditor.CSSShadowEditor.CSSLength;
    offsetY(): InlineEditor.CSSShadowEditor.CSSLength;
    blurRadius(): InlineEditor.CSSShadowEditor.CSSLength;
    spreadRadius(): InlineEditor.CSSShadowEditor.CSSLength;
    setInset(inset: boolean): void;
    setOffsetX(value: InlineEditor.CSSShadowEditor.CSSLength): void;
    setOffsetY(value: InlineEditor.CSSShadowEditor.CSSLength): void;
    setBlurRadius(value: InlineEditor.CSSShadowEditor.CSSLength): void;
    setSpreadRadius(value: InlineEditor.CSSShadowEditor.CSSLength): void;
    renderContents(span: HTMLSpanElement): void;
}
declare const ShadowRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.ShadowMatch>;
export declare class ShadowRenderer extends ShadowRendererBase {
    #private;
    constructor(treeElement: StylePropertyTreeElement | null);
    shadowModel(shadow: CodeMirror.SyntaxNode[], shadowType: SDK.CSSPropertyParserMatchers.ShadowType, context: RenderingContext): null | ShadowModel;
    render(match: SDK.CSSPropertyParserMatchers.ShadowMatch, context: RenderingContext): Node[];
}
declare const GridTemplateRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.GridTemplateMatch>;
export declare class GridTemplateRenderer extends GridTemplateRendererBase {
    render(match: SDK.CSSPropertyParserMatchers.GridTemplateMatch, context: RenderingContext): Node[];
}
export declare const SHORTHANDS_FOR_PERCENTAGES: Set<string>;
declare const LengthRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.LengthMatch>;
export declare class LengthRenderer extends LengthRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, propertyName: string, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.LengthMatch, context: RenderingContext): Node[];
    getTooltipValue(tooltip: Tooltips.Tooltip.Tooltip, match: SDK.CSSPropertyParser.Match, context: RenderingContext): Promise<void>;
}
declare const BaseFunctionRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.BaseFunctionMatch<string>>;
export declare class BaseFunctionRenderer extends BaseFunctionRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>, computedStyleExtraFields: Protocol.CSS.ComputedStyleExtraFields | null, propertyName: string, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.BaseFunctionMatch<string>, context: RenderingContext): Node[];
    applyEvaluation(span: HTMLSpanElement, match: SDK.CSSPropertyParserMatchers.BaseFunctionMatch<string>, context: RenderingContext): Promise<boolean>;
    applyMathFunction(renderedArgs: HTMLElement[], match: SDK.CSSPropertyParserMatchers.BaseFunctionMatch<string>, context: RenderingContext): Promise<void>;
}
export declare class MathFunctionRenderer extends BaseFunctionRenderer {
    readonly matchType: typeof SDK.CSSPropertyParserMatchers.MathFunctionMatch;
}
export declare class CustomFunctionRenderer extends BaseFunctionRenderer {
    readonly matchType: typeof SDK.CSSPropertyParserMatchers.CustomFunctionMatch;
}
declare const AnchorFunctionRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.AnchorFunctionMatch>;
export declare class AnchorFunctionRenderer extends AnchorFunctionRendererBase {
    #private;
    static decorateAnchorForAnchorLink(stylesContainer: StylesContainer, container: HTMLElement, { identifier, needsSpace }: {
        identifier?: string;
        needsSpace?: boolean;
    }): Promise<void>;
    constructor(stylesContainer: StylesContainer);
    render(match: SDK.CSSPropertyParserMatchers.AnchorFunctionMatch, context: RenderingContext): Node[];
}
declare const PositionAnchorRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.PositionAnchorMatch>;
export declare class PositionAnchorRenderer extends PositionAnchorRendererBase {
    #private;
    constructor(stylesContainer: StylesContainer);
    render(match: SDK.CSSPropertyParserMatchers.PositionAnchorMatch): Node[];
}
declare const PositionTryRendererBase: RendererBase<SDK.CSSPropertyParserMatchers.PositionTryMatch>;
export declare class PositionTryRenderer extends PositionTryRendererBase {
    #private;
    constructor(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles);
    render(match: SDK.CSSPropertyParserMatchers.PositionTryMatch, context: RenderingContext): Node[];
}
export declare function getPropertyRenderers(propertyName: string, style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, stylesContainer: StylesContainer, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, treeElement: StylePropertyTreeElement | null, computedStyles: Map<string, string>, computedStyleExtraFields: Protocol.CSS.ComputedStyleExtraFields | null): Array<MatchRenderer<SDK.CSSPropertyParser.Match>>;
export declare class StylePropertyTreeElement extends UI.TreeOutline.TreeElement {
    #private;
    private readonly style;
    property: SDK.CSSProperty.CSSProperty;
    isShorthand: boolean;
    private readonly applyStyleThrottler;
    private newProperty;
    private expandedDueToFilter;
    valueElement: HTMLElement | null;
    nameElement: HTMLElement | null;
    private expandElement;
    private originalPropertyText;
    private hasBeenEditedIncrementally;
    private prompt;
    private lastComputedValue;
    private computedStyles;
    private parentsComputedStyles;
    private computedStyleExtraFields;
    private contextForTest;
    constructor({ stylesContainer, section, matchedStyles, property, isShorthand, inherited, overloaded, newProperty }: StylePropertyTreeElementParams);
    onunbind(): void;
    gridNames(): Promise<Set<string>>;
    matchedStyles(): SDK.CSSMatchedStyles.CSSMatchedStyles;
    getLonghand(): StylePropertyTreeElement | null;
    editable(): boolean;
    inherited(): boolean;
    overloaded(): boolean;
    setOverloaded(x: boolean): void;
    setComputedStyles(computedStyles: Map<string, string> | null): void;
    getComputedStyle(property: string): string | null;
    getComputedStyles(): Map<string, string> | null;
    setComputedStyleExtraFields(computedStyleExtraFields: Protocol.CSS.ComputedStyleExtraFields | null): void;
    getComputedStyleExtraFields(): Protocol.CSS.ComputedStyleExtraFields | null;
    setParentsComputedStyles(parentsComputedStyles: Map<string, string> | null): void;
    get name(): string;
    get value(): string;
    updateFilter(): boolean;
    renderedPropertyText(): string;
    private updateState;
    node(): SDK.DOMModel.DOMNode | null;
    stylesContainer(): StylesContainer;
    section(): StylePropertiesSection;
    private updatePane;
    private toggleDisabled;
    onpopulate(): Promise<void>;
    onattach(): void;
    onexpand(): void;
    oncollapse(): void;
    private updateExpandElement;
    refreshIfComputedValueChanged(): void;
    updateTitle(): void;
    createExclamationMark(property: SDK.CSSProperty.CSSProperty, title: HTMLElement | null): Element;
    getTracingTooltip(functionName: string, node: CodeMirror.SyntaxNode, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>, computedStyleExtraFields: Protocol.CSS.ComputedStyleExtraFields | null, context: RenderingContext): Lit.TemplateResult;
    getTooltipId(key: string): string;
    updateAuthoringHint(): void;
    updateAnimationOverrideHint(): void;
    private overriddenByAnimation;
    private mouseUp;
    private handleContextMenuEvent;
    private handleCopyContextMenuEvent;
    createCopyContextMenu(event: Event): UI.ContextMenu.ContextMenu;
    private viewComputedValue;
    private copyCssDeclarationAsJs;
    private copyAllCssDeclarationAsJs;
    private navigateToSource;
    startEditingValue(): void;
    startEditingName(): void;
    private editingNameValueKeyDown;
    static shouldCommitValueSemicolon(text: string, cursorPosition: number): boolean;
    private editingNameValueKeyPress;
    private applyFreeFlowStyleTextEdit;
    kickFreeFlowStyleEditForTest(): Promise<void>;
    editingEnded(context: Context): void;
    editingCancelled(context: Context): void;
    commitAiSuggestion(fullText: string): Promise<void>;
    private applyOriginalStyle;
    private findSibling;
    private editingCommitted;
    private removePrompt;
    styleTextAppliedForTest(): void;
    applyStyleText(styleText: string, majorChange: boolean, property?: SDK.CSSProperty.CSSProperty | null): Promise<void>;
    private innerApplyStyleText;
    ondblclick(): boolean;
    isEventWithinDisclosureTriangle(event: Event): boolean;
    renderActiveAiSuggestion(activeAiSuggestion: ActiveAiSuggestionProperty): void;
    clearActiveAiSuggestion(): void;
}
export declare class GhostStylePropertyTreeElement extends StylePropertyTreeElement {
    constructor(stylesContainer: StylesContainer, section: StylePropertiesSection, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, property: SDK.CSSProperty.CSSProperty);
    onattach(): void;
    updateTitle(): void;
}
export interface Context {
    expanded: boolean;
    hasChildren: boolean;
    isEditingName: boolean;
    originalProperty?: SDK.CSSProperty.CSSProperty;
    originalName?: string;
    originalValue?: string;
    previousContent: string;
}
export {};
