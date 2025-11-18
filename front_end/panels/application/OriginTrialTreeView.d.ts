import '../../ui/components/icon_button/icon_button.js';
import '../../ui/legacy/legacy.js';
import '../../ui/components/adorners/adorners.js';
import * as Protocol from '../../generated/protocol.js';
import type * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
type TreeNode<DataType> = TreeOutline.TreeOutlineUtils.TreeNode<DataType>;
/**
 * The Origin Trial Tree has 4 levels of content:
 * - Origin Trial (has multiple Origin Trial tokens)
 * - Origin Trial Token (has only 1 raw token text)
 * - Fields in Origin Trial Token
 * - Raw Origin Trial Token text (folded because the content is long)
 **/
export type OriginTrialTreeNodeData = Protocol.Page.OriginTrial | Protocol.Page.OriginTrialTokenWithStatus | string;
interface TokenField {
    name: string;
    value: {
        text: string;
        hasError?: boolean;
    };
}
export interface OriginTrialTokenRowsData {
    node: TreeNode<OriginTrialTreeNodeData>;
}
interface RowsViewInput {
    tokenWithStatus: Protocol.Page.OriginTrialTokenWithStatus;
    parsedTokenDetails: TokenField[];
}
type RowsView = (input: RowsViewInput, output: undefined, target: HTMLElement) => void;
export declare class OriginTrialTokenRows extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: RowsView);
    set data(data: Protocol.Page.OriginTrialTokenWithStatus);
    connectedCallback(): void;
    performUpdate(): void;
}
export interface OriginTrialTreeViewData {
    trials: Protocol.Page.OriginTrial[];
}
type View = (input: OriginTrialTreeViewData, output: undefined, target: HTMLElement) => void;
export declare class OriginTrialTreeView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: OriginTrialTreeViewData);
    performUpdate(): void;
}
export {};
