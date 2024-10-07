import { Program, SourceFile } from "typescript";
import { AnalyzerResult } from "../../analyze/types/analyzer-result";
import { AnalyzerCliConfig } from "../analyzer-cli-config";
import { CompileResult } from "./compile";
export interface AnalyzeGlobsContext {
    didExpandGlobs?(filePaths: string[]): void;
    willAnalyzeFiles?(filePaths: string[]): void;
    emitAnalyzedFile?(file: SourceFile, result: AnalyzerResult, options: {
        program: Program;
    }): Promise<void> | void;
}
/**
 * Parses and analyses all globs and calls some callbacks while doing it.
 * @param globs
 * @param config
 * @param context
 */
export declare function analyzeGlobs(globs: string[], config: AnalyzerCliConfig, context?: AnalyzeGlobsContext): Promise<CompileResult & {
    results: AnalyzerResult[];
}>;
//# sourceMappingURL=analyze-globs.d.ts.map