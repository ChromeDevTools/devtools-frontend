// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { LLMClient } from '../../../LLM/LLMClient.js';
import type { TestCase, LLMJudgeResult, ValidationConfig } from '../types.js';
import { createLogger } from '../../../core/Logger.js';
import { ErrorHandlingUtils } from '../../utils/ErrorHandlingUtils.js';
import { PromptTemplates } from '../../utils/PromptTemplates.js';
import { ResponseParsingUtils } from '../../utils/ResponseParsingUtils.js';
import type { ScreenshotData, VisionMessage, TextContent, ImageContent } from '../../utils/EvaluationTypes.js';
import { AIChatPanel } from '../../../ui/AIChatPanel.js';

const logger = createLogger('LLMEvaluator');

/**
 * Unified LLM-based evaluator for judging tool output quality
 * Supports both text-only and vision-enhanced evaluation
 */
export class LLMEvaluator {
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel?: string) {
    this.apiKey = apiKey;
    // Use the provided model, or fall back to saved judge model, or finally to mini model
    const JUDGE_MODEL_STORAGE_KEY = 'ai_chat_judge_model';
    this.defaultModel = defaultModel || localStorage.getItem(JUDGE_MODEL_STORAGE_KEY) || AIChatPanel.getMiniModel();
  }


  /**
   * Evaluate tool output using an LLM judge (supports both text and vision)
   */
  async evaluate(
    output: unknown,
    testCase: TestCase,
    config: ValidationConfig,
    screenshots?: { before?: ScreenshotData; after?: ScreenshotData }
  ): Promise<LLMJudgeResult> {
    const llmConfig = config.llmJudge || { criteria: [], temperature: 0 };
    const model = llmConfig.model || this.defaultModel;
    const criteria = llmConfig.criteria || PromptTemplates.buildDefaultCriteria(testCase);

    // Determine if we should use vision capabilities
    const hasScreenshots = Boolean(screenshots && (screenshots.before || screenshots.after));
    const shouldUseVision = hasScreenshots && this.isVisionModel(model);
    
    // Use withErrorHandling wrapper for better error management
    return await ErrorHandlingUtils.withErrorHandling(
      async () => {
        if (shouldUseVision) {
          return await this.evaluateWithVision(output, testCase, criteria, model, llmConfig, screenshots!);
        } else {
          return await this.evaluateTextOnly(output, testCase, criteria, model, llmConfig);
        }
      },
      (error) => {
        // Use formatUserFriendlyError for cleaner error messages
        const friendlyError = ErrorHandlingUtils.formatUserFriendlyError(error, 'LLM Evaluation failed');
        return {
          passed: false,
          score: 0,
          issues: [friendlyError],
          explanation: 'Failed to evaluate output due to internal error',
          confidence: 0
        };
      },
      logger,
      'LLMEvaluator.evaluate'
    );
  }

  /**
   * Text-only evaluation using standard LLM
   */
  private async evaluateTextOnly(
    output: unknown,
    testCase: TestCase,
    criteria: string[],
    model: string,
    llmConfig: { temperature?: number }
  ): Promise<LLMJudgeResult> {
    const prompt = PromptTemplates.buildLLMEvaluationPrompt(testCase, output, criteria);
    
    let lastError: unknown;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const llm = LLMClient.getInstance();
        const llmResponse = await llm.call({
          provider: AIChatPanel.getProviderForModel(model),
          model: model,
          messages: [
            { role: 'system', content: PromptTemplates.buildSystemPrompt({ hasVision: false }) },
            { role: 'user', content: prompt }
          ],
          systemPrompt: PromptTemplates.buildSystemPrompt({ hasVision: false }),
          temperature: llmConfig.temperature ?? 0
        });
        const response = llmResponse.text || '';

        // Clean response before parsing
        const cleanedResponse = ResponseParsingUtils.cleanResponseText(response);
        return ResponseParsingUtils.safeParseJudgment(cleanedResponse, { 
          context: 'LLMEvaluator:text',
          isVision: false 
        });
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (ErrorHandlingUtils.isRetryableError(error) && attempt < maxRetries) {
          logger.info(`Retrying LLM call (attempt ${attempt}/${maxRetries}) after error:`, error);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }

  /**
   * Vision-enhanced evaluation using multimodal LLM
   */
  private async evaluateWithVision(
    output: unknown,
    testCase: TestCase,
    _criteria: string[],
    model: string,
    llmConfig: { temperature?: number },
    screenshots: { before?: ScreenshotData; after?: ScreenshotData }
  ): Promise<LLMJudgeResult> {
    // Build multimodal messages with screenshots
    const messages = this.buildVisionMessages(testCase, output, screenshots);
    
    // For vision evaluation, we use OpenAI API directly since UnifiedLLMClient may not support multimodal yet
    const response = await this.callVisionAPI(model, messages, llmConfig.temperature ?? 0.1);
    
    // Parse the response
    const content = ResponseParsingUtils.extractContentFromAPIResponse(response);
    // Clean response before parsing
    const cleanedContent = ResponseParsingUtils.cleanResponseText(content);
    return ResponseParsingUtils.safeParseJudgment(cleanedContent, { 
      context: 'LLMEvaluator:vision',
      isVision: true 
    });
  }

  /**
   * Check if a model supports vision capabilities
   */
  private isVisionModel(modelName: string): boolean {
    const visionModels = [
      // Latest GPT-4.1 family (April 2025)
      'gpt-4.1',
      'gpt-4.1-mini', 
      'gpt-4.1-nano',
      // GPT-4o series
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4o-2024-08-06',
      'gpt-4o-2024-05-13',
      'gpt-4o-mini-2024-07-18',
      // GPT-4 Turbo with Vision
      'gpt-4-turbo',
      'gpt-4-turbo-2024-04-09',
      'gpt-4-turbo-preview',
      // O-series reasoning models
      'o1-preview',
      'o1-mini',
      // Legacy
      'gpt-4-vision-preview',
    ];
    
    return visionModels.some(model => modelName.toLowerCase().includes(model.toLowerCase()));
  }

  /**
   * Build vision-enabled messages with screenshots
   */
  private buildVisionMessages(
    testCase: TestCase,
    output: unknown,
    screenshots: { before?: ScreenshotData; after?: ScreenshotData }
  ): VisionMessage[] {
    const basePrompt = PromptTemplates.buildVisionEvaluationPrompt(
      testCase, 
      output, 
      screenshots.before, 
      screenshots.after
    );
    
    const content: Array<TextContent | ImageContent> = [
      {
        type: 'text',
        text: basePrompt
      }
    ];

    // Add before screenshot if available
    if (screenshots.before) {
      content.push({
        type: 'text',
        text: '\n--- BEFORE ACTION SCREENSHOT ---'
      });
      content.push({
        type: 'image_url',
        image_url: {
          url: screenshots.before.dataUrl,
          detail: 'high' // Use high detail for better accuracy
        }
      });
    }

    // Add after screenshot if available
    if (screenshots.after) {
      content.push({
        type: 'text',
        text: '\n--- AFTER ACTION SCREENSHOT ---'
      });
      content.push({
        type: 'image_url',
        image_url: {
          url: screenshots.after.dataUrl,
          detail: 'high'
        }
      });
    }

    return [
      {
        role: 'system',
        content: PromptTemplates.buildSystemPrompt({ hasVision: true })
      },
      {
        role: 'user',
        content
      }
    ];
  }

  /**
   * Call OpenAI API with vision support
   */
  private async callVisionAPI(
    modelName: string,
    messages: VisionMessage[],
    temperature: number
  ): Promise<Record<string, unknown>> {
    const payload = {
      model: modelName,
      messages: messages,
      max_tokens: 1000,
      temperature,
      response_format: { type: 'json_object' }
    };

    logger.info('Calling OpenAI Vision API with payload:', {
      model: payload.model,
      messageCount: messages.length,
      hasImages: messages.some(m => 
        Array.isArray(m.content) && 
        m.content.some((c: any) => c.type === 'image_url')
      )
    });

    let lastError: unknown;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(`OpenAI API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
          
          // Check if this is a retryable error
          if (ErrorHandlingUtils.isRetryableError(error) && attempt < maxRetries) {
            logger.info(`Retrying Vision API call (attempt ${attempt}/${maxRetries}) after error:`, error);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            continue;
          }
          
          throw error;
        }

        const data = await response.json();
        
        if (data.usage) {
          logger.info('Token usage:', data.usage);
        }

        return data;
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable (network errors, etc.)
        if (ErrorHandlingUtils.isRetryableError(error) && attempt < maxRetries) {
          logger.info(`Retrying Vision API call (attempt ${attempt}/${maxRetries}) after error:`, error);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }


  /**
   * Evaluate multiple outputs in batch
   */
  async evaluateBatch(
    results: Array<{ output: unknown; testCase: TestCase }>,
    config: ValidationConfig
  ): Promise<LLMJudgeResult[]> {
    const evaluations: LLMJudgeResult[] = [];

    for (const { output, testCase } of results) {
      logger.info(`Evaluating ${testCase.id}...`);
      const judgment = await this.evaluate(output, testCase, config);
      evaluations.push(judgment);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return evaluations;
  }
}