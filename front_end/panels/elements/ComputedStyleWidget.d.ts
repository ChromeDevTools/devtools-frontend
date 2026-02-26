import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ComputedStyleModule from '../../models/computed_style/computed_style.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
type ComputedStyleData = {
    tag: 'property';
    propertyName: string;
    propertyValue: string;
    inherited: boolean;
} | {
    tag: 'traceElement';
    property: SDK.CSSProperty.CSSProperty;
    rule: SDK.CSSRule.CSSRule | null;
} | {
    tag: 'category';
    name: string;
};
interface ComputedStyleWidgetInput {
    computedStylesTree: TreeOutline.TreeOutline.TreeOutline<ComputedStyleData>;
    hasMatches: boolean;
    showInheritedComputedStylePropertiesSetting: Common.Settings.Setting<boolean>;
    groupComputedStylesSetting: Common.Settings.Setting<boolean>;
    onFilterChanged: (event: CustomEvent<string>) => void;
    filterText: string;
    onRegexToggled: () => void;
    includeToolbar: boolean;
}
type View = (input: ComputedStyleWidgetInput, output: null, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ComputedStyleWidget extends UI.Widget.VBox {
    #private;
    private readonly showInheritedComputedStylePropertiesSetting;
    private readonly groupComputedStylesSetting;
    private filterRegex;
    private readonly linkifier;
    private readonly imagePreviewPopover;
    constructor();
    onResize(): void;
    get includeToolbar(): boolean;
    set includeToolbar(x: boolean);
    get nodeStyle(): ComputedStyleModule.ComputedStyleModel.ComputedStyle | null;
    set nodeStyle(nodeStyle: ComputedStyleModule.ComputedStyleModel.ComputedStyle | null);
    get matchedStyles(): SDK.CSSMatchedStyles.CSSMatchedStyles | null;
    set matchedStyles(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles | null);
    get computedStyleModel(): ComputedStyleModule.ComputedStyleModel.ComputedStyleModel | undefined;
    set computedStyleModel(computedStyleModel: ComputedStyleModule.ComputedStyleModel.ComputedStyleModel);
    performUpdate(): Promise<void>;
    private rebuildAlphabeticalList;
    private rebuildGroupedList;
    private buildTraceNode;
    private createTreeNodeRenderer;
    private buildTreeNode;
    private handleContextMenuEvent;
    private computePropertyTraces;
    private computeNonInheritedProperties;
    private onRegexToggled;
    private onFilterChanged;
    filterComputedStyles(regex: RegExp | null): Promise<void>;
    setFilterInput(text: string): void;
    private nodeFilter;
    private filterAlphabeticalList;
    private filterGroupLists;
}
export {};
