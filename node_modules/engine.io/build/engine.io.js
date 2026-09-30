"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protocol = exports.Transport = exports.Socket = exports.uServer = exports.parser = exports.transports = exports.Server = void 0;
exports.listen = listen;
exports.attach = attach;
const http_1 = require("http");
const server_1 = require("./server");
Object.defineProperty(exports, "Server", { enumerable: true, get: function () { return server_1.Server; } });
const index_1 = __importDefault(require("./transports/index"));
exports.transports = index_1.default;
const parser = __importStar(require("engine.io-parser"));
exports.parser = parser;
var userver_1 = require("./userver");
Object.defineProperty(exports, "uServer", { enumerable: true, get: function () { return userver_1.uServer; } });
var socket_1 = require("./socket");
Object.defineProperty(exports, "Socket", { enumerable: true, get: function () { return socket_1.Socket; } });
var transport_1 = require("./transport");
Object.defineProperty(exports, "Transport", { enumerable: true, get: function () { return transport_1.Transport; } });
exports.protocol = parser.protocol;
/**
 * Creates an http.Server exclusively used for WS upgrades, and starts listening.
 *
 * @param port
 * @param options
 * @param listenCallback - callback for http.Server.listen()
 * @return engine.io server
 */
function listen(port, options, listenCallback) {
    if ("function" === typeof options) {
        listenCallback = options;
        options = {};
    }
    const server = (0, http_1.createServer)(function (req, res) {
        res.writeHead(501);
        res.end("Not Implemented");
    });
    // create engine server
    const engine = attach(server, options);
    engine.httpServer = server;
    server.listen(port, listenCallback);
    return engine;
}
/**
 * Captures upgrade requests for a http.Server.
 *
 * @param server
 * @param options
 * @return engine.io server
 */
function attach(server, options) {
    const engine = new server_1.Server(options);
    engine.attach(server, options);
    return engine;
}
