import * as Protocol from '../../../generated/protocol.js';
export interface AccessibilityTreeNodeData {
    ignored: boolean;
    name: string;
    role: string;
    properties: Protocol.Accessibility.AXProperty[];
    id: string;
}
export declare class AccessibilityTreeNode extends HTMLElement {
    #private;
    set data(data: AccessibilityTreeNodeData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-accessibility-tree-node': AccessibilityTreeNode;
    }
}
