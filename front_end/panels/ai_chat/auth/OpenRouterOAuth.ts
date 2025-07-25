// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { PKCEUtils, type PKCEChallenge } from './PKCEUtils.js';
import { createLogger } from '../core/Logger.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Platform from '../../../core/platform/platform.js';

const logger = createLogger('OpenRouterOAuth');

/**
 * OAuth configuration for OpenRouter
 */
interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
}


/**
 * OAuth token response from OpenRouter
 */
export interface OAuthTokenResponse {
  key: string;
  name?: string;
  created_at?: string;
}


/**
 * OAuth error types
 */
export enum OAuthError {
  USER_CANCELLED = 'user_cancelled',
  INVALID_STATE = 'invalid_state',
  NETWORK_ERROR = 'network_error',
  TOKEN_EXCHANGE_FAILED = 'token_exchange_failed',
  STORAGE_ERROR = 'storage_error',
  INVALID_RESPONSE = 'invalid_response',
  NAVIGATION_FAILED = 'navigation_failed',
  TIMEOUT = 'timeout',
  INVALID_REDIRECT_URI = 'invalid_redirect_uri',
  DUPLICATE_REQUEST = 'duplicate_request'
}

/**
 * Storage keys for OAuth data
 */
const OAUTH_STORAGE_KEYS = {
  CODE_VERIFIER: 'openrouter_oauth_code_verifier',
  STATE: 'openrouter_oauth_state',
  TOKEN: 'openrouter_oauth_token',
  AUTH_METHOD: 'openrouter_auth_method', // 'oauth' | 'api_key'
  USER_INFO: 'openrouter_oauth_user_info',
  ORIGINAL_URL: 'openrouter_oauth_original_url',
  ACTIVE_REQUEST: 'openrouter_oauth_active_request'
};


/**
 * OpenRouter OAuth service for PKCE authentication flow
 */
export class OpenRouterOAuth {
  private static readonly CONFIG: OAuthConfig = {
    authorizationUrl: 'https://openrouter.ai/auth',
    tokenUrl: 'https://openrouter.ai/api/v1/auth/keys',
    redirectUri: 'https://localhost:3000/callback'
  };

  // Track URL change listener for cleanup
  private static urlChangeListener: (() => void) | null = null;
  
  // Track active token exchange requests to prevent duplicates
  private static activeTokenExchange: Promise<OAuthTokenResponse> | null = null;
  
