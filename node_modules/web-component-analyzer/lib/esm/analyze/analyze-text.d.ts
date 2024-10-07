import { Program, SourceFile, TypeChecker } from "typescript";
import { AnalyzerOptions } from "./types/analyzer-options";
import { AnalyzerResult } from "./types/analyzer-result";
export interface IVirtualSourceFile {
    fileName: string;
    text?: string;
    analyze?: boolean;
    includeLib?: boolean;
}
export type VirtualSourceFile = IVirtualSourceFile | string;
export interface AnalyzeTextResult {
    results: AnalyzerResult[];
    checker: TypeChecker;
    program: Program;
    analyzedSourceFiles: SourceFile[];
}
/**
 * Analyzes components in code
 * @param {IVirtualSourceFile[]|VirtualSourceFile} inputFiles
 * @param config
 */
export declare function analyzeText(inputFiles: VirtualSourceFile[] | VirtualSourceFile, config?: Partial<AnalyzerOptions>): AnalyzeTextResult;
//# sourceMappingURL=analyze-text.d.ts.map