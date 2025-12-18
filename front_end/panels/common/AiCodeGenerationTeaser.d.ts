import * as UI from '../../ui/legacy/legacy.js';
export declare enum AiCodeGenerationTeaserDisplayState {
    TRIGGER = "trigger",
    DISCOVERY = "discovery",
    LOADING = "loading"
}
export interface ViewInput {
    displayState: AiCodeGenerationTeaserDisplayState;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class AiCodeGenerationTeaser extends UI.Widget.Widget {
    #private;
    constructor(view?: View);
    performUpdate(): void;
    get displayState(): AiCodeGenerationTeaserDisplayState;
    set displayState(displayState: AiCodeGenerationTeaserDisplayState);
}
