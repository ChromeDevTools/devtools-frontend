// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from '../core/Logger.js';

const logger = createLogger('PKCEUtils');

/**
 * PKCE challenge parameters for OAuth flow
 */
export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Utility class for PKCE (Proof Key for Code Exchange) OAuth flow
 * Implements RFC 7636: https://datatracker.ietf.org/doc/html/rfc7636
 */
export class PKCEUtils {
  // Minimum and maximum length for code verifier as per RFC 7636
  private static readonly MIN_VERIFIER_LENGTH = 43;
  private static readonly MAX_VERIFIER_LENGTH = 128;
  
  // Characters allowed in code verifier
  private static readonly VERIFIER_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

  /**
   * Generate a cryptographically random code verifier
   * @returns A random string between 43-128 characters
   */
  static generateCodeVerifier(): string {
    const length = Math.floor(Math.random() * (this.MAX_VERIFIER_LENGTH - this.MIN_VERIFIER_LENGTH + 1)) + this.MIN_VERIFIER_LENGTH;
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    let verifier = '';
    for (const value of randomValues) {
      verifier += this.VERIFIER_CHARSET[value % this.VERIFIER_CHARSET.length];
    }
    
    logger.debug(`Generated code verifier of length ${verifier.length}`);
    return verifier;
  }

  /**
   * Generate SHA-256 code challenge from verifier
   * @param verifier The code verifier string
   * @returns Base64URL encoded challenge
   */
  static async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const challenge = this.base64URLEncode(hash);
    
    logger.debug('Generated code challenge from verifier');
    return challenge;
  }

  /**
   * Generate a random state parameter for CSRF protection
   * @returns A random string for state parameter
   */
  static generateState(): string {
    const stateLength = 32;
    const randomValues = new Uint8Array(stateLength);
    crypto.getRandomValues(randomValues);
    
    let state = '';
    for (const value of randomValues) {
      state += this.VERIFIER_CHARSET[value % this.VERIFIER_CHARSET.length];
    }
    
    logger.debug('Generated state parameter');
    return state;
  }

  /**
   * Create a complete PKCE challenge with verifier, challenge, and state
   * @returns PKCE challenge object
   */
  static async createPKCEChallenge(): Promise<PKCEChallenge> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();
    
    logger.info('Created complete PKCE challenge');
    return {
      codeVerifier,
      codeChallenge,
      state
    };
  }

  /**
   * Base64URL encode an ArrayBuffer
   * @param buffer The buffer to encode
   * @returns Base64URL encoded string
   */
  static base64URLEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const byte of bytes) {
      str += String.fromCharCode(byte);
    }
    
    // Convert to base64
    const base64 = btoa(str);
    
    // Convert base64 to base64url
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Validate a code verifier meets RFC 7636 requirements
   * @param verifier The code verifier to validate
   * @returns True if valid
   */
  static isValidCodeVerifier(verifier: string): boolean {
    if (!verifier || 
        verifier.length < this.MIN_VERIFIER_LENGTH || 
        verifier.length > this.MAX_VERIFIER_LENGTH) {
      return false;
    }
    
    // Check all characters are in allowed charset
    for (const char of verifier) {
      if (!this.VERIFIER_CHARSET.includes(char)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Verify a code challenge matches a code verifier
   * @param verifier The code verifier
   * @param challenge The code challenge to verify
   * @returns True if challenge matches verifier
   */
  static async verifyChallenge(verifier: string, challenge: string): Promise<boolean> {
    try {
      const expectedChallenge = await this.generateCodeChallenge(verifier);
      return expectedChallenge === challenge;
    } catch (error) {
      logger.error('Error verifying challenge:', error);
      return false;
    }
  }
}