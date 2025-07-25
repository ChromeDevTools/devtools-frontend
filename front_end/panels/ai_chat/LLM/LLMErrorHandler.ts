// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from '../core/Logger.js';
import type { 
  LLMErrorType, 
  RetryConfig, 
  ErrorRetryConfig, 
  ExtendedRetryConfig,
  RetryCallback 
} from './LLMTypes.js';
import { LLMErrorType as ErrorType } from './LLMTypes.js';

const logger = createLogger('LLMErrorHandler');

/**
 * Default retry configuration for all error types
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterMs: 500,
};

/**
 * Error-specific retry configurations (only for specific error types)
 * All other error types will use DEFAULT_RETRY_CONFIG
 */
const ERROR_SPECIFIC_RETRY_CONFIGS: ErrorRetryConfig = {
  [ErrorType.RATE_LIMIT_ERROR]: {
    maxRetries: 3,
    baseDelayMs: 60000, // 60 seconds for rate limits
    maxDelayMs: 300000, // Max 5 minutes
    backoffMultiplier: 1, // No exponential backoff for rate limits
    jitterMs: 5000, // Small jitter to avoid thundering herd
  },
  
  [ErrorType.NETWORK_ERROR]: {
    maxRetries: 3,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 1000,
  },
};

/**
 * Utility class for classifying errors that occur during LLM calls
 */
export class LLMErrorClassifier {
  /**
   * Classify an error based on its message and properties
   */
  static classifyError(error: Error): LLMErrorType {
    const message = error.message.toLowerCase();
    
    // JSON parsing errors
    if (message.includes('json parsing failed') || 
        message.includes('invalid json') || 
        message.includes('json parse') ||
        message.includes('unexpected token') ||
        message.includes('syntaxerror')) {
      return ErrorType.JSON_PARSE_ERROR;
    }
    
    // Rate limit detection
    if (message.includes('rate limit') || 
        message.includes('too many requests') ||
        message.includes('quota exceeded') ||
        message.includes('429') ||
        message.includes('rate_limit_exceeded')) {
      return ErrorType.RATE_LIMIT_ERROR;
    }
    
    // Network errors
    if (message.includes('fetch') || 
        message.includes('network') ||
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('enotfound') ||
        message.includes('aborted') ||
        message.includes('socket')) {
      return ErrorType.NETWORK_ERROR;
    }
    
    // Server errors (5xx)
    if (message.includes('internal server error') || 
        message.includes('502') || 
        message.includes('503') ||
        message.includes('504') ||
        message.includes('500') ||
        message.includes('server error') ||
        message.includes('service unavailable')) {
      return ErrorType.SERVER_ERROR;
    }
    
    // Authentication errors
    if (message.includes('unauthorized') || 
        message.includes('invalid api key') ||
        message.includes('authentication') ||
        message.includes('401') ||
        message.includes('forbidden') ||
        message.includes('403')) {
      return ErrorType.AUTH_ERROR;
    }
    
    // Quota/billing errors
    if (message.includes('insufficient quota') ||
        message.includes('billing') ||
        message.includes('usage limit') ||
        message.includes('quota_exceeded') ||
        message.includes('insufficient_quota')) {
      return ErrorType.QUOTA_ERROR;
    }
    
    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * Check if an error type should be retried
   */
  static shouldRetry(errorType: LLMErrorType): boolean {
    // Auth and quota errors should never be retried
    return errorType !== ErrorType.AUTH_ERROR && errorType !== ErrorType.QUOTA_ERROR;
  }

  /**
   * Get the retry configuration for a specific error type
   */
  static getRetryConfig(errorType: LLMErrorType, customConfig?: Partial<RetryConfig>): RetryConfig {
    // Start with default config
    let config = { ...DEFAULT_RETRY_CONFIG };
    
    // Apply error-specific config if available
    const errorSpecificConfig = ERROR_SPECIFIC_RETRY_CONFIGS[errorType];
    if (errorSpecificConfig) {
      config = { ...config, ...errorSpecificConfig };
    }
    
    // Apply custom overrides
    if (customConfig) {
      config = { ...config, ...customConfig };
    }
    
    return config;
  }
}

/**
 * Manages retry logic for LLM operations with exponential backoff and jitter
 */
export class LLMRetryManager {
  private config: ExtendedRetryConfig;
  private onRetry?: RetryCallback;

  constructor(config: ExtendedRetryConfig = {}) {
    this.config = {
      defaultConfig: DEFAULT_RETRY_CONFIG,
      enableLogging: true,
      ...config,
    };
    this.onRetry = config.onRetry;
  }

