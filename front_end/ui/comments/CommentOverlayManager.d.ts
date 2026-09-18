import * as Common from '../../core/common/common.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import { type CommentThread } from './CommentAnchorResolver.js';
export declare const COMMENT_MODE_CURSOR = "var(--comment-cursor)";
export interface StartOptions {
    root?: Document | Element;
    scrollTarget?: EventTarget;
    resizeTarget?: Element;
}
export interface PinPositionData {
    id: string;
    top: number;
    left: number;
    visible: boolean;
    index: number;
}
export interface HighlightRectData {
    id: string;
    top: number;
    left: number;
    width: number;
    height: number;
    visible: boolean;
}
export interface CreateCommentOptions {
    author?: 'DEVELOPER' | 'AGENT';
    changes?: CommentManager.CommentManager.ChangeRecord[];
    coordinates?: {
        clientX: number;
        clientY: number;
    };
}
export interface HoverHighlightData {
    top: number;
    left: number;
    width: number;
    height: number;
    visible: boolean;
}
export declare const enum Events {
    POSITIONS_UPDATED = "PositionsUpdated",
    HOVER_HIGHLIGHT_CHANGED = "HoverHighlightChanged"
}
export interface EventTypes {
    [Events.POSITIONS_UPDATED]: {
        pins: PinPositionData[];
        highlights: HighlightRectData[];
    };
    [Events.HOVER_HIGHLIGHT_CHANGED]: HoverHighlightData | null;
}
/**
 * Orchestrates live DOM overlay positioning, coordinates interactive commenting UI mode,
 * and tracks live DOM element positions via observers and event listeners.
 */
export declare class CommentOverlayManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    constructor(commentManager: CommentManager.CommentManager.CommentManager);
    get commentManager(): CommentManager.CommentManager.CommentManager;
    setCommentMode(active: boolean): void;
    isCommentMode(): boolean;
    getHoverHighlight(): HoverHighlightData | null;
    getPinPositions(): PinPositionData[];
    getHighlightRects(): HighlightRectData[];
    getAnchorElement(thread: CommentThread): Element | undefined;
    clearDraftThreads(): void;
    handleElementClick(element: Element, options?: {
        clientX: number;
        clientY: number;
    }): boolean;
    createComment(element: Element, text?: string, options?: CreateCommentOptions): CommentThread | null;
    getCommentThread(id: string): CommentThread | undefined;
    getCommentThreads(): CommentThread[];
    removeCommentThread(id: string): void;
    /**
     * Initializes event listeners and lifecycle observers across the target DOM container.
     *
     * Sets up:
     * - Capturing click, hover, and interaction suppression handlers to coordinate comment placement.
     * - A capturing scroll listener on the window to track scrolling across nested subpanes.
     * - A ResizeObserver to recalculate overlay coordinates when DevTools panels or drawers are resized.
     * - A MutationObserver to automatically rematch existing comment anchors when the DOM re-renders.
     */
    start(rootOrOptions?: Document | Element | StartOptions): void;
    /**
     * Stops and detaches all active listeners and observers without clearing comment threads.
     */
    stop(): void;
    /**
     * Fully resets the manager by disabling comment mode, disconnecting all observers and listeners,
     * and purging all active comment threads and overlay data.
     */
    clear(): void;
}
