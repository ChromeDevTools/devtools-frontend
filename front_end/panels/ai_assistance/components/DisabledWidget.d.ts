import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as UI from '../../../ui/legacy/legacy.js';
interface ViewProps {
    aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
    hostConfig: Root.Runtime.HostConfig;
}
export declare const DEFAULT_VIEW: (input: ViewProps, _output: Record<string, unknown>, target: HTMLElement) => void;
export type View = typeof DEFAULT_VIEW;
export declare class DisabledWidget extends UI.Widget.Widget {
    #private;
    aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
    constructor(element?: HTMLElement, view?: (input: ViewProps, _output: Record<string, unknown>, target: HTMLElement) => void);
    wasShown(): void;
    performUpdate(): Promise<void> | void;
}
export {};
