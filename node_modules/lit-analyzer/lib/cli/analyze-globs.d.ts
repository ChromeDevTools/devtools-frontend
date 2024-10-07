import { Diagnostic, Program, SourceFile } from "typescript";
import { CompileResult } from "./compile.js";
import { LitAnalyzerCliConfig } from "./lit-analyzer-cli-config.js";
export interface AnalyzeGlobsContext {
    didExpandGlobs?(filePaths: string[]): void;
    willAnalyzeFiles?(filePaths: string[]): void;
    didFindTypescriptDiagnostics?(diagnostics: readonly Diagnostic[], options: {
        program: Program;
    }): void;
    analyzeSourceFile?(file: SourceFile, options: {
        program: Program;
    }): void | boolean;
}
/**
 * Parses and analyses all globs and calls some callbacks while doing it.
 * @param globs
 * @param config
 * @param context
 */
export declare function analyzeGlobs(globs: string[], config: LitAnalyzerCliConfig, context?: AnalyzeGlobsContext): Promise<CompileResult>;
//# sourceMappingURL=analyze-globs.d.ts.map