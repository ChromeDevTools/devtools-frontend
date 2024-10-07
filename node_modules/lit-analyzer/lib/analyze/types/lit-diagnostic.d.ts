import { SourceFile } from "typescript";
import { LitAnalyzerRuleId } from "../lit-analyzer-config.js";
import { SourceFileRange } from "./range.js";
export type LitDiagnosticSeverity = "error" | "warning";
export interface LitDiagnostic {
    location: SourceFileRange;
    code?: number;
    message: string;
    fixMessage?: string;
    suggestion?: string;
    source: LitAnalyzerRuleId;
    severity: LitDiagnosticSeverity;
    file: SourceFile;
}
//# sourceMappingURL=lit-diagnostic.d.ts.map