import type * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    showConsoleView: boolean;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ConsolePanel extends UI.Panel.Panel {
    #private;
    constructor(view?: View);
    performUpdate(): void;
    static instance(opts?: {
        forceNew: boolean | null;
        view?: View;
    }): ConsolePanel;
    static removeInstance(): void;
    static updateContextFlavor(): void;
    wasShown(): void;
    willHide(): void;
    searchableView(): UI.SearchableView.SearchableView | null;
}
export declare class WrapperView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
    static instance(opts?: {
        forceNew: boolean | null;
        view?: View;
    }): WrapperView;
    static removeInstance(): void;
    wasShown(): void;
    willHide(): void;
    showViewInWrapper(): void;
    hideViewInWrapper(): void;
    insertIntoPrompt(text: string): void;
}
export declare class ConsoleRevealer implements Common.Revealer.Revealer<Common.Console.Console> {
    reveal(_object: Common.Console.Console): Promise<void>;
}
