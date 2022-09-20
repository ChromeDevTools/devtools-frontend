/// <reference types="node" />
import { Browser as BrowserBase, BrowserCloseCallback } from '../../api/Browser.js';
import { Connection } from './Connection.js';
import { ChildProcess } from 'child_process';
/**
 * @internal
 */
export declare class Browser extends BrowserBase {
    #private;
    /**
     * @internal
     */
    static create(opts: Options): Promise<Browser>;
    /**
     * @internal
     */
    constructor(opts: Options);
    close(): Promise<void>;
    isConnected(): boolean;
    process(): ChildProcess | null;
}
interface Options {
    process?: ChildProcess;
    closeCallback?: BrowserCloseCallback;
    connection: Connection;
}
export {};
//# sourceMappingURL=Browser.d.ts.map