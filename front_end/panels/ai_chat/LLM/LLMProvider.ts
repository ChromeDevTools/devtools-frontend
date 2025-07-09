// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { LLMMessage, LLMResponse, LLMCallOptions, LLMProvider as LLMProviderType, ModelInfo } from './LLMTypes.js';

/**
 * Base interface that all LLM providers must implement
 */
export interface LLMProviderInterface {
  /** Provider name/type */
  readonly name: LLMProviderType;
  
  /**
   * Execute a chat completion request with messages
   */
  callWithMessages(
    modelName: string,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResponse>;
  
  /**
   * Simple call method for backward compatibility
   */
  call(
    modelName: string,
    prompt: string,
    systemPrompt: string,
    options?: LLMCallOptions
  ): Promise<LLMResponse>;
  
  /**
   * Get all models supported by this provider
   */
  getModels(): Promise<ModelInfo[]>;
  
  /**
   * Parse response into standardized action structure
   */
  parseResponse(response: LLMResponse): any;
  
  /**
   * Test connection to a specific model (optional)
   */
  testConnection?(modelId: string): Promise<{success: boolean, message: string}>;
  
  /**
   * Validate that required credentials are available for this provider
   * @returns Object with validation result and user-friendly message
   */
  validateCredentials(): {isValid: boolean, message: string, missingItems?: string[]};
  
  /**
   * Get the storage keys this provider uses for credentials
   * @returns Array of localStorage keys this provider needs
   */
  getCredentialStorageKeys(): {apiKey?: string, endpoint?: string, [key: string]: string | undefined};
}

/**
 * Abstract base class providing common functionality for providers
 */
export abstract class LLMBaseProvider implements LLMProviderInterface {
  abstract readonly name: LLMProviderType;
  
  constructor(protected config: any = {}) {}
  
  abstract callWithMessages(
    modelName: string,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResponse>;
  
  abstract call(
    modelName: string,
    prompt: string,
    systemPrompt: string,
    options?: LLMCallOptions
  ): Promise<LLMResponse>;
  
  abstract getModels(): Promise<ModelInfo[]>;
  
  abstract parseResponse(response: LLMResponse): any;
  
  abstract validateCredentials(): {isValid: boolean, message: string, missingItems?: string[]};
  
  abstract getCredentialStorageKeys(): {apiKey?: string, endpoint?: string, [key: string]: string | undefined};
  
  /**
   * Helper method to handle provider-specific errors
   */
  protected handleProviderError(error: any, context: string): Error {
    if (error instanceof Error) {
      return error;
    }
    
    // Handle fetch errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new Error(`Network error in ${context}: ${error.message}`);
    }
    
    // Handle HTTP errors
    if (error.status) {
      return new Error(`HTTP ${error.status} error in ${context}: ${error.message || 'Unknown error'}`);
    }
    
    return new Error(`Unknown error in ${context}: ${String(error)}`);
  }
}