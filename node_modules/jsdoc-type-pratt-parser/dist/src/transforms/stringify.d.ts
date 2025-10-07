import { type TransformRules } from './transform.js';
import type { RootResult } from '../result/RootResult.js';
import type { Node } from 'estree';
export declare function quote(value: string, quote: 'single' | 'double' | undefined): string;
export declare function stringifyRules({ computedPropertyStringifier }?: {
    computedPropertyStringifier?: (node: Node, options?: any) => string;
}): TransformRules<string>;
export declare function stringify(result: RootResult, stringificationRules?: TransformRules<string> | ((node: Node, options?: any) => string)): string;
