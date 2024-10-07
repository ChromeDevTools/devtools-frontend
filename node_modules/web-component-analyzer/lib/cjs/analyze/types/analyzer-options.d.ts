import * as tsModule from "typescript";
import { Program } from "typescript";
import { AnalyzerFlavor } from "../flavors/analyzer-flavor";
import { AnalyzerConfig } from "./analyzer-config";
/**
 * Options to give when analyzing components
 */
export interface AnalyzerOptions {
    program: Program;
    ts?: typeof tsModule;
    flavors?: AnalyzerFlavor[];
    config?: AnalyzerConfig;
    verbose?: boolean;
}
//# sourceMappingURL=analyzer-options.d.ts.map