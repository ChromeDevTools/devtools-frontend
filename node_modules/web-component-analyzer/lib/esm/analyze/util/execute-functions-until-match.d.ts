import { AnalyzerVisitContext } from "../analyzer-visit-context";
/**
 * Executes functions in a function map until some function returns a non-undefined value.
 * @param functionMaps
 * @param keys
 * @param arg
 * @param context
 */
export declare function executeFunctionsUntilMatch<T extends Partial<Record<K, any>>, K extends keyof T, ReturnValue extends ReturnType<NonNullable<T[K]>>, ArgType>(functionMaps: T[], keys: K | K[], arg: ArgType, context: AnalyzerVisitContext): {
    value: NonNullable<ReturnValue>;
    shouldContinue?: boolean;
} | undefined;
//# sourceMappingURL=execute-functions-until-match.d.ts.map