// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Core types and interfaces for the evaluation framework
 */

/**
 * Generic test case definition that can work with any tool
 */
export interface TestCase<TInput = any> {
  id: string;
  name: string;
  description: string;
  url: string;
  tool: string; // Name of the tool to test
  input: TInput; // Tool-specific input
  validation: ValidationConfig;
  metadata: {
    tags: string[];
    timeout?: number;
    retries?: number;
    flaky?: boolean;
  };
}

/**
 * Configuration for how to validate extraction results
 */
export interface ValidationConfig {
  type: 'snapshot' | 'llm-judge' | 'hybrid';
  snapshot?: {
    excludePaths?: string[];
    structureOnly?: boolean;
    sanitizers?: SanitizationRule[];
  };
  llmJudge?: {
    criteria: string[];
    model?: string;
    temperature?: number;
    includeUrl?: boolean;
    visualVerification?: {
      enabled: boolean;
      captureBeforeAction?: boolean;
      captureAfterAction?: boolean;
      verificationPrompts?: string[];
    };
  };
  custom?: Record<string, any>;
}

/**
 * Sanitization rules for snapshot comparison
 */
export interface SanitizationRule {
  path: string;
  pattern?: RegExp;
  replacement?: string;
  transform?: (value: any) => any;
}

/**
 * Result of a test execution
 */
export interface TestResult {
  testId: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  output?: any;
  error?: string;
  validation?: ValidationResult;
  duration: number;
  timestamp: number;
  retryCount?: number;
  rawResponse?: any;  // Raw tool/agent response for debugging
}

/**
 * Validation result containing all validation outcomes
 */
export interface ValidationResult {
  passed: boolean;
  snapshot?: SnapshotResult;
  llmJudge?: LLMJudgeResult;
  custom?: Record<string, any>;
  summary: string;
}

/**
 * Result of snapshot comparison
 */
export interface SnapshotResult {
  passed: boolean;
  changed: boolean;
  diff?: string;
  message: string;
}

/**
 * Result from LLM judge evaluation
 */
export interface LLMJudgeResult {
  passed: boolean;
  score: number;
  dimensions?: {
    completeness: number;
    accuracy: number;
    structure: number;
    relevance: number;
  };
  issues?: string[];
  explanation: string;
  confidence?: number;
  visualEvidence?: string;
}

/**
 * Batch execution result
 */
export interface BatchResult {
  results: TestResult[];
  summary: TestSummary;
  report?: string;
}

/**
 * Summary of test execution
 */
export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  duration: number;
  averageDuration: number;
  flakyTests: number;
}

/**
 * Options for batch execution
 */
export interface BatchOptions {
  parallel?: boolean;
  concurrency?: number;
  stopOnFailure?: boolean;
  format?: 'json' | 'html' | 'markdown';
  verbose?: boolean;
}

/**
 * Configuration for real evaluation runs
 */
export interface EvaluationConfig {
  // LLM settings for extraction (used by tools being tested)
  extractionModel: string;
  extractionApiKey: string;
  
  // LLM settings for evaluation (used by LLM judge)
  evaluationModel: string;
  evaluationApiKey: string;
  
  // Execution settings
  maxConcurrency: number;
  timeoutMs: number;
  retries: number;
  
  // Output settings
  snapshotDir: string;
  reportDir: string;
}

/**
 * Real website evaluation metrics
 */
export interface EvaluationMetrics {
  extractionTime: number;
  evaluationTime: number;
  completeness: number;
  accuracy: number;
  schemaCompliance: number;
  urlResolutionSuccess: number;
  llmCalls: number;
  tokenUsage?: {
    extraction: number;
    evaluation: number;
  };
}