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
  
  // Agent test execution timeouts
  AGENT_TEST_DEFAULT_TIMEOUT: 180000, // 3 minutes default for agent tests
  AGENT_TEST_RESEARCH_TIMEOUT: 300000, // 5 minutes for research agents
  AGENT_TEST_ACTION_TIMEOUT: 120000, // 2 minutes for action agents
  AGENT_TEST_SCHEMA_TIMEOUT: 60000, // 1 minute for schema extraction
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
  MODEL: 'gpt-4.1',
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

// Sentinel model identifiers used in agent configurations
export const MODEL_SENTINELS = {
  USE_MINI: 'use-mini',
  USE_NANO: 'use-nano',
} as const;

// Placeholder values used in UI model selectors
export const MODEL_PLACEHOLDERS = {
  NO_MODELS: '_placeholder_no_models',
  ADD_CUSTOM: '_placeholder_add_custom',
} as const;
