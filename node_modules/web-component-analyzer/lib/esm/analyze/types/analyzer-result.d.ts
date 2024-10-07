import { SourceFile } from "typescript";
import { ComponentDeclaration, ComponentFeatures } from "./component-declaration";
import { ComponentDefinition } from "./component-definition";
/**
 * The result returned after components have been analyzed.
 */
export interface AnalyzerResult {
    sourceFile: SourceFile;
    componentDefinitions: ComponentDefinition[];
    declarations?: ComponentDeclaration[];
    globalFeatures?: ComponentFeatures;
}
//# sourceMappingURL=analyzer-result.d.ts.map