import { SourceFile } from "typescript";
import { SourceFilePosition } from "../../types/range.js";
import { TextDocument } from "./text-document/text-document.js";
export interface ParseDocumentOptions {
    cssTags: string[];
    htmlTags: string[];
}
export declare function parseDocumentsInSourceFile(sourceFile: SourceFile, options: ParseDocumentOptions): TextDocument[];
export declare function parseDocumentsInSourceFile(sourceFile: SourceFile, options: ParseDocumentOptions, position: SourceFilePosition): TextDocument | undefined;
//# sourceMappingURL=parse-documents-in-source-file.d.ts.map