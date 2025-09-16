// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

import logger from './logger.js';
// No need to import EvaluationServer - it's passed as constructor parameter

class APIServer {
  constructor(evaluationServer, port = 8081) {
    this.evaluationServer = evaluationServer;
    this.port = port;
    this.server = null;
    this.configDefaults = null;
    this.loadConfigDefaults();
  }

  /**
   * Load default model configuration from config.yaml
   */
  loadConfigDefaults() {
    try {
      const configPath = path.resolve('./evals/config.yaml');
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        this.configDefaults = yaml.load(configContent);
        logger.info('Loaded config.yaml defaults:', this.configDefaults);
      } else {
        logger.warn('config.yaml not found, using hardcoded defaults');
        this.configDefaults = {
          model: {
            main_model: 'gpt-4.1',
            mini_model: 'gpt-4.1-mini',
            nano_model: 'gpt-4.1-nano',
            provider: 'openai'
          }
        };
      }
    } catch (error) {
      logger.error('Failed to load config.yaml:', error);
      this.configDefaults = {
        model: {
          main_model: 'gpt-4.1',
          mini_model: 'gpt-4.1-mini',
          nano_model: 'gpt-4.1-nano',
          provider: 'openai'
        }
      };
    }
  }

  start() {
    this.server = http.createServer((req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      this.handleRequest(req, res);
    });

    this.server.listen(this.port, () => {
      logger.info(`API server started on http://localhost:${this.port}`);
    });
  }

  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    try {
      // Get body for POST requests
      let body = '';
      if (method === 'POST') {
        for await (const chunk of req) {
          body += chunk;
        }
      }

      let result;

      // Handle dynamic client evaluations route
      if (pathname.startsWith('/clients/') && pathname.endsWith('/evaluations')) {
        const clientId = pathname.split('/')[2];
        result = this.getClientEvaluations(clientId);
      } else {
        switch (pathname) {
          case '/status':
            result = this.getStatus();
            break;

          case '/clients':
            result = this.getClients();
            break;

          case '/evaluate':
            if (method !== 'POST') {
              this.sendError(res, 405, 'Method not allowed');
              return;
            }
            result = await this.triggerEvaluation(JSON.parse(body));
            break;

          case '/v1/responses':
            if (method !== 'POST') {
              this.sendError(res, 405, 'Method not allowed');
              return;
            }
            result = await this.handleResponsesRequest(JSON.parse(body));
            break;

          default:
            this.sendError(res, 404, 'Not found');
            return;
        }
      }

      this.sendResponse(res, 200, result);

    } catch (error) {
      logger.error('API error:', error);
      this.sendError(res, 500, error.message);
    }
  }

  getStatus() {
    const status = this.evaluationServer.getStatus();
    const clients = this.evaluationServer.getClientManager().getAllClients();

    return {
      server: status,
      clients: clients.map(client => ({
        id: client.id,
        name: client.name,
        connected: this.evaluationServer.connectedClients.has(client.id),
        ready: this.evaluationServer.connectedClients.get(client.id)?.ready || false
      }))
    };
  }

  getClients() {
    const clients = this.evaluationServer.getClientManager().getAllClients();

    return clients.map(client => {
      const evaluations = this.evaluationServer.getClientManager().getClientEvaluations(client.id);
      const connection = this.evaluationServer.connectedClients.get(client.id);

      return {
        id: client.id,
        name: client.name,
        description: client.description,
        connected: !!connection,
        ready: connection?.ready || false,
        evaluations: evaluations.map(evaluation => ({
          id: evaluation.id,
          name: evaluation.name,
          tool: evaluation.tool,
          status: evaluation.status || 'pending',
          enabled: evaluation.enabled !== false
        }))
      };
    });
  }

  getClientEvaluations(clientId) {
    if (!clientId) {
      throw new Error('Client ID is required');
    }

    const evaluations = this.evaluationServer.getClientManager().getClientEvaluations(clientId);
    return {
      clientId,
      evaluations: evaluations.map(evaluation => ({
        id: evaluation.id,
        name: evaluation.name,
        description: evaluation.description,
        tool: evaluation.tool,
        status: evaluation.status || 'pending',
        enabled: evaluation.enabled !== false,
        lastRun: evaluation.lastRun,
        lastResult: evaluation.lastResult
      }))
    };
  }

  async triggerEvaluation(payload) {
    const { clientId, evaluationId, runAll = false } = payload;

    if (!clientId) {
      throw new Error('Client ID is required');
    }

    // Check if client is connected
    const connection = this.evaluationServer.connectedClients.get(clientId);
    if (!connection || !connection.ready) {
      throw new Error(`Client '${clientId}' is not connected or not ready`);
    }

    if (runAll) {
      // Run all evaluations for the client
      const evaluations = this.evaluationServer.getClientManager().getClientEvaluations(clientId);
      const results = [];

      for (const evaluation of evaluations) {
        try {
          this.evaluationServer.getClientManager().updateEvaluationStatus(clientId, evaluation.id, 'pending');
          await this.evaluationServer.executeEvaluation(connection, evaluation);
          results.push({ id: evaluation.id, status: 'completed' });
        } catch (error) {
          results.push({ id: evaluation.id, status: 'failed', error: error.message });
        }
      }

      return {
        clientId,
        type: 'batch',
        results
      };
    }
      // Run specific evaluation
      if (!evaluationId) {
        throw new Error('Evaluation ID is required when runAll is false');
      }

      const evaluation = this.evaluationServer.getClientManager().getClientEvaluations(clientId)
        .find(e => e.id === evaluationId);

      if (!evaluation) {
        throw new Error(`Evaluation '${evaluationId}' not found for client '${clientId}'`);
      }

      this.evaluationServer.getClientManager().updateEvaluationStatus(clientId, evaluationId, 'pending');
      await this.evaluationServer.executeEvaluation(connection, evaluation);

      return {
        clientId,
        evaluationId,
        type: 'single',
        status: 'completed'
      };

  }

  /**
   * Handle OpenAI Responses API compatible requests with nested model format
   */
  async handleResponsesRequest(requestBody) {
    try {
      // Validate required input field
      if (!requestBody.input || typeof requestBody.input !== 'string') {
        throw new Error('Missing or invalid "input" field. Expected a string.');
      }

      // Handle nested model configuration directly
      const nestedModelConfig = this.processNestedModelConfig(requestBody);

      logger.info('Processing responses request:', {
        input: requestBody.input,
        modelConfig: nestedModelConfig
      });

      // Find a connected and ready client
      const readyClient = this.findReadyClient();
      if (!readyClient) {
        throw new Error('No DevTools client is connected and ready. Please ensure a DevTools client is connected to the evaluation server.');
      }

      // Create a dynamic evaluation for this request
      const evaluation = this.createDynamicEvaluationNested(requestBody.input, nestedModelConfig);

      // Execute the evaluation on the DevTools client
      logger.info('Executing evaluation on DevTools client', {
        clientId: readyClient.clientId,
        evaluationId: evaluation.id
      });

      const result = await this.evaluationServer.executeEvaluation(readyClient, evaluation);

      // Debug: log the result structure
      logger.debug('executeEvaluation result:', result);

      // Extract the response text from the result
      const responseText = this.extractResponseText(result);

      // Format in OpenAI Responses API format
      return this.formatOpenAIResponse(responseText);

    } catch (error) {
      logger.error('Error handling responses request:', error);
      throw error;
    }
  }

  /**
   * Process nested model configuration from request body
   */
  processNestedModelConfig(requestBody) {
    const defaults = this.configDefaults?.model || {};

    // If nested format is provided, use it directly with fallbacks
    if (requestBody.model) {
      return {
        main_model: requestBody.model.main_model || this.createDefaultModelConfig('main', defaults),
        mini_model: requestBody.model.mini_model || this.createDefaultModelConfig('mini', defaults),
        nano_model: requestBody.model.nano_model || this.createDefaultModelConfig('nano', defaults)
      };
    }

    // Legacy flat format support - convert to nested
    if (requestBody.main_model || requestBody.provider || requestBody.api_key) {
      const legacyConfig = this.mergeModelConfig(requestBody);
      return this.convertFlatToNested(legacyConfig);
    }

    // No model config provided, use defaults
    return {
      main_model: this.createDefaultModelConfig('main', defaults),
      mini_model: this.createDefaultModelConfig('mini', defaults),
      nano_model: this.createDefaultModelConfig('nano', defaults)
    };
  }

  /**
   * Create default model configuration for a tier
   */
  createDefaultModelConfig(tier, defaults) {
    const defaultModels = {
      main: defaults.main_model || 'gpt-4',
      mini: defaults.mini_model || 'gpt-4-mini',
      nano: defaults.nano_model || 'gpt-3.5-turbo'
    };

    return {
      provider: defaults.provider || 'openai',
      model: defaultModels[tier],
      api_key: process.env.OPENAI_API_KEY
    };
  }

  /**
   * Convert flat model config to nested format (legacy support)
   */
  convertFlatToNested(flatConfig) {
    return {
      main_model: {
        provider: flatConfig.provider,
        model: flatConfig.main_model,
        api_key: flatConfig.api_key
      },
      mini_model: {
        provider: flatConfig.provider,
        model: flatConfig.mini_model,
        api_key: flatConfig.api_key
      },
      nano_model: {
        provider: flatConfig.provider,
        model: flatConfig.nano_model,
        api_key: flatConfig.api_key
      }
    };
  }

  /**
   * Merge request model parameters with config.yaml defaults (legacy)
   */
  mergeModelConfig(requestBody) {
    const defaults = this.configDefaults?.model || {};

    return {
      main_model: requestBody.main_model || defaults.main_model || 'gpt-4',
      mini_model: requestBody.mini_model || defaults.mini_model || 'gpt-4-mini',
      nano_model: requestBody.nano_model || defaults.nano_model || 'gpt-3.5-turbo',
      provider: requestBody.provider || defaults.provider || 'openai',
      api_key: requestBody.api_key || process.env.OPENAI_API_KEY
    };
  }

  /**
   * Find a connected and ready client
   */
  findReadyClient() {
    for (const [clientId, connection] of this.evaluationServer.connectedClients) {
      if (connection.ready) {
        return connection;
      }
    }
    return null;
  }

  /**
   * Create a dynamic evaluation object with nested model configuration
   */
  createDynamicEvaluationNested(input, nestedModelConfig) {
    const evaluationId = `api-eval-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return {
      id: evaluationId,
      name: 'API Request',
      description: 'Dynamic evaluation created from API request',
      enabled: true,
      tool: 'chat',
      timeout: 1500000, // 25 minutes
      input: {
        message: input
      },
      model: nestedModelConfig,
      validation: {
        type: 'none' // No validation needed for API responses
      },
      metadata: {
        tags: ['api', 'dynamic'],
        priority: 'high',
        source: 'api'
      }
    };
  }

  /**
   * Create a dynamic evaluation object for the API request (legacy)
   */
  createDynamicEvaluation(input, modelConfig) {
    const evaluationId = `api-eval-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Convert flat modelConfig to nested format
    const nestedModelConfig = {
      main_model: {
        provider: modelConfig.provider || 'openai',
        model: modelConfig.main_model || 'gpt-4',
        api_key: modelConfig.api_key
      },
      mini_model: {
        provider: modelConfig.provider || 'openai',
        model: modelConfig.mini_model || modelConfig.main_model || 'gpt-4-mini',
        api_key: modelConfig.api_key
      },
      nano_model: {
        provider: modelConfig.provider || 'openai',
        model: modelConfig.nano_model || modelConfig.mini_model || modelConfig.main_model || 'gpt-3.5-turbo',
        api_key: modelConfig.api_key
      }
    };

    return {
      id: evaluationId,
      name: 'API Request',
      description: 'Dynamic evaluation created from API request',
      enabled: true,
      tool: 'chat',
      timeout: 1500000, // 25 minutes
      input: {
        message: input
      },
      model: nestedModelConfig,
      validation: {
        type: 'none' // No validation needed for API responses
      },
      metadata: {
        tags: ['api', 'dynamic'],
        priority: 'high',
        source: 'api'
      }
    };
  }

  /**
   * Extract response text from evaluation result
   */
  extractResponseText(result) {
    if (!result) {
      return 'No response received from evaluation';
    }

    // Handle different result formats
    if (typeof result === 'string') {
      return result;
    }

    // Check for nested evaluation result structure
    if (result.output && result.output.response) {
      return result.output.response;
    }

    if (result.output && result.output.text) {
      return result.output.text;
    }

    if (result.output && result.output.answer) {
      return result.output.answer;
    }

    // Check top-level properties
    if (result.response) {
      return result.response;
    }

    if (result.text) {
      return result.text;
    }

    if (result.answer) {
      return result.answer;
    }

    // If result is an object, try to extract meaningful content
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }

    return 'Unable to extract response text from evaluation result';
  }

  /**
   * Format response in OpenAI Responses API format
   */
  formatOpenAIResponse(responseText) {
    const messageId = `msg_${uuidv4().replace(/-/g, '')}`;
    
    return [
      {
        id: messageId,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'output_text',
            text: responseText,
            annotations: []
          }
        ]
      }
    ];
  }

  sendResponse(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  sendError(res, statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }

  stop() {
    if (this.server) {
      this.server.close();
      logger.info('API server stopped');
    }
  }
}

export { APIServer };
