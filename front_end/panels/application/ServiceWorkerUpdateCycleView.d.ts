import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    timeRanges: ServiceWorkerUpdateRange[];
    expandedRows: Set<string>;
    onFocus: (event: Event) => void;
    onKeydown: (event: Event, key: string) => void;
    onClick: (event: Event, key: string) => void;
}
export type View = (input: ViewInput, output: unknown, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ServiceWorkerUpdateCycleView extends UI.Widget.Widget {
    #private;
    private rows;
    private selectedRowIndex;
    private expandedRows;
    constructor(element?: HTMLElement, view?: View);
    set registration(registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration | undefined);
    get registration(): SDK.ServiceWorkerManager.ServiceWorkerRegistration | undefined;
    set registrationFingerprint(_fingerprint: symbol | undefined);
    calculateServiceWorkerUpdateRanges(): ServiceWorkerUpdateRange[];
    performUpdate(): void;
    private toggle;
    private onFocus;
    private onKeydown;
    private focusRow;
    private blurRow;
    private selectFirstRow;
    private selectLastRow;
    private selectNextRow;
    private selectPreviousRow;
    private onClick;
}
export declare const enum ServiceWorkerUpdateNames {
    INSTALL = "Install",
    WAIT = "Wait",
    ACTIVATE = "Activate"
}
export interface ServiceWorkerUpdateRange {
    id: string;
    phase: ServiceWorkerUpdateNames;
    start: number;
    end: number;
}
