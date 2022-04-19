/// <reference types="node" />
import { EventEmitter } from "events";
import { IncomingMessage } from "http";
import { Transport } from "./transport";
export declare class Socket extends EventEmitter {
    readonly protocol: number;
    readonly request: IncomingMessage;
    readonly remoteAddress: string;
    _readyState: string;
    transport: Transport;
    private server;
    private upgrading;
    private upgraded;
    private writeBuffer;
    private packetsFn;
    private sentCallbackFn;
    private cleanupFn;
    private checkIntervalTimer;
    private upgradeTimeoutTimer;
    private pingTimeoutTimer;
    private pingIntervalTimer;
    private readonly id;
    get readyState(): string;
    set readyState(state: string);
    /**
     * Client class (abstract).
     *
     * @api private
     */
    constructor(id: any, server: any, transport: any, req: any, protocol: any);
    /**
     * Called upon transport considered open.
     *
     * @api private
     */
    private onOpen;
    /**
     * Called upon transport packet.
     *
     * @param {Object} packet
     * @api private
     */
    private onPacket;
    /**
     * Called upon transport error.
     *
     * @param {Error} error object
     * @api private
     */
    private onError;
    /**
     * Pings client every `this.pingInterval` and expects response
     * within `this.pingTimeout` or closes connection.
     *
     * @api private
     */
    private schedulePing;
    /**
     * Resets ping timeout.
     *
     * @api private
     */
    private resetPingTimeout;
    /**
     * Attaches handlers for the given transport.
     *
     * @param {Transport} transport
     * @api private
     */
    private setTransport;
    /**
     * Upgrades socket to the given transport
     *
     * @param {Transport} transport
     * @api private
     */
    private maybeUpgrade;
    /**
     * Clears listeners and timers associated with current transport.
     *
     * @api private
     */
    private clearTransport;
    /**
     * Called upon transport considered closed.
     * Possible reasons: `ping timeout`, `client error`, `parse error`,
     * `transport error`, `server close`, `transport close`
     */
    private onClose;
    /**
     * Setup and manage send callback
     *
     * @api private
     */
    private setupSendCallback;
    /**
     * Sends a message packet.
     *
     * @param {Object} data
     * @param {Object} options
     * @param {Function} callback
     * @return {Socket} for chaining
     * @api public
     */
    send(data: any, options: any, callback?: any): this;
    write(data: any, options: any, callback?: any): this;
    /**
     * Sends a packet.
     *
     * @param {String} type - packet type
     * @param {String} data
     * @param {Object} options
     * @param {Function} callback
     *
     * @api private
     */
    private sendPacket;
    /**
     * Attempts to flush the packets buffer.
     *
     * @api private
     */
    private flush;
    /**
     * Get available upgrades for this socket.
     *
     * @api private
     */
    private getAvailableUpgrades;
    /**
     * Closes the socket and underlying transport.
     *
     * @param {Boolean} discard - optional, discard the transport
     * @return {Socket} for chaining
     * @api public
     */
    close(discard?: boolean): void;
    /**
     * Closes the underlying transport.
     *
     * @param {Boolean} discard
     * @api private
     */
    private closeTransport;
}
