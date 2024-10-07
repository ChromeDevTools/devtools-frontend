import * as ts from "typescript";
import { HtmlDocument } from "../../parse/document/text-document/html-document/html-document.js";
import { LitClosingTagInfo } from "../../types/lit-closing-tag-info.js";
import { LitFormatEdit } from "../../types/lit-format-edit.js";
import { DocumentOffset } from "../../types/range.js";
export declare class LitHtmlVscodeService {
    getClosingTagAtOffset(document: HtmlDocument, offset: DocumentOffset): LitClosingTagInfo | undefined;
    format(document: HtmlDocument, settings: ts.FormatCodeSettings): LitFormatEdit[];
}
//# sourceMappingURL=lit-html-vscode-service.d.ts.map