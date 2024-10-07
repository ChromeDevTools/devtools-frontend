import { Node, SourceFile } from "typescript";
import { AnalyzerVisitContext } from "../analyzer-visit-context";
import { ComponentDeclaration } from "../types/component-declaration";
import { ComponentDefinition } from "../types/component-definition";
/**
 * Visits the source file and finds all component definitions using flavors
 * @param sourceFile
 * @param context
 * @param analyzeDeclaration
 */
export declare function discoverDefinitions(sourceFile: SourceFile, context: AnalyzerVisitContext, analyzeDeclaration: (definition: ComponentDefinition, declarationNodes: Node[]) => ComponentDeclaration | undefined): ComponentDefinition[];
//# sourceMappingURL=discover-definitions.d.ts.map