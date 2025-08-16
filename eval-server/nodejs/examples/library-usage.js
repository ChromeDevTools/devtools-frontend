#!/usr/bin/env node

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Simple example demonstrating the programmatic API usage

import { EvalServer } from '../src/lib/EvalServer.js';

console.log('🔧 Creating server...');
const server = new EvalServer({
  authKey: 'hello',
  host: '127.0.0.1',
  port: 8080
});

console.log('🔧 Setting up event handlers...');

server.on('started', (info) => {
  console.log('✅ Server started event fired:', info);
});

server.on('error', (error) => {
  console.log('❌ Server error:', error);
});

server.onConnect(async client => {
  console.log('🎉 CLIENT CONNECTED!');
  console.log('   - Client ID:', client.id);
  console.log('   - Client tabId:', client.tabId);
  console.log('   - Client info:', client.getInfo());

  try {
    console.log('🔄 Starting evaluation...');
    let response = await client.evaluate({
      id: "test_eval",
      name: "Capital of France", 
      description: "Simple test evaluation",
      tool: "chat",
      input: {
        message: "What is the capital of France?"
      }
    });
    
    console.log('✅ Evaluation completed!');
    console.log('📊 Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('❌ Evaluation failed:', error.message);
  }
});

server.onDisconnect(clientInfo => {
  console.log('👋 CLIENT DISCONNECTED:', clientInfo);
});

console.log('🔧 Starting server...');
await server.start();
console.log('✅ Server started successfully on ws://127.0.0.1:8080');
console.log('⏳ Waiting for DevTools client to connect...');
console.log('   WebSocket URL: ws://127.0.0.1:8080');
console.log('   Auth Key: hello');

// Add periodic status check
setInterval(() => {
  const status = server.getStatus();
  console.log(`📊 Status: ${status.connectedClients} clients, ${status.readyClients} ready`);
}, 10000);