// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { GenericToolEvaluator } from '../framework/GenericToolEvaluator.js';
import { LLMEvaluator } from '../framework/judges/LLMEvaluator.js';
import { AgentService } from '../../core/AgentService.js';
import { ToolRegistry } from '../../agent_framework/ConfigurableAgentTool.js';
import type { EvaluationConfig, TestResult, TestCase } from '../framework/types.js';
import { createLogger } from '../../core/Logger.js';
import { LLMClient } from '../../LLM/LLMClient.js';
import type { LLMProviderConfig } from '../../LLM/LLMClient.js';
import { TIMING_CONSTANTS } from '../../core/Constants.js';
import { createTracingProvider, isTracingEnabled, getTracingConfig } from '../../tracing/TracingConfig.js';
import type { TracingProvider, TracingContext } from '../../tracing/TracingProvider.js';

const logger = createLogger('EvaluationRunner');

/**
 * Example runner for the evaluation framework
 */
export interface EvaluationRunnerOptions {
  judgeModel: string;
  mainModel: string;
  miniModel: string;
  nanoModel: string;
}

export class EvaluationRunner {
  private evaluator: GenericToolEvaluator;
  private llmEvaluator: LLMEvaluator;
  private config: EvaluationConfig;
  private tracingProvider: TracingProvider;
  private sessionId: string;
  #llmInitPromise: Promise<void> | null = null;

