import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Extensions from '../../models/extensions/extensions.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import { ExtensionSidebarPane } from './ExtensionPanel.js';
declare global {
    interface Window {
        DevToolsAPI?: {
            getInspectedTabId?(): string | undefined;
            getOriginsForbiddenForExtensions?(): string[];
        };
    }
}
export declare class HostsPolicy {
    readonly runtimeAllowedHosts: Extensions.HostUrlPattern.HostUrlPattern[];
    readonly runtimeBlockedHosts: Extensions.HostUrlPattern.HostUrlPattern[];
    static create(policy?: Host.InspectorFrontendHostAPI.ExtensionHostsPolicy): HostsPolicy | null;
    private constructor();
    isAllowedOnURL(inspectedURL?: Platform.DevToolsPath.UrlString): boolean;
}
export declare class RevealableNetworkRequestFilter {
    readonly filter: string | undefined;
    constructor(filter: string | undefined);
}
export declare class ExtensionServer extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private readonly clientObjects;
    private readonly handlers;
    private readonly subscribers;
    private readonly subscriptionStartHandlers;
    private readonly subscriptionStopHandlers;
    private readonly extraHeaders;
    private requests;
    private readonly requestIds;
    private lastRequestId;
    private registeredExtensions;
    private status;
    private extensionsEnabled;
    private inspectedTabId?;
    private readonly extensionAPITestHook?;
    private themeChangeHandlers;
    private constructor();
    get isEnabledForTest(): boolean;
    dispose(): void;
    static instance(opts?: {
        forceNew: boolean | null;
    }): ExtensionServer;
    initializeExtensions(): void;
    hasExtensions(): boolean;
    notifySearchAction(panelId: string, action: string, searchString?: string): void;
    notifyViewShown(identifier: string, frameIndex?: number): void;
    notifyViewHidden(identifier: string): void;
    notifyButtonClicked(identifier: string): void;
    profilingStarted(): void;
    profilingStopped(): void;
    private registerLanguageExtensionEndpoint;
    private loadWasmValue;
    private onGetWasmLinearMemory;
    private convertWasmValue;
    private onGetWasmGlobal;
    private onGetWasmLocal;
    private onGetWasmOp;
    private registerRecorderExtensionEndpoint;
    private onReportResourceLoad;
    private onSetFunctionRangesForScript;
    private onShowRecorderView;
    private onShowNetworkPanel;
    private onCreateRecorderView;
    private inspectedURLChanged;
    hasSubscribers(type: string): boolean;
    private postNotification;
    private onSubscribe;
    private onUnsubscribe;
    private onAddRequestHeaders;
    private getExtensionOrigin;
    private onCreatePanel;
    private onShowPanel;
    private onCreateToolbarButton;
    private onUpdateButton;
    private onCreateSidebarPane;
    sidebarPanes(): ExtensionSidebarPane[];
    private onSetSidebarHeight;
    private onSetSidebarContent;
    private onSetSidebarPage;
    private onOpenResource;
    private onSetOpenResourceHandler;
    private onSetThemeChangeHandler;
    private handleOpenURL;
    private extensionAllowedOnURL;
    /**
     * Slightly more permissive as {@link extensionAllowedOnURL}: This method also permits
     * UISourceCodes that originate from a {@link SDK.Script.Script} with a sourceURL magic comment as
     * long as the corresponding target is permitted.
     */
    private extensionAllowedOnContentProvider;
    /**
     * This method prefers returning 'Permission denied' errors if restricted resources are not found,
     * rather then NOTFOUND. This prevents extensions from being able to fish for restricted resources.
     */
    private lookupAllowedUISourceCode;
    private extensionAllowedOnTarget;
    private onReload;
    private onEvaluateOnInspectedPage;
    private onGetHAR;
    private makeResource;
    private onGetPageResources;
    private getResourceContent;
    private onGetRequestContent;
    private onGetResourceContent;
    private onAttachSourceMapToResource;
    private onSetResourceContent;
    private requestId;
    private requestById;
    private onForwardKeyboardEvent;
    private dispatchCallback;
    private initExtensions;
    private notifyResourceAdded;
    private notifyUISourceCodeContentCommitted;
    private notifyRequestFinished;
    private notifyElementsSelectionChanged;
    sourceSelectionChanged(url: Platform.DevToolsPath.UrlString, range: TextUtils.TextRange.TextRange): void;
    private setInspectedTabId;
    addExtensionFrame({ startPage, name }: Host.InspectorFrontendHostAPI.ExtensionDescriptor): void;
    addExtension(extensionInfo: Host.InspectorFrontendHostAPI.ExtensionDescriptor): boolean | undefined;
    private registerExtension;
    private onWindowMessage;
    private extensionEnabled;
    private onmessage;
    private registerHandler;
    private registerSubscriptionHandler;
    private registerAutosubscriptionHandler;
    private registerAutosubscriptionTargetManagerHandler;
    private registerResourceContentCommittedHandler;
    static expandResourcePath(extensionOrigin: Platform.DevToolsPath.UrlString, resourcePath: string): Platform.DevToolsPath.UrlString | undefined;
    evaluate(expression: string, exposeCommandLineAPI: boolean, returnByValue: boolean, options: Extensions.ExtensionAPI.PrivateAPI.EvaluateOptions | undefined, securityOrigin: string, callback: (arg0: string | null, arg1: SDK.RemoteObject.RemoteObject | null, arg2: boolean) => unknown): Record | undefined;
    static canInspectURL(url: Platform.DevToolsPath.UrlString): boolean;
    private disableExtensions;
    private enableExtensions;
}
export declare const enum Events {
    SidebarPaneAdded = "SidebarPaneAdded"
}
export interface EventTypes {
    [Events.SidebarPaneAdded]: ExtensionSidebarPane;
}
export declare class ExtensionStatus {
    OK: (...args: unknown[]) => Record;
    E_EXISTS: (...args: unknown[]) => Record;
    E_BADARG: (...args: unknown[]) => Record;
    E_BADARGTYPE: (...args: unknown[]) => Record;
    E_NOTFOUND: (...args: unknown[]) => Record;
    E_NOTSUPPORTED: (...args: unknown[]) => Record;
    E_PROTOCOLERROR: (...args: unknown[]) => Record;
    E_FAILED: (...args: unknown[]) => Record;
    constructor();
}
export interface Record {
    code: string;
    description: string;
    details: unknown[];
    isError?: boolean;
}
