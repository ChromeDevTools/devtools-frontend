import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import ProtocolMapping from 'devtools-protocol/types/protocol-mapping.js';
import { WaitForOptions } from '../../api/Page.js';
import { CDPSession, Connection as CDPConnection } from '../Connection.js';
import { PuppeteerLifeCycleEvent } from '../LifecycleWatcher.js';
import { Connection } from './Connection.js';
import { Realm } from './Realm.js';
/**
 * @internal
 */
export declare const lifeCycleToSubscribedEvent: Map<PuppeteerLifeCycleEvent, string>;
/**
 * @internal
 */
export declare const cdpSessions: Map<string, CDPSessionWrapper>;
/**
 * @internal
 */
export declare class CDPSessionWrapper extends CDPSession {
    #private;
    constructor(context: BrowsingContext, sessionId?: string);
    connection(): CDPConnection | undefined;
    send<T extends keyof ProtocolMapping.Commands>(method: T, ...paramArgs: ProtocolMapping.Commands[T]['paramsType']): Promise<ProtocolMapping.Commands[T]['returnType']>;
    detach(): Promise<void>;
    id(): string;
}
/**
 * Internal events that the BrowsingContext class emits.
 *
 * @internal
 */
export declare const BrowsingContextEmittedEvents: {
    /**
     * Emitted on the top-level context, when a descendant context is created.
     */
    readonly Created: symbol;
    /**
     * Emitted on the top-level context, when a descendant context or the
     * top-level context itself is destroyed.
     */
    readonly Destroyed: symbol;
};
/**
 * @internal
 */
export declare class BrowsingContext extends Realm {
    #private;
    constructor(connection: Connection, info: Bidi.BrowsingContext.Info);
    createSandboxRealm(sandbox: string): Realm;
    get url(): string;
    set url(value: string);
    get id(): string;
    get parent(): string | undefined | null;
    get cdpSession(): CDPSession;
    navigated(url: string): void;
    goto(url: string, options: {
        referer?: string;
        referrerPolicy?: string;
        timeout: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<string | null>;
    reload(options: WaitForOptions & {
        timeout: number;
    }): Promise<void>;
    setContent(html: string, options: {
        timeout: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<void>;
    content(): Promise<string>;
    sendCDPCommand<T extends keyof ProtocolMapping.Commands>(method: T, ...paramArgs: ProtocolMapping.Commands[T]['paramsType']): Promise<ProtocolMapping.Commands[T]['returnType']>;
    title(): Promise<string>;
    dispose(): void;
}
/**
 * @internal
 */
export declare function getWaitUntilSingle(event: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]): Extract<PuppeteerLifeCycleEvent, 'load' | 'domcontentloaded'>;
//# sourceMappingURL=BrowsingContext.d.ts.map