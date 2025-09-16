// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from './Logger.js';
import type { LLMProvider } from '../LLM/LLMTypes.js';

const logger = createLogger('LLMConfigurationManager');

/**
 * Configuration interface for LLM settings
 */
export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  endpoint?: string; // For LiteLLM
  mainModel: string;
  miniModel?: string;
  nanoModel?: string;
}

/**
 * Local storage keys for LLM configuration
 */
const STORAGE_KEYS = {
  PROVIDER: 'ai_chat_provider',
  MODEL_SELECTION: 'ai_chat_model_selection',
  MINI_MODEL: 'ai_chat_mini_model',
  NANO_MODEL: 'ai_chat_nano_model',
  OPENAI_API_KEY: 'ai_chat_api_key',
  LITELLM_ENDPOINT: 'ai_chat_litellm_endpoint',
  LITELLM_API_KEY: 'ai_chat_litellm_api_key',
  GROQ_API_KEY: 'ai_chat_groq_api_key',
  OPENROUTER_API_KEY: 'ai_chat_openrouter_api_key',
} as const;

/**
 * Centralized LLM configuration manager with override capabilities.
 * Supports both manual mode (localStorage-based) and automated mode (override-based).
 */
export class LLMConfigurationManager {
  private static instance: LLMConfigurationManager;
  private overrideConfig?: Partial<LLMConfig>; // Override for automated mode
  private changeListeners: Array<() => void> = [];

  private constructor() {
    // Listen for localStorage changes from other tabs (manual mode)
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): LLMConfigurationManager {
    if (!LLMConfigurationManager.instance) {
      LLMConfigurationManager.instance = new LLMConfigurationManager();
    }
    return LLMConfigurationManager.instance;
  }

  /**
   * Get the current provider with override fallback
   */
  getProvider(): LLMProvider {
    if (this.overrideConfig?.provider) {
      return this.overrideConfig.provider;
    }
    const stored = localStorage.getItem(STORAGE_KEYS.PROVIDER);
    return (stored as LLMProvider) || 'openai';
  }

  /**
   * Get the main model with override fallback
   */
  getMainModel(): string {
    if (this.overrideConfig?.mainModel) {
      return this.overrideConfig.mainModel;
    }
    return localStorage.getItem(STORAGE_KEYS.MODEL_SELECTION) || '';
  }

  /**
   * Get the mini model with override fallback
   */
  getMiniModel(): string {
    if (this.overrideConfig?.miniModel) {
      return this.overrideConfig.miniModel;
    }
    return localStorage.getItem(STORAGE_KEYS.MINI_MODEL) || '';
  }

  /**
   * Get the nano model with override fallback
   */
  getNanoModel(): string {
    if (this.overrideConfig?.nanoModel) {
      return this.overrideConfig.nanoModel;
    }
    return localStorage.getItem(STORAGE_KEYS.NANO_MODEL) || '';
  }

