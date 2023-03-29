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
import { EventEmitter } from '../utils/EventEmitter.js';
import { LoggerFn } from '../utils/log.js';
import type { Message } from '../protocol/protocol.js';
import { BidiParser } from './CommandProcessor.js';
import { BidiTransport } from './BidiTransport.js';
import { BrowsingContextStorage } from './domains/context/browsingContextStorage.js';
import { CdpConnection } from './CdpConnection.js';
import { OutgoingBidiMessage } from './OutgoingBidiMessage.js';
declare type BidiServerEvents = {
    message: Message.RawCommandRequest;
};
export declare class BidiServer extends EventEmitter<BidiServerEvents> {
    #private;
    private constructor();
    static createAndStart(bidiTransport: BidiTransport, cdpConnection: CdpConnection, selfTargetId: string, parser?: BidiParser, logger?: LoggerFn): Promise<BidiServer>;
    topLevelContextsLoaded(): Promise<void>;
    /**
     * Sends BiDi message.
     */
    emitOutgoingMessage(messageEntry: Promise<OutgoingBidiMessage>): void;
    close(): void;
    getBrowsingContextStorage(): BrowsingContextStorage;
}
export {};
