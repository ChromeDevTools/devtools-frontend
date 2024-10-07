import { SourceFile } from "typescript";
import { LitDiagnostic } from "../../analyze/types/lit-diagnostic.js";
import { AnalysisStats, DiagnosticFormatter } from "./diagnostic-formatter.js";
export declare class CodeDiagnosticFormatter implements DiagnosticFormatter {
    report(stats: AnalysisStats): string | undefined;
    diagnosticTextForFile(file: SourceFile, diagnostics: LitDiagnostic[]): string | undefined;
}
//# sourceMappingURL=code-diagnostic-formatter.d.ts.map