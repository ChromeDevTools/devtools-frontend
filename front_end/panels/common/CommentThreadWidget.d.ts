import '../../ui/components/tooltips/tooltips.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
/**
 * Either the DOM node the thread is anchored to, or a plain text label for anchors that are not
 * DOM nodes (e.g. network requests).
 */
export type Title = {
    node: SDK.DOMModel.DOMNode;
} | {
    text: string;
};
export interface ViewInput {
    title: Title;
    comments: CommentManager.CommentManager.Comment[];
    commentText: string;
    textAreaRef: Lit.Directives.Ref<HTMLTextAreaElement>;
    onAddComment: (text: string) => void;
    onCommentTextChange: (event: Event) => void;
}
export type ViewOutput = undefined;
export declare const DEFAULT_VIEW: (input: ViewInput, _output: ViewOutput, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class CommentThreadWidget extends UI.Widget.Widget {
    #private;
    title: Title;
    onAddComment?: (text: string) => void;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    set comments(comments: CommentManager.CommentManager.Comment[]);
    performUpdate(): void;
}
export {};
