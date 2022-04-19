/// <reference types="node" />
import { EventEmitter } from "events";
import { IncomingMessage } from "http";
import { Packet } from "engine.io-parser";
export declare abstract class Transport extends EventEmitter {
    sid: string;
    writable: boolean;
    protocol: number;
    protected _readyState: string;
    protected discarded: boolean;
    protected parser: any;
    protected req: IncomingMessage & {
        cleanup: Function;
    };
    protected supportsBinary: boolean;
    get readyState(): string;
    set readyState(state: string);
    /**
     * Transport constructor.
     *
     * @param {http.IncomingMessage} request
     * @api public
     */
    constructor(req: any);
    /**
     * Flags the transport as discarded.
     *
     * @api private
     */
    discard(): void;
    /**
     * Called with an incoming HTTP request.
     *
     * @param {http.IncomingMessage} request
     * @api protected
     */
    protected onRequest(req: any): void;
    /**
     * Closes the transport.
     *
     * @api private
     */
    close(fn?: any): void;
    /**
     * Called with a transport error.
     *
     * @param {String} message error
     * @param {Object} error description
     * @api protected
     */
    protected onError(msg: string, desc?: any): void;
    /**
     * Called with parsed out a packets from the data stream.
     *
     * @param {Object} packet
     * @api protected
     */
    protected onPacket(packet: Packet): void;
    /**
     * Called with the encoded packet data.
     *
     * @param {String} data
     * @api protected
     */
    protected onData(data: any): void;
    /**
     * Called upon transport close.
     *
     * @api protected
     */
    protected onClose(): void;
    abstract get supportsFraming(): any;
    abstract get name(): any;
    abstract send(packets: any): any;
    abstract doClose(fn?: any): any;
}
