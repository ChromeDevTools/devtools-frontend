#!/usr/bin/env node

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Simple example demonstrating the programmatic API usage

import { EvalServer } from '../src/lib/EvalServer.js';
import { CONFIG } from '../src/config.js';

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

  // Check available LLM providers
  console.log('\n🔑 Available LLM Providers:');
  const availableProviders = [];
  if (CONFIG.providers.openai.apiKey) {
    availableProviders.push('openai');
    console.log('   ✅ OpenAI configured');
  }
  if (CONFIG.providers.groq.apiKey) {
    availableProviders.push('groq');
    console.log('   ✅ Groq configured');
  }
  if (CONFIG.providers.openrouter.apiKey) {
    availableProviders.push('openrouter');
    console.log('   ✅ OpenRouter configured');
  }
  if (CONFIG.providers.litellm.apiKey && CONFIG.providers.litellm.endpoint) {
    availableProviders.push('litellm');
    console.log('   ✅ LiteLLM configured');
  }

  if (availableProviders.length === 0) {
    console.log('   ❌ No providers configured. Add API keys to .env file.');
    console.log('   ℹ️  Example: OPENAI_API_KEY=sk-your-key-here');
  }

  try {
    // Demonstrate basic evaluation first
    console.log('\n🔄 Starting basic evaluation...');
    let response = await client.evaluate({
      id: "basic_eval",
      name: "Capital of France",
      description: "Basic test evaluation",
      tool: "chat",
      input: {
        message: "What is the capital of France?"
      }
    });

    console.log('✅ Basic evaluation completed!');
    console.log('📊 Response:', JSON.stringify(response, null, 2));

    // Demonstrate explicit model selection if OpenAI is available
    if (CONFIG.providers.openai.apiKey) {
      await demonstrateModelSelection(client);
    }

    // Demonstrate LLM configuration if providers are available
    if (availableProviders.length > 0) {
      await demonstrateLLMConfiguration(client, availableProviders);
    }

  } catch (error) {
    console.log('❌ Evaluation failed:', error.message);
  }
});

server.onDisconnect(clientInfo => {
  console.log('👋 CLIENT DISCONNECTED:', clientInfo);
});

// Function to demonstrate explicit model selection within OpenAI
async function demonstrateModelSelection(client) {
  console.log('\n🤖 Demonstrating Model Selection (OpenAI)...');

  const modelTests = [
    {
      model: 'gpt-4',
      task: 'Complex reasoning',
      message: 'Solve this step by step: If a train travels 60 mph for 2.5 hours, how far does it go?'
    },
    {
      model: 'gpt-4-mini',
      task: 'Simple question',
      message: 'What is 2 + 2?'
    },
    {
      model: 'gpt-3.5-turbo',
      task: 'Creative writing',
      message: 'Write a one-sentence story about a cat.'
    }
  ];

  for (const test of modelTests) {
    console.log(`\n🔧 Testing ${test.model} for ${test.task}...`);

    try {
      const response = await client.evaluate({
        id: `model_test_${test.model.replace(/[^a-z0-9]/g, '_')}`,
        name: `${test.model} ${test.task}`,
        tool: "chat",
        input: {
          message: test.message
        },
        model: {
          main_model: {
            provider: "openai",
            model: test.model,
            api_key: CONFIG.providers.openai.apiKey
          }
        }
      });

      console.log(`   ✅ ${test.model} completed successfully`);
      console.log(`   📊 Response: ${JSON.stringify(response.output).substring(0, 100)}...`);

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.log(`   ❌ ${test.model} failed: ${error.message}`);
    }
  }

  console.log('\n✨ Model selection demonstration completed!');
}

// Function to demonstrate LLM configuration
async function demonstrateLLMConfiguration(client, availableProviders) {
  console.log('\n🧪 Demonstrating LLM Configuration...');

  for (const provider of availableProviders.slice(0, 2)) { // Test up to 2 providers
    console.log(`\n🔧 Configuring ${provider.toUpperCase()} provider...`);

    try {
      // Configure different models based on provider
      let models;
      switch (provider) {
        case 'openai':
          models = {
            main: 'gpt-4',
            mini: 'gpt-4-mini',
            nano: 'gpt-3.5-turbo'
          };
          break;
        case 'groq':
          models = {
            main: 'llama-3.1-8b-instant',
            mini: 'llama-3.1-8b-instant',
            nano: 'llama-3.1-8b-instant'
          };
          break;
        case 'openrouter':
          models = {
            main: 'anthropic/claude-3-sonnet',
            mini: 'anthropic/claude-3-haiku',
            nano: 'anthropic/claude-3-haiku'
          };
          break;
        case 'litellm':
          models = {
            main: 'claude-3-sonnet-20240229',
            mini: 'claude-3-haiku-20240307',
            nano: 'claude-3-haiku-20240307'
          };
          break;
      }

      console.log(`   📦 Models: main=${models.main}, mini=${models.mini}, nano=${models.nano}`);

      // Run evaluation with specific provider configuration
      const response = await client.evaluate({
        id: `${provider}_config_eval`,
        name: `${provider.toUpperCase()} Configuration Test`,
        description: `Test evaluation using ${provider} provider`,
        tool: "chat",
        input: {
          message: `Hello! This is a test using the ${provider} provider. Please respond with a brief confirmation.`
        },
        model: {
          main_model: {
            provider: provider,
            model: models.main,
            api_key: CONFIG.providers[provider].apiKey,
            endpoint: CONFIG.providers[provider].endpoint
          },
          mini_model: {
            provider: provider,
            model: models.mini,
            api_key: CONFIG.providers[provider].apiKey,
            endpoint: CONFIG.providers[provider].endpoint
          },
          nano_model: {
            provider: provider,
            model: models.nano,
            api_key: CONFIG.providers[provider].apiKey,
            endpoint: CONFIG.providers[provider].endpoint
          }
        }
      });

      console.log(`   ✅ ${provider.toUpperCase()} evaluation completed successfully`);
      console.log(`   📊 Response preview: ${JSON.stringify(response.output).substring(0, 100)}...`);

      // Wait between provider tests
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.log(`   ❌ ${provider.toUpperCase()} configuration test failed:`, error.message);
    }
  }

  console.log('\n✨ LLM configuration demonstration completed!');
}

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