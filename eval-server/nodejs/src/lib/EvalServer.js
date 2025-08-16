// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';

import { ClientManager } from '../client-manager.js';
import { CONFIG, validateConfig } from '../config.js';
import logger, { logConnection, logEvaluation } from '../logger.js';
import { RpcClient } from '../rpc-client.js';
import { EvaluationLoader } from './EvaluationLoader.js';

/**
 * EvalServer - A library for programmatically managing evaluation servers
 * 
 * Example usage:
 * ```js
 * const server = new EvalServer({
 *   authKey: 'your-secret-key',
 *   host: '127.0.0.1',
 *   port: 8080
 * });
 * 
 * server.onConnect(client => {
 *   console.log(`Client connected: ${client.id}`);
 *   
 *   client.evaluate({
 *     id: "test_eval",
 *     name: "Bloomberg Eval",
 *     description: "Test Eval for Bloomberg website",
 *     input: {
 *       objective: "Navigate to Bloomberg, summarize and return sentiment of the latest news."
 *     }
 *   }).then(response => {
 *     console.log('Evaluation response:', response);
 *   });
 * });
 * 
 * server.start();
 * ```
 */
export class EvalServer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Apply configuration options
    this.config = {
      host: options.host || CONFIG.server.host,
      port: options.port || CONFIG.server.port,
      authKey: options.authKey || null,
      clientsDir: options.clientsDir || './clients',
      evalsDir: options.evalsDir || './evals',
      ...options
    };
    
    // Internal state
    this.connectedClients = new Map();
    this.clientManager = new ClientManager(this.config.clientsDir, this.config.evalsDir);
    this.evaluationLoader = new EvaluationLoader(this.config.evalsDir);
    this.judge = null; // Judge is optional - can be set later
    this.wss = null;
    this.isRunning = false;
    
    // Bind methods
    this.handleConnection = this.handleConnection.bind(this);
  }

  /**
   * Start the evaluation server
   */
  async start() {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    // Validate configuration - only require LLM if judge is configured
    const configErrors = validateConfig(!!this.judge);
    if (configErrors.length > 0) {
      throw new Error(`Configuration errors: ${configErrors.join(', ')}`);
    }

    // Create WebSocket server
    this.wss = new WebSocketServer({
      port: this.config.port,
      host: this.config.host
    });

    this.wss.on('connection', this.handleConnection);
    this.wss.on('error', error => {
      logger.error('WebSocket server error', { error: error.message });
      this.emit('error', error);
    });

    this.isRunning = true;
    logger.info(`Evaluation server started on ws://${this.config.host}:${this.config.port}`);
    this.emit('started', { host: this.config.host, port: this.config.port });

    return this;
  }

  /**
   * Stop the evaluation server
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Close all client connections
    for (const [clientId, connection] of this.connectedClients) {
      connection.rpcClient.cleanup();
      if (connection.ws.readyState === connection.ws.OPEN) {
        connection.ws.close();
      }
    }
    this.connectedClients.clear();

    this.isRunning = false;
    logger.info('Evaluation server stopped');
    this.emit('stopped');
  }

  /**
   * Register a callback for when clients connect
   * @param {Function} callback - Called with a ClientProxy instance
   */
  onConnect(callback) {
    this.on('clientConnected', callback);
    return this;
  }

  /**
   * Register a callback for when clients disconnect
   * @param {Function} callback - Called with client info
   */
  onDisconnect(callback) {
    this.on('clientDisconnected', callback);
    return this;
  }

  /**
   * Set the judge for evaluations (optional)
   * @param {Judge} judge - Judge instance for evaluation validation
   */
  setJudge(judge) {
    // If server is already running, validate LLM config when setting judge
    if (this.isRunning) {
      const configErrors = validateConfig(true);
      if (configErrors.length > 0) {
        throw new Error(`Cannot set judge: ${configErrors.join(', ')}`);
      }
    }
    
    this.judge = judge;
    return this;
  }


  /**
   * Get current server status
   */
  getStatus() {
    const connections = Array.from(this.connectedClients.values());
    const readyClients = connections.filter(client => client.ready).length;
    const uniqueBaseClients = new Set(connections.map(c => c.baseClientId).filter(Boolean)).size;
    
    return {
      isRunning: this.isRunning,
      connectedClients: this.connectedClients.size,
      uniqueBaseClients: uniqueBaseClients,
      totalTabs: this.clientManager.getTotalTabCount(),
      readyClients: readyClients,
      host: this.config.host,
      port: this.config.port
    };
  }

  /**
   * Load evaluations from YAML files
   */
  async loadEvaluations(evalsDir = './evals') {
    return this.evaluationLoader.loadFromDirectory(evalsDir);
  }

  /**
   * Get all available evaluations
   */
  getEvaluations() {
    return this.evaluationLoader.getAllEvaluations();
  }

  /**
   * Handle new WebSocket connections
   */
  handleConnection(ws, request) {
    const connectionId = uuidv4();
    const connection = {
      id: connectionId,
      ws,
      rpcClient: new RpcClient(),
      connectedAt: new Date().toISOString(),
      remoteAddress: request.socket.remoteAddress,
      registered: false,
      clientId: null
    };

    this.connectedClients.set(connectionId, connection);

    logConnection({
      event: 'connected',
      connectionId,
      remoteAddress: connection.remoteAddress,
      totalConnections: this.connectedClients.size
    });

    ws.on('message', message => {
      this.handleMessage(connection, message);
    });

    ws.on('close', () => {
      this.handleDisconnection(connection);
    });

    ws.on('error', error => {
      logger.error('WebSocket connection error', {
        connectionId: connection.id,
        clientId: connection.clientId,
        error: error.message
      });
    });

    // Send welcome message
    this.sendMessage(ws, {
      type: 'welcome',
      serverId: 'server-001',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle incoming messages from clients
   */
  async handleMessage(connection, message) {
    try {
      const data = JSON.parse(message);

      // Handle RPC responses
      if (data.jsonrpc === '2.0' && (data.result || data.error) && data.id) {
        if (connection.rpcClient.handleResponse(message)) {
          return;
        }
        logger.debug('RPC response could not be handled', {
          connectionId: connection.id,
          clientId: connection.clientId,
          id: data.id
        });
        return;
      }

      // Handle other message types
      switch (data.type) {
        case 'register':
          await this.handleRegistration(connection, data);
          break;
        case 'ping':
          this.sendMessage(connection.ws, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;
        case 'ready':
          if (!connection.registered) {
            logger.warn('Received ready signal from unregistered client', {
              connectionId: connection.id
            });
            return;
          }
          connection.ready = true;
          logger.info('Client ready for evaluations', {
            clientId: connection.clientId
          });
          
          // Create client proxy and emit connection event
          const clientProxy = new ClientProxy(connection, this);
          this.emit('clientConnected', clientProxy);
          break;
        case 'status':
          this.handleStatusUpdate(connection, data);
          break;
        case 'auth_verify':
          this.handleAuthVerification(connection, data);
          break;
        default:
          logger.warn('Unknown message type', {
            connectionId: connection.id,
            clientId: connection.clientId,
            type: data.type
          });
      }
    } catch (error) {
      logger.warn('Failed to parse message', {
        connectionId: connection.id,
        error: error.message
      });
    }
  }

  /**
   * Handle client registration
   */
  async handleRegistration(connection, data) {
    try {
      const { clientId, secretKey, capabilities } = data;
      const { baseClientId, tabId, isComposite } = this.clientManager.parseCompositeClientId(clientId);

      logger.info('Registration attempt', {
        clientId,
        baseClientId,
        tabId: tabId || 'default',
        isComposite,
        hasSecretKey: !!secretKey
      });

      // Check if base client exists
      const validation = this.clientManager.validateClient(baseClientId, null, true);
      if (!validation.valid) {
        if (validation.reason === 'Client not found') {
          // Auto-create new client configuration
          try {
            logger.info('Auto-creating new client configuration', { baseClientId, clientId });
            await this.clientManager.createClientWithId(baseClientId, `DevTools Client ${baseClientId.substring(0, 8)}`, 'hello');

            this.sendMessage(connection.ws, {
              type: 'registration_ack',
              clientId,
              status: 'rejected',
              reason: 'New client created. Please reconnect to complete registration.',
              newClient: true
            });
            return;
          } catch (error) {
            this.sendMessage(connection.ws, {
              type: 'registration_ack',
              clientId,
              status: 'rejected',
              reason: `Failed to create client configuration: ${error.message}`
            });
            return;
          }
        } else {
          this.sendMessage(connection.ws, {
            type: 'registration_ack',
            clientId,
            status: 'rejected',
            reason: validation.reason
          });
          return;
        }
      }

      // Get client info
      const client = this.clientManager.getClient(baseClientId);
      if (!client) {
        this.sendMessage(connection.ws, {
          type: 'registration_ack',
          clientId,
          status: 'rejected',
          reason: 'Client configuration not found'
        });
        return;
      }

      // Send server's secret key to client for verification
      this.sendMessage(connection.ws, {
        type: 'registration_ack',
        clientId,
        status: 'auth_required',
        serverSecretKey: client.secretKey || '',
        message: 'Please verify secret key'
      });

      connection.clientId = clientId;
      connection.capabilities = capabilities;
      connection.awaitingAuth = true;

    } catch (error) {
      logger.error('Registration error', { error: error.message });
      this.sendMessage(connection.ws, {
        type: 'registration_ack',
        clientId: data.clientId,
        status: 'rejected',
        reason: error.message
      });
    }
  }

  /**
   * Handle auth verification
   */
  handleAuthVerification(connection, data) {
    if (!connection.awaitingAuth) {
      return;
    }

    const { clientId, verified } = data;

    if (verified) {
      const { baseClientId, tabId, isComposite } = this.clientManager.parseCompositeClientId(clientId);
      
      const result = this.clientManager.registerClient(baseClientId, '', connection.capabilities, true);

      connection.registered = true;
      connection.awaitingAuth = false;
      connection.compositeClientId = clientId;
      connection.baseClientId = baseClientId;
      connection.tabId = tabId;

      // Register tab with client manager
      this.clientManager.registerTab(clientId, connection, {
        remoteAddress: connection.remoteAddress,
        userAgent: connection.userAgent || 'unknown'
      });

      // Move connection to use composite clientId as key
      this.connectedClients.delete(connection.id);
      this.connectedClients.set(clientId, connection);

      this.sendMessage(connection.ws, {
        type: 'registration_ack',
        clientId,
        status: 'accepted',
        message: result.clientName ? `Welcome ${result.clientName}` : 'Client authenticated successfully',
        evaluationsCount: result.evaluationsCount,
        tabId: tabId,
        isComposite: isComposite
      });

      logger.info('Client authenticated and registered', { 
        clientId, 
        baseClientId, 
        tabId: tabId || 'default',
        isComposite 
      });
    } else {
      this.sendMessage(connection.ws, {
        type: 'registration_ack',
        clientId,
        status: 'rejected',
        reason: 'Secret key verification failed'
      });

      connection.ws.close(1008, 'Authentication failed');
    }
  }

  /**
   * Handle status updates
   */
  handleStatusUpdate(connection, data) {
    if (!connection.registered) return;

    const { evaluationId, status, progress, message } = data;

    logger.info('Evaluation status update', {
      clientId: connection.clientId,
      evaluationId,
      status,
      progress,
      message
    });

    this.clientManager.updateEvaluationStatus(
      connection.clientId,
      evaluationId,
      status
    );
  }

  /**
   * Handle client disconnection and cleanup stale tab references
   */
  handleDisconnection(connection) {
    connection.rpcClient.cleanup();

    // Clean up stale tab references
    if (connection.registered && connection.compositeClientId) {
      this.clientManager.unregisterTab(connection.compositeClientId);
      this.connectedClients.delete(connection.compositeClientId);
      
      // Additional cleanup: ensure tab is removed from activeTabs
      const { baseClientId } = this.clientManager.parseCompositeClientId(connection.compositeClientId);
      this.clientManager.cleanupStaleTab(baseClientId, connection.tabId);
    } else if (connection.clientId) {
      this.connectedClients.delete(connection.clientId);
    } else {
      this.connectedClients.delete(connection.id);
    }

    logConnection({
      event: 'disconnected',
      connectionId: connection.id,
      clientId: connection.compositeClientId || connection.clientId,
      baseClientId: connection.baseClientId,
      tabId: connection.tabId,
      totalConnections: this.connectedClients.size
    });

    this.emit('clientDisconnected', {
      clientId: connection.compositeClientId || connection.clientId,
      baseClientId: connection.baseClientId,
      tabId: connection.tabId
    });
  }

  /**
   * Send message to WebSocket client
   */
  sendMessage(ws, data) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        logger.error('Failed to send WebSocket message', {
          error: error.message,
          messageType: data.type
        });
      }
    } else {
      logger.warn('Cannot send message, WebSocket not open', { 
        readyState: ws.readyState,
        messageType: data.type
      });
    }
  }

  /**
   * Execute evaluation on a specific client
   */
  async executeEvaluation(connection, evaluation) {
    const startTime = Date.now();
    const rpcId = `rpc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      logger.info('Starting evaluation', {
        clientId: connection.clientId,
        evaluationId: evaluation.id,
        tool: evaluation.tool
      });

      // Update status to running
      this.clientManager.updateEvaluationStatus(
        connection.clientId,
        evaluation.id,
        'running'
      );

      // Prepare RPC request
      const rpcRequest = {
        jsonrpc: '2.0',
        method: 'evaluate',
        params: {
          evaluationId: evaluation.id,
          name: evaluation.name,
          url: evaluation.target?.url || evaluation.url,
          tool: evaluation.tool,
          input: evaluation.input,
          model: evaluation.model,
          timeout: evaluation.timeout || 30000,
          metadata: {
            tags: evaluation.metadata?.tags || [],
            retries: evaluation.settings?.retry_policy?.max_retries || 0
          }
        },
        id: rpcId
      };

      // Send RPC request
      const response = await connection.rpcClient.callMethod(
        connection.ws,
        'evaluate',
        rpcRequest.params,
        evaluation.timeout || 45000
      );

      // Validate response if needed and judge is available
      let validationResult = null;
      if (evaluation.validation && this.judge) {
        validationResult = await this.validateResponse(response, evaluation);
      }

      // Update evaluation status
      this.clientManager.updateEvaluationStatus(
        connection.clientId,
        evaluation.id,
        'completed',
        {
          response,
          validation: validationResult,
          duration: Date.now() - startTime
        }
      );

      // Log evaluation
      logEvaluation({
        evaluationId: evaluation.id,
        clientId: connection.clientId,
        name: evaluation.name,
        tool: evaluation.tool,
        response,
        validation: validationResult,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });

      return response;

    } catch (error) {
      logger.error('Evaluation failed', {
        clientId: connection.clientId,
        evaluationId: evaluation.id,
        error: error.message
      });

      this.clientManager.updateEvaluationStatus(
        connection.clientId,
        evaluation.id,
        'failed',
        {
          error: error.message,
          duration: Date.now() - startTime
        }
      );

      throw error;
    }
  }

  /**
   * Validate response using configured judge
   */
  async validateResponse(response, evaluation) {
    if (!this.judge) {
      logger.warn('Validation requested but no judge configured');
      return {
        type: 'no-judge',
        result: { message: 'No judge configured for validation' },
        passed: true // Assume passed if no judge
      };
    }

    const validation = evaluation.validation;

    if (validation.type === 'llm-judge' || validation.type === 'hybrid') {
      const llmConfig = validation.llm_judge || validation.llmJudge;
      const criteria = llmConfig?.criteria || [];
      const task = `${evaluation.name} - ${evaluation.description || ''}`;

      const judgeResult = await this.judge.evaluate(
        task,
        JSON.stringify(response.output || response),
        {
          criteria,
          model: llmConfig?.model
        }
      );

      return {
        type: 'llm-judge',
        result: judgeResult,
        passed: judgeResult.score >= 0.7
      };
    }

    return null;
  }
}

/**
 * ClientProxy - Provides a convenient interface for interacting with connected clients
 */
class ClientProxy {
  constructor(connection, server) {
    this.connection = connection;
    this.server = server;
    this.id = connection.compositeClientId || connection.clientId;
    this.tabId = connection.tabId;
    this.baseClientId = connection.baseClientId;
  }

  /**
   * Execute an evaluation on this client
   */
  async evaluate(evaluation) {
    // Ensure evaluation has required fields
    const fullEvaluation = {
      id: evaluation.id || `eval-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: evaluation.name || 'Dynamic Evaluation',
      description: evaluation.description || 'Programmatically created evaluation',
      enabled: true,
      tool: evaluation.tool || 'chat',
      timeout: evaluation.timeout || 45000,
      input: evaluation.input || {},
      model: evaluation.model || {},
      validation: evaluation.validation || { type: 'none' },
      metadata: evaluation.metadata || { tags: ['api', 'dynamic'] },
      ...evaluation
    };

    return this.server.executeEvaluation(this.connection, fullEvaluation);
  }

  /**
   * Get client information
   */
  getInfo() {
    return {
      id: this.id,
      tabId: this.tabId,
      baseClientId: this.baseClientId,
      connectedAt: this.connection.connectedAt,
      remoteAddress: this.connection.remoteAddress,
      capabilities: this.connection.capabilities
    };
  }

  /**
   * Send a custom message to the client
   */
  sendMessage(data) {
    this.server.sendMessage(this.connection.ws, data);
  }
}