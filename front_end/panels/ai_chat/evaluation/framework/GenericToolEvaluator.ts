// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { Tool } from '../../tools/Tools.js';
import { NavigateURLTool } from '../../tools/Tools.js';
import type { TestCase, TestResult, EvaluationConfig } from './types.js';
import { createLogger } from '../../core/Logger.js';
import { SanitizationUtils } from '../utils/SanitizationUtils.js';
import { ErrorHandlingUtils } from '../utils/ErrorHandlingUtils.js';
import type { ToolExecutionResult } from '../utils/EvaluationTypes.js';

const logger = createLogger('GenericToolEvaluator');

/**
 * Hooks for test execution lifecycle
 */
export interface TestExecutionHooks {
  beforeNavigation?: (testCase: TestCase) => Promise<void>;
  beforeToolExecution?: (testCase: TestCase, tool: Tool) => Promise<void>;
  afterToolExecution?: (testCase: TestCase, tool: Tool, result: unknown) => Promise<void>;
  beforeEvaluation?: (testCase: TestCase, result: TestResult) => Promise<void>;
}

/**
 * Generic evaluator that can test any tool without needing specific adapters
 */
export class GenericToolEvaluator {
  private navigateTool: NavigateURLTool;
  private config: EvaluationConfig;
  private hooks?: TestExecutionHooks;

  constructor(config: EvaluationConfig, hooks?: TestExecutionHooks) {
    this.config = config;
    this.navigateTool = new NavigateURLTool();
    this.hooks = hooks;
  }

