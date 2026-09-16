import { hasPotentialMathFunction, QUICK_MATH_TEST } from './lib/simplify/call.js';
export type ReduceCalcOptions = {
    precision?: number | false;
    warnWhenCannotResolve?: boolean;
    /**
     * Serialize finite negative results without a `calc()` wrapper. Defaults to `false`.
     */
    unwrapSingleNegativeNumber?: boolean;
    /**
     * Invoked when parse/simplify throws.
     */
    onParseError?: (error: Error, input: string) => void;
    /**
     * Invoked when `warnWhenCannotResolve` is set and an expression cannot be reduced to a single value.
     */
    onWarn?: (message: string) => void;
};
export type ResolvedReduceCalcOptions = Required<Omit<ReduceCalcOptions, 'onParseError' | 'onWarn'>> & Pick<ReduceCalcOptions, 'onParseError' | 'onWarn'>;
export type TransformContext = {
    options: ResolvedReduceCalcOptions;
    value: string;
    tokens: import('@csstools/css-tokenizer').CSSToken[];
    replacements: Replacement[];
};
export type Replacement = {
    start: number;
    end: number;
    node: import('./lib/node.js').Node;
    calcName: string;
};
/**
 * Simplify every supported CSS math function in a component-value string.
 * Text outside those functions is preserved byte-for-byte.
 *
 * @param {string} value
 * @param {ReduceCalcOptions} [opts]
 * @return {string}
 */
declare function reduceCalc(value: string, opts?: ReduceCalcOptions): string;
export { QUICK_MATH_TEST, hasPotentialMathFunction };
export default reduceCalc;
