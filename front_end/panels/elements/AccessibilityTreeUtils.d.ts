import './components/components.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as Lit from '../../ui/lit/lit.js';
export type AXTreeNodeData = SDK.AccessibilityModel.AccessibilityNode;
export type AXTreeNode = TreeOutline.TreeOutlineUtils.TreeNode<AXTreeNodeData>;
export declare function sdkNodeToAXTreeNodes(sdkNode: SDK.AccessibilityModel.AccessibilityNode): Promise<AXTreeNode[]>;
export declare function accessibilityNodeRenderer(node: AXTreeNode): Lit.TemplateResult;
