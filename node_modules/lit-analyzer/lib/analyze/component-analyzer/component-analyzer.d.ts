import { ComponentDeclaration, ComponentDefinition } from "web-component-analyzer";
import { LitAnalyzerContext } from "../lit-analyzer-context.js";
import { LitCodeFix } from "../types/lit-code-fix.js";
import { LitDiagnostic } from "../types/lit-diagnostic.js";
import { SourceFileRange } from "../types/range.js";
export declare class ComponentAnalyzer {
    getDiagnostics(definitionOrDeclaration: ComponentDefinition | ComponentDeclaration, context: LitAnalyzerContext): LitDiagnostic[];
    getCodeFixesAtOffsetRange(definitionOrDeclaration: ComponentDefinition | ComponentDeclaration, range: SourceFileRange, context: LitAnalyzerContext): LitCodeFix[];
    private getRuleDiagnostics;
}
//# sourceMappingURL=component-analyzer.d.ts.map