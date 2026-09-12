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
    /** Serializable key from Trace.EventsSerializer (e.g. 'r-123', 'p-1-2-3-4', 's-5') */
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
    textSignature: string;
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
}
export interface Comment {
    author: 'DEVELOPER' | 'AGENT';
    text: string;
    timestamp: number;
}
export interface ChangeRecord {
    id: string;
    description: string;
    timestamp: number;
}
export interface CommentThread {
    id: string;
    anchor: CommentAnchorSignature;
    comments: Comment[];
    status: 'ACTIVE' | 'RESOLVED';
    transmitted?: boolean;
    changes?: ChangeRecord[];
    index: number;
}
export declare const enum Events {
    COMMENT_THREADS_CHANGED = "CommentThreadsChanged",
    COMMENT_MODE_CHANGED = "CommentModeChanged"
}
export interface EventTypes {
    [Events.COMMENT_THREADS_CHANGED]: CommentThread[];
    [Events.COMMENT_MODE_CHANGED]: boolean;
}
/**
 * Headless model managing comment thread data, CRUD operations, and comment mode.
 */
export declare class CommentManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    setCommentMode(active: boolean): void;
    isCommentMode(): boolean;
    createCommentThread(anchor: CommentAnchorSignature, text?: string, author?: 'DEVELOPER' | 'AGENT', changes?: ChangeRecord[]): CommentThread;
    getCommentThread(id: string): CommentThread | undefined;
    getCommentThreads(): CommentThread[];
    takeComments(): CommentThread[];
    resolveCommentThread(threadId: string, replyText?: string): boolean;
    removeCommentThread(id: string): void;
    clear(): void;
}
