import * as tsModule from "typescript";
import { Node, Program, TypeChecker } from "typescript";
import { AnalyzerFlavor, ComponentFeatureCollection } from "./flavors/analyzer-flavor";
import { AnalyzerConfig } from "./types/analyzer-config";
import { ComponentDeclaration } from "./types/component-declaration";
/**
 * This context is used in the entire analyzer.
 * A new instance of this is created whenever the analyzer runs.
 */
export interface AnalyzerVisitContext {
    checker: TypeChecker;
    program: Program;
    ts: typeof tsModule;
    config: AnalyzerConfig;
    flavors: AnalyzerFlavor[];
    emitContinue?(): void;
    cache: {
        featureCollection: WeakMap<Node, ComponentFeatureCollection>;
        componentDeclarationCache: WeakMap<Node, ComponentDeclaration>;
        general: Map<unknown, unknown>;
    };
}
//# sourceMappingURL=analyzer-visit-context.d.ts.map