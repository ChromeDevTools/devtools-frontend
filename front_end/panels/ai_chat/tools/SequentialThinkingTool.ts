// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type { Tool, LLMContext } from './Tools.js';
import { TakeScreenshotTool } from './Tools.js';
import { GetAccessibilityTreeTool } from './Tools.js';
import { createLogger } from '../core/Logger.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { LLMResponseParser } from '../LLM/LLMResponseParser.js';
import { LLMRetryManager } from '../LLM/LLMErrorHandler.js';

const logger = createLogger('SequentialThinkingTool');

/**
 * Interface for past executed steps
 */
export interface ExecutedStep {
  stepNumber: number;
  plannedAction: string;
  actualAction: string;
  result: 'success' | 'failure' | 'partial';
  observations: string;
}

/**
 * Interface for thinking step
 */
export interface ThinkingStep {
  step: number;
  thought: string;
  action: string;
  targetDescription?: string;
  target_id?: number;
  value?: string;
  expectedOutcome: string;
  risks?: string[];
}

/**
 * Interface for sequential thinking result
 */
export interface SequentialThinkingResult {
  currentState: {
    visualSummary: string;
    progressAssessment: string;
    completionPercentage: number;
  };
  pastStepsAnalysis?: string;
  nextSteps: ThinkingStep[];
  warnings?: string[];
  confidence: number;
}

/**
 * Interface for sequential thinking arguments
 */
export interface SequentialThinkingArgs {
  userRequest: string;
  pastSteps?: ExecutedStep[];
  context?: string;
}

/**
 * Tool for grounded sequential thinking with visual context
 */
export class SequentialThinkingTool implements Tool<SequentialThinkingArgs, SequentialThinkingResult | { error: string }> {
  name = 'sequential_thinking';
  description = 'Analyzes the current visual state of the page along with past actions to create a grounded, step-by-step plan for completing the user\'s request. Should be used at the start of tasks and after major changes to reassess progress and plan next steps.';

  private screenshotTool = new TakeScreenshotTool();
  private accessibilityTool = new GetAccessibilityTreeTool();

  async execute(args: SequentialThinkingArgs, ctx?: LLMContext): Promise<SequentialThinkingResult | { error: string }> {
    try {
      logger.info('Sequential thinking initiated', { userRequest: args.userRequest });

      // Check if current model supports vision
      const currentModel = ctx?.model || '';
      const isVisionCapable = ctx?.getVisionCapability ? await ctx.getVisionCapability(currentModel) : false;
      
      logger.info(`Model ${currentModel} vision capable: ${isVisionCapable}`);

      // 1. Capture current visual state (screenshot only if vision capable)
      const visualContext = await this.captureVisualContext(isVisionCapable);
      if ('error' in visualContext) {
        return { error: `Failed to capture visual context: ${visualContext.error}` };
      }

      // 2. Prepare grounded prompt with all context
      const prompt = this.buildGroundedPrompt(
        args.userRequest,
        args.pastSteps || [],
        visualContext,
        args.context
      );

      // 3. Get LLM analysis with visual grounding (or text-only)
      const analysis = await this.getGroundedAnalysis(prompt, ctx);
      if ('error' in analysis) {
        return { error: `Failed to analyze: ${analysis.error}` };
      }

      return analysis;
    } catch (error) {
      logger.error('Sequential thinking failed:', error);
      return { error: `Sequential thinking failed: ${String(error)}` };
    }
  }

