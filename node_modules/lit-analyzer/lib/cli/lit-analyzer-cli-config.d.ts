import { LitAnalyzerRules } from "../analyze/lit-analyzer-config.js";
export type FormatterFormat = "code" | "list" | "markdown";
export interface LitAnalyzerCliConfig {
    debug?: boolean;
    help?: boolean;
    noColor?: boolean;
    maxWarnings?: number;
    outFile?: string;
    failFast?: boolean;
    quiet?: boolean;
    strict?: boolean;
    format?: FormatterFormat;
    rules?: LitAnalyzerRules;
    maxProjectImportDepth?: number;
    maxNodeModuleImportDepth?: number;
}
//# sourceMappingURL=lit-analyzer-cli-config.d.ts.map