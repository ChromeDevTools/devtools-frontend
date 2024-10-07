import { CompilerOptions, Program, SourceFile } from "typescript";
export interface CompileResult {
    program: Program;
    files: SourceFile[];
}
/**
 * Compiles an array of file paths using typescript.
 * @param filePaths
 * @param options
 */
export declare function compileTypescript(filePaths: string | string[], options?: CompilerOptions): CompileResult;
//# sourceMappingURL=compile.d.ts.map