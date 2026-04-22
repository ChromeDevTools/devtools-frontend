import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ElementsComponents from './components/components.js';
import { StylePropertiesSection } from './StylePropertiesSection.js';
import type { StylePropertyTreeElement } from './StylePropertyTreeElement.js';
import type { StylesContainer } from './StylesContainer.js';
import { WebCustomData } from './WebCustomData.js';
interface ViewInput {
    sections: StylePropertiesSection[];
}
type View = (input: ViewInput, output_: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare const enum Events {
    STYLES_UPDATE_COMPLETED = "StylesUpdateCompleted"
}
export interface EventTypes {
    [Events.STYLES_UPDATE_COMPLETED]: void;
}
declare const StandaloneStylesContainer_base: (new (...args: any[]) => {
    __events: Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.STYLES_UPDATE_COMPLETED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.STYLES_UPDATE_COMPLETED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.STYLES_UPDATE_COMPLETED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.STYLES_UPDATE_COMPLETED): boolean;
    dispatchEventToListeners<T extends Events.STYLES_UPDATE_COMPLETED>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
    dispatchDOMEvent?(event: Event): void;
}) & typeof UI.Widget.VBox;
export declare class StandaloneStylesContainer extends StandaloneStylesContainer_base implements StylesContainer {
    #private;
    activeCSSAngle: InlineEditor.CSSAngle.CSSAngle | null;
    isEditingStyle: boolean;
    readonly sectionByElement: WeakMap<Node, StylePropertiesSection>;
    readonly linkifier: Components.Linkifier.Linkifier;
    userOperation: boolean;
    constructor(element?: HTMLElement, view?: View);
    get webCustomData(): WebCustomData | undefined;
    performUpdate(signal?: AbortSignal): Promise<void>;
    swatchPopoverHelper(): InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
    set domNode(node: SDK.DOMModel.DOMNode | null);
    set filter(regex: RegExp | null);
    node(): SDK.DOMModel.DOMNode | null;
    cssModel(): SDK.CSSModel.CSSModel | null;
    computedStyleModel(): ComputedStyle.ComputedStyleModel.ComputedStyleModel;
    setActiveProperty(_treeElement: StylePropertyTreeElement | null): void;
    refreshUpdate(editedSection: StylePropertiesSection, editedTreeElement?: StylePropertyTreeElement): void;
    filterRegex(): RegExp | null;
    setEditingStyle(editing: boolean): void;
    setUserOperation(userOperation: boolean): void;
    forceUpdate(): void;
    hideAllPopovers(): void;
    allSections(): StylePropertiesSection[];
    getVariablePopoverContents(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, variableName: string, computedValue: string | null): ElementsComponents.CSSVariableValueView.CSSVariableValueView;
    getVariableParserError(_matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, _variableName: string): ElementsComponents.CSSVariableValueView.CSSVariableParserError | null;
    jumpToFunctionDefinition(_functionName: string): void;
    continueEditingElement(_sectionIndex: number, _propertyIndex: number): void;
    revealProperty(_cssProperty: SDK.CSSProperty.CSSProperty): void;
    resetFocus(): void;
    removeSection(_section: StylePropertiesSection): void;
    focusedSectionIndex(): number;
    addBlankSection(_insertAfterSection: StylePropertiesSection, _styleSheetHeader: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, _ruleLocation: TextUtils.TextRange.TextRange): void;
    jumpToProperty(_propertyName: string, _sectionName?: string, _blockName?: string): boolean;
    jumpToSectionBlock(_section: string): void;
    jumpToFontPaletteDefinition(_paletteName: string): void;
    jumpToDeclaration(_valueSource: SDK.CSSMatchedStyles.CSSValueSource): void;
    addStyleUpdateListener(listener: () => void): void;
    removeStyleUpdateListener(listener: () => void): void;
}
export {};
