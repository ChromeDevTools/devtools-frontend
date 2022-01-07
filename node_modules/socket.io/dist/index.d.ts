/// <reference types="node" />
import http = require("http");
import { ServerOptions as EngineOptions, AttachOptions } from "engine.io";
import { ExtendedError, Namespace, ServerReservedEventsMap } from "./namespace";
import { Adapter, Room, SocketId } from "socket.io-adapter";
import * as parser from "socket.io-parser";
import type { Encoder } from "socket.io-parser";
import { Socket } from "./socket";
import type { BroadcastOperator, RemoteSocket } from "./broadcast-operator";
import { EventsMap, DefaultEventsMap, EventParams, StrictEventEmitter, EventNames } from "./typed-events";
declare type ParentNspNameMatchFn = (name: string, auth: {
    [key: string]: any;
}, fn: (err: Error | null, success: boolean) => void) => void;
declare type AdapterConstructor = typeof Adapter | ((nsp: Namespace) => Adapter);
interface ServerOptions extends EngineOptions, AttachOptions {
    /**
     * name of the path to capture
     * @default "/socket.io"
     */
    path: string;
    /**
     * whether to serve the client files
     * @default true
     */
    serveClient: boolean;
    /**
     * the adapter to use
     * @default the in-memory adapter (https://github.com/socketio/socket.io-adapter)
     */
    adapter: AdapterConstructor;
    /**
     * the parser to use
     * @default the default parser (https://github.com/socketio/socket.io-parser)
     */
    parser: any;
    /**
     * how many ms before a client without namespace is closed
     * @default 45000
     */
    connectTimeout: number;
}
export declare class Server<ListenEvents extends EventsMap = DefaultEventsMap, EmitEvents extends EventsMap = ListenEvents, ServerSideEvents extends EventsMap = DefaultEventsMap, SocketData = any> extends StrictEventEmitter<ServerSideEvents, EmitEvents, ServerReservedEventsMap<ListenEvents, EmitEvents, ServerSideEvents, SocketData>> {
    readonly sockets: Namespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData>;
    /**
     * A reference to the underlying Engine.IO server.
     *
     * Example:
     *
     * <code>
     *   const clientsCount = io.engine.clientsCount;
     * </code>
     *
     */
    engine: any;
    /** @private */
    readonly _parser: typeof parser;
    /** @private */
    readonly encoder: Encoder;
    /**
     * @private
     */
    _nsps: Map<string, Namespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData>>;
    private parentNsps;
    private _adapter?;
    private _serveClient;
    private opts;
    private eio;
    private _path;
    private clientPathRegex;
    /**
     * @private
     */
    _connectTimeout: number;
    private httpServer;
    /**
     * Server constructor.
     *
     * @param srv http server, port, or options
     * @param [opts]
     * @public
     */
    constructor(opts?: Partial<ServerOptions>);
    constructor(srv?: http.Server | number, opts?: Partial<ServerOptions>);
    constructor(srv: undefined | Partial<ServerOptions> | http.Server | number, opts?: Partial<ServerOptions>);
    /**
     * Sets/gets whether client code is being served.
     *
     * @param v - whether to serve client code
     * @return self when setting or value when getting
     * @public
     */
    serveClient(v: boolean): this;
    serveClient(): boolean;
    serveClient(v?: boolean): this | boolean;
    /**
     * Executes the middleware for an incoming namespace not already created on the server.
     *
     * @param name - name of incoming namespace
     * @param auth - the auth parameters
     * @param fn - callback
     *
     * @private
     */
    _checkNamespace(name: string, auth: {
        [key: string]: any;
    }, fn: (nsp: Namespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData> | false) => void): void;
    /**
     * Sets the client serving path.
     *
     * @param {String} v pathname
     * @return {Server|String} self when setting or value when getting
     * @public
     */
    path(v: string): this;
    path(): string;
    path(v?: string): this | string;
    /**
     * Set the delay after which a client without namespace is closed
     * @param v
     * @public
     */
    connectTimeout(v: number): this;
    connectTimeout(): number;
    connectTimeout(v?: number): this | number;
    /**
     * Sets the adapter for rooms.
     *
     * @param v pathname
     * @return self when setting or value when getting
     * @public
     */
    adapter(): AdapterConstructor | undefined;
    adapter(v: AdapterConstructor): this;
    /**
     * Attaches socket.io to a server or port.
     *
     * @param srv - server or port
     * @param opts - options passed to engine.io
     * @return self
     * @public
     */
    listen(srv: http.Server | number, opts?: Partial<ServerOptions>): this;
    /**
     * Attaches socket.io to a server or port.
     *
     * @param srv - server or port
     * @param opts - options passed to engine.io
     * @return self
     * @public
     */
    attach(srv: http.Server | number, opts?: Partial<ServerOptions>): this;
    attachApp(app: any, opts?: Partial<ServerOptions>): void;
    /**
     * Initialize engine
     *
     * @param srv - the server to attach to
     * @param opts - options passed to engine.io
     * @private
     */
    private initEngine;
    /**
     * Attaches the static file serving.
     *
     * @param srv http server
     * @private
     */
    private attachServe;
    /**
     * Handles a request serving of client source and map
     *
     * @param req
     * @param res
     * @private
     */
    private serve;
    /**
     * @param filename
     * @param req
     * @param res
     * @private
     */
    private static sendFile;
    /**
     * Binds socket.io to an engine.io instance.
     *
     * @param {engine.Server} engine engine.io (or compatible) server
     * @return self
     * @public
     */
    bind(engine: any): this;
    /**
     * Called with each incoming transport connection.
     *
     * @param {engine.Socket} conn
     * @return self
     * @private
     */
    private onconnection;
    /**
     * Looks up a namespace.
     *
     * @param {String|RegExp|Function} name nsp name
     * @param fn optional, nsp `connection` ev handler
     * @public
     */
    of(name: string | RegExp | ParentNspNameMatchFn, fn?: (socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>) => void): Namespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData>;
    /**
     * Closes server connection
     *
     * @param [fn] optional, called as `fn([err])` on error OR all conns closed
     * @public
     */
    close(fn?: (err?: Error) => void): void;
    /**
     * Sets up namespace middleware.
     *
     * @return self
     * @public
     */
    use(fn: (socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>, next: (err?: ExtendedError) => void) => void): this;
    /**
     * Targets a room when emitting.
     *
     * @param room
     * @return self
     * @public
     */
    to(room: Room | Room[]): BroadcastOperator<EmitEvents, SocketData>;
    /**
     * Targets a room when emitting.
     *
     * @param room
     * @return self
     * @public
     */
    in(room: Room | Room[]): BroadcastOperator<EmitEvents, SocketData>;
    /**
     * Excludes a room when emitting.
     *
     * @param name
     * @return self
     * @public
     */
    except(name: Room | Room[]): BroadcastOperator<EmitEvents, SocketData>;
    /**
     * Sends a `message` event to all clients.
     *
     * @return self
     * @public
     */
    send(...args: EventParams<EmitEvents, "message">): this;
    /**
     * Sends a `message` event to all clients.
     *
     * @return self
     * @public
     */
    write(...args: EventParams<EmitEvents, "message">): this;
    /**
     * Emit a packet to other Socket.IO servers
     *
     * @param ev - the event name
     * @param args - an array of arguments, which may include an acknowledgement callback at the end
     * @public
     */
    serverSideEmit<Ev extends EventNames<ServerSideEvents>>(ev: Ev, ...args: EventParams<ServerSideEvents, Ev>): boolean;
    /**
     * Gets a list of socket ids.
     *
     * @public
     */
    allSockets(): Promise<Set<SocketId>>;
    /**
     * Sets the compress flag.
     *
     * @param compress - if `true`, compresses the sending data
     * @return self
     * @public
     */
    compress(compress: boolean): BroadcastOperator<EmitEvents, SocketData>;
    /**
     * Sets a modifier for a subsequent event emission that the event data may be lost if the client is not ready to
     * receive messages (because of network slowness or other issues, or because they’re connected through long polling
     * and is in the middle of a request-response cycle).
     *
     * @return self
     * @public
     */
    get volatile(): BroadcastOperator<EmitEvents, SocketData>;
    /**
     * Sets a modifier for a subsequent event emission that the event data will only be broadcast to the current node.
     *
     * @return self
     * @public
     */
    get local(): BroadcastOperator<EmitEvents, SocketData>;
    /**
     * Returns the matching socket instances
     *
     * @public
     */
    fetchSockets(): Promise<RemoteSocket<EmitEvents, SocketData>[]>;
    /**
     * Makes the matching socket instances join the specified rooms
     *
     * @param room
     * @public
     */
    socketsJoin(room: Room | Room[]): void;
    /**
     * Makes the matching socket instances leave the specified rooms
     *
     * @param room
     * @public
     */
    socketsLeave(room: Room | Room[]): void;
    /**
     * Makes the matching socket instances disconnect
     *
     * @param close - whether to close the underlying connection
     * @public
     */
    disconnectSockets(close?: boolean): void;
}
export { Socket, ServerOptions, Namespace, BroadcastOperator, RemoteSocket };
export { Event } from "./socket";
