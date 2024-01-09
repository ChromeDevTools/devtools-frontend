/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type FS from 'fs/promises';
import type { Readable } from 'stream';
import type { Protocol } from 'devtools-protocol';
import { type Observable } from '../../third_party/rxjs/rxjs.js';
import type { CDPSession } from '../api/CDPSession.js';
import type { Deferred } from '../util/Deferred.js';
import type { EventEmitter, EventType } from './EventEmitter.js';
import type { NetworkManagerEvents } from './NetworkManagerEvents.js';
/**
 * @internal
 */
export declare const debugError: (...args: unknown[]) => void;
/**
 * @internal
 */
export declare const DEFAULT_VIEWPORT: Readonly<{
    width: 800;
    height: 600;
}>;
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
export declare function importFSPromises(): Promise<typeof FS>;
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
/**
 * @internal
 */
export declare function waitForHTTP<T extends {
    url(): string;
}>(networkManager: EventEmitter<NetworkManagerEvents>, eventName: EventType, urlOrPredicate: string | ((res: T) => boolean | Promise<boolean>), 
/** Time after the function will timeout */
ms: number, cancelation: Deferred<never>): Promise<T>;
/**
 * @internal
 */
export declare const NETWORK_IDLE_TIME = 500;
//# sourceMappingURL=util.d.ts.map