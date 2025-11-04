export interface NodeTextData {
    nodeTitle: string;
    nodeId?: string;
    nodeClasses?: string[];
}
export declare class NodeText extends HTMLElement {
    #private;
    set data(data: NodeTextData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-node-text': NodeText;
    }
}
