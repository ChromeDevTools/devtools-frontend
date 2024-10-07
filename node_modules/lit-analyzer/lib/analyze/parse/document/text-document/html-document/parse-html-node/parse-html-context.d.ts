import { Expression } from "typescript";
import { Range } from "../../../../../types/range.js";
import { HtmlDocument } from "../html-document.js";
export interface ParseHtmlContext {
    html: string;
    document: HtmlDocument;
    getPartsAtOffsetRange(range: Range): (string | Expression)[];
}
//# sourceMappingURL=parse-html-context.d.ts.map