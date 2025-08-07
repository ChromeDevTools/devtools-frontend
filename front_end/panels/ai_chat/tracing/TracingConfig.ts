// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from '../core/Logger.js';
import { TracingProvider, NoOpTracingProvider, type TracingContext } from './TracingProvider.js';
import { LangfuseProvider } from './LangfuseProvider.js';

const logger = createLogger('TracingConfig');
const contextLogger = createLogger('TracingContextManager');

/**
 * Configuration for tracing
 */
export interface TracingConfiguration {
  provider: 'langfuse' | 'disabled';
  endpoint?: string;
  publicKey?: string;
  secretKey?: string;
}

/**
 * Global tracing configuration store that persists across navigations
 */
class TracingConfigStore {
  private static instance: TracingConfigStore;
  private config: TracingConfiguration = { provider: 'disabled' };

  private constructor() {
    // Try to load from localStorage first (for backwards compatibility)
    this.loadFromLocalStorage();
  }

  static getInstance(): TracingConfigStore {
    if (!TracingConfigStore.instance) {
      TracingConfigStore.instance = new TracingConfigStore();
    }
    return TracingConfigStore.instance;
  }

  private loadFromLocalStorage(): void {
    try {
      const enabled = localStorage.getItem('ai_chat_langfuse_enabled') === 'true';
      
      if (enabled) {
        const endpoint = localStorage.getItem('ai_chat_langfuse_endpoint');
        const publicKey = localStorage.getItem('ai_chat_langfuse_public_key');
        const secretKey = localStorage.getItem('ai_chat_langfuse_secret_key');

        if (endpoint && publicKey && secretKey) {
          this.config = {
            provider: 'langfuse',
            endpoint,
            publicKey,
            secretKey
          };
          logger.info('Loaded tracing config from localStorage');
        }
      }
    } catch (error) {
      logger.warn('Failed to load tracing config from localStorage:', error);
    }
  }

  getConfig(): TracingConfiguration {
    return { ...this.config };
  }

  setConfig(newConfig: TracingConfiguration): void {
    this.config = { ...newConfig };
    logger.info('Tracing configuration updated', {
      provider: newConfig.provider,
      endpoint: newConfig.endpoint
    });

    // Also save to localStorage for persistence across DevTools sessions
    try {
      if (newConfig.provider === 'langfuse' && newConfig.endpoint && newConfig.publicKey && newConfig.secretKey) {
        localStorage.setItem('ai_chat_langfuse_enabled', 'true');
        localStorage.setItem('ai_chat_langfuse_endpoint', newConfig.endpoint);
        localStorage.setItem('ai_chat_langfuse_public_key', newConfig.publicKey);
        localStorage.setItem('ai_chat_langfuse_secret_key', newConfig.secretKey);
      } else {
        localStorage.setItem('ai_chat_langfuse_enabled', 'false');
      }
    } catch (error) {
      logger.warn('Failed to save tracing config to localStorage:', error);
    }

    // Refresh the AgentService tracing provider
    this.refreshAgentServiceTracing();
  }

  private refreshAgentServiceTracing(): void {
    try {
      // Refresh the singleton TracingProvider
      refreshTracingProvider().catch((error: Error) => {
        logger.error('Failed to refresh TracingProvider singleton:', error);
      });
      
      // Also refresh AgentService if available to maintain backward compatibility
      import('../core/AgentService.js').then(({ AgentService }) => {
        const agentService = AgentService.getInstance();
        if (agentService && typeof agentService.refreshTracingProvider === 'function') {
          agentService.refreshTracingProvider().catch((error: Error) => {
            logger.error('Failed to refresh AgentService tracing provider:', error);
          });
        }
      }).catch((error: Error) => {
        logger.warn('Could not refresh AgentService tracing provider:', error);
      });
    } catch (error) {
      logger.warn('Failed to refresh tracing providers:', error);
    }
  }

  isEnabled(): boolean {
    return this.config.provider !== 'disabled' && 
           !!this.config.publicKey && 
           !!this.config.secretKey;
  }
}

/**
 * Get tracing configuration from the persistent store
 */
export function getTracingConfig(): TracingConfiguration {
  return TracingConfigStore.getInstance().getConfig();
}

/**
 * Update tracing configuration
 */
export function setTracingConfig(config: TracingConfiguration): void {
  TracingConfigStore.getInstance().setConfig(config);
}

/**
 * Check if tracing is enabled
 */
export function isTracingEnabled(): boolean {
  return TracingConfigStore.getInstance().isEnabled();
}

/**
 * Singleton manager for TracingProvider instances
 */
class TracingProviderSingleton {
  private static instance: TracingProvider | null = null;

  static getInstance(): TracingProvider {
    if (!TracingProviderSingleton.instance) {
      TracingProviderSingleton.instance = this.createProvider();
      logger.info('Created new TracingProvider singleton instance');
    }
    return TracingProviderSingleton.instance;
  }

  static async refresh(): Promise<void> {
    logger.info('Refreshing TracingProvider singleton instance');
    
    // Cleanup old instance
    if (this.instance) {
      if (typeof (this.instance as any).destroy === 'function') {
        (this.instance as any).destroy();
        logger.debug('Destroyed previous TracingProvider instance');
      }
    }

    // Create new instance
    this.instance = this.createProvider();
    
    // Initialize if it has an initialize method
    if (typeof (this.instance as any).initialize === 'function') {
      await (this.instance as any).initialize();
      logger.debug('Initialized new TracingProvider instance');
    }
  }

