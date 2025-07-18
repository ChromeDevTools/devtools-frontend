import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG, validateConfig } from './config.js';
import { RpcClient } from './rpc-client.js';
import { LLMEvaluator } from './evaluator.js';
import { logConnection, logEvaluation } from './logger.js';
import logger from './logger.js';
import { ClientManager } from './client-manager.js';
import { APIServer } from './api-server.js';

class EvaluationServer {
  constructor() {
    this.connectedClients = new Map();
    this.rpcClient = new RpcClient();
    this.evaluator = new LLMEvaluator();
    this.evaluationQueue = [];
    this.activeEvaluations = 0;
    this.clientManager = new ClientManager('./clients', './evals');
    this.apiServer = new APIServer(this);
  }

  start() {
    // Validate configuration
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
      logger.error('Configuration errors:', configErrors);
      process.exit(1);
    }

    // Create WebSocket server
    this.wss = new WebSocketServer({
      port: CONFIG.server.port,
      host: CONFIG.server.host
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
    });

    logger.info(`Evaluation server started on ws://${CONFIG.server.host}:${CONFIG.server.port}`);
    
    // Start API server
    this.apiServer.start();
    
    this.startEvaluationProcessor();
  }

  handleConnection(ws, request) {
    const connectionId = uuidv4(); // Temporary ID until registration
    const connection = {
      id: connectionId,
      ws,
      rpcClient: new RpcClient(),
      connectedAt: new Date().toISOString(),
      remoteAddress: request.socket.remoteAddress,
      registered: false,
      clientId: null
    };

    // Store temporarily with connection ID
    this.connectedClients.set(connectionId, connection);
    
    logConnection({
      event: 'connected',
      connectionId,
      remoteAddress: connection.remoteAddress,
      totalConnections: this.connectedClients.size
    });

    ws.on('message', (message) => {
      this.handleMessage(connection, message);
    });

    ws.on('close', () => {
      this.handleDisconnection(connection);
    });

    ws.on('error', (error) => {
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

  async handleMessage(connection, message) {
    try {
      // Parse message first
      const data = JSON.parse(message);
      
      // Try to handle as RPC response first
      if (data.jsonrpc === '2.0' && (data.result || data.error) && data.id) {
        if (connection.rpcClient.handleResponse(message)) {
          return;
        }
        // If RPC client couldn't handle it, log but don't treat as unknown
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
          // Don't automatically start evaluations - wait for manual trigger
          // this.processClientEvaluations(connection.clientId);
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
            type: data.type,
            messageKeys: Object.keys(data)
          });
      }
    } catch (error) {
      logger.warn('Failed to parse message', {
        connectionId: connection.id,
        error: error.message,
        messageLength: message.length
      });
    }
  }

  async handleRegistration(connection, data) {
    try {
      const { clientId, secretKey, capabilities } = data;
      
      logger.info('Registration attempt', { 
        clientId, 
        hasSecretKey: !!secretKey,
        secretKey: secretKey ? '[REDACTED]' : 'none'
      });
      
      // Check if client exists (don't validate secret key yet - that happens later)
      const validation = this.clientManager.validateClient(clientId, null, true);
      if (!validation.valid) {
        if (validation.reason === 'Client not found') {
          // Auto-create new client configuration
          try {
            logger.info('Auto-creating new client configuration', { clientId });
            await this.clientManager.createClientWithId(clientId, `DevTools Client ${clientId.substring(0, 8)}`, 'hello');
            
            // Send rejection for first-time registration to allow server to set secret key
            this.sendMessage(connection.ws, {
              type: 'registration_ack',
              clientId,
              status: 'rejected',
              reason: 'New client created. Please reconnect to complete registration.',
              newClient: true
            });
            logger.info('New client configuration created, requesting reconnection', { clientId });
            return;
          } catch (error) {
            this.sendMessage(connection.ws, {
              type: 'registration_ack',
              clientId,
              status: 'rejected',
              reason: `Failed to create client configuration: ${error.message}`
            });
            logger.error('Failed to auto-create client', { clientId, error: error.message });
            return;
          }
        } else {
          this.sendMessage(connection.ws, {
            type: 'registration_ack',
            clientId,
            status: 'rejected',
            reason: validation.reason
          });
          logger.warn('Client registration rejected', {
            clientId,
            reason: validation.reason
          });
          return;
        }
      }
      
      // Get client info including the server's secret key for this client
      const client = this.clientManager.getClient(clientId);
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
      
      // Store connection info but don't register yet
      connection.clientId = clientId;
      connection.capabilities = capabilities;
      connection.awaitingAuth = true;
      
      logger.info('Client registered successfully', {
        clientId,
        capabilities: capabilities?.tools?.join(', ')
      });
      
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
    
    // Update evaluation status in client manager
    this.clientManager.updateEvaluationStatus(
      connection.clientId,
      evaluationId,
      status
    );
  }

  handleAuthVerification(connection, data) {
    if (!connection.awaitingAuth) {
      logger.warn('Received auth verification from non-awaiting connection', {
        connectionId: connection.id,
        clientId: connection.clientId
      });
      return;
    }

    const { clientId, verified } = data;
    
    if (verified) {
      // Authentication successful - complete registration (skip secret validation since already verified)
      const result = this.clientManager.registerClient(clientId, '', connection.capabilities, true);
      
      connection.registered = true;
      connection.awaitingAuth = false;
      
      // Move connection to use clientId as key
      this.connectedClients.delete(connection.id);
      this.connectedClients.set(clientId, connection);
      
      // Send final acknowledgment
      this.sendMessage(connection.ws, {
        type: 'registration_ack',
        clientId,
        status: 'accepted',
        message: result.clientName ? `Welcome ${result.clientName}` : 'Client authenticated successfully',
        evaluationsCount: result.evaluationsCount
      });
      
      logger.info('Client authenticated and registered', { clientId });
    } else {
      // Authentication failed
      this.sendMessage(connection.ws, {
        type: 'registration_ack',
        clientId,
        status: 'rejected',
        reason: 'Secret key verification failed'
      });
      
      logger.warn('Client authentication failed', { clientId });
      connection.ws.close(1008, 'Authentication failed');
    }
  }

  handleDisconnection(connection) {
    connection.rpcClient.cleanup();
    
    // Remove by connection ID or client ID
    if (connection.registered && connection.clientId) {
      this.connectedClients.delete(connection.clientId);
    } else {
      this.connectedClients.delete(connection.id);
    }
    
    logConnection({
      event: 'disconnected',
      connectionId: connection.id,
      clientId: connection.clientId,
      totalConnections: this.connectedClients.size
    });
  }

  sendMessage(ws, data) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  async processClientEvaluations(clientId) {
    const client = this.connectedClients.get(clientId);
    if (!client || !client.ready) return;
    
    // Get next pending evaluation for this client
    const evaluation = this.clientManager.getNextEvaluation(clientId);
    if (!evaluation) {
      logger.info('No pending evaluations for client', { clientId });
      return;
    }
    
    // Execute the evaluation
    try {
      await this.executeEvaluation(client, evaluation);
      
      // Process next evaluation after a delay
      setTimeout(() => {
        this.processClientEvaluations(clientId);
      }, 1000);
    } catch (error) {
      logger.error('Failed to execute evaluation', {
        clientId,
        evaluationId: evaluation.id,
        error: error.message
      });
    }
  }

  async executeEvaluation(client, evaluation) {
    const startTime = Date.now();
    const rpcId = `rpc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      logger.info('Starting evaluation', { 
        clientId: client.clientId,
        evaluationId: evaluation.id,
        tool: evaluation.tool
      });
      
      // Update status to running
      this.clientManager.updateEvaluationStatus(
        client.clientId,
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
          timeout: evaluation.timeout || 30000,
          metadata: {
            tags: evaluation.metadata?.tags || [],
            retries: evaluation.settings?.retry_policy?.max_retries || 0
          }
        },
        id: rpcId
      };
      
      // Send RPC request with proper timeout
      const response = await client.rpcClient.callMethod(
        client.ws,
        'evaluate',
        rpcRequest.params,
        evaluation.timeout || 45000
      );
      
      logger.info('Evaluation response received', {
        clientId: client.clientId,
        evaluationId: evaluation.id,
        executionTime: response.executionTime
      });
      
      // Validate response based on YAML configuration
      let validationResult = null;
      if (evaluation.validation) {
        validationResult = await this.validateResponse(
          response,
          evaluation
        );
      }
      
      // Update evaluation status
      this.clientManager.updateEvaluationStatus(
        client.clientId,
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
        clientId: client.clientId,
        name: evaluation.name,
        tool: evaluation.tool,
        response,
        validation: validationResult,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
      
    } catch (error) {
      logger.error('Evaluation failed', {
        clientId: client.clientId,
        evaluationId: evaluation.id,
        error: error.message
      });
      
      // Update status to failed
      this.clientManager.updateEvaluationStatus(
        client.clientId,
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

  async validateResponse(response, evaluation) {
    const validation = evaluation.validation;
    
    if (validation.type === 'llm-judge' || validation.type === 'hybrid') {
      const llmConfig = validation.llm_judge || validation.llm_judge;
      
      // Prepare prompt with criteria
      const criteria = llmConfig.criteria || [];
      const task = `${evaluation.name} - ${evaluation.description || ''}`;
      
      // Use LLM evaluator
      const judgeResult = await this.evaluator.evaluate(
        task,
        JSON.stringify(response.output || response),
        {
          criteria,
          model: llmConfig.model
        }
      );
      
      return {
        type: 'llm-judge',
        result: judgeResult,
        passed: judgeResult.score >= 0.7 // Configurable threshold
      };
    }
    
    // Add other validation types as needed
    return null;
  }

  async evaluateAllClients(task) {
    const readyClients = Array.from(this.connectedClients.values())
      .filter(client => client.ready);

    if (readyClients.length === 0) {
      throw new Error('No ready clients available');
    }

    logger.info(`Starting evaluation for ${readyClients.length} clients`, { task });

    // If task looks like an evaluation ID, run that specific evaluation
    if (task && task.includes('-')) {
      const evaluationPromises = readyClients.map(async (client) => {
        try {
          // Find the specific evaluation by ID
          const evaluation = this.clientManager.getClientEvaluations(client.clientId)
            .find(e => e.id === task);
          
          if (!evaluation) {
            logger.warn(`Evaluation '${task}' not found for client ${client.clientId}`);
            return {
              error: `Evaluation '${task}' not found`,
              clientId: client.clientId
            };
          }

          // Reset evaluation status to pending
          this.clientManager.updateEvaluationStatus(client.clientId, evaluation.id, 'pending');
          
          // Execute the specific evaluation
          await this.executeEvaluation(client, evaluation);
          
          return {
            success: true,
            clientId: client.clientId,
            evaluationId: evaluation.id
          };
        } catch (error) {
          return {
            error: error.message,
            clientId: client.clientId
          };
        }
      });

      const results = await Promise.all(evaluationPromises);
      
      logger.info('Specific evaluation completed', {
        evaluationId: task,
        totalClients: readyClients.length,
        successfulEvaluations: results.filter(r => !r.error).length,
        failedEvaluations: results.filter(r => r.error).length
      });

      return results;
    }

    // Otherwise, process all pending evaluations (original behavior)
    const evaluationPromises = readyClients.map(client => 
      this.processClientEvaluations(client.clientId).catch(error => ({
        error: error.message,
        clientId: client.clientId
      }))
    );

    const results = await Promise.all(evaluationPromises);
    
    logger.info('Batch evaluation completed', {
      totalClients: readyClients.length,
      successfulEvaluations: results.filter(r => !r.error).length,
      failedEvaluations: results.filter(r => r.error).length
    });

    return results;
  }

  startEvaluationProcessor() {
    // This method can be extended to process evaluation queues
    // For now, it's a placeholder for future batch processing functionality
    logger.info('Evaluation processor started');
  }

  getStatus() {
    return {
      connectedClients: this.connectedClients.size,
      readyClients: Array.from(this.connectedClients.values())
        .filter(client => client.ready).length,
      activeEvaluations: this.activeEvaluations
    };
  }

  getClientManager() {
    return this.clientManager;
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      logger.info('Evaluation server stopped');
    }
    
    if (this.apiServer) {
      this.apiServer.stop();
    }
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new EvaluationServer();
  
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    server.stop();
    process.exit(0);
  });

  server.start();
}

export { EvaluationServer };