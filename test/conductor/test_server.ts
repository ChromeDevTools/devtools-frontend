// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ChildProcess, spawn} from 'child_process';
import * as path from 'path';

const HOSTED_MODE_SERVER_PATH = path.join(__dirname, '..', '..', 'scripts', 'hosted_mode', 'server.js');
const COMPONENT_DOCS_SERVER_PATH = path.join(__dirname, '..', '..', 'scripts', 'component_server', 'server.js');
const cwd = path.join(__dirname, '..', '..');
let runningServer: ChildProcess;

// Starts a hosted mode server on any available port and returns the port number
// once the server is ready to receive requests.
export function startServer(server: 'hosted-mode'|'component-docs'): Promise<number> {
  if (runningServer) {
    throw new Error('Server was already started.');
  }
  function handleServerError(error: Error) {
    throw new Error(`Server error: ${error}`);
  }

  const serverExecutable = {
    'hosted-mode': HOSTED_MODE_SERVER_PATH,
    'component-docs': COMPONENT_DOCS_SERVER_PATH,
  }[server];

  // Copy the current env and append the port.
  const env = Object.create(process.env);
  env.PORT = 0;  // 0 means request a free port from the OS.
  return new Promise((resolve, reject) => {
    // We open the server with an IPC channel so that it can report the port it
    // used back to us. For parallel test mode, we need to avoid specifying a
    // port directly and instead request any free port, which is what port 0
    // signifies to the OS.
    runningServer = spawn(process.execPath, [serverExecutable], {cwd, env, stdio: ['pipe', 'pipe', 'pipe', 'ipc']});
    runningServer.on('message', message => {
      if (message === 'ERROR') {
        reject('Could not start server');
      } else {
        resolve(parseInt(message, 10));
      }
    });
    runningServer.on('error', handleServerError);
    if (runningServer.stderr) {
      runningServer.stderr.on('data', handleServerError);
    }
  });
}

export function stopServer() {
  runningServer.kill();
}