  private static createProvider(): TracingProvider {
    const config = getTracingConfig();

    if (config.provider === 'disabled') {
      logger.info('Tracing is disabled - creating NoOpTracingProvider');
      return new NoOpTracingProvider();
    }

    if (config.provider === 'langfuse') {
      if (!config.publicKey || !config.secretKey) {
        logger.warn('Langfuse tracing enabled but missing credentials, falling back to no-op');
        return new NoOpTracingProvider();
      }

      logger.info('Creating LangfuseProvider singleton', {
        endpoint: config.endpoint,
        hasPublicKey: !!config.publicKey,
        hasSecretKey: !!config.secretKey
      });

      return new LangfuseProvider(
        config.endpoint!,
        config.publicKey,
        config.secretKey,
        true
      );
    }

    // Default to no-op
    logger.warn('Unknown tracing provider, falling back to no-op', { provider: config.provider });
    return new NoOpTracingProvider();
  }

  static reset(): void {
    if (this.instance && typeof (this.instance as any).destroy === 'function') {
      (this.instance as any).destroy();
    }
    this.instance = null;
    logger.info('Reset TracingProvider singleton');
  }
}

/**
 * Create a tracing provider based on current configuration (singleton)
 */
export function createTracingProvider(): TracingProvider {
  return TracingProviderSingleton.getInstance();
}

/**
 * Refresh the singleton tracing provider (useful when configuration changes)
 */
export async function refreshTracingProvider(): Promise<void> {
  await TracingProviderSingleton.refresh();
}

/**
 * Thread-local tracing context for passing context to nested tool executions
 */
class TracingContextManager {
  private static instance: TracingContextManager;
  private currentContext: TracingContext | null = null;

  private constructor() {}

  static getInstance(): TracingContextManager {
    if (!TracingContextManager.instance) {
      TracingContextManager.instance = new TracingContextManager();
    }
    return TracingContextManager.instance;
  }

  setContext(context: TracingContext | null): void {
    this.currentContext = context;
  }

  getContext(): TracingContext | null {
    return this.currentContext;
  }

  clearContext(): void {
    this.currentContext = null;
  }

  /**
   * Execute a function with a specific tracing context
   */
  async withContext<T>(context: TracingContext | null, fn: () => Promise<T>): Promise<T> {
    const previousContext = this.currentContext;
    contextLogger.info('Setting tracing context:', { 
      hasContext: !!context, 
      traceId: context?.traceId,
      previousContext: !!previousContext 
    });
    console.log(`[HIERARCHICAL_TRACING] TracingContextManager: Setting tracing context:`, { 
      hasContext: !!context, 
      traceId: context?.traceId,
      currentAgentSpanId: context?.currentAgentSpanId,
      executionLevel: context?.executionLevel,
      agentName: context?.agentContext?.agentName,
      previousContext: !!previousContext 
    });
    this.setContext(context);
    try {
      return await fn();
    } finally {
      this.setContext(previousContext);
      contextLogger.info('Restored previous tracing context:', { hasPrevious: !!previousContext });
      console.log(`[HIERARCHICAL_TRACING] TracingContextManager: Restored previous tracing context:`, { 
        hasPrevious: !!previousContext,
        restoredExecutionLevel: previousContext?.executionLevel
      });
    }
  }
}

/**
 * Get the current tracing context
 */
export function getCurrentTracingContext(): TracingContext | null {
  return TracingContextManager.getInstance().getContext();
}

/**
 * Set the current tracing context
 */
export function setCurrentTracingContext(context: TracingContext | null): void {
  TracingContextManager.getInstance().setContext(context);
}

/**
 * Execute a function with a specific tracing context
 */
export async function withTracingContext<T>(context: TracingContext | null, fn: () => Promise<T>): Promise<T> {
  return TracingContextManager.getInstance().withContext(context, fn);
}

/**
 * Helper function for easy configuration via console
 */
export function configureLangfuseTracing(endpoint: string, publicKey: string, secretKey: string): void {
  setTracingConfig({
    provider: 'langfuse',
    endpoint,
    publicKey,
    secretKey
  });
  
  console.log('✅ Langfuse tracing configured successfully!');
  console.log('📊 Tracing will start with the next AI Chat interaction');
}

// Expose configuration function globally for console access
declare global {
  interface Window {
    configureLangfuseTracing?: typeof configureLangfuseTracing;
    getTracingConfig?: typeof getTracingConfig;
    setTracingConfig?: typeof setTracingConfig;
    isTracingEnabled?: typeof isTracingEnabled;
    refreshTracingProvider?: typeof refreshTracingProvider;
    resetTracingProvider?: () => void;
  }
}

// Make functions available globally in development
if (typeof window !== 'undefined') {
  window.configureLangfuseTracing = configureLangfuseTracing;
  window.getTracingConfig = getTracingConfig;
  window.setTracingConfig = setTracingConfig;
  window.isTracingEnabled = isTracingEnabled;
  window.refreshTracingProvider = refreshTracingProvider;
  window.resetTracingProvider = () => {
    // Add a convenience function to reset the singleton
    TracingProviderSingleton.reset();
  };
}