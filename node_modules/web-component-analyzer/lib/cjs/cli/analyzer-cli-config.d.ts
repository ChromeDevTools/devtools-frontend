import * as tsModule from "typescript";
import { ComponentFeature } from "../analyze/types/features/component-feature";
import { VisibilityKind } from "../analyze/types/visibility-kind";
import { TransformerKind } from "../transformers/transformer-kind";
export interface AnalyzerCliConfig {
    glob?: string[];
    dry?: boolean;
    verbose?: boolean;
    silent?: boolean;
    outFile?: string;
    outFiles?: string;
    outDir?: string;
    format?: TransformerKind;
    visibility?: VisibilityKind;
    features?: ComponentFeature[];
    analyzeGlobalFeatures?: boolean;
    analyzeDependencies?: boolean;
    analyzeDefaultLibrary?: boolean;
    discoverNodeModules?: boolean;
    markdown?: {
        headerLevel?: number;
    };
    inlineTypes?: boolean;
    ts?: typeof tsModule;
    cwd?: string;
}
//# sourceMappingURL=analyzer-cli-config.d.ts.map