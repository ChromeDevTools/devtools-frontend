import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import type ProtocolMapping from 'devtools-protocol/types/protocol-mapping.js';
import { CDPSession } from '../api/CDPSession.js';
import type { Connection as CdpConnection } from '../cdp/Connection.js';
import type { PuppeteerLifeCycleEvent } from '../cdp/LifecycleWatcher.js';
import type { EventType } from '../common/EventEmitter.js';
import type { BidiConnection } from './Connection.js';
import { BidiRealm } from './Realm.js';
/**
 * @internal
 */
export declare const lifeCycleToSubscribedEvent: Map<PuppeteerLifeCycleEvent, string>;
/**
 * @internal
 */
export declare const cdpSessions: Map<string, CdpSessionWrapper>;
/**
 * @internal
 */
export declare class CdpSessionWrapper extends CDPSession {
    #private;
    constructor(context: BrowsingContext, sessionId?: string);
    connection(): CdpConnection | undefined;
    send<T extends keyof ProtocolMapping.Commands>(method: T, ...paramArgs: ProtocolMapping.Commands[T]['paramsType']): Promise<ProtocolMapping.Commands[T]['returnType']>;
    detach(): Promise<void>;
    id(): string;
}
/**
 * Internal events that the BrowsingContext class emits.
 *
 * @internal
 */
export declare namespace BrowsingContextEvent {
    /**
     * Emitted on the top-level context, when a descendant context is created.
     */
    const Created: unique symbol;
    /**
     * Emitted on the top-level context, when a descendant context or the
     * top-level context itself is destroyed.
     */
    const Destroyed: unique symbol;
}
/**
 * @internal
 */
export interface BrowsingContextEvents extends Record<EventType, unknown> {
    [BrowsingContextEvent.Created]: BrowsingContext;
    [BrowsingContextEvent.Destroyed]: BrowsingContext;
}
/**
 * @internal
 */
export declare class BrowsingContext extends BidiRealm {
    #private;
    constructor(connection: BidiConnection, info: Bidi.BrowsingContext.Info, browserName: string);
    supportsCdp(): boolean;
    createRealmForSandbox(): BidiRealm;
    get url(): string;
    get id(): string;
    get parent(): string | undefined | null;
    get cdpSession(): CDPSession;
    sendCdpCommand<T extends keyof ProtocolMapping.Commands>(method: T, ...paramArgs: ProtocolMapping.Commands[T]['paramsType']): Promise<ProtocolMapping.Commands[T]['returnType']>;
    dispose(): void;
}
/**
 * @internal
 */
export declare function getWaitUntilSingle(event: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]): Extract<PuppeteerLifeCycleEvent, 'load' | 'domcontentloaded'>;
//# sourceMappingURL=BrowsingContext.d.ts.map