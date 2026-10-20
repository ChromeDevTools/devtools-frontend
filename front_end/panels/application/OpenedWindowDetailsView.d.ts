import '../../ui/components/report_view/report_view.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
export interface OpenedWindowViewInput {
    title: string;
    url: string;
    openerElement: LitTemplate | null;
    canAccessOpener: boolean;
}
export type OpenedWindowView = (input: OpenedWindowViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_OPENED_WINDOW_VIEW: OpenedWindowView;
export declare class OpenedWindowDetailsView extends UI.Widget.VBox {
    #private;
    private targetInfo;
    private isWindowClosed;
    constructor(targetInfo: Protocol.Target.TargetInfo, isWindowClosed: boolean, view?: OpenedWindowView);
    wasShown(): void;
    performUpdate(signal?: AbortSignal): Promise<void>;
    private maybeDisplayOpenerFrame;
    buildTitle(): string;
    setIsWindowClosed(isWindowClosed: boolean): void;
    setTargetInfo(targetInfo: Protocol.Target.TargetInfo): void;
}
export interface WorkerViewInput {
    title: string;
    url: string;
    workerType: string;
    coepPolicy?: Protocol.Network.CrossOriginEmbedderPolicyStatus | null;
}
export type WorkerView = (input: WorkerViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_WORKER_VIEW: WorkerView;
export declare class WorkerDetailsView extends UI.Widget.VBox {
    #private;
    private readonly targetInfo;
    constructor(targetInfo: Protocol.Target.TargetInfo, view?: WorkerView);
    wasShown(): void;
    workerTypeToString(type: string): Common.UIString.LocalizedString;
    private updateCoopCoepStatus;
    performUpdate(signal?: AbortSignal): Promise<void>;
}
