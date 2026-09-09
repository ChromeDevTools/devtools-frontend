import { Widget } from './Widget.js';
export declare const DEFAULT_VIEW: (_input: undefined, _output: undefined, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class StatusBarWidget extends Widget {
    #private;
    constructor(element: HTMLElement | undefined, view?: View);
    viewsLoadedForTest(): Promise<void>;
    wasShown(): void;
    performUpdate(): void;
}
export {};
