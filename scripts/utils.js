// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var fs = require("fs");
var http = require("http");
var https = require("https");
var parseURL = require("url").parse;
var Stream = require("stream").Transform;

function fetch(url)
{
    return new Promise(fetchPromise);

    function fetchPromise(resolve, reject)
    {
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
        var body = new Stream();
        response.on("data", chunk => body.push(chunk));
        response.on("end", () => resolve(body.read()));
    }
}

function atob(str)
{
    return new Buffer(str, "base64").toString("binary");
}


function isFile(path)
{
    try {
        return fs.statSync(path).isFile();
    } catch (e) {
        return false;
    }
}

module.exports = {
    fetch,
    atob,
    isFile,
};