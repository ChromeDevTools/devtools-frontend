import * as Common from '../../core/common/common.js';
import type * as Workspace from '../workspace/workspace.js';
import type * as StackTrace from './stack_trace.js';
import type { FrameNode } from './Trie.js';
export declare class StackTraceImpl extends Common.ObjectWrapper.ObjectWrapper<StackTrace.StackTrace.EventTypes> implements StackTrace.StackTrace.StackTrace {
    readonly syncFragment: FragmentImpl;
    readonly asyncFragments: readonly AsyncFragmentImpl[];
    constructor(syncFragment: FragmentImpl, asyncFragments: AsyncFragmentImpl[]);
}
export declare class FragmentImpl implements StackTrace.StackTrace.Fragment {
    readonly node: FrameNode;
    readonly stackTraces: Set<StackTraceImpl>;
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
