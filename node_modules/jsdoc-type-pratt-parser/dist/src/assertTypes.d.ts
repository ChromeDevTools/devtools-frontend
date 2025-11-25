import type { IndexSignatureResult, KeyValueResult, MappedTypeResult } from './result/NonRootResult.js';
import type { NameResult, NumberResult, RootResult, VariadicResult, TupleResult, GenericResult } from './result/RootResult.js';
import type { IntermediateResult } from './result/IntermediateResult.js';
import type { Parser } from './Parser.js';
export declare function assertResultIsNotReservedWord<T extends RootResult | IntermediateResult>(parser: Parser, result: T): T;
/**
 * Throws an error if the provided result is not a {@link RootResult}
 */
export declare function assertRootResult(result?: IntermediateResult): RootResult;
export declare function assertPlainKeyValueOrRootResult(result: IntermediateResult): KeyValueResult | RootResult;
export declare function assertPlainKeyValueOrNameResult(result: IntermediateResult): KeyValueResult | NameResult;
export declare function assertPlainKeyValueResult(result: IntermediateResult): KeyValueResult;
export declare function assertNumberOrVariadicNameResult(result: IntermediateResult): NumberResult | NameResult | VariadicResult<NameResult>;
export declare function assertArrayOrTupleResult(result: IntermediateResult): TupleResult | GenericResult;
export declare function isSquaredProperty(result: IntermediateResult): result is IndexSignatureResult | MappedTypeResult;
