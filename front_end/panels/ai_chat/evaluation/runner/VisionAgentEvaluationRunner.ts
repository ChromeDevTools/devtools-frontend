// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { GenericToolEvaluator, type TestExecutionHooks } from '../framework/GenericToolEvaluator.js';
import { LLMEvaluator } from '../framework/judges/LLMEvaluator.js';
import { AgentService } from '../../core/AgentService.js';
import { ToolRegistry } from '../../agent_framework/ConfigurableAgentTool.js';
import { TakeScreenshotTool } from '../../tools/Tools.js';
import type { EvaluationConfig, TestResult, TestCase, ValidationConfig } from '../framework/types.js';
import type { ScreenshotData } from '../utils/EvaluationTypes.js';
import { createLogger } from '../../core/Logger.js';
import { TIMING_CONSTANTS } from '../../core/Constants.js';
import { createTracingProvider, isTracingEnabled } from '../../tracing/TracingConfig.js';
import type { TracingProvider, TracingContext } from '../../tracing/TracingProvider.js';

const logger = createLogger('VisionAgentEvaluationRunner');

/**
 * Enhanced test case interface for vision-enabled tests
 */
export interface VisionTestCase extends TestCase {
  validation: {
    type: 'llm-judge';
    llmJudge: {
      criteria: string[];
      visualVerification?: {
        enabled: boolean;
        captureBeforeAction?: boolean;
        captureAfterAction?: boolean;
        screenshotDelay?: number; // Delay after action before taking screenshot
        verificationPrompts?: string[];
      };
    };
  };
}

/**
 * Unified agent evaluation runner that supports both standard and vision-based evaluation
 * This replaces AgentEvaluationRunner when vision capabilities are needed
 */
export class VisionAgentEvaluationRunner {
  
  private llmEvaluator: LLMEvaluator;
  private screenshotTool: TakeScreenshotTool;
  private config: EvaluationConfig;
  private globalVisionEnabled: boolean;
  private tracingProvider: TracingProvider;

  constructor(visionEnabled: boolean = false, judgeModel?: string) {
    // Get API key from AgentService
    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();
    
    if (!apiKey) {
      throw new Error('API key not configured. Please configure in AI Chat settings.');
    }

    // Use provided judge model or default
    const evaluationModel = judgeModel || 'gpt-4.1-mini';

    this.config = {
      extractionModel: evaluationModel,
      extractionApiKey: apiKey,
      evaluationModel: evaluationModel, 
      evaluationApiKey: apiKey,
      maxConcurrency: 1, // Agent tools should run sequentially
      timeoutMs: TIMING_CONSTANTS.AGENT_TEST_DEFAULT_TIMEOUT,
      retries: 2,
      snapshotDir: './snapshots/agents',
      reportDir: './reports/agents'
    };

    this.llmEvaluator = new LLMEvaluator(this.config.evaluationApiKey, this.config.evaluationModel);
    this.screenshotTool = new TakeScreenshotTool();
    this.globalVisionEnabled = visionEnabled;
    this.tracingProvider = createTracingProvider();
  }

