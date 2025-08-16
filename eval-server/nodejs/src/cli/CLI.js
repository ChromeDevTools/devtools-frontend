#!/usr/bin/env node

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import readline from 'readline';
import { EvalServer } from '../lib/EvalServer.js';

/**
 * EvaluationCLI - Command line interface for the evaluation server
 * 
 * Refactored to use the new EvalServer library instead of directly
 * instantiating the old EvaluationServer class.
 */
export class EvaluationCLI {
  constructor(options = {}) {
    this.server = new EvalServer(options);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Keep track of connected clients for CLI operations
    this.connectedClients = new Map();
    
    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for the server
   */
  setupEventHandlers() {
    this.server.onConnect(client => {
      this.connectedClients.set(client.id, client);
      console.log(`✅ Client connected: ${client.id}`);
    });

    this.server.onDisconnect(clientInfo => {
      this.connectedClients.delete(clientInfo.clientId);
      console.log(`❌ Client disconnected: ${clientInfo.clientId}`);
    });

    this.server.on('error', error => {
      console.error(`🚨 Server error: ${error.message}`);
    });
  }

  async start() {
    console.log('🚀 Starting Evaluation Server CLI');
    console.log('====================================');
    
    // Start the server
    try {
      await this.server.start();
    } catch (error) {
      console.error(`❌ Failed to start server: ${error.message}`);
      process.exit(1);
    }
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.showHelp();
    this.startInteractiveMode();
  }

  showHelp() {
    console.log('\\nAvailable commands:');
    console.log('  status                           - Show server status');
    console.log('  clients                          - List all clients and their evaluations');
    console.log('  clients-connected                - List connected clients');
    console.log('  list-tabs [client-id]            - List active tabs (all clients or specific client)');
    console.log('  run <client-id> <evaluation-id>  - Run specific evaluation for a client');
    console.log('  run-all <client-id>              - Run all evaluations for a client');
    console.log('  run-tab <client-id> <tab-id> <evaluation-id> - Run evaluation on specific tab');
    console.log('  eval <evaluation-id>             - Run specific evaluation on all connected clients');
    console.log('  eval all                         - Run all pending evaluations on all clients');
    console.log('  load-evals [directory]           - Load evaluations from directory');
    console.log('  list-evals [category]            - List available evaluations');
    console.log('  help                             - Show this help');
    console.log('  quit                             - Exit the CLI');
    console.log('');
  }

  startInteractiveMode() {
    this.rl.question('eval-server> ', (input) => {
      this.handleCommand(input.trim());
    });
  }

  async handleCommand(input) {
    const [command, ...args] = input.split(' ');
    
    try {
      switch (command) {
        case 'status':
          this.showStatus();
          break;
        case 'clients':
          this.listClients();
          break;
        case 'run':
          if (args.length < 2) {
            console.log('Usage: run <client-id> <evaluation-id>');
          } else {
            await this.runSpecificEvaluation(args[0], args[1]);
          }
          break;
        case 'run-all':
          if (args.length < 1) {
            console.log('Usage: run-all <client-id>');
          } else {
            await this.runAllEvaluations(args[0]);
          }
          break;
        case 'eval':
          if (args.length === 0) {
            console.log('Usage: eval <evaluation-id>  OR  eval all');
          } else {
            await this.runEvaluation(args.join(' '));
          }
          break;
        case 'clients-connected':
          this.listConnectedClients();
          break;
        case 'list-tabs':
          this.listTabs(args[0]);
          break;
        case 'run-tab':
          if (args.length < 3) {
            console.log('Usage: run-tab <client-id> <tab-id> <evaluation-id>');
          } else {
            await this.runTabEvaluation(args[0], args[1], args[2]);
          }
          break;
        case 'load-evals':
          await this.loadEvaluations(args[0]);
          break;
        case 'list-evals':
          this.listEvaluations(args[0]);
          break;
        case 'help':
          this.showHelp();
          break;
        case 'quit':
        case 'exit':
          this.quit();
          return;
        case '':
          break;
        default:
          console.log(`Unknown command: ${command}. Type 'help' for available commands.`);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
    
    this.startInteractiveMode();
  }

  showStatus() {
    const status = this.server.getStatus();
    console.log('\\n📊 Server Status:');
    console.log(`  Running: ${status.isRunning ? 'Yes' : 'No'}`);
    console.log(`  Host: ${status.host}:${status.port}`);
    console.log(`  Connected clients: ${status.connectedClients}`);
    console.log(`  Unique base clients: ${status.uniqueBaseClients}`);
    console.log(`  Total tabs: ${status.totalTabs}`);
    console.log(`  Ready clients: ${status.readyClients}`);
    console.log('');
  }

  listConnectedClients() {
    console.log('\\n👥 Connected Clients:');
    
    if (this.connectedClients.size === 0) {
      console.log('  No clients connected');
    } else {
      for (const [clientId, client] of this.connectedClients) {
        const info = client.getInfo();
        console.log(`  Client ID: ${info.id}`);
        console.log(`    Base Client: ${info.baseClientId}`);
        console.log(`    Tab ID: ${info.tabId || 'default'}`);
        console.log(`    Connected: ${info.connectedAt}`);
        console.log(`    Address: ${info.remoteAddress}`);
        console.log('');
      }
    }
  }

  listClients() {
    const clients = this.server.clientManager.getAllClients();
    console.log('\\n👥 Registered Clients:');
    
    if (clients.length === 0) {
      console.log('  No clients registered');
      return;
    }
    
    clients.forEach(client => {
      console.log(`\\n  📋 ${client.name} (${client.id})`);
      console.log(`     Description: ${client.description || 'N/A'}`);
      console.log(`     Secret Key: ${client.secretKey ? '***' : 'None'}`);
      
      const evaluations = this.server.clientManager.getClientEvaluations(client.id);
      console.log(`     Evaluations: ${evaluations.length}`);
      
      // Group evaluations by category
      const evaluationsByCategory = {};
      evaluations.forEach(evaluation => {
        const category = evaluation.category || 'uncategorized';
        if (!evaluationsByCategory[category]) {
          evaluationsByCategory[category] = [];
        }
        evaluationsByCategory[category].push(evaluation);
      });
      
      // Display evaluations grouped by category
      Object.keys(evaluationsByCategory).sort().forEach(category => {
        const categoryEvals = evaluationsByCategory[category];
        console.log(`\\n       📁 ${category} (${categoryEvals.length})`);
        categoryEvals.forEach(evaluation => {
          const status = evaluation.status || 'pending';
          const statusIcon = status === 'completed' ? '✅' : status === 'running' ? '🔄' : status === 'failed' ? '❌' : '⏳';
          console.log(`         ${statusIcon} ${evaluation.id}: ${evaluation.name}`);
        });
      });
    });
    console.log('');
  }

  async loadEvaluations(directory) {
    try {
      const evalsDir = directory || './evals';
      console.log(`\\n📂 Loading evaluations from ${evalsDir}...`);
      
      const result = await this.server.loadEvaluations(evalsDir);
      console.log(`✅ Loaded ${result.totalEvaluations} evaluations from ${result.categories} categories`);
      
    } catch (error) {
      console.log(`❌ Failed to load evaluations: ${error.message}`);
    }
  }

  listEvaluations(category) {
    const evaluations = category 
      ? this.server.evaluationLoader.getEvaluationsByCategory(category)
      : this.server.evaluationLoader.getAllEvaluations();
    
    console.log(`\\n📋 ${category ? `Evaluations in category '${category}'` : 'All Evaluations'}:`);
    
    if (evaluations.length === 0) {
      console.log('  No evaluations found');
      return;
    }
    
    // Group by category if showing all
    if (!category) {
      const byCategory = {};
      evaluations.forEach(evaluation => {
        const cat = evaluation.category || 'uncategorized';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(evaluation);
      });
      
      Object.keys(byCategory).sort().forEach(cat => {
        console.log(`\\n  📁 ${cat}:`);
        byCategory[cat].forEach(evaluation => {
          const enabledIcon = evaluation.enabled !== false ? '✅' : '❌';
          console.log(`    ${enabledIcon} ${evaluation.id}: ${evaluation.name} (${evaluation.tool})`);
        });
      });
    } else {
      evaluations.forEach(evaluation => {
        const enabledIcon = evaluation.enabled !== false ? '✅' : '❌';
        console.log(`  ${enabledIcon} ${evaluation.id}: ${evaluation.name} (${evaluation.tool})`);
        if (evaluation.description) {
          console.log(`     ${evaluation.description}`);
        }
      });
    }
    console.log('');
  }

  async runSpecificEvaluation(clientId, evaluationId) {
    console.log(`\\n🎯 Running evaluation '${evaluationId}' for client '${clientId}'...`);
    
    try {
      const client = this.connectedClients.get(clientId);
      if (!client) {
        console.log(`❌ Client '${clientId}' is not connected`);
        return;
      }
      
      // Get the evaluation
      const evaluation = this.server.evaluationLoader.getEvaluationById(evaluationId);
      if (!evaluation) {
        console.log(`❌ Evaluation '${evaluationId}' not found`);
        return;
      }
      
      // Execute the evaluation
      const result = await client.evaluate(evaluation);
      
      console.log(`✅ Evaluation '${evaluationId}' completed successfully`);
      console.log(`Result: ${JSON.stringify(result, null, 2)}`);
      
    } catch (error) {
      console.log(`❌ Evaluation failed: ${error.message}`);
    }
  }

  async runAllEvaluations(clientId) {
    console.log(`\\n🚀 Running all evaluations for client '${clientId}'...`);
    
    try {
      const client = this.connectedClients.get(clientId);
      if (!client) {
        console.log(`❌ Client '${clientId}' is not connected`);
        return;
      }
      
      // Get all evaluations
      const evaluations = this.server.evaluationLoader.getAllEvaluations();
      
      if (evaluations.length === 0) {
        console.log(`❌ No evaluations found`);
        return;
      }
      
      console.log(`Found ${evaluations.length} evaluations to run...`);
      
      let completed = 0;
      let failed = 0;
      
      for (const evaluation of evaluations) {
        if (evaluation.enabled === false) {
          console.log(`⏭️  Skipping disabled: ${evaluation.name}`);
          continue;
        }
        
        console.log(`\\n🔄 Running: ${evaluation.name} (${evaluation.id})`);
        
        try {
          await client.evaluate(evaluation);
          console.log(`  ✅ Completed: ${evaluation.name}`);
          completed++;
        } catch (error) {
          console.log(`  ❌ Failed: ${evaluation.name} - ${error.message}`);
          failed++;
        }
        
        // Add a small delay between evaluations
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`\\n📊 Results: ${completed} completed, ${failed} failed`);
      
    } catch (error) {
      console.log(`❌ Batch evaluation failed: ${error.message}`);
    }
  }

  async runEvaluation(task) {
    console.log(`\\n🔍 Running evaluation: "${task}"`);
    console.log('=====================================');
    
    try {
      if (this.connectedClients.size === 0) {
        console.log('❌ No clients connected');
        return;
      }
      
      const clients = Array.from(this.connectedClients.values());
      console.log(`Running on ${clients.length} connected clients...`);
      
      const results = [];
      
      for (const client of clients) {
        try {
          let evaluation;
          
          if (task === 'all') {
            // Run all evaluations for this client
            const allEvals = this.server.evaluationLoader.getAllEvaluations()
              .filter(e => e.enabled !== false);
            
            for (const evaluation of allEvals) {
              const result = await client.evaluate(evaluation);
              results.push({
                clientId: client.id,
                evaluationId: evaluation.id,
                success: true,
                result
              });
            }
          } else {
            // Run specific evaluation
            evaluation = this.server.evaluationLoader.getEvaluationById(task);
            if (!evaluation) {
              results.push({
                clientId: client.id,
                evaluationId: task,
                success: false,
                error: `Evaluation '${task}' not found`
              });
              continue;
            }
            
            const result = await client.evaluate(evaluation);
            results.push({
              clientId: client.id,
              evaluationId: evaluation.id,
              success: true,
              result
            });
          }
        } catch (error) {
          results.push({
            clientId: client.id,
            success: false,
            error: error.message
          });
        }
      }
      
      // Display results
      console.log('\\n📋 Evaluation Results:');
      results.forEach((result, index) => {
        console.log(`\\n  Client ${index + 1} (${result.clientId}):`);
        
        if (result.success) {
          console.log(`    ✅ Success`);
          if (result.evaluationId) {
            console.log(`    Evaluation ID: ${result.evaluationId}`);
          }
        } else {
          console.log(`    ❌ Error: ${result.error}`);
        }
      });
      
      console.log('\\n✅ Evaluation completed');
      
    } catch (error) {
      console.log(`\\n❌ Evaluation failed: ${error.message}`);
    }
  }

  listTabs(clientId = null) {
    console.log('\\n📱 Active Tabs:');
    
    if (clientId) {
      // List tabs for specific client
      const client = this.connectedClients.get(clientId);
      if (!client) {
        console.log(`  Client '${clientId}' not found`);
        return;
      }
      
      const info = client.getInfo();
      console.log(`\\n  Client: ${info.baseClientId}`);
      console.log(`    📄 Tab ID: ${info.tabId || 'default'}`);
      console.log(`       Connected: ${info.connectedAt}`);
      console.log(`       Address: ${info.remoteAddress || 'unknown'}`);
    } else {
      // List tabs for all clients
      if (this.connectedClients.size === 0) {
        console.log('  No active tabs');
        return;
      }
      
      for (const [clientId, client] of this.connectedClients) {
        const info = client.getInfo();
        console.log(`\\n  📋 Client: ${info.baseClientId}`);
        console.log(`       📄 Tab ID: ${info.tabId || 'default'}`);
        console.log(`          Composite ID: ${info.id}`);
        console.log(`          Connected: ${info.connectedAt}`);
        console.log(`          Address: ${info.remoteAddress || 'unknown'}`);
      }
    }
    console.log('');
  }

  async runTabEvaluation(clientId, tabId, evaluationId) {
    const compositeClientId = `${clientId}:${tabId}`;
    console.log(`\\n🎯 Running evaluation '${evaluationId}' on tab '${tabId}' of client '${clientId}'...`);
    
    try {
      const client = this.connectedClients.get(compositeClientId);
      if (!client) {
        console.log(`❌ Tab '${tabId}' of client '${clientId}' is not connected`);
        return;
      }
      
      const evaluation = this.server.evaluationLoader.getEvaluationById(evaluationId);
      if (!evaluation) {
        console.log(`❌ Evaluation '${evaluationId}' not found`);
        return;
      }
      
      const result = await client.evaluate(evaluation);
      console.log(`✅ Evaluation '${evaluationId}' completed successfully on tab '${tabId}'`);
      console.log(`Result: ${JSON.stringify(result, null, 2)}`);
      
    } catch (error) {
      console.log(`❌ Tab evaluation failed: ${error.message}`);
    }
  }

  quit() {
    console.log('\\n👋 Shutting down...');
    this.server.stop();
    this.rl.close();
    process.exit(0);
  }
}