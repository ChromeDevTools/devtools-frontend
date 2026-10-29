import * as Common from '../../core/common/common.js';
export interface EditorAnchorSignature {
    /** 1-based line number for CodeMirror text editor anchors */
    lineNumber: number;
    /** File path associated with the editor */
    filePath?: string;
}
export interface DOMNodeAnchorSignature {
    /** Backend NodeId for DOM nodes (`data-backend-node-id`) */
    backendNodeId: number;
    /** Target ID associated with the DOM node (`data-target-id`) */
    targetId: string;
}
export interface TimelineAnchorSignature {
    /** Identifier of the trace to scope comments to a specific recording */
    traceId: string;
    /**
     * Serializable key from Trace.EventsSerializer (e.g. 'r-123', 'p-1-2-3-4', 's-5'), or
     * 'fc-<chartLocation>-<entryIndex>' for flame chart entries that EventsSerializer cannot key.
     */
    traceEventKey: string;
    /** Primary event title or category name */
    entryName: string;
    /** Event start timestamp in microseconds */
    startTimeMicro: number;
    /** Chart location */
    chartLocation: 'main' | 'network';
    /** Event duration in microseconds (omitted for instant markers) */
    durationMicro?: number;
}
export interface CommentAnchorSignature {
    /** Visual logging tree path, e.g. "Panel: elements > Pane: styles > TreeOutline > TreeItem: color" */
    vePath: string;
    /** Normalized text content of the target node */
    textSignature?: string;
    /** Text content of the parent container VE node for sibling disambiguation */
    parentTextSignature?: string;
    /** 0-indexed position among siblings sharing the same visual logging path */
    siblingIndex?: number;
    /** Optional backend RequestId for Network panel elements (`data-network-request-id`) */
    networkRequestId?: string;
    /** Optional DOM node identifiers (`data-backend-node-id`, `data-target-id`) */
    node?: DOMNodeAnchorSignature;
    /** Optional editor anchor coordinates for CodeMirror text editors */
    editor?: EditorAnchorSignature;
    /** Optional timeline flamechart anchor coordinates for Performance panel trace entries */
    timeline?: TimelineAnchorSignature;
    /**
     * Optional formatted lines that give the AI agent context about the
     * anchored target beyond the VE path and text signature, for example the
     * timing and warnings of a Performance panel trace entry. CD4ABridge
     * appends each line to the comment text that it sends to the agent.
     *
     * These lines are only context for the agent. They are not used to
     * re-match the anchor to its target; the other fields of this signature
     * do that.
     *
     * Currently only the Performance panel sets this field. Before adding
     * context here, consider whether it belongs in a new field on this
     * signature instead. This field is only for text that is already
     * formatted for the agent, not for data that other code needs to read.
     */
    agentContext?: string[];
}
export interface Comment {
    author: 'DEVELOPER' | 'AGENT';
    text: string;
    timestamp: number;
}
export type CommentThreadStatus = 'DRAFT' | 'ACTIVE' | 'SENT_TO_AGENT' | 'RESOLVED';
export declare const enum Events {
    CHANGED = "Changed"
}
export interface EventTypes {
    [Events.CHANGED]: void;
}
export interface CommentThreadOptions {
    anchor: CommentAnchorSignature;
    comments?: Comment[];
    /** True for comments generated from the change tracker. */
    isGeneratedComment?: boolean;
}
export declare class CommentThread extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    readonly id: string;
    readonly anchor: CommentAnchorSignature;
    /** True for comments generated from the change tracker. */
    readonly isGeneratedComment: boolean;
    comments: Comment[];
    status: CommentThreadStatus;
    constructor(options: CommentThreadOptions);
    get isOrphaned(): boolean;
    setOrphaned(isOrphaned: boolean): void;
    /**
     * True once the thread has been taken by the agent (e.g. via CD4ABridge).
     */
    get transmitted(): boolean;
    /**
     * Marks the thread as taken by the agent.
     */
    markTransmitted(): void;
    save(text?: string, author?: 'DEVELOPER' | 'AGENT'): void;
    editComment(text: string): void;
    sendToAgent(text?: string, author?: 'DEVELOPER' | 'AGENT'): void;
    resolve(replyText?: string): void;
}
export declare class RevealableThread {
    readonly thread: CommentThread;
    readonly position?: {
        left: number;
        top: number;
    } | undefined;
    constructor(thread: CommentThread, position?: {
        left: number;
        top: number;
    } | undefined);
}
