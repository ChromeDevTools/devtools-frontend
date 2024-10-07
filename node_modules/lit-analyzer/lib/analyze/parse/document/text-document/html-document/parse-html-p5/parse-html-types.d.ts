export interface IP5BaseSourceCodeLocation {
    startLine: number;
    startCol: number;
    startOffset: number;
    endLine: number;
    endCol: number;
    endOffset: number;
    attrs?: Record<string, IP5BaseSourceCodeLocation>;
}
export interface IP5NodeAttr {
    name: string;
    value: string;
    prefix?: string;
}
export interface IP5NodeBase {
    nodeName: string;
    namespaceURI: string;
}
export interface IP5DocumentFragmentNode extends IP5NodeBase {
    nodeName: "#document-fragment";
    childNodes: P5Node[];
}
export interface IP5TextNode extends IP5NodeBase {
    nodeName: "#text";
    value: string;
    parentNode: P5Node;
}
export interface IP5CommentNode extends IP5NodeBase {
    nodeName: "#comment";
    value: string;
    data?: string;
    parentNode: P5Node;
}
export interface IP5TagNode extends IP5NodeBase {
    nodeName: string;
    tagName: string;
    attrs: IP5NodeAttr[];
    namespaceURI: string;
    childNodes?: [];
    parentNodes: P5Node;
}
export interface IP5NodeSourceLocation extends IP5BaseSourceCodeLocation {
    startTag: IP5BaseSourceCodeLocation;
    endTag?: IP5BaseSourceCodeLocation;
}
export type P5Node = IP5TextNode | IP5TagNode | IP5CommentNode;
export declare function getSourceLocation(node: IP5TagNode): IP5NodeSourceLocation | null;
export declare function getSourceLocation(node: P5Node): IP5BaseSourceCodeLocation | null;
//# sourceMappingURL=parse-html-types.d.ts.map