  /**
   * Check if we're in development mode using the Logger's detection
   */
  private static isDevelopment(): boolean {
    return location.hostname === 'localhost' || 
           location.hostname.includes('127.0.0.1') ||
           location.port === '8090' ||
           location.port === '8000';
  }

  
  /**
   * Validate that a URL matches our redirect URI
   */
  private static isValidRedirectUri(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.origin}${urlObj.pathname}`;
      return baseUrl === this.CONFIG.redirectUri;
    } catch {
      return false;
    }
  }

  /**
   * Get current page URL from DevTools target
   */
  private static getCurrentPageUrl(): string | null {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) return null;
    
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) return null;
    
    const frame = resourceTreeModel.mainFrame;
    return frame ? frame.url : null;
  }

  /**
   * Navigate to a URL using DevTools navigation API
   */
  private static async navigateToUrl(url: string): Promise<void> {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      throw this.createStandardError(OAuthError.NAVIGATION_FAILED, 'No page target available');
    }

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      throw this.createStandardError(OAuthError.NAVIGATION_FAILED, 'No ResourceTreeModel found');
    }

    const navigationResult = await resourceTreeModel.navigate(url as Platform.DevToolsPath.UrlString);
    
    if (navigationResult.errorText) {
      throw this.createStandardError(OAuthError.NAVIGATION_FAILED, `Navigation failed: ${navigationResult.errorText}`);
    }
  }

  /**
   * Store original URL to return to after OAuth
   */
  private static storeOriginalUrl(): void {
    const currentUrl = this.getCurrentPageUrl();
    if (currentUrl) {
      sessionStorage.setItem(OAUTH_STORAGE_KEYS.ORIGINAL_URL, currentUrl);
    }
  }

  /**
   * Return to original URL after OAuth completion
   */
  private static async returnToOriginalUrl(): Promise<void> {
    const originalUrl = sessionStorage.getItem(OAUTH_STORAGE_KEYS.ORIGINAL_URL);
    if (originalUrl) {
      await this.navigateToUrl(originalUrl);
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.ORIGINAL_URL);
    } else {
      // Fallback
      await this.navigateToUrl('chrome://new-tab-page');
    }
  }

  /**
   * Remove URL change listener
   */
  private static removeUrlListener(): void {
    if (this.urlChangeListener) {
      SDK.TargetManager.TargetManager.instance().removeEventListener(
        SDK.TargetManager.Events.INSPECTED_URL_CHANGED,
        this.urlChangeListener
      );
      this.urlChangeListener = null;
    }
  }

  /**
   * Start the OAuth authentication flow via tab navigation
   */
  static async startAuthFlow(): Promise<void> {
    try {
      if (this.isDevelopment()) {
        logger.info('Starting OpenRouter OAuth flow via tab navigation');
      }
      
      // Generate PKCE challenge
      const challenge = await PKCEUtils.createPKCEChallenge();
      
      // Store PKCE data and original URL for later verification
      await this.storePKCEData(challenge);
      this.storeOriginalUrl();
      
      // Build authorization URL
      const authUrl = this.buildAuthorizationUrl(challenge);
      
      // Set up URL monitoring before navigation
      const urlMonitorPromise = this.monitorUrlForCallback();
      
      // Navigate to OAuth URL
      await this.navigateToUrl(authUrl);
      
      // Wait for OAuth completion
      await urlMonitorPromise;
      
    } catch (error) {
      if (this.isDevelopment()) {
        logger.error('Failed to start OAuth flow:', error);
      }
      this.cleanupOAuthFlow();
      throw this.createStandardError(OAuthError.NAVIGATION_FAILED, error);
    }
  }

  /**
   * Monitor URL changes for OAuth callback using both target changes and URL changes
   */
  private static monitorUrlForCallback(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeUrlListener();
        reject(new Error(OAuthError.TIMEOUT));
      }, 300000); // 5 minute timeout

      
      // Check if callback URL is detected in any target
      const checkForCallback = async (url: string) => {
        if (url && this.isValidRedirectUri(url)) {
          if (this.isDevelopment()) {
            logger.info('OAuth callback URL detected:', url);
          } else {
            logger.info('OAuth callback URL detected');
          }
          
          // Remove listener and clear timeout
          this.removeUrlListener();
          clearTimeout(timeout);
          
          // Process the callback
          await this.handleCallbackFromUrl(url);
          
          // Navigate back to original location
          await this.returnToOriginalUrl();
          
          resolve();
          return true;
        }
        return false;
      };

      // Listener for new targets (tabs/windows/popups)
      const targetsChangeListener = async (event: any) => {
        try {
          const targetInfos = event.data as Array<any>;
          
          if (this.isDevelopment()) {
            logger.debug('Available targets changed, checking for OAuth callback...');
          }
          
          // Check all targets for callback URL
          for (const targetInfo of targetInfos) {
            if (targetInfo.url && await checkForCallback(targetInfo.url)) {
              return; // Callback found and processed
            }
          }
        } catch (error) {
          if (this.isDevelopment()) {
            logger.error('Error in targets change listener:', error);
          }
        }
      };

      // Listener for URL changes in existing tabs
      const urlChangeListener = async () => {
        try {
          const currentUrl = this.getCurrentPageUrl();
          if (currentUrl) {
            await checkForCallback(currentUrl);
          }
        } catch (error) {
          this.removeUrlListener();
          clearTimeout(timeout);
          reject(error);
        }
      };

      // Store listener reference for cleanup
      this.urlChangeListener = () => {
        // Remove both listeners
        SDK.TargetManager.TargetManager.instance().removeEventListener(
          SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED,
          targetsChangeListener
        );
        SDK.TargetManager.TargetManager.instance().removeEventListener(
          SDK.TargetManager.Events.INSPECTED_URL_CHANGED,
          urlChangeListener
        );
      };

      // Listen for new targets (better for popup/new tab OAuth flows)
      SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED,
        targetsChangeListener
      );
      
      // Also listen for URL changes in existing tabs (fallback)
      SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.INSPECTED_URL_CHANGED,
        urlChangeListener
      );
    });
  }

  /**
   * Handle OAuth callback by parsing URL parameters
   */
  private static async handleCallbackFromUrl(callbackUrl: string): Promise<void> {
    try {
      // Validate redirect URI first
      if (!this.isValidRedirectUri(callbackUrl)) {
        throw new Error(OAuthError.INVALID_REDIRECT_URI);
      }

      const url = new URL(callbackUrl);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      if (error) {
        throw new Error(`OAuth error: ${error} - ${errorDescription || 'Unknown error'}`);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Use existing handleCallback method
      await this.handleCallback(code, state || undefined);
      
      if (this.isDevelopment()) {
        logger.info('OAuth callback processed successfully');
        logger.info('=== DISPATCHING OAUTH SUCCESS EVENT (handleCallbackFromUrl) ===');
      }
      
      // Notify UI of successful authentication
      window.dispatchEvent(new CustomEvent('openrouter-oauth-success', { 
        detail: { success: true } 
      }));
      
      if (this.isDevelopment()) {
        logger.info('✅ OAuth success event dispatched from handleCallbackFromUrl');
      }
      
    } catch (error) {
      this.handleOAuthError(error);
      throw error instanceof Error ? error : this.createStandardError(OAuthError.INVALID_RESPONSE, error);
    }
  }

  /**
   * Build the authorization URL with PKCE parameters
   */
  static buildAuthorizationUrl(challenge: PKCEChallenge): string {
    const params = new URLSearchParams({
      callback_url: this.CONFIG.redirectUri,
      code_challenge: challenge.codeChallenge,
      code_challenge_method: 'S256',
      state: challenge.state
    });
    
    const authUrl = `${this.CONFIG.authorizationUrl}?${params.toString()}`;
    
    if (this.isDevelopment()) {
      logger.debug('Built authorization URL:', authUrl);
    }
    
    return authUrl;
  }


  /**
   * Handle the OAuth callback
   */
  static async handleCallback(code: string, state?: string): Promise<void> {
    try {
      // Use provided state or get from storage
      const stateToVerify = state || this.getStoredState() || '';

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Verify state parameter
      const isValidState = this.verifyState(stateToVerify);
      if (!isValidState) {
        throw new Error(OAuthError.INVALID_STATE);
      }

      // Get stored code verifier
      const codeVerifier = this.getStoredCodeVerifier();
      if (!codeVerifier) {
        throw new Error('No code verifier found');
      }

      // Exchange code for token
      const tokenResponse = await this.exchangeCodeForToken(code, codeVerifier);
      
      // Store the token
      await this.storeOAuthToken(tokenResponse);
      
      // Clean up PKCE data
      this.cleanupPKCEData();
      
      if (this.isDevelopment()) {
        logger.info('OAuth flow completed successfully');
        logger.info('=== DISPATCHING OAUTH SUCCESS EVENT (handleCallback) ===');
      }
      
      // Notify UI of successful authentication
      window.dispatchEvent(new CustomEvent('openrouter-oauth-success', { 
        detail: { tokenResponse } 
      }));
      
      if (this.isDevelopment()) {
        logger.info('✅ OAuth success event dispatched from handleCallback');
      }
      
    } catch (error) {
      if (this.isDevelopment()) {
        logger.error('OAuth callback error:', error);
      }
      throw error instanceof Error ? error : this.createStandardError(OAuthError.TOKEN_EXCHANGE_FAILED, error);
    }
  }

  /**
   * Exchange authorization code for API token with deduplication
   */
  static async exchangeCodeForToken(code: string, codeVerifier: string): Promise<OAuthTokenResponse> {
    // Check for duplicate request
    const requestId = `${code}-${codeVerifier}`;
    const activeRequest = sessionStorage.getItem(OAUTH_STORAGE_KEYS.ACTIVE_REQUEST);
    
    if (activeRequest === requestId) {
      throw new Error(OAuthError.DUPLICATE_REQUEST);
    }

    // Check for existing active exchange
    if (this.activeTokenExchange) {
      if (this.isDevelopment()) {
        logger.warn('Token exchange already in progress, waiting for completion');
      }
      return this.activeTokenExchange;
    }

    try {
      // Mark request as active
      sessionStorage.setItem(OAUTH_STORAGE_KEYS.ACTIVE_REQUEST, requestId);
      
      this.activeTokenExchange = this.performTokenExchange(code, codeVerifier);
      const result = await this.activeTokenExchange;
      
      return result;
      
    } finally {
      // Clean up
      sessionStorage.removeItem(OAUTH_STORAGE_KEYS.ACTIVE_REQUEST);
      this.activeTokenExchange = null;
    }
  }

  /**
   * Perform the actual token exchange
   */
  private static async performTokenExchange(code: string, codeVerifier: string): Promise<OAuthTokenResponse> {
    try {
      if (this.isDevelopment()) {
        logger.info('Exchanging authorization code for token');
      }
      
      const response = await fetch(this.CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          code_challenge_method: 'S256'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = `Token exchange failed: ${errorData.error || response.statusText}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      if (!data.key) {
        throw new Error('Invalid token response: missing API key');
      }

