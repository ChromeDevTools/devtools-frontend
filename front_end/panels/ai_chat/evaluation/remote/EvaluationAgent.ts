// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { WebSocketRPCClient } from '../../common/WebSocketRPCClient.js';
import { getEvaluationConfig, getEvaluationClientId } from '../../common/EvaluationConfig.js';
import { ToolRegistry } from '../../agent_framework/ConfigurableAgentTool.js';
import { AgentService } from '../../core/AgentService.js';
import { createLogger } from '../../core/Logger.js';
import { createTracingProvider, withTracingContext, isTracingEnabled, getTracingConfig } from '../../tracing/TracingConfig.js';
import type { TracingProvider, TracingContext } from '../../tracing/TracingProvider.js';
import type { ChatMessage } from '../../ui/ChatView.js';
import { AIChatPanel } from '../../ui/AIChatPanel.js';
import {
  RegisterMessage,
  ReadyMessage,
  StatusMessage,
  WelcomeMessage,
  RegistrationAckMessage,
  AuthVerifyMessage,
  EvaluationRequest,
  EvaluationSuccessResponse,
  EvaluationErrorResponse,
  ErrorCodes,
  isWelcomeMessage,
  isRegistrationAckMessage,
  isEvaluationRequest,
  isPongMessage,
  createRegisterMessage,
  createReadyMessage,
  createAuthVerifyMessage,
  createStatusMessage,
  createSuccessResponse,
  createErrorResponse
} from './EvaluationProtocol.js';

const logger = createLogger('EvaluationAgent');

export interface EvaluationAgentOptions {
  clientId: string;
  endpoint: string;
  secretKey?: string;
}


export class EvaluationAgent {
  private client: WebSocketRPCClient | null = null;
  private clientId: string;
  private endpoint: string;
  private secretKey?: string;
  private registered = false;
  private ready = false;
  private activeEvaluations = new Map<string, any>();
  private heartbeatInterval: number | null = null;
  private authPromise: Promise<void> | null = null;
  private authResolve: ((value?: void) => void) | null = null;
  private authReject: ((reason?: any) => void) | null = null;
  private tracingProvider: TracingProvider;

  constructor(options: EvaluationAgentOptions) {
    this.clientId = options.clientId;
    this.endpoint = options.endpoint;
    this.secretKey = options.secretKey;
    this.tracingProvider = createTracingProvider();
    
    logger.info('EvaluationAgent created with tracing provider', {
      clientId: this.clientId,
      providerType: this.tracingProvider.constructor.name,
      tracingEnabled: isTracingEnabled(),
      tracingConfig: getTracingConfig()
    });
  }

  public async connect(): Promise<void> {
    if (this.client && this.client.isConnectionReady() && this.registered) {
      logger.warn('Already connected and authenticated');
      return;
    }

    logger.info('Connecting to evaluation server', {
      endpoint: this.endpoint,
      clientId: this.clientId
    });

    // Create authentication promise
    this.authPromise = new Promise((resolve, reject) => {
      this.authResolve = resolve;
      this.authReject = reject;
    });

    this.client = new WebSocketRPCClient({
      endpoint: this.endpoint,
      secretKey: this.secretKey,
      reconnectAttempts: 5,
      reconnectDelay: 2000
    });

    // Setup event handlers
    this.setupEventHandlers();

    // Connect to server
    await this.client.connect();
    
    // Wait for authentication to complete
    await this.authPromise;
  }

