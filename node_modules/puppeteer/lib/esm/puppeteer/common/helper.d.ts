/// <reference types="node" />
import { CDPSession } from './Connection.js';
import { Protocol } from 'devtools-protocol';
import { CommonEventEmitter } from './EventEmitter.js';
export declare const debugError: (...args: unknown[]) => void;
declare function getExceptionMessage(exceptionDetails: Protocol.Runtime.ExceptionDetails): string;
declare function valueFromRemoteObject(remoteObject: Protocol.Runtime.RemoteObject): any;
declare function releaseObject(client: CDPSession, remoteObject: Protocol.Runtime.RemoteObject): Promise<void>;
export interface PuppeteerEventListener {
    emitter: CommonEventEmitter;
    eventName: string | symbol;
    handler: (...args: any[]) => void;
}
declare function addEventListener(emitter: CommonEventEmitter, eventName: string | symbol, handler: (...args: any[]) => void): PuppeteerEventListener;
declare function removeEventListeners(listeners: Array<{
    emitter: CommonEventEmitter;
    eventName: string | symbol;
    handler: (...args: any[]) => void;
}>): void;
declare function isString(obj: unknown): obj is string;
declare function isNumber(obj: unknown): obj is number;
declare function waitForEvent<T extends any>(emitter: CommonEventEmitter, eventName: string | symbol, predicate: (event: T) => boolean, timeout: number, abortPromise: Promise<Error>): Promise<T>;
declare function evaluationString(fun: Function | string, ...args: unknown[]): string;
declare function waitWithTimeout<T extends any>(promise: Promise<T>, taskName: string, timeout: number): Promise<T>;
declare function readProtocolStream(client: CDPSession, handle: string, path?: string): Promise<Buffer>;
export declare const helper: {
    evaluationString: typeof evaluationString;
    readProtocolStream: typeof readProtocolStream;
    waitWithTimeout: typeof waitWithTimeout;
    waitForEvent: typeof waitForEvent;
    isString: typeof isString;
    isNumber: typeof isNumber;
    addEventListener: typeof addEventListener;
    removeEventListeners: typeof removeEventListeners;
    valueFromRemoteObject: typeof valueFromRemoteObject;
    getExceptionMessage: typeof getExceptionMessage;
    releaseObject: typeof releaseObject;
};
export {};
//# sourceMappingURL=helper.d.ts.map