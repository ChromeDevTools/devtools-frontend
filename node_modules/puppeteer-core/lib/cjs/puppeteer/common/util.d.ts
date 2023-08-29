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
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { Readable } from 'stream';
import type { Protocol } from 'devtools-protocol';
import type { ElementHandle } from '../api/ElementHandle.js';
import type { JSHandle } from '../api/JSHandle.js';
import { Page } from '../api/Page.js';
import { Deferred } from '../util/Deferred.js';
import type { CDPSession } from './Connection.js';
import type { CommonEventEmitter } from './EventEmitter.js';
import type { ExecutionContext } from './ExecutionContext.js';
import { Awaitable } from './types.js';
/**
 * @internal
 */
export declare const debugError: (...args: unknown[]) => void;
/**
 * @internal
 */
export declare function createEvaluationError(details: Protocol.Runtime.ExceptionDetails): unknown;
/**
 * @internal
 */
export declare function createClientError(details: Protocol.Runtime.ExceptionDetails): unknown;
/**
 * @internal
 */
export declare class PuppeteerURL {
    #private;
    static INTERNAL_URL: string;
    static fromCallSite(functionName: string, site: NodeJS.CallSite): PuppeteerURL;
    static parse: (url: string) => PuppeteerURL;
    static isPuppeteerURL: (url: string) => boolean;
    get functionName(): string;
    get siteString(): string;
    toString(): string;
}
/**
 * @internal
 */
export declare const withSourcePuppeteerURLIfNone: <T extends {}>(functionName: string, object: T) => T;
/**
 * @internal
 */
export declare const getSourcePuppeteerURLIfAvailable: <T extends {}>(object: T) => PuppeteerURL | undefined;
/**
 * @internal
 */
export declare function valueFromRemoteObject(remoteObject: Protocol.Runtime.RemoteObject): any;
/**
 * @internal
 */
export declare function releaseObject(client: CDPSession, remoteObject: Protocol.Runtime.RemoteObject): Promise<void>;
/**
 * @internal
 */
export interface PuppeteerEventListener {
    emitter: CommonEventEmitter;
    eventName: string | symbol;
    handler: (...args: any[]) => void;
}
/**
 * @internal
 */
export declare function addEventListener(emitter: CommonEventEmitter, eventName: string | symbol, handler: (...args: any[]) => void): PuppeteerEventListener;
/**
 * @internal
 */
export declare function removeEventListeners(listeners: Array<{
    emitter: CommonEventEmitter;
    eventName: string | symbol;
    handler: (...args: any[]) => void;
}>): void;
/**
 * @internal
 */
export declare const isString: (obj: unknown) => obj is string;
/**
 * @internal
 */
export declare const isNumber: (obj: unknown) => obj is number;
/**
 * @internal
 */
export declare const isPlainObject: (obj: unknown) => obj is Record<any, unknown>;
/**
 * @internal
 */
export declare const isRegExp: (obj: unknown) => obj is RegExp;
/**
 * @internal
 */
export declare const isDate: (obj: unknown) => obj is Date;
/**
 * @internal
 */
export declare function waitForEvent<T>(emitter: CommonEventEmitter, eventName: string | symbol, predicate: (event: T) => Awaitable<boolean>, timeout: number, abortPromise: Promise<Error> | Deferred<Error>): Promise<T>;
/**
 * @internal
 */
export declare function createJSHandle(context: ExecutionContext, remoteObject: Protocol.Runtime.RemoteObject): JSHandle | ElementHandle<Node>;
/**
 * @internal
 */
export declare function evaluationString(fun: Function | string, ...args: unknown[]): string;
/**
 * @internal
 */
export declare function addPageBinding(type: string, name: string): void;
/**
 * @internal
 */
export declare function pageBindingInitString(type: string, name: string): string;
/**
 * @internal
 */
export declare function waitWithTimeout<T>(promise: Promise<T>, taskName: string, timeout: number): Promise<T>;
/**
 * @internal
 */
export declare function importFSPromises(): Promise<typeof import('fs/promises')>;
/**
 * @internal
 */
export declare function getReadableAsBuffer(readable: Readable, path?: string): Promise<Buffer | null>;
/**
 * @internal
 */
export declare function getReadableFromProtocolStream(client: CDPSession, handle: string): Promise<Readable>;
/**
 * @internal
 */
export declare function setPageContent(page: Pick<Page, 'evaluate'>, content: string): Promise<void>;
/**
 * @internal
 */
export declare function getPageContent(): string;
/**
 * @internal
 */
export declare function validateDialogType(type: string): 'alert' | 'confirm' | 'prompt' | 'beforeunload';
//# sourceMappingURL=util.d.ts.map