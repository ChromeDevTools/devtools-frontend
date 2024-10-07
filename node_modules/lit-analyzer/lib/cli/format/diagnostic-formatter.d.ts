import { SourceFile } from "typescript";
import { LitDiagnostic } from "../../analyze/types/lit-diagnostic.js";
import { LitAnalyzerCliConfig } from "../lit-analyzer-cli-config.js";
export interface AnalysisStats {
    diagnostics: number;
    errors: number;
    warnings: number;
    filesWithProblems: number;
    totalFiles: number;
}
export interface DiagnosticFormatter {
    report(stats: AnalysisStats, config: LitAnalyzerCliConfig): string | undefined;
    diagnosticTextForFile(file: SourceFile, diagnostics: LitDiagnostic[], config: LitAnalyzerCliConfig): string | undefined;
}
//# sourceMappingURL=diagnostic-formatter.d.ts.map