import * as Formatter from '../../models/formatter/formatter.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import type * as Platform from '../platform/platform.js';
import type { CallFrame, ScopeChainEntry } from './DebuggerModel.js';
import type { SourceMap } from './SourceMap.js';
export declare class SourceMapScopesInfo {
    #private;
    constructor(sourceMap: SourceMap, scopeInfo: ScopesCodec.ScopeInfo);
    /**
     * If the source map does not contain any scopes information, this factory function attempts to create bare bones scope information
     * via the script's AST combined with the mappings.
     *
     * We create the generated ranges from the scope tree and for each range we create an original scope that matches the bounds 1:1.
     * We don't map the bounds via mappings as mappings are often iffy and it's not strictly required to translate stack traces where we
     * map call-sites separately.
     */
    static createFromAst(sourceMap: SourceMap, scopeTree: Formatter.FormatterWorkerPool.ScopeTreeNode, text: TextUtils.Text.Text): SourceMapScopesInfo;
    addOriginalScopes(scopes: Array<ScopesCodec.OriginalScope | null>): void;
    addGeneratedRanges(ranges: ScopesCodec.GeneratedRange[]): void;
    hasOriginalScopes(sourceIdx: number): boolean;
    isEmpty(): boolean;
    addOriginalScopesAtIndex(sourceIdx: number, scope: ScopesCodec.OriginalScope): void;
    /**
     * @returns true, iff the function surrounding the provided position is marked as "hidden".
     */
    isOutlinedFrame(generatedLine: number, generatedColumn: number): boolean;
    /**
     * @returns true, iff the range surrounding the provided position contains multiple
     * inlined original functions.
     */
    hasInlinedFrames(generatedLine: number, generatedColumn: number): boolean;
    /**
     * Given a generated position, returns the original name of the surrounding function as well as
     * all the original function names that got inlined into the surrounding generated function and their
     * respective callsites in the original code (ordered from inner to outer).
     *
     * @returns a list with inlined functions. Every entry in the list has a callsite in the orignal code,
     * except the last function (since the last function didn't get inlined).
     */
    findInlinedFunctions(generatedLine: number, generatedColumn: number): InlineInfo;
    /**
     * Takes a V8 provided call frame and expands any inlined frames into virtual call frames.
     *
     * For call frames where nothing was inlined, the result contains only a single element,
     * the provided frame but with the original name.
     *
     * For call frames where we are paused in inlined code, this function returns a list of
     * call frames from "inner to outer". This is the call frame at index 0
     * signifies the top of this stack trace fragment.
     *
     * The rest are "virtual" call frames and will have an "inlineFrameIndex" set in ascending
     * order, so the condition `result[index] === result[index].inlineFrameIndex` always holds.
     */
    expandCallFrame(callFrame: CallFrame): CallFrame[];
    /**
     * @returns true if we have enough info (i.e. variable and binding expressions) to build
     * a scope view.
     */
    hasVariablesAndBindings(): boolean;
    /**
     * Constructs a scope chain based on the CallFrame's paused position.
     *
     * The algorithm to obtain the original scope chain is straight-forward:
     *
     *   1) Find the inner-most generated range that contains the CallFrame's
     *      paused position.
     *
     *   2) Does the found range have an associated original scope?
     *
     *      2a) If no, return null. This is a "hidden" range and technically
     *          we shouldn't be pausing here in the first place. This code doesn't
     *          correspond to anything in the authored code.
     *
     *      2b) If yes, the associated original scope is the inner-most
     *          original scope in the resulting scope chain.
     *
     *   3) Walk the parent chain of the found original scope outwards. This is
     *      our scope view. For each original scope we also try to find a
     *      corresponding generated range that contains the CallFrame's
     *      paused position. We need the generated range to resolve variable
     *      values.
     */
    resolveMappedScopeChain(callFrame: CallFrame): ScopeChainEntry[] | null;
    /**
     * Returns the authored function name of the function containing the provided generated position.
     */
    findOriginalFunctionName({ line, column }: ScopesCodec.Position): string | null;
    /**
     * Returns one or more original stack frames for this single "raw frame" or call-site.
     *
     * @returns An empty array if no mapping at the call-site was found, or the resulting frames
     * in top-to-bottom order in case of inlining.
     * @throws If this range is marked "hidden". Outlining needs to be handled externally as
     * outlined function segments in stack traces can span across bundles.
     */
    translateCallSite(generatedLine: number, generatedColumn: number): TranslatedFrame[];
}
/**
 * Represents a stack frame in original terms. It closely aligns with StackTrace.StackTrace.Frame,
 * but since we can't import that type here we mirror it here somewhat.
 *
 * Equivalent to Pick<StackTrace.StackTrace.Frame, 'line'|'column'|'name'|'url'>.
 */
export interface TranslatedFrame {
    line: number;
    column: number;
    name?: string;
    url?: Platform.DevToolsPath.UrlString;
}
/**
 * Represents the inlining information for a given generated position.
 *
 * It contains a list of all the inlined original functions at the generated position
 * as well as the original function name of the generated position's surrounding
 * function.
 *
 * The inlined functions are sorted from inner to outer (or top to bottom on the stack).
 */
export interface InlineInfo {
    inlinedFunctions: Array<{
        name: string;
        callsite: {
            line: number;
            column: number;
            sourceIndex: number;
            sourceURL?: Platform.DevToolsPath.UrlString;
        };
    }>;
    originalFunctionName: string;
}
export declare function contains(range: Pick<ScopesCodec.GeneratedRange, 'start' | 'end'>, line: number, column: number): boolean;
