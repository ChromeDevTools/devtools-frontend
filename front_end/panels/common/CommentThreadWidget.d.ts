import '../../ui/components/tooltips/tooltips.js';
import type * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
export interface ViewInput {
    title: string;
    comments: CommentManager.CommentManager.Comment[];
    commentText: string;
    textAreaRef: Lit.Directives.Ref<HTMLTextAreaElement>;
    onLearnMoreClick: () => void;
    onAddComment: (text: string) => void;
    onCommentTextChange: (event: Event) => void;
}
export type ViewOutput = undefined;
export declare const DEFAULT_VIEW: (input: ViewInput, _output: ViewOutput, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class CommentThreadWidget extends UI.Widget.Widget {
    #private;
    title: string;
    onAddComment?: (text: string) => void;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    set comments(comments: CommentManager.CommentManager.Comment[]);
    performUpdate(): void;
}
export {};
