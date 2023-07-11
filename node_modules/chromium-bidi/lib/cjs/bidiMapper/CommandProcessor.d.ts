/**
 * Copyright 2021 Google LLC.
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type BrowsingContext, type Cdp, type Input, Message, type Script, type Session } from '../protocol/protocol.js';
import { type LoggerFn } from '../utils/log.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import type { ICdpConnection } from '../cdp/cdpConnection.js';
import type { BrowsingContextStorage } from './domains/context/browsingContextStorage.js';
import type { IEventManager } from './domains/events/EventManager.js';
import { OutgoingBidiMessage } from './OutgoingBidiMessage.js';
import type { RealmStorage } from './domains/script/realmStorage.js';
type CommandProcessorEvents = {
    response: Promise<OutgoingBidiMessage>;
};
export interface BidiParser {
    parseAddPreloadScriptParams(params: object): Script.AddPreloadScriptParameters;
    parseRemovePreloadScriptParams(params: object): Script.RemovePreloadScriptParameters;
    parseGetRealmsParams(params: object): Script.GetRealmsParameters;
    parseCallFunctionParams(params: object): Script.CallFunctionParameters;
    parseEvaluateParams(params: object): Script.EvaluateParameters;
    parseDisownParams(params: object): Script.DisownParameters;
    parseSendCommandParams(params: object): Cdp.SendCommandParams;
    parseGetSessionParams(params: object): Cdp.GetSessionParams;
    parseSubscribeParams(params: object): Session.SubscriptionRequest;
    parseNavigateParams(params: object): BrowsingContext.NavigateParameters;
    parseReloadParams(params: object): BrowsingContext.ReloadParameters;
    parseGetTreeParams(params: object): BrowsingContext.GetTreeParameters;
    parseCreateParams(params: object): BrowsingContext.CreateParameters;
    parseCloseParams(params: object): BrowsingContext.CloseParameters;
    parseCaptureScreenshotParams(params: object): BrowsingContext.CaptureScreenshotParameters;
    parsePrintParams(params: object): BrowsingContext.PrintParameters;
    parseSetViewportParams(params: object): BrowsingContext.SetViewportParameters;
    parsePerformActionsParams(params: object): Input.PerformActionsParameters;
    parseReleaseActionsParams(params: object): Input.ReleaseActionsParameters;
}
export declare class CommandProcessor extends EventEmitter<CommandProcessorEvents> {
    #private;
    constructor(cdpConnection: ICdpConnection, eventManager: IEventManager, selfTargetId: string, parser: BidiParser | undefined, browsingContextStorage: BrowsingContextStorage, realmStorage: RealmStorage, logger?: LoggerFn);
    processCommand(command: Message.RawCommandRequest): Promise<void>;
}
export {};
