import type * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
export interface NamedFunctionRange {
    start: ScopesCodec.Position;
    end: ScopesCodec.Position;
    name: string;
}
/**
 * Turns a list of {@link NamedFunctionRange}s into a single {@link OriginalScope} tree nested
 * according to the start/end position. Each range is turned into a OriginalScope with the `isStackFrame`
 * bit set to denote it as a function and a generic "Function" label.
 *
 * We nest all these function scopes underneath a single global scope that always starts at (0, 0) and
 * reaches to the largest end position.
 *
 * `ranges` can be unsorted but will be sorted in-place.
 *
 * @throws if the ranges are not nested properly. Concretely: start < end for each range, and no
 * "straddling" (i.e. partially overlapping ranges).
 */
export declare function buildOriginalScopes(ranges: NamedFunctionRange[]): ScopesCodec.OriginalScope;
/**
 * Implements decoding of the pasta source map specification.
 *
 * See https://github.com/bloomberg/pasta-sourcemaps/blob/main/spec.md
 */
export declare function decodePastaRanges(encodedRanges: string, names: string[]): NamedFunctionRange[];
