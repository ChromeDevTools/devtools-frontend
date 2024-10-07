import { Program } from "typescript";
import { AnalyzerResult } from "../analyze/types/analyzer-result";
import { TransformerConfig } from "./transformer-config";
export type TransformerFunction = (results: AnalyzerResult[], program: Program, config: TransformerConfig) => string;
//# sourceMappingURL=transformer-function.d.ts.map