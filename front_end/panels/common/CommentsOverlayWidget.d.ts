import type * as Common from '../../core/common/common.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Comments from '../../ui/comments/comments.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type Title } from './CommentThreadWidget.js';
export interface ViewInput {
    pins: Comments.CommentOverlayManager.PinPositionData[];
    /**
     * Highlight of the currently open thread. Null when no thread is open, so
     * only pins are rendered.
     */
    activeHighlight: Comments.CommentOverlayManager.HighlightRectData | null;
    hoverHighlight: Comments.CommentOverlayManager.HoverHighlightData | null;
    commentMode: boolean;
    onPinClick: (threadId: string) => void;
    activeThread: CommentManager.CommentManager.CommentThread | null;
    activePin: Comments.CommentOverlayManager.PinPositionData | null;
    fallbackPosition?: {
        left: number;
        top: number;
    } | null;
    title: Title;
    onAddComment: (text: string) => void;
    onDeleteQueuedComment: () => void;
    onQueueComment: (text: string) => void;
    onSaveEdit: (text: string) => void;
    onStartEdit: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare class CommentsOverlayWidget extends UI.Widget.Widget {
    #private;
    static readonly INJECT: readonly [typeof CommentManager.CommentManager.CommentManager];
    constructor(element: HTMLElement | undefined, [commentManager]: UI.Widget.WidgetDependencies<typeof CommentsOverlayWidget>, view?: View);
    setOverlayManagerForTest(overlayManager: Comments.CommentOverlayManager.CommentOverlayManager): void;
    wasShown(): void;
    willHide(): void;
    performUpdate(signal?: AbortSignal): Promise<void>;
    openThread(threadId: string, fallbackPosition?: {
        left: number;
        top: number;
    }): void;
    /**
     * Opens a draft comment anchored to `element`. Comment mode must already be
     * active.
     * @returns whether a draft comment was created.
     */
    addCommentAt(element: Element, coordinates?: {
        clientX: number;
        clientY: number;
    }): boolean;
}
export declare class ThreadRevealer implements Common.Revealer.Revealer<CommentManager.CommentThread.RevealableThread> {
    reveal({ thread, position }: CommentManager.CommentThread.RevealableThread): Promise<void>;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    #private;
    constructor(commentManager?: CommentManager.CommentManager.CommentManager);
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
    static resetForTest(): void;
}
/**
 * Adds an "Add comment" item to the context menu of commentable regions while
 * the comment mode toggle is available. Choosing it turns comment mode on and
 * opens a draft comment on the right-clicked region.
 */
export declare class ContextMenuProvider implements UI.ContextMenu.Provider<Node> {
    appendApplicableItems(event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: Node): void;
}
export declare class ButtonProvider implements UI.Toolbar.Provider {
    #private;
    constructor(commentManager?: CommentManager.CommentManager.CommentManager);
    item(): UI.Toolbar.ToolbarItem | null;
}
