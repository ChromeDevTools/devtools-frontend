"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpCDPSession = void 0;
const CDPSession_js_1 = require("../api/CDPSession.js");
const Errors_js_1 = require("../common/Errors.js");
const assert_js_1 = require("../util/assert.js");
const Connection_js_1 = require("./Connection.js");
/**
 * @internal
 */
class CdpCDPSession extends CDPSession_js_1.CDPSession {
    #sessionId;
    #targetType;
    #callbacks = new Connection_js_1.CallbackRegistry();
    #connection;
    #parentSessionId;
    #target;
    /**
     * @internal
     */
    constructor(connection, targetType, sessionId, parentSessionId) {
        super();
        this.#connection = connection;
        this.#targetType = targetType;
        this.#sessionId = sessionId;
        this.#parentSessionId = parentSessionId;
    }
    /**
     * Sets the {@link CdpTarget} associated with the session instance.
     *
     * @internal
     */
    _setTarget(target) {
        this.#target = target;
    }
    /**
     * Gets the {@link CdpTarget} associated with the session instance.
     *
     * @internal
     */
    _target() {
        (0, assert_js_1.assert)(this.#target, 'Target must exist');
        return this.#target;
    }
    connection() {
        return this.#connection;
    }
    parentSession() {
        if (!this.#parentSessionId) {
            return;
        }
        const parent = this.#connection?.session(this.#parentSessionId);
        return parent ?? undefined;
    }
    send(method, ...paramArgs) {
        if (!this.#connection) {
            return Promise.reject(new Errors_js_1.TargetCloseError(`Protocol error (${method}): Session closed. Most likely the ${this.#targetType} has been closed.`));
        }
        // See the comment in Connection#send explaining why we do this.
        const params = paramArgs.length ? paramArgs[0] : undefined;
        return this.#connection._rawSend(this.#callbacks, method, params, this.#sessionId);
    }
    /**
     * @internal
     */
    _onMessage(object) {
        if (object.id) {
            if (object.error) {
                this.#callbacks.reject(object.id, (0, Connection_js_1.createProtocolErrorMessage)(object), object.error.message);
            }
            else {
                this.#callbacks.resolve(object.id, object.result);
            }
        }
        else {
            (0, assert_js_1.assert)(!object.id);
            this.emit(object.method, object.params);
        }
    }
    /**
     * Detaches the cdpSession from the target. Once detached, the cdpSession object
     * won't emit any events and can't be used to send messages.
     */
    async detach() {
        if (!this.#connection) {
            throw new Error(`Session already detached. Most likely the ${this.#targetType} has been closed.`);
        }
        await this.#connection.send('Target.detachFromTarget', {
            sessionId: this.#sessionId,
        });
    }
    /**
     * @internal
     */
    _onClosed() {
        this.#callbacks.clear();
        this.#connection = undefined;
        this.emit(CDPSession_js_1.CDPSessionEvent.Disconnected, undefined);
    }
    /**
     * Returns the session's id.
     */
    id() {
        return this.#sessionId;
    }
}
exports.CdpCDPSession = CdpCDPSession;
//# sourceMappingURL=CDPSession.js.map