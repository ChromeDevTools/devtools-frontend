import { SourceFile } from "typescript";
import { AnalyzerVisitContext } from "../analyzer-visit-context";
import { ComponentDeclaration } from "../types/component-declaration";
/**
 * Visits the source file and finds all component definitions using flavors
 * @param sourceFile
 * @param context
 */
export declare function discoverDeclarations(sourceFile: SourceFile, context: AnalyzerVisitContext): ComponentDeclaration[];
//# sourceMappingURL=discover-declarations.d.ts.map