// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { TestCase } from '../framework/types.js';
import type { ScreenshotData } from './EvaluationTypes.js';

/**
 * Utility class for building consistent evaluation prompts
 * Consolidates prompt building logic from LLMEvaluator and VisionLLMEvaluator
 */
export class PromptTemplates {
  /**
   * Build base evaluation context shared by all evaluators
   */
  static buildBaseContext(testCase: TestCase, output: unknown): string {
    return `
TEST CASE: ${testCase.name}
TOOL: ${testCase.tool}
URL: ${testCase.url}
DESCRIPTION: ${testCase.description}

INPUT PROVIDED TO TOOL:
\`\`\`json
${JSON.stringify(testCase.input, null, 2)}
\`\`\`

TOOL OUTPUT:
\`\`\`json
${JSON.stringify(output, null, 2)}
\`\`\``;
  }
  
  /**
   * Build evaluation criteria section
   */
  static buildCriteriaSection(criteria: string[]): string {
    if (!criteria || criteria.length === 0) {
      return '';
    }
    
    return `

EVALUATION CRITERIA:
${criteria.map((criterion, index) => `${index + 1}. ${criterion}`).join('\n')}`;
  }
  
  /**
   * Build standard LLM evaluation prompt (text-only)
   */
  static buildLLMEvaluationPrompt(
    testCase: TestCase, 
    output: unknown, 
    criteria: string[]
  ): string {
    return `
You are evaluating the output of an AI tool execution.

${this.buildBaseContext(testCase, output)}
${this.buildCriteriaSection(criteria)}

Please evaluate the tool output based on the criteria above. Consider:
1. Completeness: Does the output include all expected data?
2. Accuracy: Is the data correct and properly formatted?
3. Structure: Does it match the expected format?
4. Relevance: Is the output relevant to the input request?

IMPORTANT: Respond with ONLY a pure JSON object. Do not include any markdown formatting, code blocks, or explanatory text.

Required JSON format:
{
  "passed": boolean,
  "score": number (0-100),
  "dimensions": {
    "completeness": number (0-100),
    "accuracy": number (0-100),
    "structure": number (0-100),
    "relevance": number (0-100)
  },
  "issues": string[] (list of specific issues found, empty if none),
  "explanation": string (brief explanation of the evaluation),
  "confidence": number (0-100, your confidence in this evaluation)
}`;
  }
  
  /**
   * Build vision-enhanced evaluation prompt with screenshots
   */
  static buildVisionEvaluationPrompt(
    testCase: TestCase,
    output: unknown,
    beforeScreenshot?: ScreenshotData,
    afterScreenshot?: ScreenshotData
  ): string {
    const visualContext = beforeScreenshot && afterScreenshot 
      ? "\n\nSCREENSHOTS: Compare the before and after screenshots to verify the action was successful."
      : beforeScreenshot || afterScreenshot
      ? "\n\nSCREENSHOT: Use the provided screenshot to verify the action outcome."
      : "";
    
    const criteria = testCase.validation?.llmJudge?.criteria || [];
    
    return `
Task: Evaluate if this browser automation action was successful.

Objective: ${testCase.input.objective || testCase.description}
Expected URL: ${testCase.url}

Action Output:
${JSON.stringify(output, null, 2)}${visualContext}

${this.buildCriteriaSection(criteria)}

Visual Analysis Instructions:
- Analyze the provided screenshots to verify the action was completed
- Look for visual changes that indicate success (button states, form values, page navigation, etc.)
- Check for error messages, loading states, or unexpected UI changes
- Compare before/after states if both screenshots are provided
- Provide specific visual evidence in your evaluation

Please evaluate the action and provide:
1. A score from 0-100 (100 = completely successful)
2. Whether the action PASSED or FAILED overall
3. Detailed explanation of your reasoning
4. Any issues or concerns identified
5. If screenshots are provided, specific visual evidence

Respond in this JSON format:
{
  "score": <number 0-100>,
  "passed": <boolean>,
  "explanation": "<detailed reasoning>",
  "issues": ["<issue1>", "<issue2>"],
  "visualEvidence": "<description of visual confirmation if screenshots provided>"
}`;
  }
  
  /**
   * Build system prompt for LLM judge
   */
  static buildSystemPrompt(capabilities: { hasVision?: boolean } = {}): string {
    const basePrompt = `You are an expert evaluator for AI tool outputs. Your task is to objectively assess whether tool executions meet their intended purpose and quality standards. Be thorough but fair in your evaluation. Focus on practical utility rather than perfection.`;
    
    const visionAddition = capabilities.hasVision 
      ? ` You have vision capabilities and can analyze screenshots to verify browser automation tasks.`
      : '';
    
    const formatInstruction = ` CRITICAL: Always respond with pure JSON only - no markdown code blocks, no explanatory text, no formatting.`;
    
    return basePrompt + visionAddition + formatInstruction;
  }
  
  /**
   * Build default criteria based on tool type
   */
  static buildDefaultCriteria(testCase: TestCase): string[] {
    const criteria = [
      'The output is complete and contains meaningful data',
      'The output format is appropriate for the tool\'s purpose',
      'There are no obvious errors or missing required fields',
    ];

    // Add tool-specific criteria
    if (testCase.tool.includes('Extract')) {
      criteria.push('All requested data fields are extracted');
      criteria.push('Extracted data is accurate and properly formatted');
    }

    if (testCase.tool.includes('Navigate')) {
      criteria.push('Navigation was successful to the intended page');
    }

    if (testCase.tool.includes('Schema')) {
      criteria.push('Output conforms to the provided schema');
      criteria.push('All required fields are present');
    }

    return criteria;
  }
  
  /**
   * Extract objective from test case input
   */
  static extractObjective(testCase: TestCase): string {
    // Try to extract objective from various possible locations
    if (typeof testCase.input === 'object' && testCase.input !== null) {
      const inputObj = testCase.input as Record<string, unknown>;
      if (inputObj.objective && typeof inputObj.objective === 'string') {
        return inputObj.objective;
      }
      if (inputObj.description && typeof inputObj.description === 'string') {
        return inputObj.description;
      }
      if (inputObj.task && typeof inputObj.task === 'string') {
        return inputObj.task;
      }
    }
    
    return testCase.description || testCase.name;
  }
  
}