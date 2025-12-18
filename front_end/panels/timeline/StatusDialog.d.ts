import '../../ui/legacy/legacy.js';
import type * as Trace from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
/**
 * This is the dialog shown whilst a trace is being recorded/imported.
 */
export declare class StatusDialog extends UI.Widget.VBox {
    #private;
    private status;
    private time;
    private progressLabel?;
    private progressBar?;
    private readonly description;
    private button;
    private downloadTraceButton;
    private startTime;
    private timeUpdateTimer?;
    constructor(options: {
        hideStopButton: boolean;
        showTimer?: boolean;
        showProgress?: boolean;
        description?: string;
        buttonText?: string;
    }, onButtonClickCallback: () => (Promise<void> | void));
    finish(): void;
    enableDownloadOfEvents(rawEvents: Trace.Types.Events.Event[]): void;
    remove(): void;
    showPane(parent: Element, mode?: 'tinted' | 'opaque'): void;
    enableAndFocusButton(): void;
    updateStatus(text: string): void;
    updateProgressBar(activity: string, percent: number): void;
    startTimer(): void;
    private stopTimer;
    private updateTimer;
    wasShown(): void;
}
