import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
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
    hasMatches: boolean;
    computedStyleModel: ComputedStyleModule.ComputedStyleModel.ComputedStyleModel;
    showInheritedComputedStylePropertiesSetting: Common.Settings.Setting<boolean>;
    groupComputedStylesSetting: Common.Settings.Setting<boolean>;
    onFilterChanged: (event: CustomEvent<string>) => void;
    filterText: string;
}
type View = (input: ComputedStyleWidgetInput, output: null, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ComputedStyleWidget extends UI.Widget.VBox {
    #private;
    private computedStyleModel;
    private readonly showInheritedComputedStylePropertiesSetting;
    private readonly groupComputedStylesSetting;
    private filterRegex;
    private readonly linkifier;
    private readonly imagePreviewPopover;
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
    setFilterInput(text: string): void;
    private nodeFilter;
    private filterAlphabeticalList;
    private filterGroupLists;
}
export {};
