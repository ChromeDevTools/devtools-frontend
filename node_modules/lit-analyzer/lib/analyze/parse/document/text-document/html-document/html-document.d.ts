import { HtmlNodeAttr } from "../../../../types/html-node/html-node-attr-types.js";
import { HtmlNode } from "../../../../types/html-node/html-node-types.js";
import { DocumentOffset, DocumentRange } from "../../../../types/range.js";
import { VirtualDocument } from "../../virtual-document/virtual-document.js";
import { TextDocument } from "../text-document.js";
export declare class HtmlDocument extends TextDocument {
    rootNodes: HtmlNode[];
    constructor(virtualDocument: VirtualDocument, rootNodes: HtmlNode[]);
    htmlAttrAreaAtOffset(offset: DocumentOffset | DocumentRange): HtmlNode | undefined;
    htmlAttrAssignmentAtOffset(offset: DocumentOffset | DocumentRange): HtmlNodeAttr | undefined;
    htmlAttrNameAtOffset(offset: DocumentOffset | DocumentRange): HtmlNodeAttr | undefined;
    htmlNodeNameAtOffset(offset: DocumentOffset | DocumentRange): HtmlNode | undefined;
    htmlNodeOrAttrAtOffset(offset: DocumentOffset | DocumentRange): HtmlNode | HtmlNodeAttr | undefined;
    /**
     * Finds the closest node to offset.
     * This method can be used to find out which tag to close in the HTML.
     * @param offset
     */
    htmlNodeClosestToOffset(offset: DocumentOffset): HtmlNode | undefined;
    findAttr(test: (node: HtmlNodeAttr) => boolean): HtmlNodeAttr | undefined;
    findNode(test: (node: HtmlNode) => boolean): HtmlNode | undefined;
    mapNodes<T>(map: (node: HtmlNode) => T): T[];
    nodes(roots?: HtmlNode[]): IterableIterator<HtmlNode>;
    private mapFindOne;
}
//# sourceMappingURL=html-document.d.ts.map