/// <reference types="node" />
import { Context, RunningScriptOptions } from 'vm';
/**
 * Compiles sync JavaScript code into JavaScript with async Functions.
 *
 * @param {String} code JavaScript string to convert
 * @param {Array} names Array of function names to add `await` operators to
 * @return {String} Converted JavaScript string with async/await injected
 * @api public
 */
export declare function degenerator(code: string, _names: DegeneratorNames): string;
export type DegeneratorName = string | RegExp;
export type DegeneratorNames = DegeneratorName[];
export interface CompileOptions extends RunningScriptOptions {
    sandbox?: Context;
}
export declare function compile<R = unknown, A extends unknown[] = []>(code: string, returnName: string, names: DegeneratorNames, options?: CompileOptions): (...args: A) => Promise<R>;
//# sourceMappingURL=index.d.ts.map