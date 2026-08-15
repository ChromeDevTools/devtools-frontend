import * as Common from '../../core/common/common.js';
export interface EditorAnchorSignature {
    /** 1-based line number for CodeMirror text editor anchors */
    lineNumber: number;
    /** File path associated with the editor */
    filePath?: string;
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
    /** Optional backend NodeId for Elements panel DOM nodes (`data-backend-node-id`) */
    backendNodeId?: number;
    /** Optional editor anchor coordinates for CodeMirror text editors */
    editor?: EditorAnchorSignature;
}
export interface Comment {
    author: 'DEVELOPER' | 'AGENT';
    text: string;
    timestamp: number;
}
export interface CommentThread {
    id: string;
    anchor: CommentAnchorSignature;
    comments: Comment[];
    status: 'ACTIVE' | 'RESOLVED';
    changes?: Array<Record<string, unknown>>;
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
    createCommentThread(anchor: CommentAnchorSignature, text: string, author?: 'DEVELOPER' | 'AGENT', changes?: Array<Record<string, unknown>>): CommentThread;
    getCommentThread(id: string): CommentThread | undefined;
    getCommentThreads(): CommentThread[];
    removeCommentThread(id: string): void;
    clear(): void;
}
