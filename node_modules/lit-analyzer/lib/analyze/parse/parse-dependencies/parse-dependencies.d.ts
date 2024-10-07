import { SourceFile } from "typescript";
import { ComponentDefinition } from "web-component-analyzer";
import { LitAnalyzerContext } from "../../lit-analyzer-context.js";
/**
 * Returns a map of imported component definitions in each file encountered from a source file recursively.
 * @param sourceFile
 * @param context
 */
export declare function parseDependencies(sourceFile: SourceFile, context: LitAnalyzerContext): ComponentDefinition[];
/**
 * Returns a map of component declarations in each file encountered from a source file recursively.
 * @param sourceFile
 * @param context
 * @param maxExternalDepth
 * @param minExternalDepth
 */
export declare function parseAllIndirectImports(sourceFile: SourceFile, context: LitAnalyzerContext, { maxExternalDepth, maxInternalDepth }?: {
    maxExternalDepth?: number;
    maxInternalDepth?: number;
}): Set<SourceFile>;
//# sourceMappingURL=parse-dependencies.d.ts.map