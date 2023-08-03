import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import PuppeteerUtil from '../../injected/injected.js';
import { EventEmitter } from '../EventEmitter.js';
import { EvaluateFunc, HandleFor } from '../types.js';
import { Connection } from './Connection.js';
import { ElementHandle } from './ElementHandle.js';
import { Frame } from './Frame.js';
import { JSHandle } from './JSHandle.js';
export declare const SOURCE_URL_REGEX: RegExp;
export declare const getSourceUrlComment: (url: string) => string;
export declare class Realm extends EventEmitter {
    #private;
    connection: Connection;
    constructor(connection: Connection, id: string, sandbox?: string);
    get target(): Bidi.Script.Target;
    setFrame(frame: Frame): void;
    protected internalPuppeteerUtil?: Promise<JSHandle<PuppeteerUtil>>;
    get puppeteerUtil(): Promise<JSHandle<PuppeteerUtil>>;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
}
/**
 * @internal
 */
export declare function getBidiHandle(realmOrContext: Realm, result: Bidi.Script.RemoteValue, frame: Frame): JSHandle | ElementHandle<Node>;
//# sourceMappingURL=Realm.d.ts.map