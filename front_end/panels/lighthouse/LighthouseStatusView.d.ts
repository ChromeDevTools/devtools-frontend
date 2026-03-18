import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { LighthousePanel } from './LighthousePanel.js';
export interface ViewInput {
    statusHeader: string;
    statusText: string;
    progressBarClass: string;
    progressBarValue: number;
    progressBarTotal: number;
    cancelButtonVisible: boolean;
    onCancel: () => void;
    bugReport?: {
        error: Error;
        auditURL: string;
        knownBugPattern?: boolean;
    };
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: object, target: HTMLElement | DocumentFragment) => void;
export declare class StatusView {
    private readonly panel;
    private inspectedURL;
    private textChangedAt;
    private fastFactsQueued;
    private currentPhase;
    private scheduledFastFactTimeout;
    private dialogRoot;
    readonly dialog: UI.Dialog.Dialog;
    private statusHeader;
    private statusText;
    private progressBarClass;
    private progressBarValue;
    private cancelButtonVisible;
    private isAIControlled;
    private bugReport;
    constructor(panel: LighthousePanel);
    private render;
    private reset;
    show(dialogRenderElement: Element): void;
    private getStatusHeader;
    private renderStatusHeader;
    hide(): void;
    setAIControlled(isAIControlled: boolean): void;
    setInspectedURL(url?: string): void;
    updateStatus(message: string | null): void;
    private cancel;
    private getMessageForPhase;
    private getPhaseForMessage;
    private resetProgressBarClasses;
    private scheduleFastFactCheck;
    private updateFastFactIfNecessary;
    private commitTextChange;
    renderBugReport(err: Error): void;
    renderText(statusHeader: string, text: string): void;
    toggleCancelButton(show: boolean): void;
}
export declare const fastFactRotationInterval = 6000;
export declare const minimumTextVisibilityDuration = 3000;
export interface StatusPhase {
    id: string;
    progressBarClass: string;
    message: () => Common.UIString.LocalizedString;
    statusMessageRegex: RegExp;
}
export declare const StatusPhases: StatusPhase[];
