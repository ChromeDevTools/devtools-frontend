import { AttachOptions, BaseServer } from "./server";
export declare class uServer extends BaseServer {
    protected init(): void;
    protected cleanup(): void;
    /**
     * Prepares a request by processing the query string.
     *
     * @api private
     */
    private prepare;
    protected createTransport(transportName: any, req: any): any;
    /**
     * Attach the engine to a µWebSockets.js server
     * @param app
     * @param options
     */
    attach(app: any, options?: AttachOptions): void;
    private handleRequest;
    private handleUpgrade;
    private abortRequest;
}
