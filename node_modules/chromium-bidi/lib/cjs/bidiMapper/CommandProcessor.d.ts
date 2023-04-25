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
import { BrowsingContext, CDP, Message, Script, Session } from '../protocol/protocol.js';
import { LoggerFn } from '../utils/log.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { BrowsingContextStorage } from './domains/context/browsingContextStorage.js';
import { CdpConnection } from './CdpConnection.js';
import { IEventManager } from './domains/events/EventManager.js';
import { OutgoingBidiMessage } from './OutgoingBidiMessage.js';
import { RealmStorage } from './domains/script/realmStorage.js';
declare type CommandProcessorEvents = {
    response: Promise<OutgoingBidiMessage>;
};
export interface BidiParser {
    parseAddPreloadScriptParams(params: object): Script.AddPreloadScriptParameters;
    parseRemovePreloadScriptParams(params: object): Script.RemovePreloadScriptParameters;
    parseGetRealmsParams(params: object): Script.GetRealmsParameters;
    parseCallFunctionParams(params: object): Script.CallFunctionParameters;
    parseEvaluateParams(params: object): Script.EvaluateParameters;
    parseDisownParams(params: object): Script.DisownParameters;
    parseSendCommandParams(params: object): CDP.SendCommandParams;
    parseGetSessionParams(params: object): CDP.GetSessionParams;
    parseSubscribeParams(params: object): Session.SubscribeParameters;
    parseNavigateParams(params: object): BrowsingContext.NavigateParameters;
    parseGetTreeParams(params: object): BrowsingContext.GetTreeParameters;
    parseCreateParams(params: object): BrowsingContext.CreateParameters;
    parseCloseParams(params: object): BrowsingContext.CloseParameters;
    parseCaptureScreenshotParams(params: object): BrowsingContext.CaptureScreenshotParameters;
    parsePrintParams(params: object): BrowsingContext.PrintParameters;
}
export declare class CommandProcessor extends EventEmitter<CommandProcessorEvents> {
    #private;
    constructor(realmStorage: RealmStorage, cdpConnection: CdpConnection, eventManager: IEventManager, selfTargetId: string, parser: BidiParser | undefined, browsingContextStorage: BrowsingContextStorage, logger?: LoggerFn);
    processCommand(command: Message.RawCommandRequest): Promise<void>;
}
export {};
