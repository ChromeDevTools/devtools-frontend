import '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as ComputedStyleModule from '../../models/computed_style/computed_style.js';
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
    toolbar: HTMLElement;
    hasMatches: boolean;
    computedStyleModel: ComputedStyleModule.ComputedStyleModel.ComputedStyleModel;
}
type View = (input: ComputedStyleWidgetInput, output: null, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ComputedStyleWidget extends UI.Widget.VBox {
    #private;
    private computedStyleModel;
    private readonly showInheritedComputedStylePropertiesSetting;
    private readonly groupComputedStylesSetting;
    input: UI.Toolbar.ToolbarInput;
    private filterRegex;
    private readonly linkifier;
    private readonly imagePreviewPopover;
    private readonly toolbarElement;
    constructor(computedStyleModel: ComputedStyleModule.ComputedStyleModel.ComputedStyleModel);
    onResize(): void;
    wasShown(): void;
    willHide(): void;
    performUpdate(): Promise<void>;
    private rebuildAlphabeticalList;
    private rebuildGroupedList;
    private buildTraceNode;
    private createTreeNodeRenderer;
    private buildTreeNode;
    private handleContextMenuEvent;
    private computePropertyTraces;
    private computeNonInheritedProperties;
    private onFilterChanged;
    filterComputedStyles(regex: RegExp | null): Promise<void>;
    private nodeFilter;
    private filterAlphabeticalList;
    private filterGroupLists;
}
export {};
