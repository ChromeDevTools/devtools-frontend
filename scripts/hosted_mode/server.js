// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');
const https = require('https');
const path = require('path');
const parseURL = require('url').parse;

const remoteDebuggingPort = parseInt(process.env.REMOTE_DEBUGGING_PORT, 10) || 9222;
const port = parseInt(process.env.PORT, 10);
const requestedPort = port || port === 0 ? port : 8090;

let pathToOutTargetDir = __dirname;
/**
 * If we are in the gen directory, we need to find the out/Default folder to use
 * as our base to find files from. We could do this with path.join(x, '..',
 * '..') until we get the right folder, but that's brittle. It's better to
 * search up for the directory containing args.gn to be robust to any folder structures.
 */
const fileSystemRootDirectory = path.parse(process.cwd()).root;
while (!fs.existsSync(path.join(pathToOutTargetDir, 'args.gn'))) {
  pathToOutTargetDir = path.resolve(pathToOutTargetDir, '..');
  if (pathToOutTargetDir === fileSystemRootDirectory) {
    console.error(
        'Could not find the build root directory. You must run the hosted server from within the build root directory containing the args.gn file for it to work. The hosted mode server only works on the built output from DevTools, not from the source input.');
    process.exit(1);
  }
}
// We care about everything in the gen/ directory.
const devtoolsFolder = path.resolve(path.join(pathToOutTargetDir, 'gen'));

// The certificate is taken from
// https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/tools/apache_config/webkit-httpd.pem
const options = {
  key: fs.readFileSync(__dirname + '/key.pem'),
  cert: fs.readFileSync(__dirname + '/cert.pem'),
};

const server = https.createServer(options, requestHandler);
server.once('error', error => {
  if (process.send) {
    process.send('ERROR');
  }
  throw error;
});
server.once('listening', () => {
  // If port 0 was used, then requested and actual port will be different.
  const actualPort = server.address().port;
  if (process.send) {
    process.send(actualPort);
  }
  console.log(`Started hosted mode server at http://localhost:${actualPort}\n`);
  console.log('For info on using the hosted mode server, see our contributing docs:');
  console.log('https://bit.ly/devtools-contribution-guide');
  console.log('Tip: Look for the \'Development server options\' section\n');
});
server.listen(requestedPort);

function requestHandler(request, response) {
  const filePath = unescape(parseURL(request.url).pathname);
  if (filePath === '/') {
    const landingURL = `http://localhost:${remoteDebuggingPort}#custom=true`;
    sendResponse(200, `<html>Please go to <a href="${landingURL}">${landingURL}</a></html>`);
    return;
  }

  const absoluteFilePath = path.join(devtoolsFolder, filePath);
  if (!path.resolve(absoluteFilePath).startsWith(path.join(devtoolsFolder, '..'))) {
    console.log(`File requested (${absoluteFilePath}) is outside of devtools folder: ${devtoolsFolder}`);
    sendResponse(403, `403 - Access denied. File requested is outside of devtools folder: ${devtoolsFolder}`);
    return;
  }

  fs.exists(absoluteFilePath, fsExistsCallback);

  function fsExistsCallback(fileExists) {
    if (!fileExists) {
      console.log(`Cannot find file ${absoluteFilePath}. Requested URL: ${filePath}`);
      sendResponse(404, '404 - File not found');
      return;
    }

    let encoding = 'utf8';
    if (absoluteFilePath.endsWith('.wasm') || absoluteFilePath.endsWith('.png') || absoluteFilePath.endsWith('.jpg') ||
        absoluteFilePath.endsWith('.avif')) {
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
    if (path.endsWith('.js') || path.endsWith('.mjs')) {
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
    } else if (path.endsWith('.avif')) {
      response.setHeader('Content-Type', 'image/avif');
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
        let headerValue = line.substring(firstColon + 1).trim();
        headerValue = headerValue.replace('$host_port', `${server.address().port}`);
        response.setHeader(line.substring(0, firstColon), headerValue);
      } else {
        response.write(line);
      }
    }

    response.end();
  }
}
