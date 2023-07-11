import { type BrowsingContext, type Cdp, Input, Message, type Script } from '../../../protocol/protocol.js';
import { type LoggerFn } from '../../../utils/log.js';
import type { IEventManager } from '../events/EventManager.js';
import type { RealmStorage } from '../script/realmStorage.js';
import type { ICdpConnection } from '../../../cdp/cdpConnection.js';
import type { BrowsingContextStorage } from './browsingContextStorage.js';
export declare class BrowsingContextProcessor {
    #private;
    constructor(cdpConnection: ICdpConnection, selfTargetId: string, eventManager: IEventManager, browsingContextStorage: BrowsingContextStorage, realmStorage: RealmStorage, logger?: LoggerFn);
    process_browsingContext_getTree(params: BrowsingContext.GetTreeParameters): BrowsingContext.GetTreeResult;
    process_browsingContext_create(params: BrowsingContext.CreateParameters): Promise<BrowsingContext.CreateResult>;
    process_browsingContext_navigate(params: BrowsingContext.NavigateParameters): Promise<BrowsingContext.NavigateResult>;
    process_browsingContext_reload(params: BrowsingContext.ReloadParameters): Promise<Message.EmptyResult>;
    process_browsingContext_captureScreenshot(params: BrowsingContext.CaptureScreenshotParameters): Promise<BrowsingContext.CaptureScreenshotResult>;
    process_browsingContext_print(params: BrowsingContext.PrintParameters): Promise<BrowsingContext.PrintResult>;
    process_script_addPreloadScript(params: Script.AddPreloadScriptParameters): Promise<Script.AddPreloadScriptResult>;
    process_script_removePreloadScript(params: Script.RemovePreloadScriptParameters): Promise<Message.EmptyResult>;
    process_script_evaluate(params: Script.EvaluateParameters): Promise<Script.EvaluateResult>;
    process_script_getRealms(params: Script.GetRealmsParameters): Script.GetRealmsResult;
    process_script_callFunction(params: Script.CallFunctionParameters): Promise<Script.CallFunctionResult>;
    process_script_disown(params: Script.DisownParameters): Promise<Script.DisownResult>;
    process_input_performActions(params: Input.PerformActionsParameters): Promise<Message.EmptyResult>;
    process_input_releaseActions(params: Input.ReleaseActionsParameters): Promise<Message.EmptyResult>;
    process_browsingContext_setViewport(params: BrowsingContext.SetViewportParameters): Promise<Message.EmptyResult>;
    process_browsingContext_close(commandParams: BrowsingContext.CloseParameters): Promise<Message.EmptyResult>;
    process_cdp_sendCommand(params: Cdp.SendCommandParams): Promise<Cdp.SendCommandResult>;
    process_cdp_getSession(params: Cdp.GetSessionParams): Cdp.GetSessionResult;
}
