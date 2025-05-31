// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Constants used throughout the AI Chat panel
 */

// Timing constants (in milliseconds)
export const TIMING_CONSTANTS = {
  // UI feedback durations
  COPY_FEEDBACK_DURATION: 2000,
  STATUS_MESSAGE_DURATION: 3000,
  DOUBLE_CLICK_DELAY: 300,
  
  // AI Assistant loading
  AI_ASSISTANT_LOAD_TIMEOUT: 3000,
  AI_ASSISTANT_RETRY_DELAY: 1000,
  AI_ASSISTANT_MAX_RETRIES: 3,
} as const;

// Content detection thresholds
export const CONTENT_THRESHOLDS = {
  // Deep research detection
  DEEP_RESEARCH_MIN_LENGTH: 500,
  DEEP_RESEARCH_MIN_HEADINGS: 4,
  
  // Document viewer
  MARKDOWN_REPORT_MIN_LENGTH: 100,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  CUSTOM_PROMPTS: 'ai_chat_custom_prompts',
  LITELLM_MODELS: 'litellm_custom_models',
  API_KEY: 'ai_chat_api_key',
  LITELLM_ENDPOINT: 'litellm_endpoint',
  SELECTED_MODEL: 'selected_model',
} as const;

// Dialog dimensions
export const DIALOG_DIMENSIONS = {
  PROMPT_EDIT_MIN_WIDTH: 600,
  PROMPT_EDIT_MIN_HEIGHT: 500,
  PROMPT_EDIT_TEXTAREA_ROWS: 20,
  PROMPT_EDIT_TEXTAREA_COLS: 80,
} as const;

// Default values
export const DEFAULTS = {
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  MODEL: 'gpt-4o',
} as const;

// Regular expressions
export const REGEX_PATTERNS = {
  // XML parsing patterns
  REASONING_TAG: /<reasoning>\s*([\s\S]*?)\s*<\/reasoning>/,
  MARKDOWN_REPORT_TAG: /<markdown_report>\s*([\s\S]*?)\s*<\/markdown_report>/,
  
  // Markdown patterns
  HEADING: /^#{1,6}\s+.+$/gm,
  LIST_ITEM: /^[\*\-]\s+.+$/gm,
  NUMBERED_LIST: /^\d+\.\s+.+$/gm,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NO_API_KEY: 'Please configure your API key in settings',
  INVALID_API_KEY: 'Invalid API key. Please check your settings',
  STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded. Please clear some space and try again.',
  AI_ASSISTANT_LOAD_FAILED: 'Failed to load AI Assistant. Please try again.',
  NO_PRIMARY_TARGET: 'No primary page target found',
  EMPTY_PROMPT: 'Prompt cannot be empty',
} as const;