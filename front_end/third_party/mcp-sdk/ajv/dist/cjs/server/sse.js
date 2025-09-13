"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEServerTransport = void 0;
const node_crypto_1 = require("node:crypto");
const types_js_1 = require("../types.js");
const raw_body_1 = __importDefault(require("raw-body"));
const content_type_1 = __importDefault(require("content-type"));
const url_1 = require("url");
const MAXIMUM_MESSAGE_SIZE = "4mb";
/**
 * Server transport for SSE: this will send messages over an SSE connection and receive messages from HTTP POST requests.
 *
 * This transport is only available in Node.js environments.
 */
class SSEServerTransport {
    /**
     * Creates a new SSE server transport, which will direct the client to POST messages to the relative or absolute URL identified by `_endpoint`.
     */
    constructor(_endpoint, res) {
        this._endpoint = _endpoint;
        this.res = res;
        this._sessionId = (0, node_crypto_1.randomUUID)();
    }
    /**
     * Handles the initial SSE connection request.
     *
     * This should be called when a GET request is made to establish the SSE stream.
     */
    async start() {
        if (this._sseResponse) {
            throw new Error("SSEServerTransport already started! If using Server class, note that connect() calls start() automatically.");
        }
        this.res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        });
        // Send the endpoint event
        // Use a dummy base URL because this._endpoint is relative.
        // This allows using URL/URLSearchParams for robust parameter handling.
        const dummyBase = 'http://localhost'; // Any valid base works
        const endpointUrl = new url_1.URL(this._endpoint, dummyBase);
        endpointUrl.searchParams.set('sessionId', this._sessionId);
        // Reconstruct the relative URL string (pathname + search + hash)
        const relativeUrlWithSession = endpointUrl.pathname + endpointUrl.search + endpointUrl.hash;
        this.res.write(`event: endpoint\ndata: ${relativeUrlWithSession}\n\n`);
        this._sseResponse = this.res;
        this.res.on("close", () => {
            var _a;
            this._sseResponse = undefined;
            (_a = this.onclose) === null || _a === void 0 ? void 0 : _a.call(this);
        });
    }
    /**
     * Handles incoming POST messages.
     *
     * This should be called when a POST request is made to send a message to the server.
     */
    async handlePostMessage(req, res, parsedBody) {
        var _a, _b, _c;
        if (!this._sseResponse) {
            const message = "SSE connection not established";
            res.writeHead(500).end(message);
            throw new Error(message);
        }
        const authInfo = req.auth;
        let body;
        try {
            const ct = content_type_1.default.parse((_a = req.headers["content-type"]) !== null && _a !== void 0 ? _a : "");
            if (ct.type !== "application/json") {
                throw new Error(`Unsupported content-type: ${ct}`);
            }
            body = parsedBody !== null && parsedBody !== void 0 ? parsedBody : await (0, raw_body_1.default)(req, {
                limit: MAXIMUM_MESSAGE_SIZE,
                encoding: (_b = ct.parameters.charset) !== null && _b !== void 0 ? _b : "utf-8",
            });
        }
        catch (error) {
            res.writeHead(400).end(String(error));
            (_c = this.onerror) === null || _c === void 0 ? void 0 : _c.call(this, error);
            return;
        }
        try {
            await this.handleMessage(typeof body === 'string' ? JSON.parse(body) : body, { authInfo });
        }
        catch (_d) {
            res.writeHead(400).end(`Invalid message: ${body}`);
            return;
        }
        res.writeHead(202).end("Accepted");
    }
    /**
     * Handle a client message, regardless of how it arrived. This can be used to inform the server of messages that arrive via a means different than HTTP POST.
     */
    async handleMessage(message, extra) {
        var _a, _b;
        let parsedMessage;
        try {
            parsedMessage = types_js_1.JSONRPCMessageSchema.parse(message);
        }
        catch (error) {
            (_a = this.onerror) === null || _a === void 0 ? void 0 : _a.call(this, error);
            throw error;
        }
        (_b = this.onmessage) === null || _b === void 0 ? void 0 : _b.call(this, parsedMessage, extra);
    }
    async close() {
        var _a, _b;
        (_a = this._sseResponse) === null || _a === void 0 ? void 0 : _a.end();
        this._sseResponse = undefined;
        (_b = this.onclose) === null || _b === void 0 ? void 0 : _b.call(this);
    }
    async send(message) {
        if (!this._sseResponse) {
            throw new Error("Not connected");
        }
        this._sseResponse.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
    }
    /**
     * Returns the session ID for this transport.
     *
     * This can be used to route incoming POST requests.
     */
    get sessionId() {
        return this._sessionId;
    }
}
exports.SSEServerTransport = SSEServerTransport;
//# sourceMappingURL=sse.js.map