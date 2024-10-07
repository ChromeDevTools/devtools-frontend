import { AnalyzerCliConfig } from "../analyzer-cli-config";
/**
 * Logs to the console with a specific level.
 * This function takes the config into account
 * @param text
 * @param config
 * @param level
 */
export declare function log(text: unknown | (() => string), config: AnalyzerCliConfig, level?: "normal" | "verbose"): void;
/**
 * Logs only if verbose is set to true in the config
 * @param text
 * @param config
 */
export declare function logVerbose(text: () => unknown, config: AnalyzerCliConfig): void;
//# sourceMappingURL=log.d.ts.map