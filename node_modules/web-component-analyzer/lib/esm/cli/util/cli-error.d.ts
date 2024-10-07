/**
 * Make an error of kind "CLIError"
 * Use this function instead of subclassing Error because of problems after transpilation.
 * @param message
 */
export declare function makeCliError(message: string): Error;
/**
 * Returns if an error is of kind "CLIError"
 * @param error
 */
export declare function isCliError(error: unknown): error is Error;
//# sourceMappingURL=cli-error.d.ts.map