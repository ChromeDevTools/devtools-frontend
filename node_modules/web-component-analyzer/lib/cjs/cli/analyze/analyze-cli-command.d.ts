import { AnalyzerCliConfig } from "../analyzer-cli-config";
import { CliCommand } from "../cli-command";
/**
 * Runs the analyze cli command.
 * @param config
 */
export declare const analyzeCliCommand: CliCommand;
/**
 * Analyzes input globs and returns the transformed result.
 * @param inputGlobs
 * @param config
 */
export declare function analyzeAndTransformGlobs(inputGlobs: string | string[], config: AnalyzerCliConfig): Promise<string>;
//# sourceMappingURL=analyze-cli-command.d.ts.map