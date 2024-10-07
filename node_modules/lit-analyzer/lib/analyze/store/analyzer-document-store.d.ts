import { SourceFile } from "typescript";
import { LitAnalyzerConfig } from "../lit-analyzer-config.js";
import { TextDocument } from "../parse/document/text-document/text-document.js";
import { SourceFilePosition } from "../types/range.js";
export interface AnalyzerDocumentStore {
    getDocumentAtPosition(sourceFile: SourceFile, position: SourceFilePosition, options: LitAnalyzerConfig): TextDocument | undefined;
    getDocumentsInFile(sourceFile: SourceFile, config: LitAnalyzerConfig): TextDocument[];
}
//# sourceMappingURL=analyzer-document-store.d.ts.map