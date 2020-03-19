// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');
const http = require('http');
const path = require('path');
const parseURL = require('url').parse;

const utils = require('../utils');

const remoteDebuggingPort = parseInt(process.env.REMOTE_DEBUGGING_PORT, 10) || 9222;
const serverPort = parseInt(process.env.PORT, 10) || 8090;
const devtoolsFolder = path.resolve(path.join(__dirname, '../..'));

http.createServer(requestHandler).listen(serverPort);
console.log(`Started hosted mode server at http://localhost:${serverPort}\n`);
console.log('For info on using the hosted mode server, see our contributing docs:');
console.log('https://bit.ly/devtools-contribution-guide');
console.log('Tip: Look for the \'Development server options\' section\n');

function requestHandler(request, response) {
  const filePath = parseURL(request.url).pathname;
  if (filePath === '/') {
    const landingURL = `http://localhost:${remoteDebuggingPort}#custom=true`;
    sendResponse(200, `<html>Please go to <a href="${landingURL}">${landingURL}</a></html>`);
    return;
  }

  const proxiedFile = proxy(filePath, sendResponse);
  if (proxiedFile) {
    proxiedFile.then(data => sendResponse(200, data)).catch(handleProxyError);
    return;
  }

  function handleProxyError(err) {
    console.log(`Error serving the file ${filePath}:`, err);
    console.log(`Make sure you opened Chrome with the flag "--remote-debugging-port=${remoteDebuggingPort}"`);
    sendResponse(500, '500 - Internal Server Error');
  }

  const absoluteFilePath = path.join(devtoolsFolder, filePath);
  if (!path.resolve(absoluteFilePath).startsWith(devtoolsFolder)) {
    console.log(`File requested (${absoluteFilePath}) is outside of devtools folder: ${devtoolsFolder}`);
    sendResponse(403, `403 - Access denied. File requested is outside of devtools folder: ${devtoolsFolder}`);
    return;
  }

  fs.exists(absoluteFilePath, fsExistsCallback);

  function fsExistsCallback(fileExists) {
    if (!fileExists) {
      console.log(`Cannot find file ${absoluteFilePath}`);
      sendResponse(404, '404 - File not found');
      return;
    }

    let encoding = 'utf8';
    if (absoluteFilePath.endsWith('.wasm') || absoluteFilePath.endsWith('.png') || absoluteFilePath.endsWith('.jpg')) {
      encoding = 'binary';
    }

    fs.readFile(absoluteFilePath, encoding, readFileCallback);
  }

  function readFileCallback(err, file) {
    if (err) {
      console.log(`Unable to read local file ${absoluteFilePath}:`, err);
      sendResponse(500, '500 - Internal Server Error');
      return;
    }
    sendResponse(200, file);
  }

  function sendResponse(statusCode, data) {
    const path = parseURL(request.url).pathname;

    if (path.endsWith('.rawresponse')) {
      sendRawResponse(data);
      return;
    }

    let encoding = 'utf8';
    if (path.endsWith('.js')) {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      response.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (path.endsWith('.wasm')) {
      response.setHeader('Content-Type', 'application/wasm');
      encoding = 'binary';
    } else if (path.endsWith('.svg')) {
      response.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    } else if (path.endsWith('.png')) {
      response.setHeader('Content-Type', 'image/png');
      encoding = 'binary';
    } else if (path.endsWith('.jpg')) {
      response.setHeader('Content-Type', 'image/jpg');
      encoding = 'binary';
    }

    response.writeHead(statusCode);
    response.write(data, encoding);
    response.end();
  }

  function sendRawResponse(data) {
    const lines = data.split('\n');

    let isHeader = true;
    let line = lines.shift();
    const statusCode = parseInt(line, 10);

    while ((line = lines.shift()) !== undefined) {
      if (line.trim() === '') {
        isHeader = false;
        if (request.headers['if-none-match'] && response.getHeader('ETag') === request.headers['if-none-match']) {
          response.writeHead(304);
          response.end();
          return;
        }
        response.writeHead(statusCode);
        continue;
      }

      if (isHeader) {
        const firstColon = line.indexOf(':');
        response.setHeader(line.substring(0, firstColon), line.substring(firstColon + 1).trim());
      } else {
        response.write(line);
      }
    }

    response.end();
  }
}

const proxyFilePathToURL = {
  '/favicon.ico': () => 'https://chrome-devtools-frontend.appspot.com/favicon.ico',
};

const proxyFileCache = new Map();

function proxy(filePath) {
  if (!(filePath in proxyFilePathToURL)) {
    return null;
  }
  if (process.env.CHROMIUM_COMMIT) {
    return onProxyFileURL(proxyFilePathToURL[filePath](process.env.CHROMIUM_COMMIT));
  }
  return utils.fetch(`http://localhost:${remoteDebuggingPort}/json/version`)
      .then(onBrowserMetadata)
      .then(onProxyFileURL);

  function onBrowserMetadata(metadata) {
    const metadataObject = JSON.parse(metadata);
    const match = metadataObject['WebKit-Version'].match(/\s\(@(\b[0-9a-f]{5,40}\b)/);
    const commitHash = match[1];
    const proxyFileURL = proxyFilePathToURL[filePath](commitHash);
    return proxyFileURL;
  }

  function onProxyFileURL(proxyFileURL) {
    if (proxyFileCache.has(proxyFileURL)) {
      return Promise.resolve(proxyFileCache.get(proxyFileURL));
    }
    return utils.fetch(proxyFileURL).then(cacheProxyFile.bind(null, proxyFileURL)).catch(onMissingFile);
  }

  function onMissingFile() {
    const isFullCheckout = utils.shellOutput('git config --get remote.origin.url') ===
        'https://chromium.googlesource.com/chromium/src.git';
    let earlierCommitHash;
    const gitLogCommand = 'git log --max-count=1 --grep="Commit-Position" --before="12 hours ago"';
    if (isFullCheckout) {
      earlierCommitHash = utils.shellOutput(`${gitLogCommand} --pretty=format:"%H"`);
    } else {
      const commitMessage = utils.shellOutput(`${gitLogCommand}`);
      earlierCommitHash = commitMessage.match(/Cr-Mirrored-Commit: (.*)/)[1];
    }
    const fallbackURL = proxyFilePathToURL[filePath](earlierCommitHash);
    console.log('WARNING: Unable to fetch generated file based on browser\'s revision');
    console.log('Fetching earlier revision of same file as fallback');
    console.log('There may be a mismatch between the front-end and back-end');
    console.log(fallbackURL, '\n');
    return utils.fetch(fallbackURL).then(cacheProxyFile.bind(null, fallbackURL));
  }

  function cacheProxyFile(proxyFileURL, data) {
    proxyFileCache.set(proxyFileURL, data);
    return data;
  }
}
