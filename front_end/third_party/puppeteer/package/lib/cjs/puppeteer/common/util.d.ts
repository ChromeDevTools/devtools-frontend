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
import { type Observable } from '../../third_party/rxjs/rxjs.js';
import type { CDPSession } from '../api/CDPSession.js';
import { type Page } from '../api/Page.js';
import { Deferred } from '../util/Deferred.js';
import { type Awaitable } from './types.js';
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
export declare function createClientError(details: Protocol.Runtime.ExceptionDetails): Error;
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
export declare function waitForEvent<T>(emitter: any, eventName: string | symbol, predicate: (event: T) => Awaitable<boolean>, timeout: number, abortPromise: Promise<Error> | Deferred<Error>): Promise<T>;
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
/**
 * @internal
 */
export declare function timeout(ms: number): Observable<never>;
/**
 * @internal
 */
export declare const UTILITY_WORLD_NAME = "__puppeteer_utility_world__";
/**
 * @internal
 */
export declare const SOURCE_URL_REGEX: RegExp;
/**
 * @internal
 */
export declare function getSourceUrlComment(url: string): string;
//# sourceMappingURL=util.d.ts.map