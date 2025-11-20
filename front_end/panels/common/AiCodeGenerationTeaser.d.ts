import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    loading: boolean;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class AiCodeGenerationTeaser extends UI.Widget.Widget {
    #private;
    constructor(view?: View);
    performUpdate(): void;
    get loading(): boolean;
    set loading(loading: boolean);
}
