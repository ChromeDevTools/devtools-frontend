// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const chokidar = require('chokidar');
const path = require('path');
const childProcess = require('child_process');
const fs = require('fs');
const cwd = process.cwd();
const frontEndDir = path.join(cwd, 'front_end');
const testsDir = path.join(cwd, 'test');
const {WebSocketServer} = require('ws');
const env = process.env;

const extractArgument = argName => {
  const arg = process.argv.find(value => value.startsWith(`${argName}`));
  if (!arg) {
    return;
  }

  return arg.slice(`${argName}=`.length);
};

const relativeFileName = absoluteName => {
  return path.relative(cwd, absoluteName);
};

const currentTimeString = () => {
  return (new Date())
      .toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'});
};

const connections = {};
let lastConnectionId = 0;

// Extract the target if it's provided.
const target = extractArgument('--target') || 'Default';
const PORT = 8080;

let restartBuild = false;
let autoninja;

const changedFiles = new Set();

const startWebSocketServerForCssChanges = () => {
  const wss = new WebSocketServer({port: PORT});

  wss.on('listening', () => {
    console.log(`Listening connections for CSS changes at ${PORT}\n`);
  });

  wss.on('connection', ws => {
    const connection = {
      id: ++lastConnectionId,
      ws,
    };

    connections[connection.id] = connection;
    ws.on('close', () => {
      delete connections[connection.id];
    });
  });
};

const onFileChange = fileName => {
  // Some filesystems emit multiple events in quick succession for a
  // single file change. Here we track the changed files, and reset
  // after a short timeout.
  if (!fileName || changedFiles.has(fileName)) {
    return;
  }

  changedFiles.add(fileName);
  setTimeout(() => {
    changedFiles.delete(fileName);
  }, 250);

  // If the exitCode is null, autoninja is still running so stop it
  // and try to restart it again.
  const ninjaProcessExists = Boolean(autoninja && autoninja.pid);
  if (ninjaProcessExists) {
    const isRunning = ninjaProcessExists && autoninja.exitCode === null;
    if (isRunning) {
      autoninja.kill();
      restartBuild = true;
    }
    return;
  }

  if (fileName.endsWith('.css')) {
    console.log(`${currentTimeString()} - ${relativeFileName(fileName)} changed, notifying frontend`);
    const content = fs.readFileSync(fileName, {encoding: 'utf8', flag: 'r'});

    Object.values(connections).forEach(connection => {
      connection.ws.send(JSON.stringify({file: fileName, content}));
    });
    return;
  }

  autoninja = childProcess.spawn('autoninja', ['-C', `out/${target}`], {cwd, env, stdio: 'inherit'});
  autoninja.on('close', () => {
    autoninja = null;
    if (restartBuild) {
      restartBuild = false;
      console.log(`${currentTimeString()}  - ${relativeFileName(fileName)} changed, restarting ninja`);
      onFileChange();
    }
  });
};

// Run build initially before starting to watch for changes.
console.log('Running initial build before watching changes');
childProcess.spawnSync('autoninja', ['-C', `out/${target}`], {cwd, env, stdio: 'inherit'});

// Watch the front_end and test folder and build on any change.
console.log(`Watching for changes in ${frontEndDir} and ${testsDir}`);
chokidar.watch(frontEndDir).on('change', onFileChange);
chokidar.watch(testsDir).on('change', onFileChange);
startWebSocketServerForCssChanges();