  /**
   * Run a single test with unified evaluation approach
   */
  async runSingleTest<T = any>(testCase: TestCase<T>, agentName?: string): Promise<TestResult> {
    const toolName = agentName || testCase.tool;
    
    // Determine if we should use vision for this test
    const shouldUseVision = this.shouldUseVision(testCase);
    
    logger.info(`Running test: ${testCase.name}`);
    logger.info(`Agent: ${toolName}`);
    logger.info(`Vision mode: ${shouldUseVision ? 'ENABLED' : 'DISABLED'}`);

    // Get the agent from ToolRegistry
    const agent = ToolRegistry.getRegisteredTool(toolName);
    if (!agent) {
      throw new Error(`Agent "${toolName}" not found in ToolRegistry. Ensure it is properly registered.`);
    }

    const startTime = Date.now();
    let beforeScreenshot: ScreenshotData | undefined;
    let afterScreenshot: ScreenshotData | undefined;
    
    // Create a trace for this test
    const traceId = `test-${testCase.id}-${Date.now()}`;
    const tracingContext: TracingContext = { 
      traceId, 
      sessionId: `vision-session-${Date.now()}`,
      parentObservationId: undefined 
    };
    
    try {
      // Create a root trace for the test
      if (isTracingEnabled()) {
        await this.tracingProvider.initialize();
        await this.tracingProvider.createSession(tracingContext.sessionId, {
          type: 'vision-evaluation',
          source: 'ui-dialog'
        });
        
        await this.tracingProvider.createTrace(
          traceId,
          tracingContext.sessionId,
          `Vision Agent Evaluation: ${testCase.name}`,
          testCase.input,
          {
            testId: testCase.id,
            testName: testCase.name,
            agent: toolName,
            visionEnabled: shouldUseVision,
            url: testCase.url,
            tags: testCase.metadata?.tags || []
          },
          'vision-agent-runner',
          ['evaluation', 'vision', toolName]
        );
      }
    } catch (error) {
      logger.warn('Failed to create trace:', error);
    }
    
    try {
      // Always create hooks for screenshot capture in VisionAgentEvaluationRunner
      const visualConfig = testCase.validation.llmJudge?.visualVerification;
      
      const testHooks: TestExecutionHooks = {
        beforeToolExecution: async () => {
          // Only capture if this specific test has vision enabled
          if (shouldUseVision && visualConfig?.captureBeforeAction) {
            logger.info('📸 Capturing before screenshot (after navigation)...');
            const beforeResult = await this.screenshotTool.execute({ fullPage: false });
            if ('imageData' in beforeResult) {
              beforeScreenshot = {
                dataUrl: beforeResult.imageData || '',
                timestamp: Date.now()
              };
              logger.info('✅ Before screenshot captured');
            } else if ('error' in beforeResult) {
              logger.warn('⚠️ Failed to capture before screenshot:', beforeResult.error);
            }
          }
        },
        afterToolExecution: async () => {
          // Capture after screenshot if vision is enabled
          if (shouldUseVision && visualConfig?.captureAfterAction) {
            logger.info('📸 Capturing after screenshot...');
            const afterResult = await this.screenshotTool.execute({ fullPage: false });
            if ('imageData' in afterResult) {
              afterScreenshot = {
                dataUrl: afterResult.imageData || '',
                timestamp: Date.now()
              };
              logger.info('✅ After screenshot captured');
            } else if ('error' in afterResult) {
              logger.warn('⚠️ Failed to capture after screenshot:', afterResult.error);
            }
          }
        }
      };
      
      // Always use evaluator with hooks in VisionAgentEvaluationRunner
      const evaluator = new GenericToolEvaluator(this.config, testHooks);
      
      // Execute the agent action with tracing context
      const agentResult = await evaluator.runTest(testCase, agent as any, tracingContext);

      // Perform evaluation based on vision mode
      if (agentResult.status === 'passed' && agentResult.output && testCase.validation.type === 'llm-judge') {
        let llmJudgment;
        
        // Create enhanced validation config with agent-specific criteria
        const enhancedValidation = this.createEnhancedValidationConfig(
          agentResult.output,
          testCase.validation
        );

        if (shouldUseVision && (beforeScreenshot || afterScreenshot)) {
          logger.info('🤖 Running vision-enabled evaluation...');
          // Use unified LLM evaluator with vision capabilities
          llmJudgment = await this.llmEvaluator.evaluate(
            agentResult.output,
            testCase,
            enhancedValidation,
            { before: beforeScreenshot, after: afterScreenshot }
          );
        } else {
          logger.info('📝 Running standard LLM evaluation...');
          // Use unified LLM evaluator without vision
          llmJudgment = await this.llmEvaluator.evaluate(
            agentResult.output,
            testCase,
            enhancedValidation
          );
        }
        
        // Update result with evaluation
        if (agentResult.validation) {
          agentResult.validation.llmJudge = llmJudgment;
          agentResult.validation.passed = agentResult.validation.passed && llmJudgment.passed;
          agentResult.validation.summary += ` | ${shouldUseVision ? 'Vision' : 'LLM'} Score: ${llmJudgment.score}/100`;
        }
      }

      // Extract tool usage information
      const conversationInfo = this.extractConversationInfo(agentResult.output);
      
      // Add tool usage info to the result
      if (conversationInfo.toolsUsed.length > 0) {
        logger.info(`🔧 Tool calls made: ${conversationInfo.toolsUsed.length}`);
        logger.info(`🔧 Tools used: ${conversationInfo.toolsUsed.join(', ')}`);
        
        // Add to validation summary
        if (agentResult.validation) {
          agentResult.validation.summary += ` | Tools: ${conversationInfo.toolsUsed.length}`;
        }
      }

      // Add screenshot data to output if available
      if (beforeScreenshot || afterScreenshot) {
        agentResult.output = {
          ...agentResult.output,
          screenshots: { before: beforeScreenshot, after: afterScreenshot }
        };
      }
      
      // Add tool usage stats to output for UI display
      agentResult.output = {
        ...agentResult.output,
        toolUsageStats: {
          totalCalls: conversationInfo.toolsUsed.length,
          uniqueTools: [...new Set(conversationInfo.toolsUsed)].length,
          toolsList: conversationInfo.toolsUsed,
          iterations: conversationInfo.iterations,
          errorCount: conversationInfo.errorCount
        }
      };

      // Update trace with final result
      try {
        if (isTracingEnabled()) {
          await this.tracingProvider.finalizeTrace(traceId, {
            output: agentResult,
            statusMessage: agentResult.status,
            metadata: {
              ...(agentResult.validation?.llmJudge ? {
                llmScore: agentResult.validation.llmJudge.score,
                llmConfidence: agentResult.validation.llmJudge.confidence,
                llmExplanation: agentResult.validation.llmJudge.explanation
              } : {}),
              toolsUsed: agentResult.output?.toolUsageStats?.toolsList || [],
              toolCallCount: agentResult.output?.toolUsageStats?.totalCalls || 0,
              duration: agentResult.duration
            }
          });
        }
      } catch (error) {
        logger.warn('Failed to update trace:', error);
      }

      return agentResult;

    } catch (error) {
      logger.error(`❌ Test failed with error:`, error);
      
      // Update trace with error
      try {
        if (isTracingEnabled()) {
          await this.tracingProvider.finalizeTrace(traceId, {
            error: error instanceof Error ? error.message : String(error),
            statusMessage: 'error'
          });
        }
      } catch (updateError) {
        logger.warn('Failed to update trace with error:', updateError);
      }
      
      return {
        testId: testCase.id,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        output: {
          screenshots: { before: beforeScreenshot, after: afterScreenshot }
        },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Determine if vision should be used for a test
   */
  private shouldUseVision(testCase: TestCase): boolean {
    // Check if test has vision verification enabled
    const testVisionEnabled = testCase.validation.type === 'llm-judge' && 
                              testCase.validation.llmJudge?.visualVerification?.enabled === true;
    
    // Use vision if both global flag and test-specific flag are enabled
    return this.globalVisionEnabled && testVisionEnabled;
  }

  /**
   * Create enhanced validation config with agent-specific criteria
   */
  private createEnhancedValidationConfig(
    output: any,
    inputValidationConfig: ValidationConfig
  ): ValidationConfig {
    // Extract conversation history and tool usage if available
    const conversationInfo = this.extractConversationInfo(output);
    
    // Create enhanced evaluation criteria for agent results
    const enhancedCriteria = [
      ...inputValidationConfig.llmJudge?.criteria || [],
      'Agent demonstrated autonomous decision-making and logical progression',
      'Tool usage was appropriate and effective for the given task',
      'Agent showed ability to adapt strategy based on intermediate results',
      'Final output represents a meaningful completion of the requested task'
    ];

    // Add tool-specific criteria if tools were detected
    if (conversationInfo.toolsUsed.length > 0) {
      enhancedCriteria.push(
        `Agent effectively utilized available tools: ${conversationInfo.toolsUsed.join(', ')}`
      );
    }

    // Add handoff criteria if handoff occurred
    if (conversationInfo.handoffOccurred) {
      enhancedCriteria.push('Agent properly executed handoff to another agent when appropriate');
    }

    return {
      type: 'llm-judge',
      llmJudge: {
        ...inputValidationConfig.llmJudge,
        criteria: enhancedCriteria
      }
    };
  }

  /**
   * Extract comprehensive conversation and tool usage information from agent output
   */
  private extractConversationInfo(output: any): any {
    const info = {
      toolsUsed: [] as string[],
      stepCount: 0,
      handoffOccurred: false,
      handoffTarget: undefined as string | undefined,
      iterations: 0,
      researchSources: [] as string[],
      errorCount: 0,
      finalStatus: 'unknown'
    };

    if (!output || typeof output !== 'object') {
      return info;
    }

    // Extract from conversation messages (standard ConfigurableAgentTool format)
    if (output.messages && Array.isArray(output.messages)) {
      info.stepCount = output.messages.length;
      
      // Count assistant messages for iterations
      info.iterations = output.messages.filter((msg: any) => msg.role === 'assistant').length;
      
      // Extract tool usage from messages
      for (const message of output.messages) {
        if (message.tool_calls && Array.isArray(message.tool_calls)) {
          for (const toolCall of message.tool_calls) {
            if (toolCall.function?.name) {
              info.toolsUsed.push(toolCall.function.name);
            }
          }
        }
        
        // Check for errors in tool responses
        if (message.role === 'tool' && message.content) {
          try {
            const toolResult = JSON.parse(message.content);
            if (toolResult.error || toolResult.success === false) {
              info.errorCount++;
            }
          } catch {
            // Not JSON, check for error keywords
            if (message.content.toLowerCase().includes('error') || 
                message.content.toLowerCase().includes('failed')) {
              info.errorCount++;
            }
          }
        }
      }
    }

    // Check for handoff information
    if (output.handoff) {
      info.handoffOccurred = true;
      info.handoffTarget = output.handoff.agent;
    } else if (output.handoffs && Array.isArray(output.handoffs) && output.handoffs.length > 0) {
      info.handoffOccurred = true;
      info.handoffTarget = output.handoffs[0].agent;
    }

    // Extract final status
    if (output.status) {
      info.finalStatus = output.status;
    } else if (output.success !== undefined) {
      info.finalStatus = output.success ? 'success' : 'failed';
    } else if (info.handoffOccurred) {
      info.finalStatus = 'handoff';
    }

    // Extract research sources if available
    if (output.sources && Array.isArray(output.sources)) {
      info.researchSources = output.sources;
    } else if (output.data && output.data.sources) {
      info.researchSources = output.data.sources;
    }

    // Remove duplicate tools
    info.toolsUsed = [...new Set(info.toolsUsed)];

    return info;
  }

  /**
   * Check if a test case has vision capabilities enabled
   */
  static isVisionEnabled(testCase: TestCase): testCase is VisionTestCase {
    return testCase.validation.type === 'llm-judge' && 
           testCase.validation.llmJudge?.visualVerification?.enabled === true;
  }

  /**
   * Set global vision enabled flag
   */
  setVisionEnabled(enabled: boolean): void {
    this.globalVisionEnabled = enabled;
    logger.info(`Global vision mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
}