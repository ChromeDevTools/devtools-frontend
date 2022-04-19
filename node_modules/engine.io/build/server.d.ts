/// <reference types="node" />
import { EventEmitter } from "events";
import { IncomingMessage, Server as HttpServer } from "http";
import { CookieSerializeOptions } from "cookie";
import { CorsOptions, CorsOptionsDelegate } from "cors";
declare type Transport = "polling" | "websocket";
export interface AttachOptions {
    /**
     * name of the path to capture
     * @default "/engine.io"
     */
    path?: string;
    /**
     * destroy unhandled upgrade requests
     * @default true
     */
    destroyUpgrade?: boolean;
    /**
     * milliseconds after which unhandled requests are ended
     * @default 1000
     */
    destroyUpgradeTimeout?: number;
}
export interface ServerOptions {
    /**
     * how many ms without a pong packet to consider the connection closed
     * @default 20000
     */
    pingTimeout?: number;
    /**
     * how many ms before sending a new ping packet
     * @default 25000
     */
    pingInterval?: number;
    /**
     * how many ms before an uncompleted transport upgrade is cancelled
     * @default 10000
     */
    upgradeTimeout?: number;
    /**
     * how many bytes or characters a message can be, before closing the session (to avoid DoS).
     * @default 1e5 (100 KB)
     */
    maxHttpBufferSize?: number;
    /**
     * A function that receives a given handshake or upgrade request as its first parameter,
     * and can decide whether to continue or not. The second argument is a function that needs
     * to be called with the decided information: fn(err, success), where success is a boolean
     * value where false means that the request is rejected, and err is an error code.
     */
    allowRequest?: (req: IncomingMessage, fn: (err: string | null | undefined, success: boolean) => void) => void;
    /**
     * the low-level transports that are enabled
     * @default ["polling", "websocket"]
     */
    transports?: Transport[];
    /**
     * whether to allow transport upgrades
     * @default true
     */
    allowUpgrades?: boolean;
    /**
     * parameters of the WebSocket permessage-deflate extension (see ws module api docs). Set to false to disable.
     * @default false
     */
    perMessageDeflate?: boolean | object;
    /**
     * parameters of the http compression for the polling transports (see zlib api docs). Set to false to disable.
     * @default true
     */
    httpCompression?: boolean | object;
    /**
     * what WebSocket server implementation to use. Specified module must
     * conform to the ws interface (see ws module api docs).
     * An alternative c++ addon is also available by installing eiows module.
     *
     * @default `require("ws").Server`
     */
    wsEngine?: any;
    /**
     * an optional packet which will be concatenated to the handshake packet emitted by Engine.IO.
     */
    initialPacket?: any;
    /**
     * configuration of the cookie that contains the client sid to send as part of handshake response headers. This cookie
     * might be used for sticky-session. Defaults to not sending any cookie.
     * @default false
     */
    cookie?: (CookieSerializeOptions & {
        name: string;
    }) | boolean;
    /**
     * the options that will be forwarded to the cors module
     */
    cors?: CorsOptions | CorsOptionsDelegate;
    /**
     * whether to enable compatibility with Socket.IO v2 clients
     * @default false
     */
    allowEIO3?: boolean;
}
export declare abstract class BaseServer extends EventEmitter {
    opts: ServerOptions;
    protected clients: any;
    private clientsCount;
    protected corsMiddleware: Function;
    /**
     * Server constructor.
     *
     * @param {Object} opts - options
     * @api public
     */
    constructor(opts?: ServerOptions);
    protected abstract init(): any;
    /**
     * Returns a list of available transports for upgrade given a certain transport.
     *
     * @return {Array}
     * @api public
     */
    upgrades(transport: any): any;
    /**
     * Verifies a request.
     *
     * @param {http.IncomingMessage}
     * @return {Boolean} whether the request is valid
     * @api private
     */
    protected verify(req: any, upgrade: any, fn: any): any;
    /**
     * Closes all clients.
     *
     * @api public
     */
    close(): this;
    protected abstract cleanup(): any;
    /**
     * generate a socket id.
     * Overwrite this method to generate your custom socket id
     *
     * @param {Object} request object
     * @api public
     */
    generateId(req: any): any;
    /**
     * Handshakes a new client.
     *
     * @param {String} transport name
     * @param {Object} request object
     * @param {Function} closeConnection
     *
     * @api protected
     */
    protected handshake(transportName: any, req: any, closeConnection: any): Promise<any>;
    protected abstract createTransport(transportName: any, req: any): any;
    /**
     * Protocol errors mappings.
     */
    static errors: {
        UNKNOWN_TRANSPORT: number;
        UNKNOWN_SID: number;
        BAD_HANDSHAKE_METHOD: number;
        BAD_REQUEST: number;
        FORBIDDEN: number;
        UNSUPPORTED_PROTOCOL_VERSION: number;
    };
    static errorMessages: {
        0: string;
        1: string;
        2: string;
        3: string;
        4: string;
        5: string;
    };
}
export declare class Server extends BaseServer {
    httpServer?: HttpServer;
    private ws;
    /**
     * Initialize websocket server
     *
     * @api protected
     */
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
     * Handles an Engine.IO HTTP request.
     *
     * @param {http.IncomingMessage} request
     * @param {http.ServerResponse|http.OutgoingMessage} response
     * @api public
     */
    handleRequest(req: any, res: any): void;
    /**
     * Handles an Engine.IO HTTP Upgrade.
     *
     * @api public
     */
    handleUpgrade(req: any, socket: any, upgradeHead: any): void;
    /**
     * Called upon a ws.io connection.
     *
     * @param {ws.Socket} websocket
     * @api private
     */
    private onWebSocket;
    /**
     * Captures upgrade requests for a http.Server.
     *
     * @param {http.Server} server
     * @param {Object} options
     * @api public
     */
    attach(server: HttpServer, options?: AttachOptions): void;
}
export {};
