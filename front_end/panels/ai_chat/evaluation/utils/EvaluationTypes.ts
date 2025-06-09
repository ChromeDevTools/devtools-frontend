// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Additional type definitions for the evaluation framework
 * These supplement the core types in framework/types.ts
 */

/**
 * Tool execution results with standardized success/error handling
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}


/**
 * Screenshot data with metadata
 */
export interface ScreenshotData {
  dataUrl: string;
  timestamp: number;
  metadata?: {
    viewportWidth: number;
    viewportHeight: number;
    devicePixelRatio: number;
  };
}

/**
 * Vision message content for multimodal LLM calls
 */
export type MessageContent = 
  | string 
  | Array<TextContent | ImageContent>;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string; // Can be URL or base64 data URL
    detail?: 'low' | 'high' | 'auto';
  };
}

/**
 * Vision-enabled message for LLM API
 */
export interface VisionMessage {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
}


/**
 * Type guards for runtime validation
 * Reserved for future use when runtime validation becomes necessary
 */
export class TypeGuards {
  /**
   * Check if value is a ToolExecutionResult
   */
  static isToolExecutionResult(value: unknown): value is ToolExecutionResult {
    return typeof value === 'object' && 
           value !== null && 
           'success' in value && 
           typeof (value as Record<string, unknown>).success === 'boolean';
  }

  /**
   * Check if value is ScreenshotData
   */
  static isScreenshotData(value: unknown): value is ScreenshotData {
    return typeof value === 'object' && 
           value !== null && 
           'dataUrl' in value &&
           'timestamp' in value &&
           typeof (value as Record<string, unknown>).dataUrl === 'string' &&
           typeof (value as Record<string, unknown>).timestamp === 'number';
  }
}