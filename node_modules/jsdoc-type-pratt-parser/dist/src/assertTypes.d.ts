import { KeyValueResult } from './result/NonRootResult';
import { NameResult, NumberResult, RootResult, VariadicResult } from './result/RootResult';
import { IntermediateResult } from './result/IntermediateResult';
/**
 * Throws an error if the provided result is not a {@link RootResult}
 */
export declare function assertRootResult(result?: IntermediateResult): RootResult;
export declare function assertPlainKeyValueOrRootResult(result: IntermediateResult): KeyValueResult | RootResult;
export declare function assertPlainKeyValueOrNameResult(result: IntermediateResult): KeyValueResult | NameResult;
export declare function assertPlainKeyValueResult(result: IntermediateResult): KeyValueResult;
export declare function assertNumberOrVariadicNameResult(result: IntermediateResult): NumberResult | NameResult | VariadicResult<NameResult>;
export declare function isPlainKeyValue(result: IntermediateResult): result is KeyValueResult;
