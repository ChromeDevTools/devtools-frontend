import { Node } from "typescript";
import { TextDocument } from "../parse/document/text-document/text-document.js";
import { HtmlNodeAttr } from "../types/html-node/html-node-attr-types.js";
import { HtmlNode } from "../types/html-node/html-node-types.js";
import { DocumentRange, Range, SourceFileRange } from "../types/range.js";
export declare function makeSourceFileRange(range: Range): SourceFileRange;
export declare function makeDocumentRange(range: Range): DocumentRange;
export declare function rangeFromHtmlNodeAttr(htmlAttr: HtmlNodeAttr): SourceFileRange;
export declare function rangeFromHtmlNode(htmlNode: HtmlNode): SourceFileRange;
export declare function rangeFromNode(node: Node): SourceFileRange;
export declare function documentRangeToSFRange(document: TextDocument, range: DocumentRange | Range): SourceFileRange;
export declare function sfRangeToDocumentRange(document: TextDocument, range: SourceFileRange | Range): DocumentRange;
/**
 * Returns if a position is within start and end.
 * @param position
 * @param start
 * @param end
 */
export declare function intersects(position: number | Range, { start, end }: Range): boolean;
//# sourceMappingURL=range-util.d.ts.map