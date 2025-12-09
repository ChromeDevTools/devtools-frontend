import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Workspace from '../workspace/workspace.js';
import type * as StackTrace from './stack_trace.js';
import type { FrameNode } from './Trie.js';
export type AnyStackTraceImpl = StackTraceImpl<FragmentImpl | DebuggableFragmentImpl>;
export declare class StackTraceImpl<SyncFragmentT extends FragmentImpl | DebuggableFragmentImpl = FragmentImpl> extends Common.ObjectWrapper.ObjectWrapper<StackTrace.StackTrace.EventTypes> implements StackTrace.StackTrace.BaseStackTrace<SyncFragmentT> {
    readonly syncFragment: SyncFragmentT;
    readonly asyncFragments: readonly AsyncFragmentImpl[];
    constructor(syncFragment: SyncFragmentT, asyncFragments: AsyncFragmentImpl[]);
}
export declare class FragmentImpl implements StackTrace.StackTrace.Fragment {
    readonly node: FrameNode;
    readonly stackTraces: Set<AnyStackTraceImpl>;
    /**
     * Fragments are deduplicated based on the node.
     *
     * In turn, each fragment can be part of multiple stack traces.
     */
    static getOrCreate(node: FrameNode): FragmentImpl;
    private constructor();
    get frames(): FrameImpl[];
}
export declare class AsyncFragmentImpl implements StackTrace.StackTrace.AsyncFragment {
    readonly description: string;
    readonly fragment: FragmentImpl;
    constructor(description: string, fragment: FragmentImpl);
    get frames(): StackTrace.StackTrace.Frame[];
}
export declare class FrameImpl implements StackTrace.StackTrace.Frame {
    readonly url?: string;
    readonly uiSourceCode?: Workspace.UISourceCode.UISourceCode;
    readonly name?: string;
    readonly line: number;
    readonly column: number;
    readonly missingDebugInfo?: StackTrace.StackTrace.MissingDebugInfo;
    constructor(url: string | undefined, uiSourceCode: Workspace.UISourceCode.UISourceCode | undefined, name: string | undefined, line: number, column: number, missingDebugInfo?: StackTrace.StackTrace.MissingDebugInfo);
}
/**
 * A DebuggableFragmentImpl wraps an existing FragmentImpl. This is important: We can pause at the
 * same location multiple times and the paused information changes each and everytime while the underlying
 * FragmentImpl will stay the same.
 */
export declare class DebuggableFragmentImpl implements StackTrace.StackTrace.DebuggableFragment {
    readonly fragment: FragmentImpl;
    private readonly callFrames;
    constructor(fragment: FragmentImpl, callFrames: SDK.DebuggerModel.CallFrame[]);
    get frames(): DebuggableFrameImpl[];
}
/**
 * A DebuggableFrameImpl wraps an existing FrameImpl. This is important: We can pause at the
 * same location multiple times and the paused information changes each and everytime while the underlying
 * FrameImpl will stay the same.
 */
export declare class DebuggableFrameImpl implements StackTrace.StackTrace.DebuggableFrame {
    #private;
    constructor(frame: FrameImpl, sdkFrame: SDK.DebuggerModel.CallFrame);
    get url(): string | undefined;
    get uiSourceCode(): Workspace.UISourceCode.UISourceCode | undefined;
    get name(): string | undefined;
    get line(): number;
    get column(): number;
    get missingDebugInfo(): StackTrace.StackTrace.MissingDebugInfo | undefined;
    get sdkFrame(): SDK.DebuggerModel.CallFrame;
}
