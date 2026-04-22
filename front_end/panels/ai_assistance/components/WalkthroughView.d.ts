import type { MarkdownLitRenderer } from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type ModelChatMessage, type Step } from './ChatMessage.js';
export interface ViewInput {
    message: ModelChatMessage | null;
    isLoading: boolean;
    markdownRenderer: MarkdownLitRenderer;
    isInlined: boolean;
    isExpanded: boolean;
    prompt: string;
    onToggle: (isOpen: boolean, message: ModelChatMessage) => void;
    onOpen: (message: ModelChatMessage) => void;
    handleScroll: (ev: Event) => void;
}
export interface ViewOutput {
    scrollContainer?: HTMLElement;
    stepsContainer?: HTMLElement;
}
export declare function walkthroughTitle(input: {
    isLoading: boolean;
    hasWidgets: boolean;
    lastStep: Step;
}): string;
export declare function walkthroughCloseTitle(input: {
    hasWidgets: boolean;
    isInlined?: boolean;
}): string;
export declare const DEFAULT_VIEW: (input: ViewInput, output: ViewOutput, target: HTMLElement | DocumentFragment) => void;
export type View = typeof DEFAULT_VIEW;
export declare class WalkthroughView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    willHide(): void;
    scrollToBottom(): void;
    set isLoading(isLoading: boolean);
    get isLoading(): boolean;
    get markdownRenderer(): MarkdownLitRenderer | null;
    set markdownRenderer(markdownRenderer: MarkdownLitRenderer | null);
    get message(): ModelChatMessage | null;
    get onOpen(): (message: ModelChatMessage) => void;
    set onOpen(onOpen: (message: ModelChatMessage) => void);
    set message(message: ModelChatMessage | null);
    set onToggle(onToggle: (isOpen: boolean, message: ModelChatMessage) => void);
    set isInlined(isInlined: boolean);
    set isExpanded(isExpanded: boolean);
    get prompt(): string;
    set prompt(prompt: string);
    performUpdate(): void;
}
