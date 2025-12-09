import * as UI from '../../../ui/legacy/legacy.js';
export interface ViewInput {
    artifacts: [];
}
export declare const DEFAULT_VIEW: (_input: ViewInput, _output: Record<string, unknown>, target: HTMLElement) => void;
export type View = typeof DEFAULT_VIEW;
export declare class ArtifactsViewer extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: (_input: ViewInput, _output: Record<string, unknown>, target: HTMLElement) => void);
    wasShown(): void;
    performUpdate(): Promise<void> | void;
}
