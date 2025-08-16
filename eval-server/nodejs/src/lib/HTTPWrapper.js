// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { APIServer } from '../api-server.js';

/**
 * HTTPWrapper - Optional HTTP API wrapper for EvalServer
 * 
 * This provides an HTTP REST API on top of the core EvalServer,
 * following the same pattern as the CLI wrapper.
 * 
 * Example usage:
 * ```js
 * import { EvalServer } from './EvalServer.js';
 * import { HTTPWrapper } from './HTTPWrapper.js';
 * 
 * const evalServer = new EvalServer({ port: 8080 });
 * const httpWrapper = new HTTPWrapper(evalServer, { port: 8081 });
 * 
 * await evalServer.start();
 * await httpWrapper.start();
 * ```
 */
export class HTTPWrapper {
  constructor(evalServer, options = {}) {
    this.evalServer = evalServer;
    this.config = {
      port: options.port || 8081,
      host: options.host || 'localhost',
      ...options
    };
    
    this.apiServer = new APIServer(evalServer, this.config.port);
    this.isRunning = false;
  }

  /**
   * Start the HTTP API server
   */
  async start() {
    if (this.isRunning) {
      throw new Error('HTTP wrapper is already running');
    }

    if (!this.evalServer.isRunning) {
      throw new Error('EvalServer must be started before starting HTTP wrapper');
    }

    this.apiServer.start();
    this.isRunning = true;
    
    return this;
  }

  /**
   * Stop the HTTP API server
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.apiServer.stop();
    this.isRunning = false;
  }

  /**
   * Get the HTTP server port
   */
  getPort() {
    return this.config.port;
  }

  /**
   * Get the HTTP server host
   */
  getHost() {
    return this.config.host;
  }

  /**
   * Get running status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      host: this.config.host,
      port: this.config.port,
      url: `http://${this.config.host}:${this.config.port}`
    };
  }
}