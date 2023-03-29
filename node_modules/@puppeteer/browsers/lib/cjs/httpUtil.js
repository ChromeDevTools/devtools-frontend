"use strict";
/**
 * Copyright 2023 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFile = exports.httpRequest = exports.headHttpRequest = void 0;
const fs_1 = require("fs");
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const url_1 = require("url");
const https_proxy_agent_1 = __importDefault(require("https-proxy-agent"));
const proxy_from_env_1 = require("proxy-from-env");
function headHttpRequest(url) {
    return new Promise(resolve => {
        const request = httpRequest(url, 'HEAD', response => {
            resolve(response.statusCode === 200);
        }, false);
        request.on('error', () => {
            resolve(false);
        });
    });
}
exports.headHttpRequest = headHttpRequest;
function httpRequest(url, method, response, keepAlive = true) {
    const options = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: keepAlive ? { Connection: 'keep-alive' } : undefined,
    };
    const proxyURL = (0, proxy_from_env_1.getProxyForUrl)(url.toString());
    if (proxyURL) {
        const proxy = new url_1.URL(proxyURL);
        if (proxy.protocol === 'http:') {
            options.path = url.href;
            options.hostname = proxy.hostname;
            options.protocol = proxy.protocol;
            options.port = proxy.port;
        }
        else {
            options.agent = (0, https_proxy_agent_1.default)({
                host: proxy.host,
                path: proxy.pathname,
                port: proxy.port,
                secureProxy: proxy.protocol === 'https:',
                headers: options.headers,
            });
        }
    }
    const requestCallback = (res) => {
        if (res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location) {
            httpRequest(new url_1.URL(res.headers.location), method, response);
        }
        else {
            response(res);
        }
    };
    const request = options.protocol === 'https:'
        ? https.request(options, requestCallback)
        : http.request(options, requestCallback);
    request.end();
    return request;
}
exports.httpRequest = httpRequest;
/**
 * @internal
 */
function downloadFile(url, destinationPath, progressCallback) {
    return new Promise((resolve, reject) => {
        let downloadedBytes = 0;
        let totalBytes = 0;
        function onData(chunk) {
            downloadedBytes += chunk.length;
            progressCallback(downloadedBytes, totalBytes);
        }
        const request = httpRequest(url, 'GET', response => {
            if (response.statusCode !== 200) {
                const error = new Error(`Download failed: server returned code ${response.statusCode}. URL: ${url}`);
                // consume response data to free up memory
                response.resume();
                reject(error);
                return;
            }
            const file = (0, fs_1.createWriteStream)(destinationPath);
            file.on('finish', () => {
                return resolve();
            });
            file.on('error', error => {
                return reject(error);
            });
            response.pipe(file);
            totalBytes = parseInt(response.headers['content-length'], 10);
            if (progressCallback) {
                response.on('data', onData);
            }
        });
        request.on('error', error => {
            return reject(error);
        });
    });
}
exports.downloadFile = downloadFile;
//# sourceMappingURL=httpUtil.js.map