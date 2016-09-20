// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
var fs = require("fs");
var http = require("http");
var path = require("path");
var parseURL = require("url").parse;

var utils = require("../utils");

var remoteDebuggingPort = parseInt(process.env.REMOTE_DEBUGGING_PORT, 10) || 9222;
var serverPort = parseInt(process.env.PORT, 10) || 8090;
var devtoolsFolder = path.resolve(path.join(__dirname, "../.."));

http.createServer(requestHandler).listen(serverPort);
console.log(`Started hosted mode server at http://localhost:${serverPort}\n`);
console.log("For info on using the hosted mode server, see our contributing docs:");
console.log("https://bit.ly/devtools-contribution-guide");
console.log("Tip: Look for the 'Hosted Mode Server Options' section\n");

function requestHandler(request, response)
{
    var filePath = parseURL(request.url).pathname;
    if (filePath === "/") {
        var landingURL = `http://localhost:${remoteDebuggingPort}#http://localhost:${serverPort}/front_end/inspector.html?experiments=true`;
        sendResponse(200, `<html>Please go to <a href="${landingURL}">${landingURL}</a></html>`);
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
        console.log(`Make sure you opened Chrome with the flag "--remote-debugging-port=${remoteDebuggingPort}"`);
        sendResponse(500, "500 - Internal Server Error");
    }

    var absoluteFilePath = path.join(process.cwd(), filePath);
    if (!path.resolve(absoluteFilePath).startsWith(devtoolsFolder)) {
        console.log(`File requested is outside of devtools folder: ${devtoolsFolder}`);
        sendResponse(403, `403 - Access denied. File requested is outside of devtools folder: ${devtoolsFolder}`);
        return;
    }

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
    "/front_end/SupportedCSSProperties.js": cloudURL.bind(null, "SupportedCSSProperties.js"),
    "/front_end/InspectorBackendCommands.js": cloudURL.bind(null, "InspectorBackendCommands.js"),
    "/favicon.ico": () => "https://chrome-devtools-frontend.appspot.com/favicon.ico"
};

function cloudURL(path, commitHash)
{
    return `https://chrome-devtools-frontend.appspot.com/serve_file/@${commitHash}/${path}`;
}

var proxyFileCache = new Map();

function proxy(filePath)
{
    if (!(filePath in proxyFilePathToURL))
        return null;
    if (process.env.CHROMIUM_COMMIT)
        return onProxyFileURL(proxyFilePathToURL[filePath](process.env.CHROMIUM_COMMIT));
    return utils.fetch(`http://localhost:${remoteDebuggingPort}/json/version`)
        .then(onBrowserMetadata)
        .then(onProxyFileURL);

    function onBrowserMetadata(metadata)
    {
        var metadataObject = JSON.parse(metadata);
        var match = metadataObject["WebKit-Version"].match(/\s\(@(\b[0-9a-f]{5,40}\b)/);
        var commitHash = match[1];
        var proxyFileURL = proxyFilePathToURL[filePath](commitHash);
        return proxyFileURL;
    }

    function onProxyFileURL(proxyFileURL)
    {
        if (proxyFileCache.has(proxyFileURL))
            return Promise.resolve(proxyFileCache.get(proxyFileURL));
        return utils.fetch(proxyFileURL)
            .then(cacheProxyFile.bind(null, proxyFileURL));
    }

    function cacheProxyFile(proxyFileURL, data)
    {
        proxyFileCache.set(proxyFileURL, data);
        return data;
    }
}