  public disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }

    this.registered = false;
    this.ready = false;
    this.activeEvaluations.clear();

    logger.info('Disconnected from evaluation server');
  }

  public isConnected(): boolean {
    return (this.client?.isConnectionReady() && this.registered) || false;
  }

  public isRegistered(): boolean {
    return this.registered;
  }

  public isReady(): boolean {
    return this.ready;
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connected', () => {
      logger.info('WebSocket connected, waiting for welcome message');
    });

    this.client.on('disconnected', () => {
      logger.info('WebSocket disconnected');
      this.registered = false;
      this.ready = false;
      this.stopHeartbeat();
    });

    this.client.on('message', (data: any) => {
      this.handleMessage(data);
    });

    this.client.on('error', (error: any) => {
      logger.error('WebSocket error:', typeof error === 'object' ? JSON.stringify(error) : error);
    });
  }

  private async handleMessage(message: any): Promise<void> {
    try {
      if (isWelcomeMessage(message)) {
        logger.info('Received welcome message from server', {
          serverId: message.serverId,
          version: message.version
        });
        await this.register();
      }
      else if (isRegistrationAckMessage(message)) {
        this.handleRegistrationAck(message);
      }
      else if (isEvaluationRequest(message)) {
        await this.handleEvaluationRequest(message);
      }
      else if (isPongMessage(message)) {
        logger.debug('Received pong');
      }
      else {
        logger.warn('Unknown message type:', message);
      }
    } catch (error) {
      logger.error('Error handling message:', error instanceof Error ? error.message : String(error));
    }
  }

  private async register(): Promise<void> {
    if (!this.client) return;

    const tools: string[] = [];
    
    const registerMessage = createRegisterMessage(
      this.clientId,
      {
        tools,
        maxConcurrency: 3,
        version: '1.0.0'
      }
      // Note: No secret key sent - server will send its key for client verification
    );

    logger.info('Registering with server', {
      clientId: this.clientId,
      tools: tools.join(', ')
    });

    this.client.send(registerMessage);
  }

  private handleRegistrationAck(message: RegistrationAckMessage): void {
    if (message.status === 'accepted') {
      logger.info('Registration accepted', {
        evaluationsCount: message.evaluationsCount
      });
      this.registered = true;
      this.sendReady();
      this.startHeartbeat();
      
      // Resolve auth promise - connection is complete
      if (this.authResolve) {
        this.authResolve();
        this.authResolve = null;
        this.authReject = null;
      }
    } else if (message.status === 'auth_required') {
      logger.info('Server requesting authentication verification');
      this.handleAuthRequest(message);
    } else {
      if (message.newClient) {
        logger.info('New client created, will retry connection', {
          reason: message.reason
        });
        // For new clients, the server created the config and asks to reconnect
        // We can attempt to reconnect after a short delay
        setTimeout(() => {
          if (this.client) {
            this.register();
          }
        }, 1000);
      } else {
        logger.error('Registration rejected', {
          reason: message.reason
        });
        
        // Reject auth promise - authentication failed
        if (this.authReject) {
          this.authReject(new Error(`Registration rejected: ${message.reason}`));
          this.authResolve = null;
          this.authReject = null;
        }
        
        this.disconnect();
      }
    }
  }

  private async handleAuthRequest(message: RegistrationAckMessage): Promise<void> {
    if (!message.serverSecretKey) {
      logger.error('Server did not provide secret key for verification');
      this.disconnect();
      return;
    }

    // Get the client's configured secret key from EvaluationConfig
    const config = getEvaluationConfig();
    const clientSecretKey = config.secretKey || '';

    // Verify if the server's secret key matches the client's configured key
    const verified = clientSecretKey === message.serverSecretKey;

    logger.info('Verifying secret key', { 
      hasClientKey: !!clientSecretKey,
      hasServerKey: !!message.serverSecretKey,
      verified 
    });

    // Send verification response
    const authMessage = createAuthVerifyMessage(message.clientId, verified);
    this.client?.send(authMessage);

    if (!verified) {
      logger.error('Secret key verification failed - keys do not match');
      // Reject auth promise immediately since we know auth will fail
      if (this.authReject) {
        this.authReject(new Error('Secret key verification failed - keys do not match'));
        this.authResolve = null;
        this.authReject = null;
      }
    }
  }

  private sendReady(): void {
    if (!this.client || !this.registered) return;

    const readyMessage = createReadyMessage();
    this.client.send(readyMessage);
    this.ready = true;

    logger.info('Sent ready signal to server');
  }

  private async handleEvaluationRequest(request: EvaluationRequest): Promise<void> {
    const { params, id } = request;
    const startTime = Date.now();

    logger.info('Received evaluation request', {
      evaluationId: params.evaluationId,
      tool: params.tool,
      url: params.url,
      isChat: params.tool === 'chat',
      modelOverride: params.input?.ai_chat_model,
      modelConfig: params.model
    });

    // Track active evaluation
    this.activeEvaluations.set(params.evaluationId, {
      startTime,
      tool: params.tool
    });

    // Create a trace for this evaluation
    const traceId = `eval-${params.evaluationId}-${Date.now()}`;
    const sessionId = `eval-session-${Date.now()}`;
    const tracingContext: TracingContext = { 
      traceId, 
      sessionId,
      parentObservationId: undefined 
    };
    
    try {
      // Initialize tracing provider if not already done
      await this.tracingProvider.initialize();
      
      // Create session for this evaluation
      await this.tracingProvider.createSession(sessionId, {
        type: 'evaluation',
        source: 'evaluation-server',
        evaluationId: params.evaluationId
      });
      
      // Create root trace for the evaluation
      await this.tracingProvider.createTrace(
        traceId,
        sessionId,
        `Evaluation: ${params.tool}`,
        params.input,
        {
          evaluationId: params.evaluationId,
          tool: params.tool,
          url: params.url,
          source: 'evaluation-server'
        },
        'evaluation-agent',
        ['evaluation', params.tool]
      );
      
      logger.info('Trace created successfully for evaluation', {
        traceId,
        sessionId,
        evaluationId: params.evaluationId
      });
    } catch (error) {
      logger.warn('Failed to create trace:', error);
    }

    try {
      // Send status update
      this.sendStatus(params.evaluationId, 'running', 0.1, 'Starting evaluation...');

      // Get the tool from registry (only for non-chat evaluations)
      let tool: any = null;
      if (params.tool !== 'chat') {
        tool = ToolRegistry.getRegisteredTool(params.tool);
        if (!tool) {
          throw new Error(`Tool not found: ${params.tool}`);
        }
      }

      // Navigate to URL if needed
      if (params.url) {
        this.sendStatus(params.evaluationId, 'running', 0.2, 'Navigating to URL...');
        
        try {
          // Use the correct navigate_url tool from registry
          const navigateUrlTool = ToolRegistry.getRegisteredTool('navigate_url');
          if (navigateUrlTool) {
            logger.info('Navigating to URL using navigate_url tool', { url: params.url });
            const navigationResult = await this.executeToolWithTimeout(
              navigateUrlTool,
              { 
                url: params.url,
                reasoning: `Navigate to ${params.url} for evaluation ${params.evaluationId}`
              },
              15000, // 15 second timeout for navigation
              tracingContext,
              'navigate_url'
            );
            logger.info('Navigation result', { navigationResult });
            this.sendStatus(params.evaluationId, 'running', 0.3, 'Navigation completed successfully');
          } else {
            // Fallback: try action_agent for navigation
            const actionTool = ToolRegistry.getRegisteredTool('action_agent');
            if (actionTool) {
              logger.info('Navigating to URL using action_agent fallback', { url: params.url });
              const navigationResult = await this.executeToolWithTimeout(
                actionTool,
                { 
                  task: `Navigate to ${params.url}`,
                  reasoning: 'Navigation required for evaluation'
                },
                15000, // 15 second timeout for navigation
                tracingContext,
                'action_agent'
              );
              logger.info('Action agent navigation result', { navigationResult });
              this.sendStatus(params.evaluationId, 'running', 0.3, 'Navigation completed via action agent');
            } else {
              logger.error('No navigation tools available in registry');
              this.sendStatus(params.evaluationId, 'running', 0.3, 'ERROR: No navigation tools available');
              throw new Error('Navigation failed: No navigation tools available');
            }
          }
        } catch (error) {
          logger.error('Navigation failed', { url: params.url, error: error instanceof Error ? error.message : error });
          this.sendStatus(params.evaluationId, 'running', 0.3, `Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'} - continuing with current page`);
          // Continue with evaluation even if navigation fails, but log the issue prominently
        }
      }

      // Check if this is a chat evaluation that needs AgentService
      let toolResult: any;
      
      if (params.tool === 'chat') {
        // Handle chat evaluations using AgentService
        this.sendStatus(params.evaluationId, 'running', 0.5, 'Processing chat request...');
        
        // Merge model configuration - prefer params.model over params.input model fields
        const mergedInput = {
          ...params.input,
          ...(params.model && {
            main_model: params.model.main_model,
            mini_model: params.model.mini_model,
            nano_model: params.model.nano_model,
            provider: params.model.provider
          })
        };
        
        toolResult = await this.executeChatEvaluation(
          mergedInput,
          params.timeout || 300000, // Default 5 minutes for chat
          tracingContext
        );
      } else {
        // Execute regular tool evaluation
        this.sendStatus(params.evaluationId, 'running', 0.5, `Executing ${params.tool}...`);
        
        toolResult = await this.executeToolWithTimeout(
          tool,
          params.input,
          params.timeout || 30000,
          tracingContext,
          params.tool
        );
      }

      const executionTime = Date.now() - startTime;

      // Send JSON-RPC success response
      const rpcResponse = createSuccessResponse(
        id,
        toolResult,
        executionTime,
        [{
          tool: params.tool,
          timestamp: new Date().toISOString(),
          duration: executionTime,
          status: 'success'
        }],
        {
          url: params.url,
          evaluationId: params.evaluationId
        }
      );

      if (this.client) {
        this.client.send(rpcResponse);
      }

      this.sendStatus(params.evaluationId, 'completed', 1.0, 'Evaluation completed successfully');

      // Update trace with success
      try {
        await this.tracingProvider.finalizeTrace(traceId, {
          output: toolResult,
          statusMessage: 'completed',
          metadata: {
            executionTime,
            evaluationId: params.evaluationId
          }
        });
      } catch (error) {
        logger.warn('Failed to update trace:', error);
      }

      logger.info('Evaluation completed successfully', {
        evaluationId: params.evaluationId,
        executionTime
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Evaluation failed: ${errorMessage} (evaluationId: ${params.evaluationId})`);

      // Send JSON-RPC error response
      const rpcResponse = createErrorResponse(
        id,
        ErrorCodes.TOOL_EXECUTION_ERROR,
        'Tool execution failed',
        {
          tool: params.tool,
          error: errorMessage,
          url: params.url,
          timestamp: new Date().toISOString()
        }
      );

      if (this.client) {
        this.client.send(rpcResponse);
      }

      this.sendStatus(params.evaluationId, 'failed', 1.0, errorMessage);

      // Update trace with error
      try {
        await this.tracingProvider.finalizeTrace(traceId, {
          error: errorMessage,
          statusMessage: 'failed',
          metadata: {
            executionTime,
            evaluationId: params.evaluationId
          }
        });
      } catch (updateError) {
        logger.warn('Failed to update trace with error:', updateError);
      }

    } finally {
      this.activeEvaluations.delete(params.evaluationId);
    }
  }

  private async executeToolWithTimeout(
    tool: any,
    input: any,
    timeout: number,
    tracingContext?: TracingContext,
    toolName?: string
  ): Promise<any> {
    const spanId = `tool-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();
    
    // Create tool execution span if tracing context is provided
    if (tracingContext) {
      try {
        await this.tracingProvider.createObservation({
          id: spanId,
          name: `Tool: ${toolName || 'unknown'}`,
          type: 'span',
          startTime,
          input,
          metadata: {
            tool: toolName,
            timeout
          }
        }, tracingContext.traceId);
      } catch (error) {
        logger.warn('Failed to create tool execution span:', error);
      }
    }
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // Update span with timeout error
        if (tracingContext) {
          this.tracingProvider.updateObservation(spanId, {
            endTime: new Date(),
            error: `Tool execution timeout after ${timeout}ms`
          }).catch(err => logger.warn('Failed to update span with timeout:', err));
        }
        reject(new Error(`Tool execution timeout after ${timeout}ms`));
      }, timeout);

      // Execute tool with tracing context if available
      const executePromise = tracingContext 
        ? withTracingContext(tracingContext, () => tool.execute(input))
        : tool.execute(input);
      
      executePromise
        .then((result: any) => {
          clearTimeout(timer);
          
          // Update span with success
          if (tracingContext) {
            this.tracingProvider.updateObservation(spanId, {
              endTime: new Date(),
              output: result
            }).catch(err => logger.warn('Failed to update span with result:', err));
          }
          
          resolve(result);
        })
        .catch((error: Error) => {
          clearTimeout(timer);
          
          // Update span with error
          if (tracingContext) {
            this.tracingProvider.updateObservation(spanId, {
              endTime: new Date(),
              error: error.message
            }).catch(err => logger.warn('Failed to update span with error:', err));
          }
          
          reject(error);
        });
    });
  }

  private sendStatus(
    evaluationId: string,
    status: 'running' | 'completed' | 'failed',
    progress?: number,
    message?: string
  ): void {
    if (!this.client || !this.ready) return;

    const statusMessage = createStatusMessage(
      evaluationId,
      status,
      progress,
      message
    );

    this.client.send(statusMessage);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.client && this.ready) {
        this.client.send({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public getActiveEvaluationsCount(): number {
    return this.activeEvaluations.size;
  }

  public getActiveEvaluations(): string[] {
    return Array.from(this.activeEvaluations.keys());
  }


  private async executeChatEvaluation(
    input: any,
    timeout: number,
    tracingContext?: TracingContext
  ): Promise<any> {
    // Validate input
    if (!input.message) {
      throw new Error('Chat evaluation requires input.message');
    }
    
    logger.info('Starting chat evaluation', {
      message: input.message,
      timeout,
      hasTracingContext: !!tracingContext
    });
    
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Chat evaluation timeout after ${timeout}ms`));
      }, timeout);

      let chatObservationId: string | undefined;

      try {
        // Get or create AgentService instance
        const agentService = AgentService.getInstance();
        
        // Use the current model from localStorage (no override)
        let modelName = localStorage.getItem('ai_chat_model_selection');
        if (!modelName) {
          // Default model
          modelName = 'gpt-4o';
        }
        
        logger.info('Initializing AgentService for chat evaluation', {
          modelName,
          hasApiKey: !!agentService.getApiKey(),
          isInitialized: agentService.isInitialized()
        });
        
        // Always reinitialize with the current model
        await agentService.initialize(agentService.getApiKey(), modelName);
        
        // Create a child observation for the chat execution
        if (tracingContext) {
          chatObservationId = `chat-exec-${Date.now()}`;
          try {
            await this.tracingProvider.createObservation({
              id: chatObservationId,
              name: 'Chat Execution',
              type: 'span',
              startTime: new Date(),
              input: { message: input.message, model: modelName },
              metadata: {
                evaluationType: 'chat'
              }
            }, tracingContext.traceId);
          } catch (error) {
            logger.warn('Failed to create chat execution observation:', error);
          }
        }
        
        // Send the message with the evaluation tracing context
        const finalMessage: ChatMessage = tracingContext 
          ? await withTracingContext(tracingContext, () => agentService.sendMessage(input.message))
          : await agentService.sendMessage(input.message);
        
        clearTimeout(timer);
        
        // Extract the response text from the final message
        let responseText = '';
        if ('answer' in finalMessage) {
          responseText = finalMessage.answer || '';
        } else if ('error' in finalMessage) {
          responseText = `Error: ${finalMessage.error}`;
        }
        
        // Update the chat execution observation with the result
        if (tracingContext && chatObservationId) {
          try {
            await this.tracingProvider.updateObservation(chatObservationId, {
              endTime: new Date(),
              output: { response: responseText, messageCount: agentService.getMessages().length }
            });
          } catch (error) {
            logger.warn('Failed to update chat execution observation:', error);
          }
        }
        
        // Build a response object similar to tool responses
        const result = {
          response: responseText,
          messages: agentService.getMessages(),
          modelUsed: modelName,
          timestamp: new Date().toISOString(),
          evaluationMetadata: {
            evaluationType: 'chat',
            actualModelUsed: modelName
          }
        };
        
        logger.info('Chat evaluation completed successfully', {
          responseLength: responseText.length,
          messageCount: result.messages.length,
          modelUsed: modelName,
          evaluationId: tracingContext?.traceId
        });
        
        resolve(result);
        
      } catch (error) {
        clearTimeout(timer);
        
        // Update the chat execution observation with the error
        if (tracingContext && chatObservationId) {
          try {
            await this.tracingProvider.updateObservation(chatObservationId, {
              endTime: new Date(),
              error: error instanceof Error ? error.message : String(error)
            });
          } catch (updateError) {
            logger.warn('Failed to update chat execution observation with error:', updateError);
          }
        }
        
        logger.error('Chat evaluation failed:', error);
        reject(error);
      }
    });
  }
}

