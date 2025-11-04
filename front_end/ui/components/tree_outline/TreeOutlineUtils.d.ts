import * as Platform from '../../../core/platform/platform.js';
import * as Lit from '../../lit/lit.js';
export type TreeNodeId = string;
interface BaseTreeNode<TreeNodeDataType> {
    treeNodeData: TreeNodeDataType;
    renderer?: (node: TreeNode<TreeNodeDataType>, state: {
        isExpanded: boolean;
    }) => Lit.TemplateResult;
    id: TreeNodeId;
    jslogContext?: string;
}
export interface TreeNodeWithChildren<TreeNodeDataType> extends BaseTreeNode<TreeNodeDataType> {
    children: () => Promise<Array<TreeNode<TreeNodeDataType>>>;
}
interface LeafNode<TreeNodeDataType> extends BaseTreeNode<TreeNodeDataType> {
    children?: never;
}
export type TreeNode<TreeNodeDataType> = TreeNodeWithChildren<TreeNodeDataType> | LeafNode<TreeNodeDataType>;
export declare function isExpandableNode<TreeNodeDataType>(node: TreeNode<TreeNodeDataType>): node is TreeNodeWithChildren<TreeNodeDataType>;
/**
 * This is a custom lit directive that lets us track the DOM nodes that Lit
 * creates and maps them to the tree node that was given to us. This means we
 * can navigate between real DOM node and structural tree node easily in code.
 */
declare class TrackDOMNodeToTreeNode extends Lit.Directive.Directive {
    constructor(partInfo: Lit.Directive.PartInfo);
    update(part: Lit.Directive.ElementPart, [weakMap, treeNode]: Lit.Directive.DirectiveParameters<this>): void;
    render(_weakmap: WeakMap<HTMLLIElement, TreeNode<any>>, _treeNode: TreeNode<any>): void;
}
export declare const trackDOMNodeToTreeNode: (_weakmap: WeakMap<HTMLLIElement, TreeNode<any>>, _treeNode: TreeNode<any>) => Lit.Directive.DirectiveResult<typeof TrackDOMNodeToTreeNode>;
export declare const getNodeChildren: <TreeNodeDataType>(node: TreeNode<TreeNodeDataType>) => Promise<Array<TreeNode<TreeNodeDataType>>>;
/**
 * Searches the tree and returns a path to the given node.
 * e.g. if the tree is:
 * A
 * - B
 *   - C
 * - D
 *   - E
 *   - F
 *
 * And you look for F, you'll get back [A, D, F]
 */
export declare const getPathToTreeNode: <TreeNodeDataType>(tree: ReadonlyArray<TreeNode<TreeNodeDataType>>, nodeIdToFind: TreeNodeId) => Promise<Array<TreeNode<TreeNodeDataType>> | null>;
interface KeyboardNavigationOptions<TreeNodeDataType> {
    currentDOMNode: HTMLLIElement;
    currentTreeNode: TreeNode<TreeNodeDataType>;
    direction: Platform.KeyboardUtilities.ArrowKey;
    setNodeExpandedState: (treeNode: TreeNode<TreeNodeDataType>, expanded: boolean) => void;
}
export declare const findNextNodeForTreeOutlineKeyboardNavigation: <TreeNodeDataType>(options: KeyboardNavigationOptions<TreeNodeDataType>) => HTMLLIElement;
export {};
