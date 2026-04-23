import '../../ui/legacy/legacy.js';
import type * as Trace from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    statusText: string;
    showTimer: boolean;
    timeText: string;
    showProgress: boolean;
    progressActivity: string;
    progressPercent: number;
    descriptionText: string | undefined;
    buttonText: string;
    hideStopButton: boolean;
    focusStopButton: boolean;
    showDownloadButton: boolean;
    downloadButtonDisabled: boolean;
    onStopClick: () => void;
    onDownloadClick: () => void;
}
export type ViewOutput = Record<string, never>;
export type View = (input: ViewInput, output: ViewOutput, target: DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
/**
 * This is the dialog shown whilst a trace is being recorded/imported.
 */
export declare class StatusDialog extends UI.Widget.VBox<ShadowRoot> {
    #private;
    constructor(options: {
        hideStopButton: boolean;
        showTimer?: boolean;
        showProgress?: boolean;
        description?: string;
        buttonText?: string;
    }, onButtonClickCallback: () => (Promise<void> | void), view?: View);
    finish(): void;
    enableDownloadOfEvents(rawEvents: Trace.Types.Events.Event[]): void;
    remove(): void;
    showPane(parent: Element, mode?: 'tinted' | 'opaque'): void;
    enableAndFocusButton(): void;
    updateStatus(text: string): void;
    updateProgressBar(activity: string, percent: number): void;
    startTimer(): void;
    private stopTimer;
    performUpdate(): void;
    wasShown(): void;
}