  private async captureVisualContext(includeScreenshot: boolean = true): Promise<{ screenshot: string; tree: string; url: string; title: string } | { error: string }> {
    try {
      // Take screenshot only if vision is supported
      let screenshot = '';
      if (includeScreenshot) {
        const screenshotResult = await this.screenshotTool.execute({ fullPage: false });
        if ('error' in screenshotResult) {
          return { error: `Screenshot failed: ${screenshotResult.error}` };
        }
        screenshot = screenshotResult.imageData || '';
      } else {
        logger.info('Skipping screenshot capture - model does not support vision');
        screenshot = 'no-screenshot-available';
      }

      // Get accessibility tree
      const treeResult = await this.accessibilityTool.execute({ reasoning: 'Getting page structure for sequential thinking' });
      if ('error' in treeResult) {
        return { error: `Accessibility tree failed: ${treeResult.error}` };
      }

      // Get page metadata
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) {
        return { error: 'No page target available' };
      }

      const url = target.inspectedURL();
      const titleResult = await target.runtimeAgent().invoke_evaluate({
        expression: 'document.title',
        returnByValue: true,
      });
      const title = titleResult.result?.value || 'Untitled';

      return {
        screenshot: screenshot,
        tree: treeResult.simplified,
        url,
        title
      };
    } catch (error) {
      return { error: `Failed to capture visual context: ${String(error)}` };
    }
  }

  private buildGroundedPrompt(
    userRequest: string,
    pastSteps: ExecutedStep[],
    visualContext: { screenshot: string; tree: string; url: string; title: string },
    additionalContext?: string
  ): { systemPrompt: string; userPrompt: string; images: Array<{ type: string; data: string }> } {
    const systemPrompt = `You are a visual-grounded sequential thinking agent. Your job is to analyze the current state of a web page (through screenshot and accessibility tree) along with past actions to create a concrete, step-by-step plan.

CRITICAL RULES:
1. Base ALL observations on what you can SEE in the screenshot
2. Don't assume elements exist - only reference what's visible
3. Learn from past failed attempts and adapt the approach
4. Describe UI elements by their visual appearance AND location
5. Be specific about expected outcomes and how to verify them visually
6. Consider the current progress toward the goal based on visual evidence

OUTPUT FORMAT:
{
  "currentState": {
    "visualSummary": "Brief description of what you see in the screenshot",
    "progressAssessment": "How much of the task is complete based on visual evidence",
    "completionPercentage": 0-100
  },
  "pastStepsAnalysis": "What worked, what failed, and why (if past steps provided)",
  "nextSteps": [
    {
      "step": 1,
      "thought": "Why this action is needed",
      "action": "Specific action to take (e.g., CLICK, TYPE, SCROLL)",
      "targetDescription": "Visual description of target element (color, position, text)",
      "target_id": 123456,
      "value": "text to type (for TYPE actions only)",
      "expectedOutcome": "What should change visually",
      "risks": ["Potential issues"]
    }
  ],
  "warnings": ["Any concerns about completing the task"],
  "confidence": 0.0-1.0
}

IMPORTANT FIELD USAGE:
- target_id: Include this number when you can identify a specific element ID from the accessibility tree
- value: Only include for TYPE actions - the text that should be typed into the element
- action: Use standard action types like CLICK, TYPE, SCROLL, SELECT, etc.`;

    const pastStepsSection = pastSteps.length > 0 ? `
PAST STEPS ATTEMPTED:
${pastSteps.map(step => `
Step ${step.stepNumber}: ${step.plannedAction}
- Actual: ${step.actualAction}
- Result: ${step.result}
- Observation: ${step.observations}`).join('\n')}` : '';

    const userPrompt = `USER REQUEST: ${userRequest}

CURRENT PAGE STATE:
- Title: ${visualContext.title}
${additionalContext ? `- Context: ${additionalContext}` : ''}
${pastStepsSection}

ACCESSIBILITY TREE (Current visible elements):
${visualContext.tree}

Based on the screenshot and current state, create a grounded sequential plan for completing the user's request. Remember to base everything on what you can actually SEE.`;

    return {
      systemPrompt,
      userPrompt,
      images: [{
        type: 'image_url',
        data: visualContext.screenshot
      }]
    };
  }

  private async getGroundedAnalysis(prompt: { systemPrompt: string; userPrompt: string; images: Array<{ type: string; data: string }> }, ctx?: LLMContext): Promise<SequentialThinkingResult | { error: string }> {
    const retryManager = new LLMRetryManager({
      enableLogging: true,
      defaultConfig: {
        maxRetries: 2, // Allow 2 retries for JSON parsing failures
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 1.5,
        jitterMs: 500,
      }
    });

    try {
      const result = await retryManager.executeWithRetry(async () => {
        // Get the selected model and its provider
        if (!ctx?.provider || !ctx.model) {
          throw new Error('Missing LLM context (provider/model) for SequentialThinkingTool');
        }
        const provider = ctx.provider;
        const model = ctx.model;
        const llm = LLMClient.getInstance();

        // Prepare multimodal message
        const validImages = prompt.images.filter(img => !!img?.data && img.data !== 'no-screenshot-available');
        const messages = [{
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: prompt.userPrompt },
            ...validImages.map(img => ({
              type: 'image_url' as const,
              image_url: { url: img.data }
            }))
          ]
        }];

        const response = await llm.call({
          provider,
          model,
          messages,
          systemPrompt: prompt.systemPrompt,
          temperature: 0.2
        });

        if (!response.text) {
          throw new Error('No response from LLM');
        }

        // This will throw if JSON parsing fails, triggering a retry
        const parsedResult = LLMResponseParser.parseStrictJSON(response.text) as SequentialThinkingResult;
        
        // Validate result structure
        if (!parsedResult.currentState || !parsedResult.nextSteps || !Array.isArray(parsedResult.nextSteps)) {
          throw new Error('Invalid response structure from LLM - missing required fields');
        }

        return parsedResult;
      }, {
        context: 'sequential_thinking_analysis',
        customRetryConfig: {
          maxRetries: 2, // Specific retry count for this operation
        }
      });

      return result;
    } catch (error) {
      logger.error('Sequential thinking analysis failed after retries:', error);
      return { error: `Analysis failed: ${String(error)}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      userRequest: {
        type: 'string',
        description: 'The original user request or task to be completed'
      },
      pastSteps: {
        type: 'array',
        description: 'Array of previously executed steps with their outcomes',
        items: {
          type: 'object',
          properties: {
            stepNumber: { type: 'number' },
            plannedAction: { type: 'string' },
            actualAction: { type: 'string' },
            result: { type: 'string', enum: ['success', 'failure', 'partial'] },
            observations: { type: 'string' }
          },
          required: ['stepNumber', 'plannedAction', 'actualAction', 'result', 'observations']
        }
      },
      context: {
        type: 'string',
        description: 'Additional context about the task or current situation'
      }
    },
    required: ['userRequest']
  };
}
