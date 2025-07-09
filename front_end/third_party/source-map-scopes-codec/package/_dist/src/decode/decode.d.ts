import type { ScopeInfo, SourceMapJson } from "../../../src/scopes.js";
/**
 * The mode decides how well-formed the encoded scopes have to be, to be accepted by the decoder.
 *
 * LAX is the default and is much more lenient. It's still best effort though and the decoder doesn't
 * implement any error recovery: e.g. superfluous "start" items can lead to whole trees being omitted.
 *
 * STRICT mode will throw in the following situations:
 *
 *   - Encountering ORIGINAL_SCOPE_END, or GENERATED_RANGE_END items that don't have matching *_START items.
 *   - Encountering ORIGINAL_SCOPE_VARIABLES items outside a surrounding scope START/END.
 *   - Encountering GENERATED_RANGE_BINDINGS items outside a surrounding range START/END.
 *   - Miss-matches between the number of variables in a scope vs the number of value expressions in the ranges.
 *   - Out-of-bound indices into the "names" array.
 */ export declare const enum DecodeMode {
  STRICT = 1,
  LAX = 2
}
export declare function decode(sourceMap: SourceMapJson, options?: {
  mode: DecodeMode;
}): ScopeInfo;
//# sourceMappingURL=decode.d.ts.map