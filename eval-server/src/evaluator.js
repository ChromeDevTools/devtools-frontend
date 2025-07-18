import OpenAI from 'openai';
import { CONFIG } from './config.js';
import logger from './logger.js';

export class LLMEvaluator {
  constructor() {
    if (!CONFIG.llm.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.openai = new OpenAI({
      apiKey: CONFIG.llm.apiKey
    });
  }

  async evaluate(task, agentResponse) {
    try {
      const prompt = this.buildEvaluationPrompt(task, agentResponse);
      
      const completion = await this.openai.chat.completions.create({
        model: CONFIG.llm.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert evaluator of AI agent responses. Provide objective, detailed evaluations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: CONFIG.llm.temperature,
        max_tokens: 1000
      });

      const evaluation = completion.choices[0].message.content;
      const usage = completion.usage;

      logger.info('LLM evaluation completed', {
        tokens_used: usage.total_tokens,
        model: CONFIG.llm.model
      });

      return this.parseEvaluation(evaluation);
    } catch (error) {
      logger.error('LLM evaluation failed', { error: error.message });
      throw error;
    }
  }

  buildEvaluationPrompt(task, agentResponse) {
    return `Please evaluate the following AI agent response to a given task.

TASK:
${task}

AGENT RESPONSE:
${agentResponse}

Please evaluate the response on the following criteria and provide a JSON response:

1. **Correctness**: Is the response factually accurate and correct?
2. **Completeness**: Does the response fully address the task?
3. **Clarity**: Is the response clear and well-structured?
4. **Relevance**: Is the response relevant to the task?
5. **Helpfulness**: How helpful is the response to the user?

Provide your evaluation in the following JSON format:
{
  "overall_score": <score from 1-10>,
  "criteria_scores": {
    "correctness": <score from 1-10>,
    "completeness": <score from 1-10>,
    "clarity": <score from 1-10>,
    "relevance": <score from 1-10>,
    "helpfulness": <score from 1-10>
  },
  "reasoning": "<detailed explanation of your evaluation>",
  "strengths": ["<list of strengths>"],
  "weaknesses": ["<list of weaknesses>"],
  "suggestions": ["<list of improvement suggestions>"]
}`;
  }

  parseEvaluation(evaluationText) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, return a structured response with the raw text
      return {
        overall_score: null,
        criteria_scores: {},
        reasoning: evaluationText,
        strengths: [],
        weaknesses: [],
        suggestions: [],
        raw_evaluation: evaluationText
      };
    } catch (error) {
      logger.warn('Failed to parse evaluation JSON', { error: error.message });
      return {
        overall_score: null,
        criteria_scores: {},
        reasoning: evaluationText,
        strengths: [],
        weaknesses: [],
        suggestions: [],
        raw_evaluation: evaluationText,
        parse_error: error.message
      };
    }
  }
}