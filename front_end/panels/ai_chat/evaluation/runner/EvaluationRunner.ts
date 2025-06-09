// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { GenericToolEvaluator } from '../framework/GenericToolEvaluator.js';
import { LLMEvaluator } from '../framework/judges/LLMEvaluator.js';
import { AgentService } from '../../core/AgentService.js';
import { ToolRegistry } from '../../agent_framework/ConfigurableAgentTool.js';
import type { EvaluationConfig, TestResult, TestCase } from '../framework/types.js';
import { createLogger } from '../../core/Logger.js';
import { TIMING_CONSTANTS } from '../../core/Constants.js';

const logger = createLogger('EvaluationRunner');

/**
 * Example runner for the evaluation framework
 */
export class EvaluationRunner {
  private evaluator: GenericToolEvaluator;
  private llmEvaluator: LLMEvaluator;
  private config: EvaluationConfig;

  constructor() {
    // Get API key from AgentService
    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();
    
    if (!apiKey) {
      throw new Error('API key not configured. Please configure in AI Chat settings.');
    }

    this.config = {
      extractionModel: 'gpt-4.1-mini',
      extractionApiKey: apiKey,
      evaluationModel: 'gpt-4.1-mini',
      evaluationApiKey: apiKey,
      maxConcurrency: 1,
      timeoutMs: TIMING_CONSTANTS.AGENT_TEST_SCHEMA_TIMEOUT,
      retries: 2,
      snapshotDir: './snapshots',
      reportDir: './reports'
    };

    this.evaluator = new GenericToolEvaluator(this.config);
    this.llmEvaluator = new LLMEvaluator(this.config.evaluationApiKey, this.config.evaluationModel);
  }

  /**
   * Run a single test case
   */
  async runSingleTest(testCase: TestCase<any>): Promise<TestResult> {

    logger.debug(`[EvaluationRunner] Running test: ${testCase.name}`);
    logger.debug(`[EvaluationRunner] URL: ${testCase.url}`);
    logger.debug(`[EvaluationRunner] Tool: ${testCase.tool}`);

    // Get the tool instance from ToolRegistry based on what the test specifies
    const tool = ToolRegistry.getRegisteredTool(testCase.tool);
    if (!tool) {
      throw new Error(`Tool "${testCase.tool}" not found in ToolRegistry. Ensure it is properly registered.`);
    }

    const result = await this.evaluator.runTest(testCase, tool as any);
    
    // Add LLM evaluation if test passed
    if (result.status === 'passed' && result.output && testCase.validation.type !== 'snapshot') {
      logger.debug(`[EvaluationRunner] Adding LLM evaluation...`);
      
      try {
        const llmJudgment = await this.llmEvaluator.evaluate(
          result.output,
          testCase,
          testCase.validation
        );
        
        if (result.validation) {
          result.validation.llmJudge = llmJudgment;
          result.validation.passed = result.validation.passed && llmJudgment.passed;
          result.validation.summary += ` | LLM Score: ${llmJudgment.score}/100`;
        }
      } catch (error) {
        console.warn('[EvaluationRunner] LLM evaluation failed:', error);
      }
    }

    this.printTestResult(result);
    return result;
  }

  /**
   * Run all tests from a given test array
   */
  async runAllTests(testCases: TestCase<any>[]): Promise<TestResult[]> {
    logger.debug(`[EvaluationRunner] Running ${testCases.length} tests...`);
    
    // Create tool instances map based on tools used in test cases
    const toolInstances = new Map();
    const uniqueTools = new Set(testCases.map(test => test.tool));
    
    for (const toolName of uniqueTools) {
      const tool = ToolRegistry.getRegisteredTool(toolName);
      if (!tool) {
        throw new Error(`Tool "${toolName}" not found in ToolRegistry. Ensure it is properly registered.`);
      }
      toolInstances.set(toolName, tool as any);
    }
    
    const results = await this.evaluator.runBatch(testCases, toolInstances);
    
    // Add LLM evaluations
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const testCase = testCases[i];
      
      if (result.status === 'passed' && result.output && testCase.validation.type !== 'snapshot') {
        try {
          const llmJudgment = await this.llmEvaluator.evaluate(
            result.output,
            testCase,
            testCase.validation
          );
          
          if (result.validation) {
            result.validation.llmJudge = llmJudgment;
            result.validation.passed = result.validation.passed && llmJudgment.passed;
          }
        } catch (error) {
          console.warn(`[EvaluationRunner] LLM evaluation failed for ${testCase.id}:`, error);
        }
      }
    }

