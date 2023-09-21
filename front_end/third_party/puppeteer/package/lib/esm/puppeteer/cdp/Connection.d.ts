/**
 * Copyright 2017 Google Inc. All rights reserved.
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
import { type Protocol } from 'devtools-protocol';
import { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping.js';
import { type CDPSession, type CDPSessionEvents } from '../api/CDPSession.js';
import { ConnectionTransport } from '../common/ConnectionTransport.js';
import { ProtocolError } from '../common/Errors.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { Deferred } from '../util/Deferred.js';
/**
 * @public
 */
export { ConnectionTransport, ProtocolMapping };
/**
 * @internal
 */
export declare class Callback {
    #private;
    constructor(id: number, label: string, timeout?: number);
    resolve(value: unknown): void;
    reject(error: Error): void;
    get id(): number;
    get promise(): Deferred<unknown>;
    get error(): ProtocolError;
    get label(): string;
}
/**
 * Manages callbacks and their IDs for the protocol request/response communication.
 *
 * @internal
 */
export declare class CallbackRegistry {
    #private;
    create(label: string, timeout: number | undefined, request: (id: number) => void): Promise<unknown>;
    reject(id: number, message: string, originalMessage?: string): void;
    _reject(callback: Callback, errorMessage: string | ProtocolError, originalMessage?: string): void;
    resolve(id: number, value: unknown): void;
    clear(): void;
}
/**
 * @public
 */
export declare class Connection extends EventEmitter<CDPSessionEvents> {
    #private;
    constructor(url: string, transport: ConnectionTransport, delay?: number, timeout?: number);
    static fromSession(session: CDPSession): Connection | undefined;
    get timeout(): number;
    /**
     * @internal
     */
    get _closed(): boolean;
    /**
     * @internal
     */
    get _sessions(): Map<string, CDPSession>;
    /**
     * @param sessionId - The session id
     * @returns The current CDP session if it exists
     */
    session(sessionId: string): CDPSession | null;
    url(): string;
    send<T extends keyof ProtocolMapping.Commands>(method: T, ...paramArgs: ProtocolMapping.Commands[T]['paramsType']): Promise<ProtocolMapping.Commands[T]['returnType']>;
    /**
     * @internal
     */
    _rawSend<T extends keyof ProtocolMapping.Commands>(callbacks: CallbackRegistry, method: T, params: ProtocolMapping.Commands[T]['paramsType'][0], sessionId?: string): Promise<ProtocolMapping.Commands[T]['returnType']>;
    /**
     * @internal
     */
    closeBrowser(): Promise<void>;
    /**
     * @internal
     */
    protected onMessage(message: string): Promise<void>;
    dispose(): void;
    /**
     * @internal
     */
    isAutoAttached(targetId: string): boolean;
    /**
     * @internal
     */
    _createSession(targetInfo: Protocol.Target.TargetInfo, isAutoAttachEmulated?: boolean): Promise<CDPSession>;
    /**
     * @param targetInfo - The target info
     * @returns The CDP session that is created
     */
    createSession(targetInfo: Protocol.Target.TargetInfo): Promise<CDPSession>;
}
/**
 * @internal
 */
export declare function createProtocolErrorMessage(object: {
    error: {
        message: string;
        data: any;
        code: number;
    };
}): string;
/**
 * @internal
 */
export declare function isTargetClosedError(error: Error): boolean;
//# sourceMappingURL=Connection.d.ts.map