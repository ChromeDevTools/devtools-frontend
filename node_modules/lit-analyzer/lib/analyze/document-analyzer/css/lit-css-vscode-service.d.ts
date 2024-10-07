import { LitAnalyzerContext } from "../../lit-analyzer-context.js";
import { CssDocument } from "../../parse/document/text-document/css-document/css-document.js";
import { LitCompletion } from "../../types/lit-completion.js";
import { LitDiagnostic } from "../../types/lit-diagnostic.js";
import { LitQuickInfo } from "../../types/lit-quick-info.js";
import { DocumentOffset } from "../../types/range.js";
export declare class LitCssVscodeService {
    private dataProvider;
    private get cssService();
    private get scssService();
    getDiagnostics(document: CssDocument, context: LitAnalyzerContext): LitDiagnostic[];
    getQuickInfo(document: CssDocument, offset: DocumentOffset, context: LitAnalyzerContext): LitQuickInfo | undefined;
    getCompletions(document: CssDocument, offset: DocumentOffset, context: LitAnalyzerContext): LitCompletion[];
    private makeVscStylesheet;
}
//# sourceMappingURL=lit-css-vscode-service.d.ts.map