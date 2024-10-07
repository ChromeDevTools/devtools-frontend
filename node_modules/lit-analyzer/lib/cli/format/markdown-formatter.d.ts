import { SourceFile } from "typescript";
import { LitDiagnostic } from "../../analyze/types/lit-diagnostic.js";
import { AnalysisStats, DiagnosticFormatter } from "./diagnostic-formatter.js";
export declare class MarkdownDiagnosticFormatter implements DiagnosticFormatter {
    report(stats: AnalysisStats): string | undefined;
    diagnosticTextForFile(file: SourceFile, diagnostics: LitDiagnostic[]): string | undefined;
}
//# sourceMappingURL=markdown-formatter.d.ts.map