import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as AccessibilityTreeUtils from './AccessibilityTreeUtils.js';
export declare class AccessibilityTreeView extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<SDK.AccessibilityModel.AccessibilityModel> {
    private accessibilityTreeComponent;
    private readonly toggleButton;
    private inspectedDOMNode;
    private root;
    constructor(toggleButton: HTMLElement, accessibilityTreeComponent: TreeOutline.TreeOutline.TreeOutline<AccessibilityTreeUtils.AXTreeNodeData>);
    wasShown(): Promise<void>;
    refreshAccessibilityTree(): Promise<void>;
    renderTree(): Promise<void>;
    loadSubTreeIntoAccessibilityModel(selectedNode: SDK.DOMModel.DOMNode): Promise<void>;
    revealAndSelectNode(inspectedNode: SDK.DOMModel.DOMNode): Promise<void>;
    selectedNodeChanged(inspectedNode: SDK.DOMModel.DOMNode): Promise<void>;
    treeUpdated({ data }: Common.EventTarget.EventTargetEvent<SDK.AccessibilityModel.EventTypes[SDK.AccessibilityModel.Events.TREE_UPDATED]>): void;
    modelAdded(model: SDK.AccessibilityModel.AccessibilityModel): void;
    modelRemoved(model: SDK.AccessibilityModel.AccessibilityModel): void;
}
