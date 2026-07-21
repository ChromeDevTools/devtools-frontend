import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as AccessibilityTreeUtils from './AccessibilityTreeUtils.js';
export interface ViewInput {
    nodes: AccessibilityTreeUtils.AXTreeNode[];
    onNodeSelected: (node: SDK.AccessibilityModel.AccessibilityNode) => void;
    onNodeHighlight: (node: SDK.AccessibilityModel.AccessibilityNode) => void;
    onNodeClearHighlight: () => void;
    onCopy: (node: SDK.AccessibilityModel.AccessibilityNode) => void;
    onScrollIntoView: (node: SDK.AccessibilityModel.AccessibilityNode) => void;
    onSwitchToDomTree: () => void;
}
export interface ViewOutput {
    expandRoots?(): Promise<void>;
    revealNode?(ancestors: string[], nodeId: string): Promise<void>;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class AccessibilityTreeView extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<SDK.AccessibilityModel.AccessibilityModel> {
    #private;
    private inspectedDOMNode;
    private root;
    constructor(view?: View, frameManager?: SDK.FrameManager.FrameManager);
    wasShown(): Promise<void>;
    performUpdate(): Promise<void>;
    refreshAccessibilityTree(): Promise<void>;
    loadSubTreeIntoAccessibilityModel(selectedNode: SDK.DOMModel.DOMNode): Promise<void>;
    revealAndSelectNode(inspectedNode: SDK.DOMModel.DOMNode): Promise<void>;
    selectedNodeChanged(inspectedNode: SDK.DOMModel.DOMNode): Promise<void>;
    treeUpdated({ data }: Common.EventTarget.EventTargetEvent<SDK.AccessibilityModel.EventTypes[SDK.AccessibilityModel.Events.TREE_UPDATED]>): void;
    modelAdded(model: SDK.AccessibilityModel.AccessibilityModel): void;
    modelRemoved(model: SDK.AccessibilityModel.AccessibilityModel): void;
}
