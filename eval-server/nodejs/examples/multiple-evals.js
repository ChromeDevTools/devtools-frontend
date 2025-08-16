#!/usr/bin/env node

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Example demonstrating multiple evaluations using a stack-based approach
// Each connecting client receives a different evaluation from the stack

import { EvalServer } from '../src/lib/EvalServer.js';
import { EvaluationStack } from '../src/lib/EvaluationStack.js';

console.log('🔧 Creating evaluation stack...');
const evalStack = new EvaluationStack();

// Create multiple diverse evaluations for the stack
const evaluations = [
  {
    id: "math_eval",
    name: "Basic Math Problem",
    description: "Simple arithmetic evaluation",
    tool: "chat",
    input: {
      message: "What is 15 * 7 + 23? Please show your calculation steps."
    }
  },
  {
    id: "geography_eval", 
    name: "Capital of France",
    description: "Geography knowledge test",
    tool: "chat",
    input: {
      message: "What is the capital of France?"
    }
  },
  {
    id: "creative_eval",
    name: "Creative Writing",
    description: "Short creative writing task",
    tool: "chat", 
    input: {
      message: "Write a two-sentence story about a robot discovering friendship."
    }
  },
  {
    id: "tech_eval",
    name: "Technology Knowledge",
    description: "Basic technology concepts",
    tool: "chat",
    input: {
      message: "Explain what HTTP stands for and what it's used for in simple terms."
    }
  }
];

// Push evaluations to stack (they will be popped in reverse order)
console.log('📚 Adding evaluations to stack...');
evaluations.forEach((evaluation, index) => {
  evalStack.push(evaluation);
  console.log(`   ${index + 1}. ${evaluation.name} (${evaluation.id})`);
});

console.log(`✅ Stack initialized with ${evalStack.size()} evaluations`);

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

  // Check if we have evaluations left in the stack
  if (evalStack.isEmpty()) {
    console.log('⚠️  No more evaluations in stack for this client');
    console.log('   Consider refilling the stack or handling this scenario');
    return;
  }

  // Pop the next evaluation from the stack
  const evaluation = evalStack.pop();
  console.log(`📋 Assigning evaluation: "${evaluation.name}" (${evaluation.id})`);
  console.log(`📊 Remaining evaluations in stack: ${evalStack.size()}`);

  try {
    console.log('🔄 Starting evaluation...');
    let response = await client.evaluate(evaluation);
    
    console.log('✅ Evaluation completed!');
    console.log(`📊 Response for "${evaluation.name}":`, JSON.stringify(response, null, 2));
  } catch (error) {
    console.log(`❌ Evaluation "${evaluation.name}" failed:`, error.message);
  }
});

server.onDisconnect(clientInfo => {
  console.log('👋 CLIENT DISCONNECTED:', clientInfo);
});

console.log('🔧 Starting server...');
await server.start();
console.log('✅ Server started successfully on ws://127.0.0.1:8080');
console.log('⏳ Waiting for DevTools clients to connect...');
console.log('   WebSocket URL: ws://127.0.0.1:8080');
console.log('   Auth Key: hello');
console.log(`📚 Stack contains ${evalStack.size()} evaluations ready to be distributed`);

// Add periodic status check
setInterval(() => {
  const status = server.getStatus();
  console.log(`📊 Status: ${status.connectedClients} clients, ${status.readyClients} ready, ${evalStack.size()} evals remaining`);
}, 10000);