    this.printDetailedSummary(results);
    return results;
  }

  /**
   * Print test result
   */
  private printTestResult(result: TestResult): void {
    logger.debug('\n' + '='.repeat(60));
    logger.debug(`Test: ${result.testId}`);
    logger.debug(`Status: ${result.status.toUpperCase()}`);
    logger.debug(`Duration: ${result.duration}ms`);
    
    if (result.error) {
      logger.debug(`Error: ${result.error}`);
    }
    
    if (result.validation) {
      logger.debug(`Validation: ${result.validation.passed ? 'PASSED' : 'FAILED'}`);
      logger.debug(`Summary: ${result.validation.summary}`);
      
      if (result.validation.llmJudge) {
        const judge = result.validation.llmJudge;
        logger.debug(`LLM Score: ${judge.score}/100`);
        logger.debug(`Explanation: ${judge.explanation}`);
        
        if (judge.issues && judge.issues.length > 0) {
          logger.debug(`Issues: ${judge.issues.join(', ')}`);
        }
      }
    }
    
    // Always show the tool response regardless of pass/fail status
    if (result.rawResponse !== undefined) {
      logger.debug('\nTool Response:');
      const rawPreview = JSON.stringify(result.rawResponse, null, 2);
      logger.debug(rawPreview);  // Show full response without truncation
    }
    
    logger.debug('='.repeat(60));
  }

  /**
   * Print detailed summary including all test responses
   */
  private printDetailedSummary(results: TestResult[]): void {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'error').length;
    
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    logger.debug('\n' + '='.repeat(60));
    logger.debug('DETAILED EVALUATION REPORT');
    logger.debug('='.repeat(60));
    logger.debug(`Total Tests: ${results.length}`);
    logger.debug(`Passed: ${passed}`);
    logger.debug(`Failed: ${failed}`);
    logger.debug(`Errors: ${errors}`);
    logger.debug(`Average Duration: ${Math.round(avgDuration)}ms`);
    logger.debug(`Success Rate: ${Math.round((passed / results.length) * 100)}%`);
    
    // LLM Judge statistics
    const withLLMJudge = results.filter(r => r.validation?.llmJudge);
    if (withLLMJudge.length > 0) {
      const avgScore = withLLMJudge.reduce(
        (sum, r) => sum + (r.validation?.llmJudge?.score || 0), 
        0
      ) / withLLMJudge.length;
      logger.debug(`Average LLM Score: ${Math.round(avgScore)}/100`);
    }
    
    logger.debug('\n' + '='.repeat(60));
    logger.debug('ALL TEST RESPONSES');
    logger.debug('='.repeat(60));
    
    // Show all test responses
    results.forEach((result, index) => {
      logger.debug(`\n--- Test ${index + 1}: ${result.testId} ---`);
      logger.debug(`Status: ${result.status.toUpperCase()}`);
      logger.debug(`Duration: ${result.duration}ms`);
      
      if (result.rawResponse !== undefined) {
        logger.debug('\nResponse:');
        const rawPreview = JSON.stringify(result.rawResponse, null, 2);
        logger.debug(rawPreview);
      } else {
        logger.debug('\nResponse: No response captured');
      }
      
      if (result.error) {
        logger.debug(`\nError: ${result.error}`);
      }
    });
    
    logger.debug('\n' + '='.repeat(60));
  }
}

// Export for easy access in DevTools console
(globalThis as any).EvaluationRunner = EvaluationRunner;