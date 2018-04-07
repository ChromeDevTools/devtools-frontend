// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

var childProcess = require('child_process');
const fs = require('fs');
var http = require('http');
const path = require('path');
var parseURL = require('url').parse;

const utils = require('../utils');

const FRONTEND_PATH = path.resolve(__dirname, '..', '..', 'front_end');
const OUT_DIR_PATH = path.resolve(__dirname, 'out');
const OUT_FILE_PATH = path.resolve(OUT_DIR_PATH, 'dependencies.dot');

const SERVER_PORT = parseInt(process.env.PORT, 10) || 8001;

function main() {
  generateDot();
  try {
    childProcess.execSync(`dot -O -Tsvg ${OUT_FILE_PATH}`);
  } catch (err) {
    console.log(`Could not generate dot svg because: ${err}`);
    console.log('Make sure you have graphviz installed (e.g. sudo apt install graphviz)');
    return;
  }
  console.log('Generated dot file & svg');
  startServer();
  console.log(`Go to: http://localhost:${SERVER_PORT}/jquery_svg.html`);
}

function generateDot() {
  if (!utils.isDir(OUT_DIR_PATH))
    fs.mkdirSync(OUT_DIR_PATH);
  const modules = new Set();
  const moduleToDependencyList = ['digraph dependencies {'];
  moduleToDependencyList.push('fixedsize = true;');
  fs.readdirSync(FRONTEND_PATH).forEach(function(file) {
    const moduleJSONPath = path.join(FRONTEND_PATH, file, 'module.json');
    if (fs.statSync(path.join(FRONTEND_PATH, file)).isDirectory() && utils.isFile(moduleJSONPath)) {
      const module = file;
      if (module === 'audits2_worker')
        return;
      modules.add(module);
      const moduleJSON = require(moduleJSONPath);
      let moduleSize = 0;

      let resources = (moduleJSON.scripts || []).concat((moduleJSON.resources || []));
      for (let script of resources) {
        if (fs.existsSync(path.join(FRONTEND_PATH, module, script)))
          moduleSize += fs.statSync(path.join(FRONTEND_PATH, module, script)).size;
      }
      moduleSize /= 200000;
      moduleSize = Math.max(0.5, moduleSize);
      let fontSize = Math.max(moduleSize * 14, 14);

      moduleToDependencyList.push(`${module} [width=${moduleSize}, height=${moduleSize} fontsize=${fontSize}];`);

      if (moduleJSON.dependencies) {
        for (let d of moduleJSON.dependencies)
          moduleToDependencyList.push(`  ${module} -> ${d}`);
      }
    }
  });
  moduleToDependencyList.push('}');
  const content = moduleToDependencyList.join('\n');
  fs.writeFileSync(OUT_FILE_PATH, content);
}

function startServer() {
  http.createServer(requestHandler).listen(SERVER_PORT);

  function requestHandler(request, response) {
    var filePath = parseURL(request.url).pathname;
    var absoluteFilePath = path.join(__dirname, filePath);
    if (!path.resolve(absoluteFilePath).startsWith(__dirname)) {
      console.log(`File requested is outside of folder: ${__dirname}`);
      sendResponse(403, `403 - Access denied. File requested is outside of folder: ${__dirname}`);
      return;
    }

    fs.exists(absoluteFilePath, fsExistsCallback);

    function fsExistsCallback(fileExists) {
      if (!fileExists) {
        console.log(`Cannot find file ${absoluteFilePath}`);
        sendResponse(404, '404 - File not found');
        return;
      }
      fs.readFile(absoluteFilePath, 'binary', readFileCallback);
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
      response.writeHead(statusCode);
      response.write(data, 'binary');
      response.end();
    }
  }
}

if (require.main === module)
  main();