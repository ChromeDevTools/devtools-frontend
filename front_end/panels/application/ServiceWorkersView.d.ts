import '../../ui/components/report_view/report_view.js';
import '../../ui/kit/kit.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate, nothing } from '../../ui/lit/lit.js';
export interface SectionData {
    manager: SDK.ServiceWorkerManager.ServiceWorkerManager;
    registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration;
}
export interface ServiceWorkersViewInput {
    canManageServiceWorkers: boolean;
    sections: SectionData[];
}
type View = (input: ServiceWorkersViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare const setThrottleDisabledForDebugging: (enable: boolean) => void;
export declare class ServiceWorkersView extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<SDK.ServiceWorkerManager.ServiceWorkerManager> {
    #private;
    private readonly sections;
    private manager;
    private securityOriginManager;
    private readonly eventListeners;
    constructor(view?: View);
    wasShown(): void;
    performUpdate(): Promise<void>;
    modelAdded(serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager): void;
    modelRemoved(serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager): void;
    private registrationUpdated;
    private gcRegistrations;
    private isOriginCurrent;
    private updateRegistration;
    private registrationDeleted;
    private removeRegistrationFromList;
    private isRegistrationVisible;
}
export interface SectionViewInput {
    title: string;
    isDeleted: boolean;
    errorsLength: number;
    pushData: string;
    syncTag: string;
    periodicSyncTag: string;
    registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration;
    activeVersion?: SDK.ServiceWorkerManager.ServiceWorkerVersion;
    waitingVersion?: SDK.ServiceWorkerManager.ServiceWorkerVersion;
    installingVersion?: SDK.ServiceWorkerManager.ServiceWorkerVersion;
    redundantVersion?: SDK.ServiceWorkerManager.ServiceWorkerVersion;
    renderClientInfo: (clientId: Protocol.Target.TargetID) => Promise<LitTemplate | typeof nothing>;
    onNetworkRequests: () => void;
    onUpdate: () => void;
    onUnregister: () => void;
    onPush: (data: string) => void;
    onSync: (tag: string) => void;
    onPeriodicSync: (tag: string) => void;
    onStop: (versionId: string) => void;
    onStart: () => void;
    onSkipWaiting: () => void;
}
type SectionView = (input: SectionViewInput, _output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_SECTION_VIEW: SectionView;
export declare class Section extends UI.Widget.VBox {
    #private;
    private manager;
    registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration;
    private sectionInternal;
    private fingerprint;
    private pushNotificationDataSetting;
    private syncTagNameSetting;
    private periodicSyncTagNameSetting;
    private readonly clientInfoCache;
    private readonly throttler;
    constructor(element: HTMLElement, view?: SectionView);
    set section(data: SectionData);
    get section(): SectionData;
    getTitle(): string;
    requestUpdate(): void;
    performUpdate(): Promise<void>;
    private unregisterButtonClicked;
    private updateButtonClicked;
    private networkRequestsClicked;
    private push;
    private sync;
    private periodicSync;
    private renderClientInfo;
    private activateTarget;
    private startButtonClicked;
    private skipButtonClicked;
    private stopButtonClicked;
}
export {};
