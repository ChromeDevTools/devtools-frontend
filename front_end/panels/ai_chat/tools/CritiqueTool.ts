// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { AgentService } from '../core/AgentService.js';
import { createLogger } from '../core/Logger.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';

import type { Tool } from './Tools.js';

const logger = createLogger('Tool:Critique');

/**
 * Arguments for the CritiqueTool
 */
export interface CritiqueToolArgs {
  userInput: string;
  finalResponse: string;
  reasoning: string;
}

/**
 * Result of the CritiqueTool operation
 */
export interface CritiqueToolResult {
  satisfiesCriteria: boolean;
  feedback?: string;
  success: boolean;
  error?: string;
}

/**
 * Evaluation criteria returned from the LLM
 */
interface EvaluationCriteria {
  satisfiesCriteria: boolean;
  completeness: boolean;
  feasibility: boolean;
  alignment: boolean;
  missedRequirements: string[];
  suggestedImprovements?: string[];
}

/**
 * Agent that evaluates if a planning agent's response satisfies the user's requirements.
 *
 * This agent compares user input against a planning response to determine if
 * all requirements are met, and provides constructive feedback if not.
 */
export class CritiqueTool implements Tool<CritiqueToolArgs, CritiqueToolResult> {
  name = 'critique_tool';
  description = 'Evaluates if finalresponse satisfies the user\'s requirements and provides feedback if needed.';

