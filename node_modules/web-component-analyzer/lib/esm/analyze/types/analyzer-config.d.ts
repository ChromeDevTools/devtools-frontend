import { ComponentFeature } from "./features/component-feature";
/**
 * Configuration to give when analyzing components.
 */
export interface AnalyzerConfig {
    analyzeDefaultLib?: boolean;
    analyzeDependencies?: boolean;
    analyzeGlobalFeatures?: boolean;
    analyzeAllDeclarations?: boolean;
    excludedDeclarationNames?: string[];
    features?: ComponentFeature[];
}
//# sourceMappingURL=analyzer-config.d.ts.map