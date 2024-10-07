import { LitAnalyzerContext } from "../../lit-analyzer-context.js";
import { CssDocument } from "../../parse/document/text-document/css-document/css-document.js";
import { LitCompletion } from "../../types/lit-completion.js";
import { LitCompletionDetails } from "../../types/lit-completion-details.js";
import { LitDefinition } from "../../types/lit-definition.js";
import { LitDiagnostic } from "../../types/lit-diagnostic.js";
import { LitQuickInfo } from "../../types/lit-quick-info.js";
import { DocumentOffset } from "../../types/range.js";
export declare class LitCssDocumentAnalyzer {
    private vscodeCssService;
    private completionsCache;
    getCompletionDetailsAtOffset(document: CssDocument, offset: DocumentOffset, name: string, context: LitAnalyzerContext): LitCompletionDetails | undefined;
    getCompletionsAtOffset(document: CssDocument, offset: DocumentOffset, context: LitAnalyzerContext): LitCompletion[];
    getQuickInfoAtOffset(document: CssDocument, offset: DocumentOffset, context: LitAnalyzerContext): LitQuickInfo | undefined;
    getDiagnostics(document: CssDocument, context: LitAnalyzerContext): LitDiagnostic[];
    getDefinitionAtOffset(document: CssDocument, offset: DocumentOffset, context: LitAnalyzerContext): LitDefinition | undefined;
}
//# sourceMappingURL=lit-css-document-analyzer.d.ts.map