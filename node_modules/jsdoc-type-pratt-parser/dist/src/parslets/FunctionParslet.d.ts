import { type ParsletFunction } from './Parslet.js';
import type { RootResult } from '../result/RootResult.js';
import type { IntermediateResult } from '../result/IntermediateResult.js';
import type { KeyValueResult } from '../result/NonRootResult.js';
export declare function getParameters(value: IntermediateResult): Array<RootResult | KeyValueResult>;
export declare function getUnnamedParameters(value: IntermediateResult): RootResult[];
export declare function createFunctionParslet({ allowNamedParameters, allowNoReturnType, allowWithoutParenthesis, allowNewAsFunctionKeyword }: {
    allowNamedParameters?: string[];
    allowWithoutParenthesis: boolean;
    allowNoReturnType: boolean;
    allowNewAsFunctionKeyword: boolean;
}): ParsletFunction;
