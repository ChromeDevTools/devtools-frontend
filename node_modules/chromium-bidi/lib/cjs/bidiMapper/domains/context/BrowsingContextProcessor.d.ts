import type { CdpClient } from '../../../cdp/CdpClient.js';
import type { CdpConnection } from '../../../cdp/CdpConnection.js';
import { BrowsingContext, type EmptyResult, type Browser } from '../../../protocol/protocol.js';
import { type LoggerFn } from '../../../utils/log.js';
import type { NetworkStorage } from '../network/NetworkStorage.js';
import type { PreloadScriptStorage } from '../script/PreloadScriptStorage.js';
import type { RealmStorage } from '../script/RealmStorage.js';
import type { EventManager } from '../session/EventManager.js';
import type { BrowsingContextStorage } from './BrowsingContextStorage.js';
export declare class BrowsingContextProcessor {
    #private;
    constructor(cdpConnection: CdpConnection, browserCdpClient: CdpClient, selfTargetId: string, eventManager: EventManager, browsingContextStorage: BrowsingContextStorage, realmStorage: RealmStorage, networkStorage: NetworkStorage, preloadScriptStorage: PreloadScriptStorage, acceptInsecureCerts: boolean, sharedIdWithFrame: boolean, defaultUserContextId: Browser.UserContext, logger?: LoggerFn);
    getTree(params: BrowsingContext.GetTreeParameters): BrowsingContext.GetTreeResult;
    create(params: BrowsingContext.CreateParameters): Promise<BrowsingContext.CreateResult>;
    navigate(params: BrowsingContext.NavigateParameters): Promise<BrowsingContext.NavigateResult>;
    reload(params: BrowsingContext.ReloadParameters): Promise<EmptyResult>;
    activate(params: BrowsingContext.ActivateParameters): Promise<EmptyResult>;
    captureScreenshot(params: BrowsingContext.CaptureScreenshotParameters): Promise<BrowsingContext.CaptureScreenshotResult>;
    print(params: BrowsingContext.PrintParameters): Promise<BrowsingContext.PrintResult>;
    setViewport(params: BrowsingContext.SetViewportParameters): Promise<EmptyResult>;
    traverseHistory(params: BrowsingContext.TraverseHistoryParameters): Promise<BrowsingContext.TraverseHistoryResult>;
    handleUserPrompt(params: BrowsingContext.HandleUserPromptParameters): Promise<EmptyResult>;
    close(params: BrowsingContext.CloseParameters): Promise<EmptyResult>;
}
