// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type { Tool } from './Tools.js';
import { TakeScreenshotTool, GetAccessibilityTreeTool } from './Tools.js';
import { createLogger } from '../core/Logger.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';

const logger = createLogger('ThinkingTool');

/**
 * Interface for thinking result with flexible structure
 */
export interface ThinkingResult {
  visualSummary: string;
  thingsToDoList: string[];
  currentProgress?: string;
  observations?: string;
}

/**
 * Interface for thinking arguments
 */
export interface ThinkingArgs {
  userRequest: string;
  context?: string;
}

/**
 * Tool for high-level thinking and planning with visual context
 */
export class ThinkingTool implements Tool<ThinkingArgs, ThinkingResult | { error: string }> {
  name = 'thinking';
  description = 'A flexible thinking tool that provides a high-level visual summary and creates an unstructured list of things to do. Useful for getting oriented, planning next steps, or reflecting on current state. Automatically adapts to use visual analysis for vision-capable models or accessibility tree analysis for text-only models.';

  private screenshotTool = new TakeScreenshotTool();
  private accessibilityTool = new GetAccessibilityTreeTool();

  async execute(args: ThinkingArgs): Promise<ThinkingResult | { error: string }> {
    try {
      logger.info('Thinking tool initiated', { userRequest: args.userRequest });

      // 1. Check if current model supports vision
      const currentModel = AIChatPanel.instance().getSelectedModel();
      const isVisionModel = await AIChatPanel.isVisionCapable(currentModel);
      
      logger.info(`Model ${currentModel} vision capable: ${isVisionModel}`);

      // 2. Capture context based on model capabilities
      let contextData: any;
      if (isVisionModel) {
        // Use visual context for vision models
        contextData = await this.captureVisualContext();
        if ('error' in contextData) {
          return { error: `Failed to capture visual context: ${contextData.error}` };
        }
      } else {
        // Use accessibility tree for text-only models
        contextData = await this.captureAccessibilityContext();
        if ('error' in contextData) {
          return { error: `Failed to capture accessibility context: ${contextData.error}` };
        }
      }

      // 3. Build thinking prompt based on model type
      const prompt = isVisionModel 
        ? this.buildVisualThinkingPrompt(args.userRequest, args.context, contextData)
        : this.buildTextThinkingPrompt(args.userRequest, args.context, contextData);

      // 4. Get thinking analysis
      const analysis = await this.getThinkingAnalysis(prompt, isVisionModel);
      if ('error' in analysis) {
        return { error: `Failed to analyze: ${analysis.error}` };
      }

      return analysis;
    } catch (error) {
      logger.error('Thinking tool failed:', error);
      return { error: `Thinking failed: ${String(error)}` };
    }
  }

  private async captureAccessibilityContext(): Promise<{ accessibilityTree: string; url: string; title: string } | { error: string }> {
    try {
      // Get accessibility tree
      const accessibilityResult = await this.accessibilityTool.execute({ reasoning: 'for text-only model thinking analysis' });
      if ('error' in accessibilityResult) {
        return { error: `Accessibility tree failed: ${accessibilityResult.error}` };
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
        accessibilityTree: accessibilityResult.simplified || '',
        url,
        title
      };
    } catch (error) {
      return { error: `Failed to capture accessibility context: ${String(error)}` };
    }
  }

  private async captureVisualContext(): Promise<{ screenshot: string; url: string; title: string } | { error: string }> {
    try {
      // Take screenshot
      const screenshotResult = await this.screenshotTool.execute({ fullPage: false });
      if ('error' in screenshotResult) {
        return { error: `Screenshot failed: ${screenshotResult.error}` };
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
        screenshot: screenshotResult.imageData || '',
        url,
        title
      };
    } catch (error) {
      return { error: `Failed to capture visual context: ${String(error)}` };
    }
  }

  private buildVisualThinkingPrompt(
    userRequest: string,
    context: string | undefined,
    visualContext: { screenshot: string; url: string; title: string }
  ): { systemPrompt: string; userPrompt: string; images: Array<{ type: string; data: string }> } {
    const systemPrompt = `You are a thinking tool that helps with high-level planning and visual analysis. Your job is to look at the current state and think through what needs to be done in a flexible, unstructured way, always staying focused on the user's original request.

APPROACH:
1. Describe what you see in the screenshot in a brief, useful way
2. Create a flexible list of things that might need to be done (not rigid steps) to accomplish the user's request
3. Think about current progress toward the user's goal and what to focus on next
4. Be conversational and adaptive, not overly structured

OUTPUT FORMAT:
{
  "visualSummary": "Brief description of what you see that's relevant to the context",
  "thingsToDoList": ["High-level thing 1", "High-level thing 2", "Maybe this other thing", "Check on this", "Consider doing that"],
  "currentProgress": "Optional - where things stand right now toward the user's goal",
  "observations": "Optional - any interesting observations or notes"
}

Keep it conversational and flexible. Don't make it overly structured or rigid. Always keep the user's request in mind.`;

    const contextSection = context ? `\nADDITIONAL CONTEXT: ${context}` : '';

    const userPrompt = `USER REQUEST: ${userRequest}

CONTEXT: ${contextSection}

CURRENT PAGE: ${visualContext.title}

Look at the screenshot and think through what needs to be done to accomplish the user's request. Create a high-level visual summary and a flexible list of things to consider or work on.`;

    return {
      systemPrompt,
      userPrompt,
      images: [{
        type: 'image_url',
        data: visualContext.screenshot
      }]
    };
  }

