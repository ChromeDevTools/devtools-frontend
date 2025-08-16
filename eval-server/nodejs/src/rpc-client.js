import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from './config.js';
import { logRpcCall } from './logger.js';

export class RpcClient {
  constructor() {
    this.pendingRequests = new Map();
  }

  async callMethod(ws, method, params, timeout = CONFIG.rpc.timeout) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const request = {
        jsonrpc: '2.0',
        method,
        params,
        id
      };

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        logRpcCall({
          id,
          method,
          params,
          status: 'timeout',
          error: 'Request timeout'
        });
        reject(new Error(`RPC call timeout after ${timeout}ms`));
      }, timeout);

      // Store the request for correlation
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeoutId,
        method,
        params,
        timestamp: Date.now()
      });

      // Send the request
      try {
        ws.send(JSON.stringify(request));
        logRpcCall({
          id,
          method,
          params,
          status: 'sent'
        });
      } catch (error) {
        this.pendingRequests.delete(id);
        clearTimeout(timeoutId);
        logRpcCall({
          id,
          method,
          params,
          status: 'error',
          error: error.message
        });
        reject(error);
      }
    });
  }

  handleResponse(message) {
    try {
      const response = JSON.parse(message);
      
      // Check if it's a valid JSON-RPC response
      if (response.jsonrpc !== '2.0' || !response.id) {
        return false;
      }

      const pendingRequest = this.pendingRequests.get(response.id);
      if (!pendingRequest) {
        return false;
      }

      // Clean up
      this.pendingRequests.delete(response.id);
      clearTimeout(pendingRequest.timeoutId);

      // Handle response
      if (response.error) {
        logRpcCall({
          id: response.id,
          method: pendingRequest.method,
          params: pendingRequest.params,
          status: 'error',
          error: response.error,
          duration: Date.now() - pendingRequest.timestamp
        });
        pendingRequest.reject(new Error(response.error.message || 'RPC error'));
      } else {
        logRpcCall({
          id: response.id,
          method: pendingRequest.method,
          params: pendingRequest.params,
          status: 'success',
          result: response.result,
          duration: Date.now() - pendingRequest.timestamp
        });
        pendingRequest.resolve(response.result);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  cleanup() {
    // Cleanup any pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeoutId);
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }
}