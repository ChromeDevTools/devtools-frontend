// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var fs = require('fs');
var http = require('http');
var https = require('https');
var path = require('path');
var parseURL = require('url').parse;
var shell = require('child_process').execSync;
var Stream = require('stream').Transform;

function fetch(url) {
  return new Promise(fetchPromise);

  function fetchPromise(resolve, reject) {
    var request;
    var protocol = parseURL(url).protocol;
    var handleResponse = getCallback.bind(null, resolve, reject);
    if (protocol === 'https:') {
      request = https.get(url, handleResponse);
    } else if (protocol === 'http:') {
      request = http.get(url, handleResponse);
    } else {
      reject(new Error(`Invalid protocol for url: ${url}`));
      return;
    }
    request.on('error', err => reject(err));
  }

  function getCallback(resolve, reject, response) {
    if (response.statusCode !== 200) {
      reject(new Error(`Request error: + ${response.statusCode}`));
      return;
    }
    var body = new Stream();
    response.on('data', chunk => body.push(chunk));
    response.on('end', () => resolve(body.read()));
  }
}

function atob(str) {
  return new Buffer(str, 'base64').toString('binary');
}

function isFile(path) {
  try {
    return fs.statSync(path).isFile();
  } catch (error) {
    return false;
  }
}

function isDir(path) {
  try {
    return fs.statSync(path).isDirectory();
  } catch (error) {
    return false;
  }
}

function copy(src, dest) {
  try {
    var targetFilePath = path.resolve(dest, path.basename(src));
    fs.writeFileSync(targetFilePath, fs.readFileSync(src));
  } catch (error) {
    throw new Error(`Received an error: [${error}] while trying to copy: ${src} -> ${dest}`);
  }
}

function copyRecursive(src, dest) {
  try {
    if (isFile(src)) {
      copy(src, dest);
      return;
    }
    var targetDirPath = path.resolve(dest, path.basename(src));
    if (!fs.existsSync(targetDirPath))
      fs.mkdirSync(targetDirPath);
    if (isDir(src)) {
      var files = fs.readdirSync(src);
      for (var i = 0; i < files.length; i++) {
        var childPath = path.resolve(src, files[i]);
        if (isDir(childPath)) {
          copyRecursive(childPath, targetDirPath);
        } else {
          var targetFilePath = path.resolve(targetDirPath, path.basename(childPath));
          fs.writeFileSync(targetFilePath, fs.readFileSync(childPath));
        }
      }
    }
  } catch (error) {
    throw new Error(`Received an error: [${error}] while trying to copy: ${src} -> ${dest}`);
  }
}

function removeRecursive(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      if (isFile(filePath)) {
        fs.unlinkSync(filePath);
        return;
      }
      var files = fs.readdirSync(filePath);
      for (var i = 0; i < files.length; i++) {
        var childPath = path.resolve(filePath, files[i]);
        if (isDir(childPath))
          removeRecursive(childPath);
        else
          fs.unlinkSync(childPath);
      }
      fs.rmdirSync(filePath);
    }
  } catch (error) {
    throw new Error(`Received an error: [${error}] while trying to remove: ${filePath}`);
  }
}

function includes(sequence, target) {
  return sequence.indexOf(target) > -1;
}

function shellOutput(command) {
  return shell(command).toString().trim();
}

function parseArgs(args) {
  var argObject = {};
  for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    var components = arg.split('=');
    var key = components[0];
    argObject[key] = components[1] || true;
  }
  return argObject;
}

module.exports = {
    fetch, atob, isFile, isDir, copy, copyRecursive, removeRecursive, includes, shellOutput, parseArgs,
};