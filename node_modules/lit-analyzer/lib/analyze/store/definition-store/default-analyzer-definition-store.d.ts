import { SourceFile } from "typescript";
import { AnalyzerResult, ComponentDeclaration, ComponentDefinition } from "web-component-analyzer";
import { AnalyzerDefinitionStore } from "../analyzer-definition-store.js";
export declare class DefaultAnalyzerDefinitionStore implements AnalyzerDefinitionStore {
    private analysisResultForFile;
    private definitionForTagName;
    private intersectingDefinitionsForFile;
    absorbAnalysisResult(sourceFile: SourceFile, result: AnalyzerResult): void;
    forgetAnalysisResultForFile(sourceFile: SourceFile): void;
    getAnalysisResultForFile(sourceFile: SourceFile): AnalyzerResult | undefined;
    getDefinitionsWithDeclarationInFile(sourceFile: SourceFile): ComponentDefinition[];
    getComponentDeclarationsInFile(sourceFile: SourceFile): ComponentDeclaration[];
    getDefinitionForTagName(tagName: string): ComponentDefinition | undefined;
    getDefinitionsInFile(sourceFile: SourceFile): ComponentDefinition[];
}
//# sourceMappingURL=default-analyzer-definition-store.d.ts.map