#!/usr/bin/env node

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Example demonstrating how to use EvalServer with optional HTTP API wrapper

import { EvalServer } from '../src/lib/EvalServer.js';
import { HTTPWrapper } from '../src/lib/HTTPWrapper.js';

console.log('🔧 Creating EvalServer...');
const evalServer = new EvalServer({
  authKey: 'hello',
  host: '127.0.0.1',
  port: 8080
});

console.log('🔧 Creating HTTP wrapper...');
const httpWrapper = new HTTPWrapper(evalServer, {
  port: 8081,
  host: '127.0.0.1'
});


console.log('🔧 Starting EvalServer...');
await evalServer.start();
console.log('✅ EvalServer started on ws://127.0.0.1:8080');

console.log('🔧 Starting HTTP wrapper...');
await httpWrapper.start();
console.log('✅ HTTP API started on http://127.0.0.1:8081');

console.log('⏳ Waiting for DevTools client to connect...');
console.log('   WebSocket URL: ws://127.0.0.1:8080');
console.log('   HTTP API URL: http://127.0.0.1:8081');
console.log('   Auth Key: hello');

// Add periodic status check
setInterval(() => {
  const evalServerStatus = evalServer.getStatus();
  const httpWrapperStatus = httpWrapper.getStatus();
  console.log(`📊 EvalServer: ${evalServerStatus.connectedClients} clients, ${evalServerStatus.readyClients} ready`);
  console.log(`📊 HTTP API: ${httpWrapperStatus.isRunning ? 'running' : 'stopped'} on ${httpWrapperStatus.url}`);
}, 15000);