import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ElementsComponents from './components/components.js';
import type { ComputedStyleModel, CSSModelChangedEvent } from './ComputedStyleModel.js';
import { ElementsSidebarPane } from './ElementsSidebarPane.js';
import { StylePropertiesSection } from './StylePropertiesSection.js';
import type { StylePropertyTreeElement } from './StylePropertyTreeElement.js';
import { WebCustomData } from './WebCustomData.js';
/** Title of the registered properties section **/
export declare const REGISTERED_PROPERTY_SECTION_NAME = "@property";
/** Title of the function section **/
export declare const FUNCTION_SECTION_NAME = "@function";
/** Title of the general at-rule section */
export declare const AT_RULE_SECTION_NAME = "@font-*";
declare const StylesSidebarPane_base: (new (...args: any[]) => {
    addEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends keyof EventTypes>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof EventTypes): boolean;
    dispatchEventToListeners<T extends keyof EventTypes>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof ElementsSidebarPane;
export declare class StylesSidebarPane extends StylesSidebarPane_base {
    #private;
    private matchedStyles;
    private currentToolbarPane;
    private animatedToolbarPane;
    private pendingWidget;
    private pendingWidgetToggle;
    private toolbar;
    private toolbarPaneElement;
    private lastFilterChange;
    private visibleSections;
    private noMatchesElement;
    private sectionsContainer;
    sectionByElement: WeakMap<Node, StylePropertiesSection>;
    readonly linkifier: Components.Linkifier.Linkifier;
    private readonly decorator;
    private lastRevealedProperty;
    private userOperation;
    isEditingStyle: boolean;
    private isActivePropertyHighlighted;
    private initialUpdateCompleted;
    hasMatchedStyles: boolean;
    private sectionBlocks;
    private idleCallbackManager;
    private needsForceUpdate;
    private readonly resizeThrottler;
    private readonly resetUpdateThrottler;
    private readonly computedStyleUpdateThrottler;
    private scrollerElement?;
    private readonly boundOnScroll;
    private readonly imagePreviewPopover;
    activeCSSAngle: InlineEditor.CSSAngle.CSSAngle | null;
    constructor(computedStyleModel: ComputedStyleModel);
    get webCustomData(): WebCustomData | undefined;
    private onScroll;
    swatchPopoverHelper(): InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
    setUserOperation(userOperation: boolean): void;
    static ignoreErrorsForProperty(property: SDK.CSSProperty.CSSProperty): boolean;
    static formatLeadingProperties(section: StylePropertiesSection): {
        allDeclarationText: string;
        ruleText: string;
    };
    revealProperty(cssProperty: SDK.CSSProperty.CSSProperty): void;
    jumpToProperty(propertyName: string, sectionName?: string, blockName?: string): boolean;
    jumpToDeclaration(valueSource: SDK.CSSMatchedStyles.CSSValueSource): void;
    jumpToSection(sectionName: string, blockName: string): void;
    jumpToSectionBlock(section: string): void;
    jumpToFunctionDefinition(functionName: string): void;
    jumpToFontPaletteDefinition(paletteName: string): void;
    forceUpdate(): void;
    private sectionsContainerKeyDown;
    private sectionsContainerFocusChanged;
    resetFocus(): void;
    onAddButtonLongClick(event: Event): void;
    private onFilterChanged;
    refreshUpdate(editedSection: StylePropertiesSection, editedTreeElement?: StylePropertyTreeElement): void;
    doUpdate(): Promise<void>;
    getVariableParserError(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, variableName: string): ElementsComponents.CSSVariableValueView.CSSVariableParserError | null;
    getVariablePopoverContents(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, variableName: string, computedValue: string | null): ElementsComponents.CSSVariableValueView.CSSVariableValueView;
    private fetchComputedStylesFor;
    onResize(): void;
    private resetCache;
    private fetchMatchedCascade;
    setEditingStyle(editing: boolean): void;
    setActiveProperty(treeElement: StylePropertyTreeElement | null): void;
    onCSSModelChanged(event: Common.EventTarget.EventTargetEvent<CSSModelChangedEvent>): void;
    onComputedStyleChanged(): void;
    handledComputedStyleChangedForTest(): void;
    scheduleResetUpdateIfNotEditingCalledForTest(): void;
    focusedSectionIndex(): number;
    continueEditingElement(sectionIndex: number, propertyIndex: number): void;
    private innerRebuildUpdate;
    private nodeStylesUpdatedForTest;
    setMatchedStylesForTest(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles): void;
    rebuildSectionsForMatchedStyleRulesForTest(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, computedStyles: Map<string, string> | null, parentsComputedStyles: Map<string, string> | null): Promise<SectionBlock[]>;
    private rebuildSectionsForMatchedStyleRules;
    createNewRuleInViaInspectorStyleSheet(): Promise<void>;
    private createNewRuleInStyleSheet;
    addBlankSection(insertAfterSection: StylePropertiesSection, styleSheetHeader: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, ruleLocation: TextUtils.TextRange.TextRange): void;
    removeSection(section: StylePropertiesSection): void;
    filterRegex(): RegExp | null;
    private updateFilter;
    wasShown(): void;
    willHide(): void;
    hideAllPopovers(): void;
    getSectionBlockByName(name: string): SectionBlock | undefined;
    allSections(): StylePropertiesSection[];
    private clipboardCopy;
    private createStylesSidebarToolbar;
    showToolbarPane(widget: UI.Widget.Widget | null, toggle: UI.Toolbar.ToolbarToggle | null): void;
    appendToolbarItem(item: UI.Toolbar.ToolbarItem): void;
    private startToolbarPaneAnimation;
    private createRenderingShortcuts;
}
export declare const enum Events {
    INITIAL_UPDATE_COMPLETED = "InitialUpdateCompleted",
    STYLES_UPDATE_COMPLETED = "StylesUpdateCompleted"
}
export interface StylesUpdateCompletedEvent {
    hasMatchedStyles: boolean;
}
export interface EventTypes {
    [Events.INITIAL_UPDATE_COMPLETED]: void;
    [Events.STYLES_UPDATE_COMPLETED]: StylesUpdateCompletedEvent;
}
export declare class SectionBlock {
    #private;
    sections: StylePropertiesSection[];
    constructor(titleElement: Element | null, expandable?: boolean, expandedByDefault?: boolean);
    expand(expand: boolean): void;
    static createPseudoTypeBlock(pseudoType: Protocol.DOM.PseudoType, pseudoArgument: string | null): SectionBlock;
    static createInheritedPseudoTypeBlock(pseudoType: Protocol.DOM.PseudoType, pseudoArgument: string | null, node: SDK.DOMModel.DOMNode): Promise<SectionBlock>;
    static createRegisteredPropertiesBlock(expandedByDefault: boolean): SectionBlock;
    static createFunctionBlock(expandedByDefault: boolean): SectionBlock;
    static createKeyframesBlock(keyframesName: string): SectionBlock;
    static createAtRuleBlock(expandedByDefault: boolean): SectionBlock;
    static createPositionTryBlock(positionTryName: string): SectionBlock;
    static createInheritedNodeBlock(node: SDK.DOMModel.DOMNode): Promise<SectionBlock>;
    static createLayerBlock(rule: SDK.CSSRule.CSSStyleRule): SectionBlock;
    updateFilter(): number;
    titleElement(): Element | null;
}
export declare class IdleCallbackManager {
    private discarded;
    private readonly promises;
    private readonly queue;
    constructor();
    discard(): void;
    schedule(fn: () => void): void;
    protected scheduleIdleCallback(timeout: number): void;
    awaitDone(): Promise<void[]>;
}
export declare function quoteFamilyName(familyName: string): string;
export declare class CSSPropertyPrompt extends UI.TextPrompt.TextPrompt {
    private readonly isColorAware;
    private readonly cssCompletions;
    private selectedNodeComputedStyles;
    private parentNodeComputedStyles;
    private treeElement;
    private isEditingName;
    private readonly cssVariables;
    constructor(treeElement: StylePropertyTreeElement, isEditingName: boolean, completions?: string[]);
    onKeyDown(event: Event): void;
    onMouseWheel(event: Event): void;
    tabKeyPressed(): boolean;
    private handleNameOrValueUpDown;
    private isValueSuggestion;
    private buildPropertyCompletions;
}
export declare function unescapeCssString(input: string): string;
export declare function escapeUrlAsCssComment(urlText: string): string;
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
export declare class ButtonProvider implements UI.Toolbar.Provider {
    private readonly button;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): ButtonProvider;
    private longClicked;
    item(): UI.Toolbar.ToolbarItem;
}
export {};
