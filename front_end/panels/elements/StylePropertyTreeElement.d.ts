import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as Tooltips from '../../ui/components/tooltips/tooltips.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import { type MatchRenderer, RenderingContext } from './PropertyRenderer.js';
import type { StylePropertiesSection } from './StylePropertiesSection.js';
import { StylesSidebarPane } from './StylesSidebarPane.js';
interface StylePropertyTreeElementParams {
    stylesPane: StylesSidebarPane;
    section: StylePropertiesSection;
    matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
    property: SDK.CSSProperty.CSSProperty;
    isShorthand: boolean;
    inherited: boolean;
    overloaded: boolean;
    newProperty: boolean;
}
declare const EnvFunctionRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.EnvFunctionMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.EnvFunctionMatch, _context: RenderingContext): Node[];
};
export declare class EnvFunctionRenderer extends EnvFunctionRenderer_base {
    readonly treeElement: StylePropertyTreeElement | null;
    readonly matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
    readonly computedStyles: Map<string, string>;
    constructor(treeElement: StylePropertyTreeElement | null, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>);
    render(match: SDK.CSSPropertyParserMatchers.EnvFunctionMatch, context: RenderingContext): Node[];
}
declare const FlexGridRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.FlexGridGridLanesMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.FlexGridGridLanesMatch, _context: RenderingContext): Node[];
};
export declare class FlexGridRenderer extends FlexGridRenderer_base {
    #private;
    constructor(stylesPane: StylesSidebarPane, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.FlexGridGridLanesMatch, context: RenderingContext): Node[];
}
declare const CSSWideKeywordRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.CSSWideKeywordMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.CSSWideKeywordMatch, _context: RenderingContext): Node[];
};
export declare class CSSWideKeywordRenderer extends CSSWideKeywordRenderer_base {
    #private;
    constructor(stylesPane: StylesSidebarPane, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.CSSWideKeywordMatch, context: RenderingContext): Node[];
}
declare const VariableRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.VariableMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.VariableMatch, _context: RenderingContext): Node[];
};
export declare class VariableRenderer extends VariableRenderer_base {
    #private;
    constructor(stylesPane: StylesSidebarPane, treeElement: StylePropertyTreeElement | null, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>);
    render(match: SDK.CSSPropertyParserMatchers.VariableMatch, context: RenderingContext): Node[];
}
declare const AttributeRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.AttributeMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.AttributeMatch, _context: RenderingContext): Node[];
};
export declare class AttributeRenderer extends AttributeRenderer_base {
    #private;
    constructor(stylesPane: StylesSidebarPane, treeElement: StylePropertyTreeElement | null, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>);
    render(match: SDK.CSSPropertyParserMatchers.AttributeMatch, context: RenderingContext): Node[];
}
declare const LinearGradientRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.LinearGradientMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.LinearGradientMatch, _context: RenderingContext): Node[];
};
export declare class LinearGradientRenderer extends LinearGradientRenderer_base {
    render(match: SDK.CSSPropertyParserMatchers.LinearGradientMatch, context: RenderingContext): Node[];
}
declare const RelativeColorChannelRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.RelativeColorChannelMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.RelativeColorChannelMatch, _context: RenderingContext): Node[];
};
export declare class RelativeColorChannelRenderer extends RelativeColorChannelRenderer_base {
    #private;
    constructor(treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.RelativeColorChannelMatch, context: RenderingContext): Node[];
}
declare const ColorRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.ColorMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.ColorMatch, _context: RenderingContext): Node[];
};
export declare class ColorRenderer extends ColorRenderer_base {
    #private;
    constructor(stylesPane: StylesSidebarPane, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.ColorMatch, context: RenderingContext): Node[];
    renderColorSwatch(color: Common.Color.Color | undefined, valueChild: Node): InlineEditor.ColorSwatch.ColorSwatch;
}
declare const LightDarkColorRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.LightDarkColorMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.LightDarkColorMatch, _context: RenderingContext): Node[];
};
export declare class LightDarkColorRenderer extends LightDarkColorRenderer_base {
    #private;
    constructor(stylesPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.LightDarkColorMatch, context: RenderingContext): Node[];
    applyColorScheme(match: SDK.CSSPropertyParserMatchers.LightDarkColorMatch, context: RenderingContext, colorSwatch: InlineEditor.ColorSwatch.ColorSwatch, light: HTMLSpanElement, dark: HTMLSpanElement, lightControls: SDK.CSSPropertyParser.CSSControlMap, darkControls: SDK.CSSPropertyParser.CSSControlMap): Promise<void>;
}
declare const ColorMixRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.ColorMixMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.ColorMixMatch, _context: RenderingContext): Node[];
};
export declare class ColorMixRenderer extends ColorMixRenderer_base {
    #private;
    constructor(pane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.ColorMixMatch, context: RenderingContext): Node[];
}
declare const AngleRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.AngleMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.AngleMatch, _context: RenderingContext): Node[];
};
export declare class AngleRenderer extends AngleRenderer_base {
    #private;
    constructor(treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.AngleMatch, context: RenderingContext): Node[];
}
declare const LinkableNameRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.LinkableNameMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.LinkableNameMatch, _context: RenderingContext): Node[];
};
export declare class LinkableNameRenderer extends LinkableNameRenderer_base {
    #private;
    constructor(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, stylesSidebarPane: StylesSidebarPane);
    render(match: SDK.CSSPropertyParserMatchers.LinkableNameMatch): Node[];
}
declare const BezierRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.BezierMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.BezierMatch, _context: RenderingContext): Node[];
};
export declare class BezierRenderer extends BezierRenderer_base {
    #private;
    constructor(treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.BezierMatch, context: RenderingContext): Node[];
}
declare const AutoBaseRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.AutoBaseMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.AutoBaseMatch, _context: RenderingContext): Node[];
};
export declare class AutoBaseRenderer extends AutoBaseRenderer_base {
    #private;
    constructor(computedStyle: Map<string, string>);
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
declare const ShadowRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.ShadowMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.ShadowMatch, _context: RenderingContext): Node[];
};
export declare class ShadowRenderer extends ShadowRenderer_base {
    #private;
    constructor(treeElement: StylePropertyTreeElement | null);
    shadowModel(shadow: CodeMirror.SyntaxNode[], shadowType: SDK.CSSPropertyParserMatchers.ShadowType, context: RenderingContext): null | ShadowModel;
    render(match: SDK.CSSPropertyParserMatchers.ShadowMatch, context: RenderingContext): Node[];
}
declare const FontRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.FontMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.FontMatch, _context: RenderingContext): Node[];
};
export declare class FontRenderer extends FontRenderer_base {
    readonly treeElement: StylePropertyTreeElement;
    constructor(treeElement: StylePropertyTreeElement);
    render(match: SDK.CSSPropertyParserMatchers.FontMatch, context: RenderingContext): Node[];
}
declare const GridTemplateRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.GridTemplateMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.GridTemplateMatch, _context: RenderingContext): Node[];
};
export declare class GridTemplateRenderer extends GridTemplateRenderer_base {
    render(match: SDK.CSSPropertyParserMatchers.GridTemplateMatch, context: RenderingContext): Node[];
}
export declare const SHORTHANDS_FOR_PERCENTAGES: Set<string>;
declare const LengthRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.LengthMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.LengthMatch, _context: RenderingContext): Node[];
};
export declare class LengthRenderer extends LengthRenderer_base {
    #private;
    constructor(stylesPane: StylesSidebarPane, propertyName: string, treeElement: StylePropertyTreeElement | null);
    render(match: SDK.CSSPropertyParserMatchers.LengthMatch, context: RenderingContext): Node[];
    getTooltipValue(tooltip: Tooltips.Tooltip.Tooltip, match: SDK.CSSPropertyParser.Match, context: RenderingContext): Promise<void>;
}
declare const BaseFunctionRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.BaseFunctionMatch<any>, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.BaseFunctionMatch<any>, _context: RenderingContext): Node[];
};
export declare class BaseFunctionRenderer extends BaseFunctionRenderer_base {
    #private;
    constructor(stylesPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>, propertyName: string, treeElement: StylePropertyTreeElement | null);
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
declare const AnchorFunctionRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.AnchorFunctionMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.AnchorFunctionMatch, _context: RenderingContext): Node[];
};
export declare class AnchorFunctionRenderer extends AnchorFunctionRenderer_base {
    #private;
    static decorateAnchorForAnchorLink(stylesPane: StylesSidebarPane, container: HTMLElement, { identifier, needsSpace }: {
        identifier?: string;
        needsSpace?: boolean;
    }): Promise<void>;
    constructor(stylesPane: StylesSidebarPane);
    render(match: SDK.CSSPropertyParserMatchers.AnchorFunctionMatch, context: RenderingContext): Node[];
}
declare const PositionAnchorRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.PositionAnchorMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.PositionAnchorMatch, _context: RenderingContext): Node[];
};
export declare class PositionAnchorRenderer extends PositionAnchorRenderer_base {
    #private;
    constructor(stylesPane: StylesSidebarPane);
    render(match: SDK.CSSPropertyParserMatchers.PositionAnchorMatch): Node[];
}
declare const PositionTryRenderer_base: abstract new () => {
    readonly matchType: Platform.Constructor.Constructor<SDK.CSSPropertyParserMatchers.PositionTryMatch, any[]>;
    render(_match: SDK.CSSPropertyParserMatchers.PositionTryMatch, _context: RenderingContext): Node[];
};
export declare class PositionTryRenderer extends PositionTryRenderer_base {
    #private;
    constructor(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles);
    render(match: SDK.CSSPropertyParserMatchers.PositionTryMatch, context: RenderingContext): Node[];
}
export declare function getPropertyRenderers(propertyName: string, style: SDK.CSSStyleDeclaration.CSSStyleDeclaration, stylesPane: StylesSidebarPane, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, treeElement: StylePropertyTreeElement | null, computedStyles: Map<string, string>): Array<MatchRenderer<SDK.CSSPropertyParser.Match>>;
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
    private contextForTest;
    constructor({ stylesPane, section, matchedStyles, property, isShorthand, inherited, overloaded, newProperty }: StylePropertyTreeElementParams);
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
    setParentsComputedStyles(parentsComputedStyles: Map<string, string> | null): void;
    get name(): string;
    get value(): string;
    updateFilter(): boolean;
    renderedPropertyText(): string;
    private updateState;
    node(): SDK.DOMModel.DOMNode | null;
    parentPane(): StylesSidebarPane;
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
    getTracingTooltip(functionName: string, node: CodeMirror.SyntaxNode, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string>, context: RenderingContext): Lit.TemplateResult;
    getTooltipId(key: string): string;
    updateAuthoringHint(): void;
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
    private applyOriginalStyle;
    private findSibling;
    private editingCommitted;
    private removePrompt;
    styleTextAppliedForTest(): void;
    applyStyleText(styleText: string, majorChange: boolean, property?: SDK.CSSProperty.CSSProperty | null): Promise<void>;
    private innerApplyStyleText;
    ondblclick(): boolean;
    isEventWithinDisclosureTriangle(event: Event): boolean;
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
