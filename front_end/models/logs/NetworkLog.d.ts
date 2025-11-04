import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
export declare class NetworkLog extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements SDK.TargetManager.SDKModelObserver<SDK.NetworkManager.NetworkManager> {
    #private;
    constructor();
    static instance(): NetworkLog;
    static removeInstance(): void;
    modelAdded(networkManager: SDK.NetworkManager.NetworkManager): void;
    modelRemoved(networkManager: SDK.NetworkManager.NetworkManager): void;
    private removeNetworkManagerListeners;
    setIsRecording(enabled: boolean): void;
    requestForURL(url: Platform.DevToolsPath.UrlString): SDK.NetworkRequest.NetworkRequest | null;
    originalRequestForURL(url: Platform.DevToolsPath.UrlString): Protocol.Network.Request | null;
    originalResponseForURL(url: Platform.DevToolsPath.UrlString): Protocol.Network.Response | null;
    requests(): SDK.NetworkRequest.NetworkRequest[];
    requestByManagerAndId(networkManager: SDK.NetworkManager.NetworkManager, requestId: string): SDK.NetworkRequest.NetworkRequest | null;
    private requestByManagerAndURL;
    private initializeInitiatorSymbolIfNeeded;
    static initiatorInfoForRequest(request: SDK.NetworkRequest.NetworkRequest, existingInitiatorData?: InitiatorData): InitiatorInfo;
    initiatorInfoForRequest(request: SDK.NetworkRequest.NetworkRequest): InitiatorInfo;
    initiatorGraphForRequest(request: SDK.NetworkRequest.NetworkRequest): InitiatorGraph;
    private initiatorChain;
    private initiatorRequest;
    private willReloadPage;
    private onPrimaryPageChanged;
    private addRequest;
    private removeRequest;
    private tryResolvePreflightRequests;
    importRequests(requests: SDK.NetworkRequest.NetworkRequest[]): void;
    private onRequestStarted;
    private onResponseReceived;
    private onRequestUpdated;
    private onRequestRedirect;
    private onDOMContentLoaded;
    private onLoad;
    reset(clearIfPreserved: boolean): void;
    private networkMessageGenerated;
    associateConsoleMessageWithRequest(consoleMessage: SDK.ConsoleModel.ConsoleMessage, requestId: string): void;
    static requestForConsoleMessage(consoleMessage: SDK.ConsoleModel.ConsoleMessage): SDK.NetworkRequest.NetworkRequest | null;
    requestsForId(requestId: string): SDK.NetworkRequest.NetworkRequest[];
}
export declare enum Events {
    Reset = "Reset",
    RequestAdded = "RequestAdded",
    RequestUpdated = "RequestUpdated",
    RequestRemoved = "RequestRemoved"
}
export interface ResetEvent {
    clearIfPreserved: boolean;
}
export interface EventTypes {
    [Events.Reset]: ResetEvent;
    [Events.RequestAdded]: {
        request: SDK.NetworkRequest.NetworkRequest;
        preserveLog?: boolean;
    };
    [Events.RequestUpdated]: {
        request: SDK.NetworkRequest.NetworkRequest;
    };
    [Events.RequestRemoved]: {
        request: SDK.NetworkRequest.NetworkRequest;
    };
}
export interface InitiatorData {
    info: InitiatorInfo | null;
    chain: Set<SDK.NetworkRequest.NetworkRequest> | null;
    request?: SDK.NetworkRequest.NetworkRequest | null;
}
export interface InitiatorGraph {
    initiators: Set<SDK.NetworkRequest.NetworkRequest>;
    initiated: Map<SDK.NetworkRequest.NetworkRequest, SDK.NetworkRequest.NetworkRequest>;
}
export interface InitiatorInfo {
    type: SDK.NetworkRequest.InitiatorType;
    url: Platform.DevToolsPath.UrlString;
    lineNumber: number | undefined;
    columnNumber: number | undefined;
    scriptId: Protocol.Runtime.ScriptId | null;
    stack: Protocol.Runtime.StackTrace | null;
    initiatorRequest: SDK.NetworkRequest.NetworkRequest | null;
}