  private async createToolTracingObservation(toolName: string, args: any): Promise<void> {
    try {
      const { getCurrentTracingContext, createTracingProvider } = await import('../tracing/TracingConfig.js');
      const context = getCurrentTracingContext();
      if (context) {
        const tracingProvider = createTracingProvider();
        await tracingProvider.createObservation({
          id: `event-tool-execute-${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: `Tool Execute: ${toolName}`,
          type: 'event',
          startTime: new Date(),
          input: { 
            toolName, 
            toolArgs: args,
            contextInfo: `Direct tool execution in ${toolName}`
          },
          metadata: {
            executionPath: 'direct-tool',
            toolName
          }
        }, context.traceId);
      }
    } catch (tracingError) {
      // Don't fail tool execution due to tracing errors
      console.error(`[TRACING ERROR in ${toolName}]`, tracingError);
    }
  }

  schema = {
    type: 'object',
    properties: {
      userInput: {
        type: 'string',
        description: 'The original user requirements/input to be evaluated against.'
      },
      finalResponse: {
        type: 'string',
        description: 'The final response to be evaluated.'
      },
      reasoning: {
        type: 'string',
        description: 'Reasoning for performing the evaluation, displayed to the user.'
      }
    },
    required: ['userInput', 'finalResponse', 'reasoning']
  };

  /**
   * Execute the critique agent
   */
  async execute(args: CritiqueToolArgs): Promise<CritiqueToolResult> {
    await this.createToolTracingObservation(this.name, args);
    logger.debug('Executing with args', args);
    const { userInput, finalResponse, reasoning } = args;
    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();

    // Validate input
    if (!userInput || !finalResponse) {
      return {
        satisfiesCriteria: false,
        success: false,
        error: 'Both user input and final response must be provided.'
      };
    }

    if (!apiKey) {
      return {
        satisfiesCriteria: false,
        success: false,
        error: 'API key not configured.'
      };
    }

    try {
      logger.info('Evaluating planning response against user requirements');

      // First, extract requirements from user input
      const requirementsResult = await this.extractRequirements(userInput, apiKey);
      if (!requirementsResult.success) {
        throw new Error('Failed to extract requirements from user input.');
      }

      // Then evaluate the planning response against the requirements
      const evaluationResult = await this.evaluateResponse(
        userInput,
        finalResponse,
        requirementsResult.requirements,
        apiKey
      );

      if (!evaluationResult.success || !evaluationResult.criteria) {
        throw new Error('Failed to evaluate response against requirements.');
      }

      const criteria = evaluationResult.criteria;

      // Generate feedback only if criteria not satisfied
      let feedback = undefined;
      if (!criteria.satisfiesCriteria) {
        feedback = await this.generateFeedback(criteria, userInput, finalResponse, apiKey);
      }

      logger.info('Evaluation complete', {
        satisfiesCriteria: criteria.satisfiesCriteria,
        result: criteria.satisfiesCriteria ? 'Requirements satisfied' : 'Requirements not satisfied'
      });

      return {
        satisfiesCriteria: criteria.satisfiesCriteria,
        feedback,
        success: true
      };

    } catch (error: any) {
      logger.error('Error during evaluation process', error);
      return {
        satisfiesCriteria: false,
        success: false,
        error: `Evaluation failed: ${error.message || String(error)}`
      };
    }
  }

  /**
   * Extract structured requirements from user input
   */
  private async extractRequirements(userInput: string, apiKey: string): Promise<{success: boolean, requirements: string[], error?: string}> {
    const systemPrompt = `You are an expert requirements analyst. 
Your task is to extract clear, specific requirements from the user's input.
Focus on functional requirements, constraints, and expected outcomes.
Return ONLY a JSON array of requirement statements without any explanation.`;

    const userPrompt = `Extract the key requirements from this input:

USER INPUT:
${userInput}

Return a JSON array of requirement statements. Example format:
["Requirement 1", "Requirement 2", ...]`;

    try {
      const { model, provider } = AIChatPanel.getNanoModelWithProvider();
      const llm = LLMClient.getInstance();
      
      const response = await llm.call({
        provider,
        model,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        systemPrompt,
        temperature: 0.1,
      });

      if (!response.text) {
        return { success: false, requirements: [], error: 'No response received' };
      }

      // Parse the JSON array from the response
      const requirementsMatch = response.text.match(/\[(.*)\]/s);
      if (!requirementsMatch) {
        return { success: false, requirements: [], error: 'Failed to parse requirements' };
      }

      const requirements = JSON.parse(requirementsMatch[0]);
      return { success: true, requirements };
    } catch (error: any) {
      logger.error('Error extracting requirements', error);
      return { success: false, requirements: [], error: String(error) };
    }
  }

  /**
   * Evaluate planning response against requirements
   */
  private async evaluateResponse(
    userInput: string,
    finalResponse: string,
    requirements: string[],
    apiKey: string
  ): Promise<{success: boolean, criteria?: EvaluationCriteria, error?: string}> {
    const systemPrompt = `You are an expert plan evaluator.
Your task is to determine if a planning response satisfies the user's requirements.
Be thorough but fair in your assessment. Focus on substance over style.
You must return a JSON object with the evaluation criteria.`;

    const evaluationSchema = {
      type: 'object',
      properties: {
        satisfiesCriteria: {
          type: 'boolean',
          description: 'Overall assessment: true if the plan satisfies requirements, false otherwise'
        },
        completeness: {
          type: 'boolean',
          description: 'Whether all requirements are addressed'
        },
        feasibility: {
          type: 'boolean',
          description: 'Whether the plan is implementable'
        },
        alignment: {
          type: 'boolean',
          description: 'Whether the plan aligns with user intent'
        },
        missedRequirements: {
          type: 'array',
          items: { type: 'string' },
          description: 'Requirements that were not addressed'
        },
        suggestedImprovements: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific improvements that would make the plan satisfactory'
        }
      },
      required: ['satisfiesCriteria', 'completeness', 'feasibility', 'alignment', 'missedRequirements']
    };

    const userPrompt = `Evaluate if this planning response satisfies the user's requirements:

USER INPUT:
${userInput}

EXTRACTED REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

FINAL RESPONSE:
${finalResponse}

Return a JSON object evaluating the plan against the requirements using this schema:
${JSON.stringify(evaluationSchema, null, 2)}`;

    try {
      const { model, provider } = AIChatPanel.getNanoModelWithProvider();
      const llm = LLMClient.getInstance();
      
      const response = await llm.call({
        provider,
        model,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        systemPrompt,
        temperature: 0.1,
      });

      if (!response.text) {
        return { success: false, error: 'No response received' };
      }

      // Extract JSON object from the response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: 'Failed to parse evaluation criteria' };
      }

      const criteria = JSON.parse(jsonMatch[0]) as EvaluationCriteria;
      return { success: true, criteria };
    } catch (error: any) {
      logger.error('Error evaluating response', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Generate actionable feedback based on evaluation criteria
   */
  private async generateFeedback(
    criteria: EvaluationCriteria,
    userInput: string,
    finalResponse: string,
    apiKey: string
  ): Promise<string> {
    const systemPrompt = `You are an expert feedback provider.
Your task is to generate clear, constructive feedback for a planning response.
Focus on actionable improvements rather than criticism.
Be specific about what needs to change to meet the requirements.`;

    const userPrompt = `Generate constructive feedback for this planning response:

USER INPUT:
${userInput}

FINAL RESPONSE:
${finalResponse}

EVALUATION CRITERIA:
${JSON.stringify(criteria, null, 2)}

Provide clear, actionable feedback focused on helping improve the final response to meet the requirements.
Be concise, specific, and constructive.`;

    try {
      const { model, provider } = AIChatPanel.getNanoModelWithProvider();
      const llm = LLMClient.getInstance();
      
      const response = await llm.call({
        provider,
        model,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        systemPrompt,
        temperature: 0.7,
      });

      return response.text || 'The plan does not meet all requirements, but no specific feedback could be generated.';
    } catch (error: any) {
      logger.error('Error generating feedback', error);
      return 'Failed to generate detailed feedback, but the plan does not meet all requirements.';
    }
  }
}
