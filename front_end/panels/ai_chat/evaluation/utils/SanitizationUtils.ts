// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from '../../core/Logger.js';

const logger = createLogger('SanitizationUtils');

/**
 * Utility class for sanitizing data in evaluation outputs
 * Removes dynamic/time-based values for consistent comparisons
 */
export class SanitizationUtils {
  /**
   * Sanitize output for snapshot comparison - removes dynamic/time-based values
   */
  static sanitizeOutput(output: unknown): unknown {
    if (output === null || output === undefined) return output;
    
    let sanitized: unknown;
    try {
      sanitized = JSON.parse(JSON.stringify(output));
    } catch (error) {
      logger.warn('Failed to serialize output for sanitization, returning original:', error);
      return output;
    }
    
    this.sanitizeObject(sanitized);
    return sanitized;
  }
  
  /**
   * Recursively sanitize an object by replacing dynamic values
   */
  private static sanitizeObject(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      obj.forEach(item => this.sanitizeObject(item));
      return;
    }
    
    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      const value = objRecord[key];
      
      if (this.isDynamicField(key, value)) {
        objRecord[key] = this.sanitizeDynamicValue(key, value);
      } else if (typeof value === 'object') {
        this.sanitizeObject(value);
      }
    }
  }
  
  /**
   * Check if a field contains dynamic data that should be sanitized
   */
  private static isDynamicField(key: string, value: unknown): boolean {
    const lowerKey = key.toLowerCase();
    
    // Timestamp and date fields
    if (lowerKey.includes('timestamp') || lowerKey.includes('time')) return true;
    if (lowerKey.includes('date')) return true;
    
    // ID fields with string values
    if (lowerKey.includes('id') && typeof value === 'string') return true;
    
    // Coordinate fields (often change between runs)
    if (lowerKey.includes('x') || lowerKey.includes('y')) return true;
    if (lowerKey.includes('top') || lowerKey.includes('left')) return true;
    if (lowerKey.includes('width') || lowerKey.includes('height')) return true;
    
    // Session and runtime specific fields
    if (lowerKey.includes('session') || lowerKey.includes('token')) return true;
    
    return false;
  }
  
  /**
   * Generate appropriate sanitized replacement for dynamic values
   */
  private static sanitizeDynamicValue(key: string, _value: unknown): string {
    const lowerKey = key.toLowerCase();
    
    if (lowerKey.includes('timestamp') || lowerKey.includes('time')) {
      return '[TIMESTAMP]';
    }
    if (lowerKey.includes('date')) {
      return '[DATE]';
    }
    if (lowerKey.includes('id')) {
      return '[ID]';
    }
    if (lowerKey.includes('x') || lowerKey.includes('y') || 
        lowerKey.includes('top') || lowerKey.includes('left') ||
        lowerKey.includes('width') || lowerKey.includes('height')) {
      return '[COORDINATE]';
    }
    if (lowerKey.includes('session') || lowerKey.includes('token')) {
      return '[SESSION]';
    }
    
    return '[DYNAMIC]';
  }
  
  /**
   * Sanitize URLs by removing query parameters and dynamic segments
   */
  static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove query parameters and fragments
      urlObj.search = '';
      urlObj.hash = '';
      
      // Replace session IDs and dynamic path segments
      const pathname = urlObj.pathname
        .replace(/\/[a-f0-9-]{36}\//gi, '/[UUID]/')  // UUIDs
        .replace(/\/\d{10,13}\//g, '/[TIMESTAMP]/')  // Timestamps
        .replace(/\/session_[^\/]+\//g, '/[SESSION]/'); // Session IDs
      
      urlObj.pathname = pathname;
      return urlObj.toString();
    } catch {
      return url; // Return original if URL parsing fails
    }
  }
  
  /**
   * Sanitize error messages by removing dynamic content
   * Reserved for future error reporting features
   */
  static sanitizeErrorMessage(message: string): string {
    return message
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]')
      .replace(/[a-f0-9-]{36}/gi, '[UUID]')
      .replace(/session_[a-zA-Z0-9]+/g, '[SESSION]')
      .replace(/\d{10,13}/g, '[TIMESTAMP]')
      .replace(/line \d+/g, 'line [NUM]')
      .replace(/column \d+/g, 'column [NUM]');
  }
}