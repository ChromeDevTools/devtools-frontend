import type * as Protocol from '../../generated/protocol.js';
import type { FragmentImpl, FrameImpl } from './StackTraceImpl.js';
/**
 * Intentionally very close to a {@link Protocol.Runtime.CallFrame} but with optional `scriptId`.
 */
export interface RawFrame {
    readonly scriptId?: Protocol.Runtime.ScriptId;
    readonly url?: string;
    readonly functionName?: string;
    readonly lineNumber: number;
    readonly columnNumber: number;
}
/**
 * @returns whether the frame is a V8 builtin frame e.g. Array.map. Builtin frames
 * have neither source position nor script or URL. They only have a name.
 */
export declare function isBuiltinFrame(rawFrame: RawFrame): boolean;
interface FrameNodeBase<ChildT, ParentT> {
    readonly parent: ParentT;
    readonly children: ChildT[];
}
type RootFrameNode = FrameNodeBase<WeakRef<FrameNode>, null>;
type AnyFrameNode = FrameNode | RootFrameNode;
export declare class FrameNode implements FrameNodeBase<FrameNode, AnyFrameNode> {
    readonly parent: AnyFrameNode;
    readonly children: FrameNode[];
    readonly rawFrame: RawFrame;
    frames: FrameImpl[];
    fragment?: FragmentImpl;
    constructor(rawFrame: RawFrame, parent: AnyFrameNode);
    /**
     * Produces the ancestor chain. Including `this` but excluding the `RootFrameNode`.
     */
    getCallStack(): Generator<FrameNode>;
}
/**
 * Stores stack trace fragments in a trie, but does not own them/keep them alive.
 */
export declare class Trie {
    #private;
    /**
     * Most sources produce stack traces in "top-to-bottom" order, so that is what this method expects.
     *
     * @returns The {@link FrameNode} corresponding to the top-most stack frame.
     */
    insert(frames: RawFrame[]): FrameNode;
    /**
     * Traverses the trie in pre-order.
     *
     * @param node Start at `node` or `null` to start with the children of the root.
     * @param visit Called on each node in the trie. Return `true` if the visitor should descend into child nodes of the provided node.
     */
    walk(node: FrameNode | null, visit: (node: FrameNode) => boolean): void;
}
/**
 * @returns a number < 0, 0 or > 0, if the `a` is smaller then, equal or greater then `b`.
 */
export declare function compareRawFrames(a: RawFrame, b: RawFrame): number;
export {};
