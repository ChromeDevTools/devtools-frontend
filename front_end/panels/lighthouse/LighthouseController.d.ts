import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as LighthouseModel from '../../models/lighthouse/lighthouse.js';
import type { LighthouseRun as LighthouseRunType, ProtocolService } from './LighthouseProtocolService.js';
export declare class LighthouseController extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements SDK.TargetManager.SDKModelObserver<SDK.ServiceWorkerManager.ServiceWorkerManager> {
    private readonly protocolService;
    private manager?;
    private serviceWorkerListeners?;
    private inspectedURL?;
    private currentLighthouseRun?;
    private lastAction;
    constructor(protocolService: ProtocolService);
    modelAdded(serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager): void;
    modelRemoved(serviceWorkerManager: SDK.ServiceWorkerManager.ServiceWorkerManager): void;
    private hasActiveServiceWorker;
    private hasAtLeastOneCategory;
    private unauditablePageMessage;
    private javaScriptDisabled;
    private hasImportantResourcesNotCleared;
    private evaluateInspectedURL;
    getCurrentRun(): LighthouseRunType | undefined;
    getFlags(): {
        formFactor: (string | undefined);
        mode: string;
    };
    getCategoryIDs(): LighthouseModel.RunTypes.CategoryId[];
    getInspectedURL(options?: {
        force: boolean;
    }): Promise<Platform.DevToolsPath.UrlString>;
    recomputePageAuditability(): void;
    private recordMetrics;
    /**
     * Starts a LH run. By default it will use the categories based on what the
     * user has selected in the UI, but these can be overridden by passing in the
     * category IDs, in which case these take priority.
     */
    startLighthouse(overrides?: LighthouseModel.RunTypes.RunOverrides): Promise<void>;
    collectLighthouseResults(): Promise<LighthouseModel.ReporterTypes.RunnerResult>;
    cancelLighthouse(): Promise<void>;
}
export declare function getPresets(): LighthouseModel.RunTypes.Preset[];
export declare function getRuntimeSettings(): LighthouseModel.RunTypes.RuntimeSetting[];
export declare enum Events {
    PageAuditabilityChanged = "PageAuditabilityChanged",
    PageWarningsChanged = "PageWarningsChanged",
    AuditProgressChanged = "AuditProgressChanged"
}
export interface PageAuditabilityChangedEvent {
    helpText: string;
}
export interface PageWarningsChangedEvent {
    warning: string;
}
export interface AuditProgressChangedEvent {
    message: string;
}
export interface EventTypes {
    [Events.PageAuditabilityChanged]: PageAuditabilityChangedEvent;
    [Events.PageWarningsChanged]: PageWarningsChangedEvent;
    [Events.AuditProgressChanged]: AuditProgressChangedEvent;
}
