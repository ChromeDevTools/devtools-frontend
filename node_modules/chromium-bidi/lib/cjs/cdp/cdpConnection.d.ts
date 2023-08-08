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
import type { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping.js';
import type Protocol from 'devtools-protocol';
import type { ITransport } from '../utils/transport.js';
import type { LoggerFn } from '../utils/log.js';
import { CdpClient, type ICdpClient } from './cdpClient.js';
export interface ICdpConnection {
    browserClient(): ICdpClient;
    getCdpClient(sessionId: Protocol.Target.SessionID): ICdpClient;
}
/**
 * Represents a high-level CDP connection to the browser backend.
 * Manages a CdpClient instance for each active CDP session.
 */
export declare class CdpConnection implements ICdpConnection {
    #private;
    constructor(transport: ITransport, logger?: LoggerFn);
    /** Closes the connection to the browser. */
    close(): void;
    /** The CdpClient object attached to the root browser session. */
    browserClient(): CdpClient;
    /**
     * Gets a CdpClient instance attached to the given session ID,
     * or null if the session is not attached.
     */
    getCdpClient(sessionId: Protocol.Target.SessionID): CdpClient;
    sendCommand<CdpMethod extends keyof ProtocolMapping.Commands>(method: CdpMethod, params?: ProtocolMapping.Commands[CdpMethod]['paramsType'][0], sessionId?: Protocol.Target.SessionID): Promise<object>;
}