  /**
   * Get the API key for the current provider with override fallback
   */
  getApiKey(): string {
    if (this.overrideConfig?.apiKey) {
      return this.overrideConfig.apiKey;
    }

    const provider = this.getProvider();
    switch (provider) {
      case 'openai':
        return localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY) || '';
      case 'litellm':
        return localStorage.getItem(STORAGE_KEYS.LITELLM_API_KEY) || '';
      case 'groq':
        return localStorage.getItem(STORAGE_KEYS.GROQ_API_KEY) || '';
      case 'openrouter':
        return localStorage.getItem(STORAGE_KEYS.OPENROUTER_API_KEY) || '';
      default:
        return '';
    }
  }

  /**
   * Get the endpoint (primarily for LiteLLM) with override fallback
   */
  getEndpoint(): string | undefined {
    if (this.overrideConfig?.endpoint) {
      return this.overrideConfig.endpoint;
    }

    const provider = this.getProvider();
    if (provider === 'litellm') {
      return localStorage.getItem(STORAGE_KEYS.LITELLM_ENDPOINT) || undefined;
    }
    return undefined;
  }

  /**
   * Get the complete current configuration
   */
  getConfiguration(): LLMConfig {
    return {
      provider: this.getProvider(),
      apiKey: this.getApiKey(),
      endpoint: this.getEndpoint(),
      mainModel: this.getMainModel(),
      miniModel: this.getMiniModel(),
      nanoModel: this.getNanoModel(),
    };
  }

  /**
   * Set override configuration (for automated mode per-request overrides)
   */
  setOverride(config: Partial<LLMConfig>): void {
    logger.info('Setting configuration override', {
      provider: config.provider,
      mainModel: config.mainModel,
      hasApiKey: !!config.apiKey,
      hasEndpoint: !!config.endpoint
    });

    this.overrideConfig = { ...config };
    this.notifyListeners();
  }

  /**
   * Clear override configuration
   */
  clearOverride(): void {
    if (this.overrideConfig) {
      logger.info('Clearing configuration override');
      this.overrideConfig = undefined;
      this.notifyListeners();
    }
  }

  /**
   * Check if override is currently active
   */
  hasOverride(): boolean {
    return !!this.overrideConfig;
  }

  /**
   * Save configuration to localStorage (for manual mode and persistent automated mode)
   */
  saveConfiguration(config: LLMConfig): void {
    logger.info('Saving configuration to localStorage', {
      provider: config.provider,
      mainModel: config.mainModel,
      hasApiKey: !!config.apiKey,
      hasEndpoint: !!config.endpoint
    });

    // Save provider
    localStorage.setItem(STORAGE_KEYS.PROVIDER, config.provider);

    // Save models
    localStorage.setItem(STORAGE_KEYS.MODEL_SELECTION, config.mainModel);
    if (config.miniModel) {
      localStorage.setItem(STORAGE_KEYS.MINI_MODEL, config.miniModel);
    } else {
      localStorage.removeItem(STORAGE_KEYS.MINI_MODEL);
    }
    if (config.nanoModel) {
      localStorage.setItem(STORAGE_KEYS.NANO_MODEL, config.nanoModel);
    } else {
      localStorage.removeItem(STORAGE_KEYS.NANO_MODEL);
    }

    // Save provider-specific settings
    this.saveProviderSpecificSettings(config);

    // Notify listeners of configuration change
    this.notifyListeners();
  }

  /**
   * Load configuration from localStorage
   */
  loadConfiguration(): LLMConfig {
    return {
      provider: this.getProvider(),
      apiKey: this.getApiKey(),
      endpoint: this.getEndpoint(),
      mainModel: this.getMainModel(),
      miniModel: this.getMiniModel(),
      nanoModel: this.getNanoModel(),
    };
  }

  /**
   * Add a listener for configuration changes
   */
  addChangeListener(listener: () => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Remove a configuration change listener
   */
  removeChangeListener(listener: () => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index !== -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Validate the current configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const config = this.getConfiguration();
    const errors: string[] = [];

    // Check provider
    if (!config.provider) {
      errors.push('Provider is required');
    }

    // Check main model
    if (!config.mainModel) {
      errors.push('Main model is required');
    }

    // Provider-specific validation
    switch (config.provider) {
      case 'openai':
      case 'groq':
      case 'openrouter':
        if (!config.apiKey) {
          errors.push(`API key is required for ${config.provider}`);
        }
        break;
      case 'litellm':
        if (!config.endpoint) {
          errors.push('Endpoint is required for LiteLLM');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Save provider-specific settings to localStorage
   */
  private saveProviderSpecificSettings(config: LLMConfig): void {
    // Clear all provider-specific keys first
    localStorage.removeItem(STORAGE_KEYS.OPENAI_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.LITELLM_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.LITELLM_ENDPOINT);
    localStorage.removeItem(STORAGE_KEYS.GROQ_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.OPENROUTER_API_KEY);

    // Save current provider's settings
    switch (config.provider) {
      case 'openai':
        if (config.apiKey) {
          localStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, config.apiKey);
        }
        break;
      case 'litellm':
        if (config.endpoint) {
          localStorage.setItem(STORAGE_KEYS.LITELLM_ENDPOINT, config.endpoint);
        }
        if (config.apiKey) {
          localStorage.setItem(STORAGE_KEYS.LITELLM_API_KEY, config.apiKey);
        }
        break;
      case 'groq':
        if (config.apiKey) {
          localStorage.setItem(STORAGE_KEYS.GROQ_API_KEY, config.apiKey);
        }
        break;
      case 'openrouter':
        if (config.apiKey) {
          localStorage.setItem(STORAGE_KEYS.OPENROUTER_API_KEY, config.apiKey);
        }
        break;
    }
  }

  /**
   * Handle localStorage changes from other tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key && Object.values(STORAGE_KEYS).includes(event.key as any)) {
      logger.debug('Configuration changed in another tab', {
        key: event.key,
        newValue: event.newValue
      });
      this.notifyListeners();
    }
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners(): void {
    this.changeListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        logger.error('Error in configuration change listener:', error);
      }
    });
  }

  /**
   * Get debug information about current configuration state
   */
  getDebugInfo(): Record<string, any> {
    return {
      hasOverride: this.hasOverride(),
      overrideConfig: this.overrideConfig,
      currentConfig: this.getConfiguration(),
      validation: this.validateConfiguration(),
      listenerCount: this.changeListeners.length,
    };
  }
}