  /**
   * Creates a tracing observation for retry attempts and errors
   */
  private async createRetryTracingObservation(
    error: Error, 
    errorType: LLMErrorType, 
    attempt: number, 
    willRetry: boolean, 
    context?: string
  ): Promise<void> {
    try {
      const { getCurrentTracingContext, createTracingProvider } = await import('../tracing/TracingConfig.js');
      const tracingContext = getCurrentTracingContext();
      if (tracingContext) {
        const tracingProvider = createTracingProvider();
        await tracingProvider.createObservation({
          id: `error-retry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: willRetry ? `LLM Error - Retry Attempt ${attempt}` : `LLM Error - Final Failure`,
          type: 'event',
          startTime: new Date(),
          input: { 
            errorType,
            errorMessage: error.message,
            attempt,
            willRetry,
            context: context || 'unknown_operation'
          },
          error: willRetry ? undefined : error.message, // Only mark as error if not retrying
          metadata: {
            errorType,
            attempt,
            willRetry,
            retryable: LLMErrorClassifier.shouldRetry(errorType),
            operation: context
          }
        }, tracingContext.traceId);
      }
    } catch (tracingError) {
      // Don't fail the main operation due to tracing errors
      logger.debug('Failed to create retry tracing observation:', tracingError);
    }
  }

  /**
   * Execute an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      customRetryConfig?: Partial<RetryConfig>;
      context?: string;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error;
    let attempt = 1;

    while (true) {
      try {
        const result = await operation();
        
        if (attempt > 1 && this.config.enableLogging) {
          logger.info(`Operation succeeded on attempt ${attempt}`, {
            context: options.context,
            totalTime: Date.now() - startTime,
          });
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorType = LLMErrorClassifier.classifyError(lastError);
        
        if (this.config.enableLogging) {
          logger.error(`Operation failed on attempt ${attempt}:`, {
            error: lastError.message,
            errorType,
            context: options.context,
          });
        }

        // Check if we should retry this error type
        if (!LLMErrorClassifier.shouldRetry(errorType)) {
          if (this.config.enableLogging) {
            logger.info(`Not retrying ${errorType} error`);
          }
          
          // Create tracing observation for non-retryable error
          await this.createRetryTracingObservation(lastError, errorType, attempt, false, options.context);
          
          throw lastError;
        }

        // Get retry configuration
        const retryConfig = LLMErrorClassifier.getRetryConfig(errorType, options.customRetryConfig);
        
        // Check if we've exceeded max retries
        if (attempt > retryConfig.maxRetries) {
          if (this.config.enableLogging) {
            logger.error(`Max retries (${retryConfig.maxRetries}) exceeded for ${errorType}`);
          }
          
          // Create tracing observation for max retries exceeded
          await this.createRetryTracingObservation(lastError, errorType, attempt, false, options.context);
          
          throw lastError;
        }

        // Check total time limit
        if (this.config.maxTotalTimeMs && (Date.now() - startTime) >= this.config.maxTotalTimeMs) {
          if (this.config.enableLogging) {
            logger.error(`Total retry time limit (${this.config.maxTotalTimeMs}ms) exceeded`);
          }
          
          // Create tracing observation for timeout
          await this.createRetryTracingObservation(lastError, errorType, attempt, false, options.context);
          
          throw lastError;
        }

        // Calculate delay and wait
        const delayMs = this.calculateDelay(retryConfig, attempt);
        
        if (this.config.enableLogging) {
          logger.warn(`Retrying after ${delayMs}ms (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}) for ${errorType}`);
        }

        // Create tracing observation for retry attempt
        await this.createRetryTracingObservation(lastError, errorType, attempt, true, options.context);

        // Call retry callback if provided
        if (this.onRetry) {
          this.onRetry(attempt, lastError, errorType, delayMs);
        }
        
        if (delayMs > 0) {
          await this.sleep(delayMs);
        }
        
        attempt++;
      }
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(config: RetryConfig, attempt: number): number {
    const baseDelay = config.baseDelayMs;
    const multiplier = config.backoffMultiplier;
    const maxDelay = config.maxDelayMs;
    const jitter = config.jitterMs;
    
    // Calculate exponential backoff
    const exponentialDelay = baseDelay * Math.pow(multiplier, attempt - 1);
    
    // Apply max delay cap
    const cappedDelay = Math.min(exponentialDelay, maxDelay);
    
    // Add random jitter to avoid thundering herd problem
    const randomJitter = jitter > 0 ? Math.random() * jitter : 0;
    
    return Math.max(0, cappedDelay + randomJitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Static convenience method for simple retry scenarios
   */
  static async simpleRetry<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const manager = new LLMRetryManager();
    return manager.executeWithRetry(operation, { customRetryConfig: customConfig });
  }
}

/**
 * Static utility functions for common error handling scenarios
 */
export class LLMErrorUtils {
  /**
   * Check if an error is retryable
   */
  static isRetryable(error: Error): boolean {
    const errorType = LLMErrorClassifier.classifyError(error);
    return LLMErrorClassifier.shouldRetry(errorType);
  }

  /**
   * Get human-readable error message
   */
  static getErrorMessage(error: Error): string {
    const errorType = LLMErrorClassifier.classifyError(error);
    
    switch (errorType) {
      case ErrorType.RATE_LIMIT_ERROR:
        return 'Rate limit exceeded. Please wait before trying again.';
      case ErrorType.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection.';
      case ErrorType.AUTH_ERROR:
        return 'Authentication failed. Please check your API key.';
      case ErrorType.QUOTA_ERROR:
        return 'API quota exceeded. Please check your usage limits.';
      case ErrorType.SERVER_ERROR:
        return 'Server error. The service may be temporarily unavailable.';
      case ErrorType.JSON_PARSE_ERROR:
        return 'Failed to parse response. The AI response was not in the expected format.';
      default:
        return error.message || 'An unknown error occurred.';
    }
  }

  /**
   * Create enhanced error with additional context
   */
  static enhanceError(error: Error, context: { operation?: string; attempt?: number }): Error {
    const errorType = LLMErrorClassifier.classifyError(error);
    const enhancedMessage = `${context.operation || 'LLM operation'} failed with ${errorType}${context.attempt ? ` (attempt ${context.attempt})` : ''}: ${error.message}`;
    
    const enhancedError = new Error(enhancedMessage);
    (enhancedError as any).originalError = error;
    (enhancedError as any).errorType = errorType;
    (enhancedError as any).context = context;
    
    return enhancedError;
  }
}