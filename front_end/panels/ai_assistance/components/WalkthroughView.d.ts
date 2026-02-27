import type { MarkdownLitRenderer } from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type ModelChatMessage } from './ChatMessage.js';
export interface ViewInput {
    message: ModelChatMessage | null;
    isLoading: boolean;
    markdownRenderer: MarkdownLitRenderer;
    isInlined: boolean;
    isExpanded: boolean;
    onToggle: (isOpen: boolean) => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: null, target: HTMLElement | DocumentFragment) => void;
export type View = typeof DEFAULT_VIEW;
export declare class WalkthroughView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set isLoading(isLoading: boolean);
    get isLoading(): boolean;
    get markdownRenderer(): MarkdownLitRenderer | null;
    set markdownRenderer(markdownRenderer: MarkdownLitRenderer | null);
    get message(): ModelChatMessage | null;
    set message(message: ModelChatMessage | null);
    set onToggle(onToggle: (isOpen: boolean) => void);
    set isInlined(isInlined: boolean);
    set isExpanded(isExpanded: boolean);
    performUpdate(): void;
}