  /**
   * Run a test case for any tool
   */
  async runTest(testCase: TestCase, tool: Tool): Promise<TestResult> {
    const startTime = Date.now();

    // Use withErrorHandling wrapper for better error management
    return await ErrorHandlingUtils.withErrorHandling(
      async () => {
        logger.info(`Starting test: ${testCase.name}`);
        logger.info(`Tool: ${testCase.tool}, URL: ${testCase.url}`);

        // 1. Navigate to the URL if provided
        if (testCase.url) {
          // Call beforeNavigation hook
          if (this.hooks?.beforeNavigation) {
            logger.info('Calling beforeNavigation hook');
            await this.hooks.beforeNavigation(testCase);
          }
          
          const navResult = await this.navigateTool.execute({ url: testCase.url, reasoning: `Navigate to ${testCase.url} for test case ${testCase.name}` });
          if ('error' in navResult) {
            throw new Error(`Navigation failed: ${navResult.error}`);
          }
          // Wait for page to stabilize
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Call beforeToolExecution hook (after navigation, before tool execution)
        if (this.hooks?.beforeToolExecution) {
          logger.info('Calling beforeToolExecution hook');
          await this.hooks.beforeToolExecution(testCase, tool);
        }

        // 2. Execute the tool with the input - wrapped with error handling
        const toolResult = await ErrorHandlingUtils.withErrorHandling(
          async () => await tool.execute(testCase.input),
          (error) => ({ error: ErrorHandlingUtils.formatUserFriendlyError(error, 'Tool execution failed') }),
          logger,
          `GenericToolEvaluator.toolExecution:${testCase.tool}`
        );

        // 3. Store the raw tool response for debugging
        const rawResponse = toolResult;

        // Call afterToolExecution hook
        if (this.hooks?.afterToolExecution) {
          logger.info('Calling afterToolExecution hook');
          await this.hooks.afterToolExecution(testCase, tool, toolResult);
        }

        // 4. Extract success/failure and output
        const success = this.isSuccessfulResult(toolResult);
        const output = this.extractOutput(toolResult);
        const error = this.extractError(toolResult);

        const result: TestResult = {
          testId: testCase.id,
          status: success ? 'passed' : 'failed',
          output,
          error: error ? ErrorHandlingUtils.formatUserFriendlyError(error, undefined) : undefined,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
          validation: {
            passed: success,
            summary: success 
              ? `Successfully executed ${testCase.tool}`
              : `${testCase.tool} execution failed: ${error}`,
          },
          // Add raw response for debugging
          rawResponse,
        };

        // Call beforeEvaluation hook
        if (this.hooks?.beforeEvaluation) {
          logger.info('Calling beforeEvaluation hook');
          await this.hooks.beforeEvaluation(testCase, result);
        }

        return result;
      },
      (error) => ErrorHandlingUtils.createTestExecutionError(error, testCase.id, startTime),
      logger,
      'GenericToolEvaluator.runTest'
    );
  }

  /**
   * Run multiple tests sequentially
   */
  async runBatch(testCases: TestCase[], toolInstances: Map<string, Tool>): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      logger.info(`Running test ${results.length + 1}/${testCases.length}`);
      
      const tool = toolInstances.get(testCase.tool);
      if (!tool) {
        throw new Error(`Tool instance not provided for: ${testCase.tool}`);
      }
      
      const result = await this.runTestWithRetries(testCase, tool);
      results.push(result);

      // Small delay between tests to avoid overwhelming the system
      if (results.length < testCases.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Run a test with retry logic
   */
  private async runTestWithRetries(testCase: TestCase, tool: Tool): Promise<TestResult> {
    const maxRetries = testCase.metadata?.retries || this.config.retries || 1;
    let lastResult: TestResult | null = null;
    let lastError: unknown = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        logger.info(`Retry ${attempt}/${maxRetries} for ${testCase.id}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
      }

      lastResult = await this.runTest(testCase, tool);
      
      // Only retry on errors, not on test failures
      if (lastResult.status !== 'error') {
        lastResult.retryCount = attempt;
        return lastResult;
      }
      
      // Check if the error is retryable
      lastError = lastResult.error || lastResult.rawResponse;
      if (!ErrorHandlingUtils.isRetryableError(lastError)) {
        logger.info(`Error is not retryable, stopping retries for ${testCase.id}`);
        lastResult.retryCount = attempt;
        return lastResult;
      }
    }

    // Return the last error result
    if (!lastResult) {
      const errorResult = ErrorHandlingUtils.createTestExecutionError(
        'No test execution attempted', 
        testCase.id, 
        Date.now()
      );
      errorResult.retryCount = maxRetries;
      return errorResult;
    }
    lastResult.retryCount = maxRetries;
    return lastResult;
  }

  /**
   * Determine if a tool result indicates success
   */
  private isSuccessfulResult(result: unknown): boolean {
    // Null/undefined is failure
    if (result === null || result === undefined) {
      return false;
    }

    // Check for explicit success/failure indicators
    if (typeof result === 'object') {
      if ('success' in result) return Boolean(result.success);
      if ('error' in result) return !result.error;
      if ('failed' in result) return !result.failed;
    }

    // Anything else (non-null string, number, object with content) is success
    return true;
  }

  /**
   * Extract the meaningful output from any tool result
   */
  private extractOutput(result: unknown): unknown {
    if (typeof result === 'object' && result !== null) {
      // Common output patterns
      if ('data' in result) return this.sanitizeOutputIfNeeded(result.data);
      if ('output' in result) return this.sanitizeOutputIfNeeded(result.output);
      if ('result' in result) return this.sanitizeOutputIfNeeded(result.result);
      if ('value' in result) return this.sanitizeOutputIfNeeded(result.value);
      
      // For tools that return success + other fields
      if ('success' in result) {
        const resultObj = result as Record<string, unknown>;
        const { success, error, ...output } = resultObj;
        return this.sanitizeOutputIfNeeded(output);
      }
    }
    return this.sanitizeOutputIfNeeded(result);
  }
  
  /**
   * Sanitize output data if it contains URLs or dynamic content
   */
  private sanitizeOutputIfNeeded(output: unknown): unknown {
    if (typeof output === 'string' && this.looksLikeUrl(output)) {
      return SanitizationUtils.sanitizeUrl(output);
    }
    
    if (typeof output === 'object' && output !== null) {
      // Deep clone and sanitize
      return SanitizationUtils.sanitizeOutput(output);
    }
    
    return output;
  }
  
  /**
   * Check if a string looks like a URL
   */
  private looksLikeUrl(str: string): boolean {
    return str.startsWith('http://') || str.startsWith('https://') || str.includes('://');
  }

  /**
   * Extract error message from any tool result
   */
  private extractError(result: unknown): string | undefined {
    if (typeof result === 'object' && result !== null) {
      if ('error' in result && result.error) {
        return String(result.error);
      }
      if ('message' in result && result.message) {
        return String(result.message);
      }
      if ('reason' in result && result.reason) {
        return String(result.reason);
      }
    }
    return undefined;
  }

  /**
   * Sanitize output for snapshot comparison (static method for reusability)
   * @deprecated Use SanitizationUtils.sanitizeOutput() instead
   */
  static sanitizeOutput(output: unknown): unknown {
    return SanitizationUtils.sanitizeOutput(output);
  }
}