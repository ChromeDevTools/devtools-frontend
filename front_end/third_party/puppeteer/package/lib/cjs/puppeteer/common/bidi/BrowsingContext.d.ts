import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import ProtocolMapping from 'devtools-protocol/types/protocol-mapping.js';
import { WaitForOptions } from '../../api/Page.js';
import type { CDPSession, Connection as CDPConnection } from '../Connection.js';
import { EventEmitter } from '../EventEmitter.js';
import { PuppeteerLifeCycleEvent } from '../LifecycleWatcher.js';
import { TimeoutSettings } from '../TimeoutSettings.js';
import { Connection } from './Connection.js';
import { Realm } from './Realm.js';
/**
 * @internal
 */
export declare class CDPSessionWrapper extends EventEmitter implements CDPSession {
    #private;
    constructor(context: BrowsingContext);
    connection(): CDPConnection | undefined;
    send<T extends keyof ProtocolMapping.Commands>(method: T, ...paramArgs: ProtocolMapping.Commands[T]['paramsType']): Promise<ProtocolMapping.Commands[T]['returnType']>;
    detach(): Promise<void>;
    id(): string;
}
/**
 * @internal
 */
export declare class BrowsingContext extends Realm {
    #private;
    constructor(connection: Connection, timeoutSettings: TimeoutSettings, info: Bidi.BrowsingContext.Info);
    createSandboxRealm(sandbox: string): Realm;
    get url(): string;
    get id(): string;
    get cdpSession(): CDPSession;
    goto(url: string, options?: {
        referer?: string;
        referrerPolicy?: string;
        timeout?: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<string | null>;
    reload(options?: WaitForOptions): Promise<void>;
    setContent(html: string, options: {
        timeout?: number;
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