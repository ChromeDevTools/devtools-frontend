import { CompilerOptions, Program, SourceFile } from "typescript";
import { LitAnalyzerConfig } from "../analyze/lit-analyzer-config.js";
export interface CompileResult {
    program: Program;
    files: SourceFile[];
    pluginOptions?: LitAnalyzerConfig;
}
/**
 * Compiles an array of file paths using typescript.
 * @param filePaths
 */
export declare function compileTypescript(filePaths: string | string[]): CompileResult;
/**
 * Returns compiler options to be used
 */
export declare function getCompilerOptions(): CompilerOptions;
/**
 * Resolves "tsconfig.json" file and returns its CompilerOptions
 */
export declare function resolveTsConfigCompilerOptions(): CompilerOptions | undefined;
/**
 * Resolves the nearest tsconfig.json and returns the configuration seed within the plugins section for "ts-lit-plugin"
 */
export declare function readLitAnalyzerConfigFromTsConfig(): Partial<LitAnalyzerConfig> | undefined;
//# sourceMappingURL=compile.d.ts.map