      if (this.isDevelopment()) {
        logger.info('Successfully obtained API token');
      }
      return data as OAuthTokenResponse;
      
    } catch (error) {
      if (this.isDevelopment()) {
        logger.error('Token exchange error:', error);
      }
      throw new Error(OAuthError.TOKEN_EXCHANGE_FAILED);
    }
  }

  /**
   * Store PKCE data temporarily during OAuth flow
   */
  private static async storePKCEData(challenge: PKCEChallenge): Promise<void> {
    try {
      sessionStorage.setItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER, challenge.codeVerifier);
      sessionStorage.setItem(OAUTH_STORAGE_KEYS.STATE, challenge.state);
    } catch (error) {
      if (this.isDevelopment()) {
        logger.error('Failed to store PKCE data:', error);
      }
      throw this.createStandardError(OAuthError.STORAGE_ERROR, error);
    }
  }

  /**
   * Get stored code verifier
   */
  private static getStoredCodeVerifier(): string | null {
    return sessionStorage.getItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER);
  }

  /**
   * Get stored state
   */
  private static getStoredState(): string | null {
    return sessionStorage.getItem(OAUTH_STORAGE_KEYS.STATE);
  }

  /**
   * Verify state parameter matches stored state
   */
  private static verifyState(state: string): boolean {
    const storedState = this.getStoredState();
    return storedState === state;
  }

  /**
   * Clean up temporary PKCE data
   */
  private static cleanupPKCEData(): void {
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER);
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.STATE);
  }

  /**
   * Clean up OAuth flow state
   */
  private static cleanupOAuthFlow(): void {
    // Remove URL listener
    this.removeUrlListener();
    
    // Clean up PKCE data
    this.cleanupPKCEData();
    
    // Clean up navigation state
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.ORIGINAL_URL);
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.ACTIVE_REQUEST);
    
    // Clear active token exchange
    this.activeTokenExchange = null;
  }

  /**
   * Store OAuth token securely
   */
  static async storeOAuthToken(tokenResponse: OAuthTokenResponse): Promise<void> {
    try {
      const timestamp = Date.now();
      
      if (this.isDevelopment()) {
        logger.info('=== STORING OAUTH TOKEN ===');
        logger.info('Timestamp:', new Date(timestamp).toISOString());
        logger.info('Token response keys:', Object.keys(tokenResponse));
        logger.info('API key length:', tokenResponse.key?.length || 0);
        logger.info('API key prefix:', tokenResponse.key?.substring(0, 8) + '...' || 'none');
      }
      
      // Store the API key in the same location as manual API keys for compatibility
      const storageKey = 'ai_chat_openrouter_api_key';
      
      localStorage.setItem(storageKey, tokenResponse.key);
      
      // Switch provider to OpenRouter when OAuth succeeds
      localStorage.setItem('ai_chat_provider', 'openrouter');
      
      // Store additional OAuth metadata
      localStorage.setItem(OAUTH_STORAGE_KEYS.TOKEN, JSON.stringify(tokenResponse));
      localStorage.setItem(OAUTH_STORAGE_KEYS.AUTH_METHOD, 'oauth');
      
      if (tokenResponse.name) {
        localStorage.setItem(OAUTH_STORAGE_KEYS.USER_INFO, tokenResponse.name);
      }
      
      if (this.isDevelopment()) {
        // Verify storage immediately
        const storedKey = localStorage.getItem(storageKey);
        logger.info('Verification - stored key exists:', !!storedKey);
        logger.info('Verification - stored key length:', storedKey?.length || 0);
        logger.info('Verification - keys match:', storedKey === tokenResponse.key);
        
        // Log storage state for debugging
        logger.info('=== CURRENT STORAGE STATE ===');
        const allKeys = Object.keys(localStorage);
        const openRouterKeys = allKeys.filter(key => key.includes('openrouter') || key.includes('ai_chat'));
        openRouterKeys.forEach(key => {
          const value = localStorage.getItem(key);
          logger.info(`Storage[${key}]:`, value?.substring(0, 50) + (value && value.length > 50 ? '...' : '') || 'null');
        });
        
        logger.info('=== OAUTH TOKEN STORAGE COMPLETED ===');
      }
      
    } catch (error) {
      if (this.isDevelopment()) {
        logger.error('❌ Failed to store OAuth token:', error);
        logger.error('Storage error details:', {
          error: error instanceof Error ? error.message : error,
          tokenResponse: tokenResponse ? 'present' : 'missing',
          localStorageAvailable: typeof(Storage) !== 'undefined'
        });
      }
      throw new Error(OAuthError.STORAGE_ERROR);
    }
  }

  /**
   * Check if user is authenticated via OAuth
   */
  static async isOAuthAuthenticated(): Promise<boolean> {
    const authMethod = localStorage.getItem(OAUTH_STORAGE_KEYS.AUTH_METHOD);
    const token = localStorage.getItem('ai_chat_openrouter_api_key');
    const result = authMethod === 'oauth' && !!token;
    
    if (this.isDevelopment()) {
      logger.debug('=== OAUTH AUTHENTICATION CHECK ===');
      logger.debug('Auth method:', authMethod);
      logger.debug('Token exists:', !!token);
      logger.debug('Token length:', token?.length || 0);
      logger.debug('Is OAuth authenticated:', result);
    }
    
    return result;
  }


  /**
   * Get API key from local storage
   */
  static getApiKey(): string | null {
    const key = localStorage.getItem('ai_chat_openrouter_api_key');
    
    if (this.isDevelopment()) {
      logger.debug('=== GETTING API KEY ===');
      logger.debug('Key exists:', !!key);
      logger.debug('Key length:', key?.length || 0);
      logger.debug('Key prefix:', key?.substring(0, 8) + '...' || 'none');
    }
    
    return key;
  } 

  /**
   * Get stored OAuth token info
   */
  static getStoredTokenInfo(): OAuthTokenResponse | null {
    try {
      const tokenStr = localStorage.getItem(OAUTH_STORAGE_KEYS.TOKEN);
      return tokenStr ? JSON.parse(tokenStr) : null;
    } catch (error) {
      if (this.isDevelopment()) {
        logger.error('Failed to parse stored token info:', error);
      }
      return null;
    }
  }

  /**
   * Revoke OAuth token and clear stored data
   */
  static async revokeToken(): Promise<void> {
    try {
      if (this.isDevelopment()) {
        logger.info('Revoking OAuth token');
      }
      
      // Clear local OAuth-related data
      localStorage.removeItem('ai_chat_openrouter_api_key');
      localStorage.removeItem(OAUTH_STORAGE_KEYS.TOKEN);
      localStorage.removeItem(OAUTH_STORAGE_KEYS.AUTH_METHOD);
      localStorage.removeItem(OAUTH_STORAGE_KEYS.USER_INFO);
      
      // Clean up any remaining PKCE data
      this.cleanupPKCEData();
      
      if (this.isDevelopment()) {
        logger.info('OAuth token revoked successfully');
      }
      
      // Notify UI of logout
      window.dispatchEvent(new CustomEvent('openrouter-oauth-logout'));
      
    } catch (error) {
      if (this.isDevelopment()) {
        logger.error('Failed to revoke token:', error);
      }
      throw this.createStandardError(OAuthError.STORAGE_ERROR, error);
    }
  }

  /**
   * Create a standardized OAuth error
   */
  private static createStandardError(errorType: OAuthError, originalError?: unknown): Error {
    const baseMessage = this.getErrorMessage(errorType);
    
    if (this.isDevelopment() && originalError) {
      const originalMessage = originalError instanceof Error ? originalError.message : String(originalError);
      logger.error(`OAuth ${errorType}:`, originalMessage);
    }
    
    const error = new Error(baseMessage);
    error.name = errorType;
    return error;
  }

  /**
   * Handle OAuth errors with standardized processing
   */
  private static handleOAuthError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorType = error instanceof Error && error.name in OAuthError ? error.name as OAuthError : OAuthError.INVALID_RESPONSE;
    
    if (this.isDevelopment()) {
      logger.error('OAuth error:', errorMessage);
    }
    
    // Dispatch error event for UI handling
    window.dispatchEvent(new CustomEvent('openrouter-oauth-error', {
      detail: { 
        error: errorMessage,
        type: errorType
      }
    }));
  }

  /**
   * Switch from OAuth to manual API key
   */
  static switchToManualApiKey(): void {
    // Update auth method but keep the API key
    localStorage.setItem(OAUTH_STORAGE_KEYS.AUTH_METHOD, 'api_key');
    
    // Clear OAuth-specific metadata
    localStorage.removeItem(OAUTH_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(OAUTH_STORAGE_KEYS.USER_INFO);
  }

  /**
   * Get user-friendly error message
   */
  static getErrorMessage(error: OAuthError): string {
    const messages: Record<OAuthError, string> = {
      [OAuthError.USER_CANCELLED]: 'Authentication was cancelled',
      [OAuthError.INVALID_STATE]: 'Authentication failed - please try again',
      [OAuthError.NETWORK_ERROR]: 'Network error during authentication',
      [OAuthError.TOKEN_EXCHANGE_FAILED]: 'Failed to complete authentication',
      [OAuthError.STORAGE_ERROR]: 'Failed to store authentication data',
      [OAuthError.INVALID_RESPONSE]: 'Invalid response from authentication server',
      [OAuthError.NAVIGATION_FAILED]: 'Failed to navigate to authentication page',
      [OAuthError.TIMEOUT]: 'Authentication timed out - please try again',
      [OAuthError.INVALID_REDIRECT_URI]: 'Invalid redirect URL detected',
      [OAuthError.DUPLICATE_REQUEST]: 'Authentication request already in progress'
    };
    
    return messages[error] || 'Authentication failed';
  }
}