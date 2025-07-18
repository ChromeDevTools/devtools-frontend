import http from 'http';
import url from 'url';
import { EvaluationServer } from './server.js';
import logger from './logger.js';

class APIServer {
  constructor(evaluationServer, port = 8081) {
    this.evaluationServer = evaluationServer;
    this.port = port;
    this.server = null;
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
    const path = parsedUrl.pathname;
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
      
      switch (path) {
        case '/status':
          result = this.getStatus();
          break;
        
        case '/clients':
          result = this.getClients();
          break;
        
        case '/clients/:id/evaluations':
          const clientId = parsedUrl.query.id;
          result = this.getClientEvaluations(clientId);
          break;
        
        case '/evaluate':
          if (method !== 'POST') {
            this.sendError(res, 405, 'Method not allowed');
            return;
          }
          result = await this.triggerEvaluation(JSON.parse(body));
          break;
        
        default:
          this.sendError(res, 404, 'Not found');
          return;
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
    } else {
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