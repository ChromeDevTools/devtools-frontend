// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var fs = require("fs");
var http = require("http");
var https = require("https");
var path = require("path");
var parseURL = require("url").parse;

var port = parseInt(process.env.PORT, 10) || 8090;

http.createServer(requestHandler).listen(port);
console.log("Started hosted mode server at http://localhost:" + port);

function requestHandler(request, response)
{
    var filePath = parseURL(request.url).pathname;
    if (filePath === "/front_end/InspectorBackendCommands.js") {
        sendResponse(200, " ");
        return;
    }

    var proxiedFile = proxy(filePath, sendResponse);
    if (proxiedFile) {
        proxiedFile
            .then(data => sendResponse(200, data))
            .catch(handleProxyError);
        return;
    }

    function handleProxyError(err)
    {
        console.log(`Error fetching over the internet file ${filePath}:`, err);
        sendResponse(500, "500 - Internal Server Error");
    }

    var absoluteFilePath = path.join(process.cwd(), filePath);
    fs.exists(absoluteFilePath, fsExistsCallback);

    function fsExistsCallback(fileExists)
    {
        if (!fileExists) {
            console.log(`Cannot find file ${absoluteFilePath}`);
            sendResponse(404, "404 - File not found");
            return;
        }
        fs.readFile(absoluteFilePath, "binary", readFileCallback);
    }

    function readFileCallback(err, file)
    {
        if (err) {
            console.log(`Unable to read local file ${absoluteFilePath}:`, err);
            sendResponse(500, "500 - Internal Server Error");
            return;
        }
        sendResponse(200, file);
    }

    function sendResponse(statusCode, data)
    {
        response.writeHead(statusCode);
        response.write(data, "binary");
        response.end();
    }
}

var proxyFilePathToURL = {
    "/front_end/sdk/protocol/js_protocol.json": getWebKitURL.bind(null, "platform/v8_inspector/js_protocol.json"),
    "/front_end/sdk/protocol/browser_protocol.json": getWebKitURL.bind(null, "core/inspector/browser_protocol.json"),
    "/front_end/SupportedCSSProperties.js": getFrontendURL.bind(null, "SupportedCSSProperties.js")
};

function getWebKitURL(path, commitHash)
{
    return {
        url: `https://chromium.googlesource.com/chromium/src/+/${commitHash}/third_party/WebKit/Source/${path}?format=TEXT`,
        isBase64: true
    }
}

function getFrontendURL(path, commitHash)
{
    return {
        url: `https://chrome-devtools-frontend.appspot.com/serve_file/@${commitHash}/${path}`,
        isBase64: false
    }
}

var proxyFileCache = new Map();

function proxy(filePath)
{
    if (!(filePath in proxyFilePathToURL))
        return null;
    return fetch("http://localhost:9222/json/version")
        .then(onBrowserMetadata);

    function onBrowserMetadata(metadata)
    {
        var metadataObject = JSON.parse(metadata);
        var match = metadataObject["WebKit-Version"].match(/\s\(@(\b[0-9a-f]{5,40}\b)/);
        var commitHash = match[1];
        var proxyFile = proxyFilePathToURL[filePath](commitHash);
        var proxyFileURL = proxyFile.url;
        if (proxyFileCache.has(proxyFileURL))
            return proxyFileCache.get(proxyFileURL);
        return fetch(proxyFileURL)
            .then(text => proxyFile.isBase64 ? new Buffer(text, "base64").toString("binary") : text)
            .then(cacheProxyFile.bind(null, proxyFileURL));
    }

    function cacheProxyFile(proxyFileURL, data)
    {
        proxyFileCache.set(proxyFileURL, data);
        return data;
    }
}

function fetch(url)
{
    return new Promise(fetchPromise);

    function fetchPromise(resolve, reject) {
        var request;
        var protocol = parseURL(url).protocol;
        var handleResponse = getCallback.bind(null, resolve, reject);
        if (protocol === "https:") {
            request = https.get(url, handleResponse);
        } else if (protocol === "http:") {
            request = http.get(url, handleResponse);
        } else {
            reject(new Error(`Invalid protocol for url: ${url}`));
            return;
        }
        request.on("error", err => reject(err));
    }

    function getCallback(resolve, reject, response)
    {
        if (response.statusCode !== 200) {
            reject(new Error(`Request error: + ${response.statusCode}`));
            return;
        }
        var body = "";
        response.on("data", chunk => body += chunk);
        response.on("end", () => resolve(body));
    }
}

