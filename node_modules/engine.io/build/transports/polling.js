"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Polling = void 0;
const transport_1 = require("../transport");
const zlib_1 = require("zlib");
const accepts = require("accepts");
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)("engine:polling");
const compressionMethods = {
    gzip: zlib_1.createGzip,
    deflate: zlib_1.createDeflate,
};
class Polling extends transport_1.Transport {
    /**
     * HTTP polling constructor.
     */
    constructor(req) {
        super(req);
        this.closeTimeout = 30 * 1000;
    }
    /**
     * Transport name
     */
    get name() {
        return "polling";
    }
    /**
     * Overrides onRequest.
     *
     * @param {EngineRequest} req
     * @package
     */
    onRequest(req) {
        const res = req.res;
        // remove the reference to the ServerResponse object (as the first request of the session is kept in memory by default)
        req.res = null;
        if ("GET" === req.method) {
            this.onPollRequest(req, res);
        }
        else if ("POST" === req.method) {
            this.onDataRequest(req, res);
        }
        else {
            res.writeHead(500);
            res.end();
        }
    }
    /**
     * The client sends a request awaiting for us to send data.
     *
     * @private
     */
    onPollRequest(req, res) {
        if (this.req) {
            debug("request overlap");
            // assert: this.res, '.req and .res should be (un)set together'
            this.onError("overlap from client");
            res.writeHead(400);
            res.end();
            return;
        }
        debug("setting request");
        this.req = req;
        this.res = res;
        const onClose = () => {
            this.onError("poll connection closed prematurely");
        };
        const cleanup = () => {
            req.removeListener("close", onClose);
            this.req = this.res = null;
        };
        req.cleanup = cleanup;
        req.on("close", onClose);
        this.writable = true;
        this.emit("ready");
        // if we're still writable but had a pending close, trigger an empty send
        if (this.writable && this.shouldClose) {
            debug("triggering empty send to append close packet");
            this.send([{ type: "noop" }]);
        }
    }
    /**
     * The client sends a request with data.
     *
     * @private
     */
    onDataRequest(req, res) {
        if (this.dataReq) {
            // assert: this.dataRes, '.dataReq and .dataRes should be (un)set together'
            this.onError("data request overlap from client");
            res.writeHead(400);
            res.end();
            return;
        }
        const isBinary = "application/octet-stream" === req.headers["content-type"];
        if (isBinary && this.protocol === 4) {
            this.onError("invalid content");
            return res.writeHead(400).end();
        }
        this.dataReq = req;
        this.dataRes = res;
        const buffers = [];
        let stringChunks = "";
        let contentLength = 0;
        let exceededMaxHttpBufferSize = false;
        const cleanup = () => {
            req.removeListener("data", onData);
            req.removeListener("end", onEnd);
            req.removeListener("close", onClose);
            this.dataReq = this.dataRes = null;
        };
        const onClose = () => {
            cleanup();
            this.onError("data request connection closed prematurely");
        };
        const onData = (chunk) => {
            contentLength += isBinary ? chunk.length : Buffer.byteLength(chunk);
            if (contentLength > this.maxHttpBufferSize) {
                exceededMaxHttpBufferSize = true;
                res.writeHead(413).end();
                cleanup();
                return;
            }
            if (isBinary) {
                buffers.push(chunk);
            }
            else {
                stringChunks += chunk;
            }
        };
        const onEnd = () => {
            if (exceededMaxHttpBufferSize) {
                return;
            }
            const chunks = isBinary
                ? Buffer.concat(buffers, contentLength)
                : stringChunks;
            this.onData(chunks);
            const headers = {
                // text/html is required instead of text/plain to avoid an
                // unwanted download dialog on certain user-agents (GH-43)
                "Content-Type": "text/html",
                "Content-Length": "2",
            };
            res.writeHead(200, this.headers(req, headers));
            res.end("ok");
            cleanup();
        };
        req.on("close", onClose);
        if (!isBinary)
            req.setEncoding("utf8");
        req.on("data", onData);
        req.on("end", onEnd);
    }
    /**
     * Processes the incoming data payload.
     *
     * @param data - encoded payload
     * @protected
     */
    onData(data) {
        debug('received "%s"', data);
        const callback = (packet) => {
            if ("close" === packet.type) {
                debug("got xhr close packet");
                this.onClose();
                return false;
            }
            this.onPacket(packet);
        };
        if (this.protocol === 3) {
            this.parser.decodePayload(data, callback);
        }
        else {
            this.parser.decodePayload(data).forEach(callback);
        }
    }
    /**
     * Overrides onClose.
     *
     * @private
     */
    onClose() {
        if (this.writable) {
            // close pending poll request
            this.send([{ type: "noop" }]);
        }
        super.onClose();
    }
    send(packets) {
        this.writable = false;
        if (this.shouldClose) {
            debug("appending close packet to payload");
            packets.push({ type: "close" });
            this.shouldClose();
            this.shouldClose = null;
        }
        const doWrite = (data) => {
            const compress = packets.some((packet) => {
                return packet.options && packet.options.compress;
            });
            this.write(data, { compress });
        };
        if (this.protocol === 3) {
            this.parser.encodePayload(packets, this.supportsBinary, doWrite);
        }
        else {
            this.parser.encodePayload(packets, doWrite);
        }
    }
    /**
     * Writes data as response to poll request.
     *
     * @param {String} data
     * @param {Object} options
     * @private
     */
    write(data, options) {
        debug('writing "%s"', data);
        this.doWrite(data, options, () => {
            this.req.cleanup();
            this.emit("drain");
        });
    }
    /**
     * Performs the write.
     *
     * @protected
     */
    doWrite(data, options, callback) {
        // explicit UTF-8 is required for pages not served under utf
        const isString = typeof data === "string";
        const contentType = isString
            ? "text/plain; charset=UTF-8"
            : "application/octet-stream";
        const headers = {
            "Content-Type": contentType,
        };
        const respond = (data) => {
            headers["Content-Length"] =
                "string" === typeof data ? Buffer.byteLength(data) : data.length;
            this.res.writeHead(200, this.headers(this.req, headers));
            this.res.end(data);
            callback();
        };
        if (!this.httpCompression || !options.compress) {
            respond(data);
            return;
        }
        const len = isString ? Buffer.byteLength(data) : data.length;
        if (len < this.httpCompression.threshold) {
            respond(data);
            return;
        }
        const encoding = accepts(this.req).encodings(["gzip", "deflate"]);
        if (!encoding) {
            respond(data);
            return;
        }
        debug("compressing");
        headers["Content-Encoding"] = encoding;
        this.res.writeHead(200, this.headers(this.req, headers));
        const stream = compressionMethods[encoding](this.httpCompression);
        let isErrored = false;
        let isDone = false;
        const done = () => {
            if (isDone || isErrored) {
                return;
            }
            isDone = true;
            callback();
        };
        stream.on("error", (err) => {
            isErrored = true;
            this.res.end();
            callback(err);
        });
        // 'close' also fires after a normal completion, hence the guard: whatever
        // happens, the write callback must run exactly once so the transport
        // cleans up its request state and emits 'drain'.
        this.res.once("finish", done);
        this.res.once("close", done);
        stream.pipe(this.res);
        stream.end(data);
    }
    /**
     * Closes the transport.
     *
     * @private
     */
    doClose(fn) {
        debug("closing");
        let closeTimeoutTimer;
        if (this.dataReq) {
            debug("aborting ongoing data request");
            this.dataReq.destroy();
        }
        const onClose = () => {
            clearTimeout(closeTimeoutTimer);
            fn();
            this.onClose();
        };
        if (this.writable) {
            debug("transport writable - closing right away");
            this.send([{ type: "close" }]);
            onClose();
        }
        else if (this.discarded) {
            debug("transport discarded - closing right away");
            onClose();
        }
        else {
            debug("transport not writable - buffering orderly close");
            this.shouldClose = onClose;
            closeTimeoutTimer = setTimeout(onClose, this.closeTimeout);
        }
    }
    /**
     * Returns headers for a response.
     *
     * @param {http.IncomingMessage} req
     * @param {Object} headers - extra headers
     * @private
     */
    headers(req, headers = {}) {
        // prevent XSS warnings on IE
        // https://github.com/LearnBoost/socket.io/pull/1333
        const ua = req.headers["user-agent"];
        if (ua && (~ua.indexOf(";MSIE") || ~ua.indexOf("Trident/"))) {
            headers["X-XSS-Protection"] = "0";
        }
        headers["cache-control"] = "no-store";
        this.emit("headers", headers, req);
        return headers;
    }
}
exports.Polling = Polling;