  private buildTextThinkingPrompt(
    userRequest: string,
    context: string | undefined,
    accessibilityContext: { accessibilityTree: string; url: string; title: string }
  ): { systemPrompt: string; userPrompt: string; images: Array<{ type: string; data: string }> } {
    const systemPrompt = `You are a thinking tool that helps with high-level planning and analysis based on the page's accessibility structure. Your job is to understand the current state through the accessibility tree and think through what needs to be done in a flexible, unstructured way, always staying focused on the user's original request.

APPROACH:
1. Analyze the accessibility tree to understand the page structure and available elements
2. Create a flexible list of things that might need to be done (not rigid steps) to accomplish the user's request
3. Think about current progress toward the user's goal and what to focus on next
4. Be conversational and adaptive, not overly structured

OUTPUT FORMAT:
{
  "visualSummary": "Brief description of the page structure and relevant elements based on accessibility tree",
  "thingsToDoList": ["High-level thing 1", "High-level thing 2", "Maybe this other thing", "Check on this", "Consider doing that"],
  "currentProgress": "Optional - where things stand right now toward the user's goal",
  "observations": "Optional - any interesting observations about the page structure or elements"
}

Keep it conversational and flexible. Don't make it overly structured or rigid. Always keep the user's request in mind.`;

    const contextSection = context ? `\nADDITIONAL CONTEXT: ${context}` : '';

    const userPrompt = `USER REQUEST: ${userRequest}

CONTEXT: ${contextSection}

CURRENT PAGE: ${accessibilityContext.title}

ACCESSIBILITY TREE:
${accessibilityContext.accessibilityTree}

Based on the accessibility tree structure above, think through what needs to be done to accomplish the user's request. Create a high-level summary of the page and a flexible list of things to consider or work on. Focus on the elements and structure that are relevant to the user's goal.`;

    return {
      systemPrompt,
      userPrompt,
      images: [] // No images for text-only models
    };
  }

  private async getThinkingAnalysis(prompt: { systemPrompt: string; userPrompt: string; images: Array<{ type: string; data: string }> }, isVisionModel: boolean): Promise<ThinkingResult | { error: string }> {
    try {
      // Get the selected model and its provider
      const model = AIChatPanel.instance().getSelectedModel();
      const provider = AIChatPanel.getProviderForModel(model);
      const llm = LLMClient.getInstance();

      // Prepare message based on model type
      const messages = [{
        role: 'user' as const,
        content: isVisionModel ? [
          { type: 'text' as const, text: prompt.userPrompt },
          ...prompt.images.map(img => ({
            type: 'image_url' as const,
            image_url: { url: img.data }
          }))
        ] : prompt.userPrompt // Text-only for non-vision models
      }];

      const response = await llm.call({
        provider,
        model,
        messages,
        systemPrompt: prompt.systemPrompt,
        temperature: 0.3,
        retryConfig: { maxRetries: 3 }
      });

      if (!response.text) {
        return { error: 'No response from LLM' };
      }

      try {
        const result = JSON.parse(response.text) as ThinkingResult;

        // Validate result structure
        if (!result.visualSummary || !result.thingsToDoList || !Array.isArray(result.thingsToDoList)) {
          return { error: 'Invalid response structure from LLM' };
        }

        return result;
      } catch (parseError) {
        logger.error('Failed to parse LLM response:', parseError);
        return { error: `Failed to parse response: ${String(parseError)}` };
      }
    } catch (error) {
      logger.error('LLM call failed:', error);
      return { error: `LLM analysis failed: ${String(error)}` };
    }
  }

  schema = {
    type: 'object',
    properties: {
      userRequest: {
        type: 'string',
        description: 'The original user request or goal to think about'
      },
      context: {
        type: 'string',
        description: 'Optional additional context about the current situation'
      }
    },
    required: ['userRequest']
  };
}