  constructor(options: EvaluationRunnerOptions) {
    // Get API key from AgentService
    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();
    
    if (!apiKey) {
      throw new Error('API key not configured. Please configure in AI Chat settings.');
    }

    // Require explicit models from caller
    const { judgeModel, mainModel, miniModel, nanoModel } = options;
    const evaluationModel = judgeModel;

    this.config = {
      extractionModel: evaluationModel,
      extractionApiKey: apiKey,
      evaluationModel: evaluationModel,
      evaluationApiKey: apiKey,
      mainModel,
      miniModel,
      nanoModel,
      maxConcurrency: 1,
      timeoutMs: TIMING_CONSTANTS.AGENT_TEST_SCHEMA_TIMEOUT,
      retries: 2,
      snapshotDir: './snapshots',
      reportDir: './reports'
    };

    this.evaluator = new GenericToolEvaluator(this.config);
    this.llmEvaluator = new LLMEvaluator(this.config.evaluationApiKey, this.config.evaluationModel);
    
    // Initialize LLM client for tools under evaluation (based on selected provider)
    this.#llmInitPromise = this.#initializeLLMForEvaluation();

    // Initialize tracing
    this.tracingProvider = createTracingProvider();
    this.sessionId = `evaluation-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('EvaluationRunner created with tracing provider', {
      sessionId: this.sessionId,
      providerType: this.tracingProvider.constructor.name,
      tracingEnabled: isTracingEnabled(),
      tracingConfig: getTracingConfig()
    });
    
    // Initialize tracing provider
    this.initializeTracing();
  }

  // Initialize LLMClient with the currently selected provider for extraction tools
  async #initializeLLMForEvaluation(): Promise<void> {
    try {
      const provider = (localStorage.getItem('ai_chat_provider') || 'openai') as any;
      const providers: LLMProviderConfig[] = [];

      if (provider === 'openai') {
        const key = localStorage.getItem('ai_chat_api_key') || '';
        if (key) providers.push({ provider: 'openai', apiKey: key });
      } else if (provider === 'openrouter') {
        const key = localStorage.getItem('ai_chat_openrouter_api_key') || '';
        if (key) providers.push({ provider: 'openrouter', apiKey: key });
      } else if (provider === 'groq') {
        const key = localStorage.getItem('ai_chat_groq_api_key') || '';
        if (key) providers.push({ provider: 'groq', apiKey: key });
      } else if (provider === 'litellm') {
        const key = localStorage.getItem('ai_chat_litellm_api_key') || '';
        const endpoint = localStorage.getItem('ai_chat_litellm_endpoint') || '';
        if (endpoint) providers.push({ provider: 'litellm', apiKey: key, providerURL: endpoint });
      }

      // Fallback to OpenAI if specific selection is not configured but an OpenAI key exists
      if (!providers.length) {
        const fallback = localStorage.getItem('ai_chat_api_key') || '';
        if (fallback) providers.push({ provider: 'openai', apiKey: fallback });
      }

      if (!providers.length) {
        logger.warn('LLMClient initialization skipped: no provider credentials found');
        return;
      }

      const llm = LLMClient.getInstance();
      await llm.initialize({ providers });
      logger.info('LLMClient initialized for evaluation', { providerSelection: provider, providersRegistered: providers.map(p => p.provider) });
    } catch (error) {
      logger.warn('Failed to initialize LLM client for evaluation:', error);
    }
  }
  
  private async initializeTracing(): Promise<void> {
    if (isTracingEnabled()) {
      try {
        logger.info('Initializing tracing for evaluation runner', {
          sessionId: this.sessionId,
          providerType: this.tracingProvider.constructor.name
        });
        
        await this.tracingProvider.initialize();
        await this.tracingProvider.createSession(this.sessionId, {
          type: 'evaluation',
          runner: 'EvaluationRunner',
          timestamp: new Date().toISOString()
        });
        
        logger.info('Tracing initialized successfully for evaluation runner');
      } catch (error) {
        logger.warn('Failed to initialize tracing for evaluation:', error);
      }
    } else {
      logger.info('Tracing disabled, skipping initialization');
    }
  }

  /**
   * Run a single test case
   */
  async runSingleTest(testCase: TestCase<any>): Promise<TestResult> {
    // Ensure LLM client initialization completes before running tests
    if (this.#llmInitPromise) {
      try { await this.#llmInitPromise; } catch { /* ignore; errors are logged in initializer */ }
    }
    const traceId = `eval-${testCase.id || testCase.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    logger.debug(`[EvaluationRunner] Running test: ${testCase.name}`);
    logger.debug(`[EvaluationRunner] URL: ${testCase.url}`);
    logger.debug(`[EvaluationRunner] Tool: ${testCase.tool}`);

    // Create tracing context
    const tracingContext: TracingContext = {
      sessionId: this.sessionId,
      traceId,
      parentObservationId: undefined
    };

    // Create trace for this evaluation
    if (isTracingEnabled()) {
      try {
        logger.info('Creating trace for evaluation', {
          traceId,
          sessionId: this.sessionId,
          testName: testCase.name,
          tool: testCase.tool,
          providerType: this.tracingProvider.constructor.name
        });
        
        await this.tracingProvider.createTrace(
          traceId,
          this.sessionId,
          `Evaluation: ${testCase.name}`,
          {
            testCase: {
              id: testCase.id,
              name: testCase.name,
              tool: testCase.tool,
              url: testCase.url,
              description: testCase.description
            }
          },
          {
            type: 'evaluation',
            tool: testCase.tool,
            url: testCase.url,
            testId: testCase.id || testCase.name
          },
          'evaluation-runner',
          ['evaluation', testCase.tool, 'test']
        );
        
        logger.info('Trace created successfully');
      } catch (error) {
        logger.error('Failed to create trace for evaluation:', error);
      }
    } else {
      logger.info('Tracing disabled, skipping trace creation');
    }

    // Get the tool instance from ToolRegistry based on what the test specifies
    const tool = ToolRegistry.getRegisteredTool(testCase.tool);
    if (!tool) {
      throw new Error(`Tool "${testCase.tool}" not found in ToolRegistry. Ensure it is properly registered.`);
    }

    const result = await this.evaluator.runTest(testCase, tool as any, tracingContext);
    
    // Add LLM evaluation if test passed
    if (result.status === 'passed' && result.output && testCase.validation.type !== 'snapshot') {
      logger.debug(`[EvaluationRunner] Adding LLM evaluation...`);
      
      // Create span for LLM evaluation
      const llmSpanId = `llm-judge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const llmStartTime = new Date();
      
      try {
        if (isTracingEnabled()) {
          await this.tracingProvider.createObservation({
            id: llmSpanId,
            name: 'LLM Judge Evaluation',
            type: 'generation',
            startTime: llmStartTime,
            input: {
              output: result.output,
              testCase: testCase.name,
              validation: testCase.validation
            },
            model: this.config.evaluationModel,
            metadata: {
              tool: testCase.tool,
              testId: testCase.id || testCase.name,
              phase: 'llm-evaluation'
            }
          }, traceId);
        }
        
        const llmJudgment = await this.llmEvaluator.evaluate(
          result.output,
          testCase,
          testCase.validation
        );
        
        // Update LLM evaluation span with result
        if (isTracingEnabled()) {
          await this.tracingProvider.updateObservation(llmSpanId, {
            endTime: new Date(),
            output: llmJudgment,
            metadata: {
              score: llmJudgment.score,
              passed: llmJudgment.passed,
              explanation: llmJudgment.explanation
            }
          });
        }
        
        if (result.validation) {
          result.validation.llmJudge = llmJudgment;
          result.validation.passed = result.validation.passed && llmJudgment.passed;
          result.validation.summary += ` | LLM Score: ${llmJudgment.score}/100`;
        }
      } catch (error) {
        console.warn('[EvaluationRunner] LLM evaluation failed:', error);
        // Update span with error
        if (isTracingEnabled()) {
          try {
            await this.tracingProvider.updateObservation(llmSpanId, {
              endTime: new Date(),
              error: error instanceof Error ? error.message : String(error)
            });
          } catch (tracingError) {
            logger.warn('Failed to update LLM evaluation span with error:', tracingError);
          }
        }
      }
    }

    // Finalize the trace
    if (isTracingEnabled()) {
      try {
        await this.tracingProvider.finalizeTrace(traceId, {
          status: result.status,
          output: result.output,
          duration: Date.now() - startTime.getTime(),
          validation: result.validation
        });
      } catch (error) {
        logger.warn('Failed to finalize trace:', error);
      }
    }

    this.printTestResult(result);
    return result;
  }

  /**
   * Run all tests from a given test array
   */
  async runAllTests(testCases: TestCase<any>[]): Promise<TestResult[]> {
    // Ensure LLM client initialization completes before running batch
    if (this.#llmInitPromise) {
      try { await this.#llmInitPromise; } catch { /* ignore; errors are logged in initializer */ }
    }
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
    
    // Show tool usage stats if available
    if (result.output?.toolUsageStats) {
      logger.debug(`Tool Calls: ${result.output.toolUsageStats.totalCalls}`);
      logger.debug(`Unique Tools: ${result.output.toolUsageStats.uniqueTools}`);
      logger.debug(`Iterations: ${result.output.toolUsageStats.iterations}`);
      if (result.output.toolUsageStats.errorCount > 0) {
        logger.debug(`Errors: ${result.output.toolUsageStats.errorCount}`);
      }
    }
    
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
