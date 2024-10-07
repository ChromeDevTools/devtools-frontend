import { Program } from "typescript";
import { AnalyzerResult } from "../analyze/types/analyzer-result";
import { TransformerConfig } from "./transformer-config";
import { TransformerKind } from "./transformer-kind";
/**
 * Transforms the analyzer results into a string representation based on the transformer kind
 * @param kind
 * @param results
 * @param program
 * @param config
 */
export declare function transformAnalyzerResult(kind: TransformerKind, results: AnalyzerResult | AnalyzerResult[], program: Program, config?: Partial<TransformerConfig>): string;
//# sourceMappingURL=transform-analyzer-result.d.ts.map