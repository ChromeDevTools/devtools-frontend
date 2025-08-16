// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Judge - Abstract interface for evaluation judges
 * 
 * A Judge is responsible for evaluating the quality of responses from LLM agents.
 * Different implementations can provide different evaluation strategies.
 */
export class Judge {
  /**
   * Evaluate an agent response against a task
   * 
   * @param {string} task - The original task or prompt
   * @param {string} agentResponse - The response from the agent
   * @param {Object} options - Additional options for evaluation
   * @returns {Promise<Object>} Evaluation result with scores and feedback
   */
  async evaluate(task, agentResponse, options = {}) {
    throw new Error('Judge.evaluate() must be implemented by subclass');
  }

  /**
   * Get the name of this judge implementation
   * @returns {string} The judge name
   */
  getName() {
    return this.constructor.name;
  }

  /**
   * Get configuration schema for this judge
   * @returns {Object} Configuration schema
   */
  getConfigSchema() {
    return {};
  }

  /**
   * Validate judge configuration
   * @param {Object} config - Configuration to validate
   * @returns {boolean} Whether configuration is valid
   */
  validateConfig(config) {
    return true;
  }
}

/**
 * Default evaluation result structure
 */
export const DEFAULT_EVALUATION_RESULT = {
  overall_score: null,
  criteria_scores: {},
  reasoning: '',
  strengths: [],
  weaknesses: [],
  suggestions: [],
  metadata: {
    judge: 'unknown',
    timestamp: null,
    duration: null
  }
};

/**
 * Utility function to create a standardized evaluation result
 */
export function createEvaluationResult(overrides = {}) {
  return {
    ...DEFAULT_EVALUATION_RESULT,
    ...overrides,
    metadata: {
      ...DEFAULT_EVALUATION_RESULT.metadata,
      ...overrides.metadata,
      timestamp: new Date().toISOString()
    }
  };
}