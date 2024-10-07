import { SourceFile } from "typescript";
import { AnalyzerResult, ComponentDeclaration, ComponentDefinition } from "web-component-analyzer";
export interface AnalyzerDefinitionStore {
    getAnalysisResultForFile(sourceFile: SourceFile): AnalyzerResult | undefined;
    getDefinitionsWithDeclarationInFile(sourceFile: SourceFile): ComponentDefinition[];
    getComponentDeclarationsInFile(sourceFile: SourceFile): ComponentDeclaration[];
    getDefinitionForTagName(tagName: string): ComponentDefinition | undefined;
    getDefinitionsInFile(sourceFile: SourceFile): ComponentDefinition[];
}
//# sourceMappingURL=analyzer-definition-store.d.ts.map