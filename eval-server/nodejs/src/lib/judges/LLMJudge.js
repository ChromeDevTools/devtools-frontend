// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import OpenAI from 'openai';
import { Judge, createEvaluationResult } from './Judge.js';
import { CONFIG } from '../../config.js';
import logger from '../../logger.js';

/**
 * LLMJudge - Uses an LLM (like GPT-4) to evaluate agent responses
 * 
 * This is a refactored version of the original LLMEvaluator class,
 * now implementing the Judge interface for better modularity.
 */
export class LLMJudge extends Judge {
  constructor(config = {}) {
    super();
    
    this.config = {
      apiKey: config.apiKey || CONFIG.llm.apiKey,
      model: config.model || CONFIG.llm.model,
      temperature: config.temperature || CONFIG.llm.temperature,
      maxTokens: config.maxTokens || 1000,
      ...config
    };
    
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required for LLMJudge');
    }
    
    this.openai = new OpenAI({
      apiKey: this.config.apiKey
    });
  }

  /**
   * Evaluate an agent response using an LLM
   */
  async evaluate(task, agentResponse, options = {}) {
    const startTime = Date.now();
    
    try {
      // Merge options with default config
      const evalConfig = {
        criteria: [],
        model: this.config.model,
        temperature: this.config.temperature,
        ...options
      };
      
      const prompt = this.buildEvaluationPrompt(task, agentResponse, evalConfig);
      
      const completion = await this.openai.chat.completions.create({
        model: evalConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert evaluator of AI agent responses. Provide objective, detailed evaluations in the requested JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: evalConfig.temperature,
        max_tokens: this.config.maxTokens
      });

      const evaluation = completion.choices[0].message.content;
      const usage = completion.usage;
      const duration = Date.now() - startTime;

      logger.info('LLMJudge: Evaluation completed', {
        tokens_used: usage.total_tokens,
        model: evalConfig.model,
        duration
      });

      const result = this.parseEvaluation(evaluation);
      
      // Add metadata
      result.metadata = {
        judge: this.getName(),
        model: evalConfig.model,
        timestamp: new Date().toISOString(),
        duration,
        tokens_used: usage.total_tokens,
        criteria: evalConfig.criteria
      };

      return result;
      
    } catch (error) {
      logger.error('LLMJudge: Evaluation failed', { error: error.message });
      
      return createEvaluationResult({
        overall_score: 0,
        reasoning: `Evaluation failed: ${error.message}`,
        metadata: {
          judge: this.getName(),
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          error: error.message
        }
      });
    }
  }

  /**
   * Build the evaluation prompt
   */
  buildEvaluationPrompt(task, agentResponse, config) {
    const { criteria } = config;
    
    let prompt = `Please evaluate the following AI agent response to a given task.

TASK:
${task}

AGENT RESPONSE:
${agentResponse}

Please evaluate the response on the following criteria and provide a JSON response:

`;

    // Use custom criteria if provided, otherwise use default criteria
    if (criteria && criteria.length > 0) {
      criteria.forEach((criterion, index) => {
        prompt += `${index + 1}. **${criterion}**: Evaluate how well the response meets this criterion\n`;
      });
    } else {
      prompt += `1. **Correctness**: Is the response factually accurate and correct?
2. **Completeness**: Does the response fully address the task?
3. **Clarity**: Is the response clear and well-structured?
4. **Relevance**: Is the response relevant to the task?
5. **Helpfulness**: How helpful is the response to the user?
`;
    }

    prompt += `
Provide your evaluation in the following JSON format:
{
  "overall_score": <score from 0-10>,
  "criteria_scores": {`;
    
    if (criteria && criteria.length > 0) {
      criteria.forEach((criterion, index) => {
        const key = criterion.toLowerCase().replace(/[^a-z0-9]/g, '_');
        prompt += `\n    "${key}": <score from 0-10>`;
        if (index < criteria.length - 1) prompt += ',';
      });
    } else {
      prompt += `
    "correctness": <score from 0-10>,
    "completeness": <score from 0-10>,
    "clarity": <score from 0-10>,
    "relevance": <score from 0-10>,
    "helpfulness": <score from 0-10>`;
    }
    
    prompt += `
  },
  "reasoning": "<detailed explanation of your evaluation>",
  "strengths": ["<list of strengths>"],
  "weaknesses": ["<list of weaknesses>"],
  "suggestions": ["<list of improvement suggestions>"]
}`;

    return prompt;
  }

  /**
   * Parse the LLM evaluation response
   */
  parseEvaluation(evaluationText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[0]);
        
        // Validate and normalize the result
        return createEvaluationResult({
          overall_score: this.normalizeScore(parsedResult.overall_score),
          criteria_scores: this.normalizeCriteriaScores(parsedResult.criteria_scores || {}),
          reasoning: parsedResult.reasoning || '',
          strengths: Array.isArray(parsedResult.strengths) ? parsedResult.strengths : [],
          weaknesses: Array.isArray(parsedResult.weaknesses) ? parsedResult.weaknesses : [],
          suggestions: Array.isArray(parsedResult.suggestions) ? parsedResult.suggestions : [],
          raw_evaluation: evaluationText
        });
      }
      
      // If no JSON found, return a structured response with the raw text
      return createEvaluationResult({
        overall_score: null,
        criteria_scores: {},
        reasoning: evaluationText,
        strengths: [],
        weaknesses: [],
        suggestions: [],
        raw_evaluation: evaluationText
      });
      
    } catch (error) {
      logger.warn('LLMJudge: Failed to parse evaluation JSON', { error: error.message });
      
      return createEvaluationResult({
        overall_score: null,
        criteria_scores: {},
        reasoning: evaluationText,
        strengths: [],
        weaknesses: [],
        suggestions: [],
        raw_evaluation: evaluationText,
        parse_error: error.message
      });
    }
  }

  /**
   * Normalize score to be between 0 and 10
   */
  normalizeScore(score) {
    if (typeof score !== 'number' || isNaN(score)) {
      return null;
    }
    
    // Clamp score between 0 and 10
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Normalize criteria scores
   */
  normalizeCriteriaScores(scores) {
    const normalized = {};
    
    for (const [criterion, score] of Object.entries(scores)) {
      normalized[criterion] = this.normalizeScore(score);
    }
    
    return normalized;
  }

  /**
   * Get configuration schema
   */
  getConfigSchema() {
    return {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'OpenAI API key'
        },
        model: {
          type: 'string',
          description: 'OpenAI model to use for evaluation',
          default: 'gpt-4'
        },
        temperature: {
          type: 'number',
          description: 'Temperature for LLM generation',
          minimum: 0,
          maximum: 2,
          default: 0.1
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens for evaluation response',
          minimum: 100,
          maximum: 4000,
          default: 1000
        }
      },
      required: ['apiKey']
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    if (!config.apiKey) {
      throw new Error('LLMJudge requires an API key');
    }
    
    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
        throw new Error('Temperature must be a number between 0 and 2');
      }
    }
    
    if (config.maxTokens !== undefined) {
      if (typeof config.maxTokens !== 'number' || config.maxTokens < 100 || config.maxTokens > 4000) {
        throw new Error('maxTokens must be a number between 100 and 4000');
      }
    }
    
    return true;
  }

  /**
   * Get available OpenAI models for evaluation
   */
  async getAvailableModels() {
    try {
      const models = await this.openai.models.list();
      return models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();
    } catch (error) {
      logger.error('LLMJudge: Failed to fetch available models', { error: error.message });
      return ['gpt-4', 'gpt-3.5-turbo']; // Fallback list
    }
  }

  /**
   * Test the judge with a simple evaluation
   */
  async test() {
    const testTask = 'Summarize the main points of artificial intelligence';
    const testResponse = 'AI is a technology that enables machines to perform tasks that typically require human intelligence, such as learning, reasoning, and problem-solving.';
    
    try {
      const result = await this.evaluate(testTask, testResponse);
      return {
        success: true,
        result,
        message: 'LLMJudge test completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'LLMJudge test failed'
      };
    }
  }
}