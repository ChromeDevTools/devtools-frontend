// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from '../core/Logger.js';
import { WebSocketRPCClient } from './WebSocketRPCClient.js';
import { createAndConnectEvaluationAgent, getEvaluationAgent, disconnectEvaluationAgent } from '../evaluation/remote/EvaluationAgent.js';

const logger = createLogger('EvaluationConfig');

// Localized strings for evaluation configuration
// TODO: Move to proper i18n system when evaluation UI is added to SettingsDialog
const EvaluationStrings = {
  testingConnection: 'Testing connection...',
  connectionSuccessful: 'Connection successful',
  connectionFailed: 'Connection failed',
  unknownConnectionError: 'Unknown connection error',
  evaluationNotEnabled: 'Evaluation is not enabled',
  clientIdNotAvailable: 'Client ID not available',
};

export interface EvaluationConfiguration {
  enabled: boolean;
  endpoint: string;
  secretKey?: string;
  clientId?: string;
}

class EvaluationConfigStore {
  private static instance: EvaluationConfigStore;
  private config: EvaluationConfiguration = {
    enabled: false,
    endpoint: 'ws://localhost:8080',
    secretKey: '',
    clientId: ''
  };
  private rpcClient: WebSocketRPCClient | null = null;

  private constructor() {
    this.loadFromLocalStorage();
    this.ensureClientId();
  }

  static getInstance(): EvaluationConfigStore {
    if (!EvaluationConfigStore.instance) {
      EvaluationConfigStore.instance = new EvaluationConfigStore();
    }
    return EvaluationConfigStore.instance;
  }

  private loadFromLocalStorage(): void {
    try {
      const enabled = localStorage.getItem('ai_chat_evaluation_enabled') === 'true';
      const endpoint = localStorage.getItem('ai_chat_evaluation_endpoint') || 'ws://localhost:8080';
      const secretKey = localStorage.getItem('ai_chat_evaluation_secret_key') || '';
      const clientId = localStorage.getItem('ai_chat_evaluation_client_id') || '';

      this.config = {
        enabled,
        endpoint,
        secretKey,
        clientId
      };

      logger.info('Loaded evaluation config from localStorage');
    } catch (error) {
      logger.warn('Failed to load evaluation config from localStorage:', error);
    }
  }

  getConfig(): EvaluationConfiguration {
    return { ...this.config };
  }

  setConfig(newConfig: EvaluationConfiguration): void {
    // Preserve existing client ID if new config doesn't have one
    const preservedClientId = newConfig.clientId || this.config.clientId;
    
    this.config = { ...newConfig, clientId: preservedClientId };
    
    // Ensure we have a client ID (generate if needed)
    this.ensureClientId();
    
    logger.info('Evaluation configuration updated', {
      enabled: this.config.enabled,
      endpoint: this.config.endpoint,
      clientId: this.config.clientId
    });

    // Save to localStorage for persistence
    try {
      localStorage.setItem('ai_chat_evaluation_enabled', String(this.config.enabled));
      localStorage.setItem('ai_chat_evaluation_endpoint', this.config.endpoint);
      localStorage.setItem('ai_chat_evaluation_secret_key', this.config.secretKey || '');
      localStorage.setItem('ai_chat_evaluation_client_id', this.config.clientId || '');
    } catch (error) {
      logger.warn('Failed to save evaluation config to localStorage:', error);
    }

    // Disconnect existing client if configuration changed
    if (this.rpcClient) {
      this.rpcClient.disconnect();
      this.rpcClient = null;
    }
  }

  private ensureClientId(): void {
    if (!this.config.clientId) {
      // Generate a unique client ID for this installation
      const clientId = this.generateUUID();
      this.config.clientId = clientId;
      
      try {
        localStorage.setItem('ai_chat_evaluation_client_id', clientId);
        logger.info('Generated and saved new client ID:', clientId);
      } catch (error) {
        logger.warn('Failed to save client ID to localStorage:', error);
      }
    } else {
      logger.debug('Using existing client ID:', this.config.clientId);
    }
  }

  private generateUUID(): string {
    // Generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  async connect(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error(EvaluationStrings.evaluationNotEnabled);
    }

    // Ensure client ID exists
    this.ensureClientId();

    if (!this.config.clientId) {
      throw new Error(EvaluationStrings.clientIdNotAvailable);
    }

    // Check if already connected
    const existingAgent = getEvaluationAgent();
    if (existingAgent && existingAgent.isConnected()) {
      logger.info('Already connected to evaluation service');
      return;
    }

    // Create and connect evaluation agent
    await createAndConnectEvaluationAgent(
      this.config.clientId,
      this.config.endpoint,
      this.config.secretKey
    );

    logger.info('Connected to evaluation service with client ID:', this.config.clientId);
  }

  disconnect(): void {
    disconnectEvaluationAgent();
    logger.info('Disconnected from evaluation service');
  }

  getClientId(): string | undefined {
    return this.config.clientId;
  }

  isConnected(): boolean {
    const agent = getEvaluationAgent();
    return agent ? agent.isConnected() : false;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const client = new WebSocketRPCClient({
        endpoint: this.config.endpoint,
        secretKey: this.config.secretKey,
        connectionTimeout: 5000
      });

      await client.connect();
      
      // Try to make a ping call to test the connection
      try {
        await client.call('ping', {}, 5000);
      } catch (error) {
        // Ping might not be implemented, that's okay
        logger.debug('Ping method not available, connection still valid');
      }

      client.disconnect();
      return { success: true, message: EvaluationStrings.connectionSuccessful };
    } catch (error) {
      const message = error instanceof Error ? error.message : EvaluationStrings.unknownConnectionError;
      logger.error('Connection test failed:', error);
      return { success: false, message };
    }
  }
}

export function getEvaluationConfig(): EvaluationConfiguration {
  return EvaluationConfigStore.getInstance().getConfig();
}

export function setEvaluationConfig(config: EvaluationConfiguration): void {
  EvaluationConfigStore.getInstance().setConfig(config);
}

export function isEvaluationEnabled(): boolean {
  return EvaluationConfigStore.getInstance().isEnabled();
}

export async function connectToEvaluationService(): Promise<void> {
  return EvaluationConfigStore.getInstance().connect();
}

export function disconnectFromEvaluationService(): void {
  EvaluationConfigStore.getInstance().disconnect();
}

export function getEvaluationClientId(): string | undefined {
  return EvaluationConfigStore.getInstance().getClientId();
}

export function isEvaluationConnected(): boolean {
  return EvaluationConfigStore.getInstance().isConnected();
}

export async function testEvaluationConnection(): Promise<{ success: boolean; message: string }> {
  return EvaluationConfigStore.getInstance().testConnection();
}

// Expose configuration functions globally for console access
declare global {
  interface Window {
    getEvaluationConfig?: typeof getEvaluationConfig;
    setEvaluationConfig?: typeof setEvaluationConfig;
    isEvaluationEnabled?: typeof isEvaluationEnabled;
    connectToEvaluationService?: typeof connectToEvaluationService;
    disconnectFromEvaluationService?: typeof disconnectFromEvaluationService;
  }
}

// Make functions available globally in development
if (typeof window !== 'undefined') {
  window.getEvaluationConfig = getEvaluationConfig;
  window.setEvaluationConfig = setEvaluationConfig;
  window.isEvaluationEnabled = isEvaluationEnabled;
  window.connectToEvaluationService = connectToEvaluationService;
  window.disconnectFromEvaluationService = disconnectFromEvaluationService;
}