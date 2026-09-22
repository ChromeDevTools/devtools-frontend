import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Comments from '../../ui/comments/comments.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type Title } from './CommentThreadWidget.js';
export interface ViewInput {
    pins: Comments.CommentOverlayManager.PinPositionData[];
    highlights: Comments.CommentOverlayManager.HighlightRectData[];
    hoverHighlight: Comments.CommentOverlayManager.HoverHighlightData | null;
    commentMode: boolean;
    onPinClick: (threadId: string) => void;
    activeThread: CommentManager.CommentManager.CommentThread | null;
    activePin: Comments.CommentOverlayManager.PinPositionData | null;
    title: Title;
    onAddComment: (text: string) => void;
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
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    #private;
    constructor(commentManager?: CommentManager.CommentManager.CommentManager);
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
    static resetForTest(): void;
}
export declare class ButtonProvider implements UI.Toolbar.Provider {
    #private;
    constructor(commentManager?: CommentManager.CommentManager.CommentManager);
    item(): UI.Toolbar.ToolbarItem | null;
}
