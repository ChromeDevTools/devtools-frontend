import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import ProtocolMapping from 'devtools-protocol/types/protocol-mapping.js';
import { WaitForOptions } from '../../api/Page.js';
import PuppeteerUtil from '../../injected/injected.js';
import { EventEmitter } from '../EventEmitter.js';
import { PuppeteerLifeCycleEvent } from '../LifecycleWatcher.js';
import { TimeoutSettings } from '../TimeoutSettings.js';
import { EvaluateFunc, HandleFor } from '../types.js';
import { Connection } from './Connection.js';
import { ElementHandle } from './ElementHandle.js';
import { JSHandle } from './JSHandle.js';
/**
 * @internal
 */
export declare class BrowsingContext extends EventEmitter {
    #private;
    connection: Connection;
    constructor(connection: Connection, timeoutSettings: TimeoutSettings, info: Bidi.BrowsingContext.Info);
    get puppeteerUtil(): Promise<JSHandle<PuppeteerUtil>>;
    get url(): string;
    get id(): string;
    get cdpSessionId(): string | undefined;
    goto(url: string, options?: {
        referer?: string;
        referrerPolicy?: string;
        timeout?: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<string | null>;
    reload(options?: WaitForOptions): Promise<void>;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    setContent(html: string, options: {
        timeout?: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<void>;
    content(): Promise<string>;
    sendCDPCommand<T extends keyof ProtocolMapping.Commands>(method: T, params?: ProtocolMapping.Commands[T]['paramsType'][0]): Promise<ProtocolMapping.Commands[T]['returnType']>;
    dispose(): void;
    title(): Promise<string>;
}
/**
 * @internal
 */
export declare function getBidiHandle(context: BrowsingContext, result: Bidi.CommonDataTypes.RemoteValue): JSHandle | ElementHandle<Node>;
/**
 * @internal
 */
export declare function getWaitUntilSingle(event: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]): Extract<PuppeteerLifeCycleEvent, 'load' | 'domcontentloaded'>;
//# sourceMappingURL=BrowsingContext.d.ts.map