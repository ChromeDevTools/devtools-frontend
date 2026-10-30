import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    threads: CommentManager.CommentManager.CommentThread[];
    /** Number of threads with an agent response that the user has not seen yet. */
    unseenResponseCount: number;
    onPillClick: () => void;
    disabled?: boolean;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class CommentsStatusBarPill extends UI.Widget.Widget {
    #private;
    static readonly INJECT: readonly [typeof CommentManager.CommentManager.CommentManager];
    constructor(element: HTMLElement | undefined, [commentManager]: UI.Widget.WidgetDependencies<typeof CommentsStatusBarPill>, view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
